// CRUD da coleção 'categorias' no Firestore.
// O ID do documento é o slug (ex: "feijoes") — fixado na criação.

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import { uploadImagem, cloudinaryConfigurado } from "./cloudinary-upload.js";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const state = { categorias: [] };

// ---------- Toasts ----------
function toast(msg, type = "success") {
  const wrap = $("toast-area");
  const cls = type === "error" ? "alert-danger" : type === "warn" ? "alert-warning" : "alert-success";
  const el = document.createElement("div");
  el.className = `alert ${cls} shadow-sm py-2 px-3 mb-0`;
  el.style.minWidth = "240px";
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Data ----------
async function carregarCategorias() {
  const snap = await getDocs(collection(db, "categorias"));
  state.categorias = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

async function importarDoJson() {
  const res = await fetch("../data/categorias.json");
  if (!res.ok) throw new Error("Não consegui ler data/categorias.json");
  const lista = await res.json();
  const batch = writeBatch(db);
  for (const c of lista) {
    const ref = doc(db, "categorias", c.id);
    batch.set(ref, {
      nome: c.nome,
      tipo: c.tipo || "regular",
      ordem: c.ordem ?? 0,
      subtitulo: c.subtitulo ?? "",
      frase_destaque: c.frase_destaque ?? "",
      imagem_secao: c.imagem_secao ?? "",
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    });
  }
  await batch.commit();
}

// Preenche subtitulo/frase_destaque/imagem_secao nas categorias existentes
// que estejam com esses campos vazios — sem sobrescrever valores customizados.
async function completarCamposPadrao() {
  const res = await fetch("../data/categorias.json");
  if (!res.ok) throw new Error("Não consegui ler data/categorias.json");
  const defaults = await res.json();
  const defaultsMap = new Map(defaults.map((c) => [c.id, c]));

  const batch = writeBatch(db);
  let atualizados = 0;
  for (const cat of state.categorias) {
    const def = defaultsMap.get(cat.id);
    if (!def) continue;
    const patch = {};
    if (!cat.subtitulo && def.subtitulo)            patch.subtitulo = def.subtitulo;
    if (!cat.frase_destaque && def.frase_destaque)  patch.frase_destaque = def.frase_destaque;
    if (!cat.imagem_secao && def.imagem_secao)      patch.imagem_secao = def.imagem_secao;
    if (Object.keys(patch).length === 0) continue;
    patch.atualizado_em = serverTimestamp();
    batch.set(doc(db, "categorias", cat.id), patch, { merge: true });
    atualizados++;
  }
  if (atualizados === 0) return 0;
  await batch.commit();
  return atualizados;
}

// ---------- Render ----------
const sortables = { regular: null, pet: null };

function tipoLabel(tipo) {
  return tipo === "pet" ? "pet" : "regular";
}

function renderLinhas(lista) {
  if (lista.length === 0) {
    return `<tr><td colspan="5" class="state-message">Nenhuma categoria neste grupo.</td></tr>`;
  }
  return lista.map((c, i) => `
    <tr data-id="${c.id}" data-tipo="${tipoLabel(c.tipo)}">
      <td class="drag-handle text-center" title="Arrastar para reordenar" style="cursor: grab; color: #aaa; user-select: none;">⋮⋮</td>
      <td class="text-center text-muted small">${i + 1}</td>
      <td><code>${escapeHtml(c.id)}</code></td>
      <td class="fw-medium">${escapeHtml(c.nome)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" data-action="editar">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-action="remover">Remover</button>
      </td>
    </tr>
  `).join("");
}

function categoriasDoTipo(tipo) {
  return state.categorias
    .filter((c) => tipoLabel(c.tipo) === tipo)
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

function renderTabela() {
  const regulares = categoriasDoTipo("regular");
  const pets = categoriasDoTipo("pet");

  $("contagem").textContent = `${state.categorias.length} categoria(s) — ${regulares.length} regular + ${pets.length} pet`;

  if (state.categorias.length === 0) {
    $("import-banner").classList.remove("d-none");
    $("import-banner").classList.add("d-flex");
  } else {
    $("import-banner").classList.add("d-none");
    $("import-banner").classList.remove("d-flex");
  }

  $("tabela-body-regular").innerHTML = renderLinhas(regulares);
  $("tabela-body-pet").innerHTML = renderLinhas(pets);

  initSortable();
}

function initSortable() {
  const SortableLib = window.Sortable;
  if (!SortableLib) {
    console.warn("SortableJS não carregado — drag-and-drop indisponível.");
    return;
  }
  ["regular", "pet"].forEach((tipo) => {
    if (sortables[tipo]) sortables[tipo].destroy();
    const tbody = $(`tabela-body-${tipo}`);
    sortables[tipo] = new SortableLib(tbody, {
      handle: ".drag-handle",
      animation: 150,
      ghostClass: "table-active",
      onEnd: async (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        await persistirNovaOrdem(tipo);
      }
    });
  });
}

async function persistirNovaOrdem(tipo) {
  const tbody = $(`tabela-body-${tipo}`);
  const ids = Array.from(tbody.querySelectorAll("tr[data-id]")).map((tr) => tr.dataset.id);
  const batch = writeBatch(db);
  let mudou = 0;
  ids.forEach((id, i) => {
    const cat = state.categorias.find((c) => c.id === id);
    const novaOrdem = i + 1;
    if (cat && cat.ordem !== novaOrdem) {
      cat.ordem = novaOrdem;
      batch.set(doc(db, "categorias", id), { ordem: novaOrdem, atualizado_em: serverTimestamp() }, { merge: true });
      mudou++;
    }
  });
  if (mudou === 0) return;
  try {
    await batch.commit();
    renderTabela();
    toast(`Ordem atualizada (${mudou} ${tipo === "pet" ? "pet" : "regular"}).`);
  } catch (e) {
    toast(e.message || "Erro ao salvar nova ordem.", "error");
    await carregarCategorias();
    renderTabela();
  }
}

// ---------- Modal ----------
let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("cat-modal"));
  return modalInstance;
}

function atualizarPreviewImagemCat() {
  const url = $("cat-imagem").value.trim();
  const img = $("cat-imagem-preview");
  if (url) {
    img.src = url;
    img.style.display = "block";
    img.onerror = () => { img.style.display = "none"; };
  } else {
    img.style.display = "none";
  }
}

async function handleUploadImagemCat(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const statusEl = $("cat-imagem-status");
  const fileInput = e.target;

  if (!cloudinaryConfigurado()) {
    statusEl.textContent = "Cloudinary não configurado.";
    statusEl.className = "small text-danger";
    fileInput.value = "";
    return;
  }

  statusEl.textContent = "Enviando 0%...";
  statusEl.className = "small text-muted";
  fileInput.disabled = true;

  try {
    const url = await uploadImagem(file, {
      onProgress: (pct) => { statusEl.textContent = `Enviando ${pct}%...`; }
    });
    $("cat-imagem").value = url;
    atualizarPreviewImagemCat();
    statusEl.textContent = "✓ Imagem enviada.";
    statusEl.className = "small text-success";
  } catch (err) {
    statusEl.textContent = err.message || "Erro no upload.";
    statusEl.className = "small text-danger";
  } finally {
    fileInput.disabled = false;
    fileInput.value = "";
  }
}

function abrirModalNovo() {
  $("modal-titulo").textContent = "Nova categoria";
  $("cat-original-id").value = "";
  $("cat-id").value = "";
  $("cat-id").disabled = false;
  $("cat-nome").value = "";
  $("cat-tipo").value = "regular";
  $("cat-subtitulo").value = "";
  $("cat-frase").value = "";
  $("cat-imagem").value = "";
  $("cat-imagem-status").textContent = "";
  atualizarPreviewImagemCat();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

function abrirModalEditar(c) {
  $("modal-titulo").textContent = `Editar: ${c.nome}`;
  $("cat-original-id").value = c.id;
  $("cat-id").value = c.id;
  $("cat-id").disabled = true; // id é imutável depois de criado
  $("cat-nome").value = c.nome || "";
  $("cat-tipo").value = c.tipo || "regular";
  $("cat-subtitulo").value = c.subtitulo || "";
  $("cat-frase").value = c.frase_destaque || "";
  $("cat-imagem").value = c.imagem_secao || "";
  $("cat-imagem-status").textContent = "";
  atualizarPreviewImagemCat();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

async function salvarCategoria(e) {
  e.preventDefault();
  const originalId = $("cat-original-id").value;
  const id = $("cat-id").value.trim().toLowerCase();
  const nome = $("cat-nome").value.trim();
  const tipo = $("cat-tipo").value;
  const errEl = $("form-erro");

  if (!id || !nome) {
    errEl.textContent = "ID e nome são obrigatórios.";
    errEl.classList.remove("d-none");
    return;
  }
  if (!/^[a-z0-9-]+$/.test(id)) {
    errEl.textContent = "ID deve ter apenas letras minúsculas, números e hífens.";
    errEl.classList.remove("d-none");
    return;
  }
  // Em criação, não permitir sobrescrever existente
  if (!originalId && state.categorias.some((c) => c.id === id)) {
    errEl.textContent = `Já existe uma categoria com ID '${id}'.`;
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    nome,
    tipo,
    subtitulo:      $("cat-subtitulo").value.trim(),
    frase_destaque: $("cat-frase").value.trim(),
    imagem_secao:   $("cat-imagem").value.trim(),
    atualizado_em:  serverTimestamp()
  };
  if (!originalId) {
    // Categoria nova: vai pro fim da lista do seu tipo (ordens são independentes entre regulares e pet)
    const doTipo = state.categorias.filter((c) => tipoLabel(c.tipo) === tipoLabel(tipo));
    const maxOrdem = doTipo.length > 0 ? Math.max(...doTipo.map((c) => c.ordem ?? 0)) : 0;
    payload.ordem = maxOrdem + 1;
    payload.criado_em = serverTimestamp();
  }

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    await setDoc(doc(db, "categorias", id), payload, { merge: true });
    toast(originalId ? `"${nome}" atualizada.` : `"${nome}" criada.`);
    getModal().hide();
    await carregarCategorias();
    renderTabela();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

async function removerCategoria(id) {
  const c = state.categorias.find((x) => x.id === id);
  if (!c) return;

  // Avisa se houver produtos usando essa categoria.
  let qtdProdutos = 0;
  try {
    const snap = await getDocs(query(collection(db, "produtos"), where("categoria", "==", id)));
    qtdProdutos = snap.size;
  } catch (e) {
    console.warn("Não consegui checar produtos:", e);
  }

  const aviso = qtdProdutos > 0
    ? `\n\nATENÇÃO: ${qtdProdutos} produto(s) usam essa categoria. Eles continuarão existindo mas vão aparecer como "categoria desconhecida" no site público.`
    : "";
  if (!confirm(`Remover categoria "${c.nome}" (id: ${id})?${aviso}\n\nNão tem como desfazer.`)) return;

  try {
    await deleteDoc(doc(db, "categorias", id));
    state.categorias = state.categorias.filter((x) => x.id !== id);
    renderTabela();
    toast(`"${c.nome}" removida.`);
  } catch (err) {
    toast(err.message || "Erro ao remover.", "error");
  }
}

function handleTabelaClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr[data-id]");
  if (!tr) return;
  const id = tr.dataset.id;
  if (btn.dataset.action === "editar") {
    const c = state.categorias.find((x) => x.id === id);
    if (c) abrirModalEditar(c);
  } else if (btn.dataset.action === "remover") {
    removerCategoria(id);
  }
}

// ---------- Boot ----------
async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;

  watchAuth((u) => {
    if (!u) window.location.replace("index.html");
  });

  try {
    await carregarCategorias();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="5" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("cat-form").addEventListener("submit", salvarCategoria);
  $("tabela-body-regular").addEventListener("click", handleTabelaClick);
  $("tabela-body-pet").addEventListener("click", handleTabelaClick);
  $("cat-imagem-file").addEventListener("change", handleUploadImagemCat);
  $("cat-imagem").addEventListener("input", atualizarPreviewImagemCat);

  $("import-btn").addEventListener("click", async () => {
    $("import-btn").disabled = true;
    $("import-btn").textContent = "Importando...";
    try {
      await importarDoJson();
      await carregarCategorias();
      renderTabela();
      toast("Importação concluída.");
    } catch (err) {
      toast(err.message || "Erro ao importar.", "error");
    } finally {
      $("import-btn").disabled = false;
      $("import-btn").textContent = "Importar agora";
    }
  });

  $("completar-btn").addEventListener("click", async () => {
    $("completar-btn").disabled = true;
    try {
      const n = await completarCamposPadrao();
      if (n === 0) {
        toast("Nada a completar — todas as categorias padrão já têm os campos preenchidos.", "warn");
      } else {
        await carregarCategorias();
        renderTabela();
        toast(`${n} categoria(s) atualizada(s) com dados padrão.`);
      }
    } catch (err) {
      toast(err.message || "Erro ao completar.", "error");
    } finally {
      $("completar-btn").disabled = false;
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
