// Leitura publica rapida: cache local persistente + snapshot estatico + Firestore REST.
// O Firestore continua sendo a fonte atualizada, mas nao bloqueia a primeira renderizacao.

const API_KEY = "AIzaSyB0lJrlsHERnH2ZArBRbiOD-bk32hsxECs";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/site-produtos-tio-luiz/databases/(default)/documents";
const CACHE_PREFIX = "tioluiz_public_v2:";

function storage() {
  try {
    const key = `${CACHE_PREFIX}test`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return localStorage;
  } catch {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  }
}

export function lerCachePublico(key) {
  try {
    const store = storage();
    if (!store) return null;
    const raw = store.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw).data ?? null;
  } catch {
    return null;
  }
}

export function salvarCachePublico(key, data) {
  try {
    const store = storage();
    if (!store) return;
    store.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // QuotaExceeded, modo privado ou dados grandes demais: segue sem cache.
  }
}

export function removerCachePublico(key) {
  try {
    const store = storage();
    if (store) store.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignora indisponibilidade do storage.
  }
}

export async function carregarJsonPublico(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Falha ao carregar ${url}.`);
  return res.json();
}

export function valorFirestore(field) {
  if (!field || typeof field !== "object") return null;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return Boolean(field.booleanValue);
  if ("timestampValue" in field) return field.timestampValue;
  if ("nullValue" in field) return null;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map(valorFirestore);
  if ("mapValue" in field) {
    return Object.fromEntries(
      Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, valorFirestore(value)])
    );
  }
  return null;
}

function normalizarDocumento(doc) {
  const item = { id: doc.name.split("/").pop() };
  Object.entries(doc.fields || {}).forEach(([key, field]) => {
    item[key] = valorFirestore(field);
  });
  return item;
}

export async function carregarColecaoFirestore(nome) {
  const url = `${FIRESTORE_BASE}/${nome}?key=${API_KEY}&pageSize=100`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar ${nome} do Firestore.`);
  const data = await res.json();
  return (data.documents || []).map(normalizarDocumento);
}

export async function carregarDocumentoFirestore(path) {
  const url = `${FIRESTORE_BASE}/${path}?key=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao carregar ${path} do Firestore.`);
  return normalizarDocumento(await res.json());
}

export function ordenarPorOrdem(lista, fallback = 99) {
  return [...(lista || [])].sort((a, b) => (a.ordem ?? fallback) - (b.ordem ?? fallback));
}
