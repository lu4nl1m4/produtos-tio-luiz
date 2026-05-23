// Renderiza a coluna "Downloads" no rodape.
// Cache/snapshot aparecem rapido; Firestore REST atualiza em segundo plano.

import {
  carregarColecaoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  ordenarPorOrdem,
  salvarCachePublico
} from "./public-data.js";

const STATIC_DOWNLOADS = "data/downloads-publico.json";
const CACHE_KEY = "downloads";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

function comDownload(url) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  if (/\/(?:image|raw|video)\/upload\/[^/]*fl_attachment/.test(url)) return url;
  return url.replace(/\/(image|raw|video)\/upload\//, "/$1/upload/fl_attachment/");
}

function normalizarItens(itens) {
  return ordenarPorOrdem(itens || [], 9999)
    .filter((d) => d.ativo !== false);
}

let ultimoHtmlRenderizado = "";

function renderListas(itens) {
  const containers = document.querySelectorAll("[data-footer-downloads]");
  if (!containers.length) return false;

  const colunas = document.querySelectorAll("[data-footer-downloads-col]");
  const lista = normalizarItens(itens);

  if (!lista.length) {
    colunas.forEach((c) => { c.hidden = true; });
    ultimoHtmlRenderizado = "";
    return true;
  }

  const html = lista.map((it) => `
    <li><a href="${escapeAttr(comDownload(it.url))}" target="_blank" rel="noopener noreferrer" class="footer__link" download>${escapeHtml(it.titulo)}</a></li>
  `).join("");

  if (html === ultimoHtmlRenderizado) return true;

  ultimoHtmlRenderizado = html;
  containers.forEach((c) => { c.innerHTML = html; });
  colunas.forEach((c) => { c.hidden = false; });
  return true;
}

(async () => {
  let renderizou = false;
  const cache = lerCachePublico(CACHE_KEY);

  if (cache) {
    renderizou = renderListas(cache);
  }

  if (!renderizou) {
    try {
      renderizou = renderListas(await carregarJsonPublico(STATIC_DOWNLOADS));
    } catch (err) {
      console.warn("[downloads] Falha ao carregar snapshot:", err);
    }
  }

  try {
    const itens = normalizarItens(await carregarColecaoFirestore("downloads"));
    salvarCachePublico(CACHE_KEY, itens);
    renderizou = renderListas(itens) || renderizou;
  } catch (err) {
    if (!renderizou) {
      console.error("[downloads] Falha ao carregar:", err);
      document.querySelectorAll("[data-footer-downloads-col]").forEach((c) => { c.hidden = true; });
    } else {
      console.warn("[downloads] Falha ao atualizar em segundo plano:", err);
    }
  }
})();
