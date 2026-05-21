// Renderiza a coluna "Downloads" no rodapé de todas as páginas públicas.
// Lê /downloads do Firestore (ativos, ordenados por `ordem`) e injeta nos
// containers [data-footer-downloads]. Se não houver itens ativos, esconde
// a coluna inteira (via [data-footer-downloads-col]).

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const CACHE_KEY = "downloads_publicos_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }

async function carregarItens() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch {}

  const snap = await getDocs(collection(db, "downloads"));
  const itens = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => d.ativo !== false)
    .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999));

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: itens })); } catch {}
  return itens;
}

function renderListas(itens) {
  const containers = document.querySelectorAll("[data-footer-downloads]");
  if (!containers.length) return;

  const colunas = document.querySelectorAll("[data-footer-downloads-col]");

  if (!itens.length) {
    colunas.forEach((c) => { c.hidden = true; });
    return;
  }

  const html = itens.map((it) => `
    <li><a href="${escapeAttr(it.url)}" target="_blank" rel="noopener noreferrer" class="footer__link">${escapeHtml(it.titulo)}</a></li>
  `).join("");

  containers.forEach((c) => { c.innerHTML = html; });
  colunas.forEach((c) => { c.hidden = false; });
}

(async () => {
  try {
    const itens = await carregarItens();
    renderListas(itens);
  } catch (err) {
    console.error("[downloads] Falha ao carregar:", err);
    document.querySelectorAll("[data-footer-downloads-col]").forEach((c) => { c.hidden = true; });
  }
})();
