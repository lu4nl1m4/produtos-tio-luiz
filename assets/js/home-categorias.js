// Cards da home.
// Renderiza cache/snapshot e revalida o Firestore sem bloquear a tela.

import {
  carregarColecaoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  ordenarPorOrdem,
  salvarCachePublico
} from "./public-data.js";

const STATIC_HOME_CARDS = "data/home-cards-publico.json";
const STATIC_CATEGORIAS = "data/categorias-publico.json";
const STATIC_PRODUTOS = "data/produtos-publico.json";
const CACHE_KEY = "home_cards";
const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCardNormal({ titulo, texto, imagem, link }) {
  return `
    <a href="${escapeHtml(link)}" class="card fade-in">
      <img src="${escapeHtml(imagem || FALLBACK_IMAGE)}" alt="${escapeHtml(titulo)}" class="card__image" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_IMAGE}'">
      <div class="card__content">
        <h3 class="card__title">${escapeHtml(titulo)}</h3>
        <p class="card__text">${escapeHtml(texto || "")}</p>
      </div>
    </a>
  `;
}

function renderCardCta({ titulo, link }) {
  return `
    <a href="${escapeHtml(link)}" class="card fade-in" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div class="card__content u-text-center">
        <h3 style="color: white; font-size: 2rem; margin: 0;">${escapeHtml(titulo)}</h3>
      </div>
    </a>
  `;
}

function normalizarHomeCards(cards) {
  return ordenarPorOrdem(cards || [])
    .filter((c) => c.ativo !== false);
}

function montarFallback(categorias, produtos) {
  const cats = ordenarPorOrdem(categorias || [])
    .filter((c) => (c.tipo || "regular") !== "pet");
  const prods = produtos || [];

  const cards = cats.map((cat) => {
    const primeiroProdComImg = prods
      .filter((p) => p.categoria === cat.id && p.ativo !== false && p.imagem_url)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0];
    return {
      titulo: cat.nome,
      texto: cat.subtitulo || "",
      imagem_url: cat.imagem_secao || primeiroProdComImg?.imagem_url || "",
      link: `produtos.html#${cat.id}`,
      tipo: "normal"
    };
  });

  cards.push({
    titulo: "Ver Todos os Produtos ->",
    link: "produtos.html",
    tipo: "cta"
  });
  return cards;
}

async function carregarSnapshotEstatico() {
  const cards = normalizarHomeCards(await carregarJsonPublico(STATIC_HOME_CARDS));
  if (cards.length) return cards;

  const [categorias, produtos] = await Promise.all([
    carregarJsonPublico(STATIC_CATEGORIAS),
    carregarJsonPublico(STATIC_PRODUTOS)
  ]);
  return montarFallback(categorias, produtos);
}

async function carregarSnapshotDinamico() {
  const cards = normalizarHomeCards(await carregarColecaoFirestore("home_cards"));
  if (cards.length) return cards;

  const [categorias, produtos] = await Promise.all([
    carregarColecaoFirestore("categorias"),
    carregarColecaoFirestore("produtos")
  ]);
  return montarFallback(categorias, produtos);
}

let ultimoHtmlRenderizado = "";

function renderizarCards(container, cards) {
  if (!cards || cards.length === 0) return false;

  const html = cards.map((c) => {
    if (c.tipo === "cta") return renderCardCta({ titulo: c.titulo, link: c.link });
    return renderCardNormal({ titulo: c.titulo, texto: c.texto, imagem: c.imagem_url, link: c.link });
  }).join("");

  if (html === ultimoHtmlRenderizado) return true;

  ultimoHtmlRenderizado = html;
  container.innerHTML = html;
  container.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
  return true;
}

async function init() {
  const container = document.getElementById("home-cards-container");
  if (!container) return;

  let renderizou = false;
  const cache = lerCachePublico(CACHE_KEY);

  if (cache) {
    renderizou = renderizarCards(container, cache);
  }

  if (!renderizou) {
    try {
      renderizou = renderizarCards(container, await carregarSnapshotEstatico());
    } catch (e) {
      console.warn("Falha ao carregar snapshot de home cards:", e);
    }
  }

  try {
    const cards = await carregarSnapshotDinamico();
    salvarCachePublico(CACHE_KEY, cards);
    renderizou = renderizarCards(container, cards) || renderizou;
  } catch (e) {
    if (!renderizou) {
      console.error("Erro ao carregar home cards:", e);
    } else {
      console.warn("Falha ao atualizar home cards em segundo plano:", e);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
