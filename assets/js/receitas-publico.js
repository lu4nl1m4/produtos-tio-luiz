// Lista publica de receitas.
// Renderiza rapido a partir de cache/snapshot e confirma o Firestore em segundo plano.

import {
  carregarColecaoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  ordenarPorOrdem,
  salvarCachePublico
} from "./public-data.js";

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";
const STATIC_RECEITAS = "data/receitas-publico.json";
const CACHE_KEY = "receitas";

const BADGE_DESTAQUE = `<span style="position:absolute;top:0.5rem;right:0.5rem;background:#ffb300;color:#000;font-size:0.7rem;font-weight:700;padding:0.2rem 0.55rem;border-radius:999px;letter-spacing:0.02em;box-shadow:0 1px 3px rgba(0,0,0,0.15);z-index:2;">* DESTAQUE</span>`;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCard(r) {
  const meta = [r.tempo, r.porcoes, r.dificuldade].filter(Boolean).join(" | ");
  return `
    <a href="receita.html?id=${encodeURIComponent(r.id)}" class="card fade-in" style="position:relative;text-decoration:none;color:inherit;">
      ${r.destaque ? BADGE_DESTAQUE : ""}
      <img src="${escapeHtml(r.imagem_url || FALLBACK_IMAGE)}" alt="${escapeHtml(r.titulo)}" class="card__image" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_IMAGE}'">
      <div class="card__content">
        <h3 class="card__title">${escapeHtml(r.titulo)}</h3>
        ${meta ? `<p class="card__text" style="font-size:0.85rem;color:var(--color-gray-700,#555);margin-bottom:0.5rem;">${escapeHtml(meta)}</p>` : ""}
        ${r.descricao_curta ? `<p class="card__text">${escapeHtml(r.descricao_curta)}</p>` : ""}
        <span style="display:inline-block;margin-top:0.75rem;font-size:0.875rem;color:var(--color-primary);font-weight:500;">Ver receita -></span>
      </div>
    </a>
  `;
}

function normalizarReceitas(receitas) {
  return ordenarPorOrdem(receitas || [])
    .filter((r) => r.ativa !== false);
}

let ultimoHtmlRenderizado = "";

function renderizarReceitas(container, status, receitas) {
  const lista = normalizarReceitas(receitas);

  if (lista.length === 0) {
    status.textContent = "Nenhuma receita cadastrada ainda.";
    status.style.display = "";
    container.hidden = true;
    return true;
  }

  const html = lista.map(renderCard).join("");
  if (html === ultimoHtmlRenderizado) return true;

  ultimoHtmlRenderizado = html;
  container.innerHTML = html;
  status.style.display = "none";
  container.hidden = false;
  container.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
  return true;
}

async function init() {
  const container = document.getElementById("receitas-container");
  const status = document.getElementById("receitas-status");
  if (!container || !status) return;

  let renderizou = false;
  const cache = lerCachePublico(CACHE_KEY);

  if (cache) {
    renderizou = renderizarReceitas(container, status, cache);
  }

  if (!renderizou) {
    try {
      renderizou = renderizarReceitas(container, status, await carregarJsonPublico(STATIC_RECEITAS));
    } catch (e) {
      console.warn("Falha ao carregar snapshot estatico de receitas:", e);
    }
  }

  try {
    const receitas = normalizarReceitas(await carregarColecaoFirestore("receitas"));
    salvarCachePublico(CACHE_KEY, receitas);
    renderizou = renderizarReceitas(container, status, receitas) || renderizou;
  } catch (e) {
    if (!renderizou) {
      console.error("Erro ao carregar receitas:", e);
      status.textContent = "Erro ao carregar receitas. Veja o console.";
      status.style.color = "#d32f2f";
    } else {
      console.warn("Falha ao atualizar receitas em segundo plano:", e);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
