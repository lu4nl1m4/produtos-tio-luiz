// Renderiza dinamicamente os cards de preview na seção "Nossos Produtos" da home (index.html).
// Procura <div id="home-cards-container"></div> e popula.
//
// Fonte principal: coleção `home_cards` no Firestore (gerenciada via admin/home.html).
// Fallback: se a coleção estiver vazia, usa as categorias regulares — assim o site nunca
// fica em branco mesmo antes de o admin importar/criar os cards.

import { db } from "./firebase-config.js";
import { cached } from "./cache.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const TTL_HOME_CARDS  = 10 * 60 * 1000;
const TTL_CATEGORIAS  = 10 * 60 * 1000;
const TTL_PRODUTOS    = 5 * 60 * 1000;

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

async function carregarHomeCards() {
  // Fonte principal: coleção home_cards (ativos, na ordem). Cache via sessionStorage.
  try {
    return await cached("home_cards", TTL_HOME_CARDS, async () => {
      const snap = await getDocs(collection(db, "home_cards"));
      if (snap.size === 0) return null;
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.ativo !== false)
        .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
    });
  } catch (e) {
    console.warn("Falha ao ler home_cards do Firestore:", e);
    return null;  // sinaliza pra usar o fallback
  }
}

async function carregarFallback() {
  // Fallback: categorias regulares + card CTA "Ver Todos"
  const [cats, prods] = await Promise.all([
    cached("categorias", TTL_CATEGORIAS, async () => {
      const snap = await getDocs(collection(db, "categorias"));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => (c.tipo || "regular") !== "pet")
        .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
    }),
    cached("produtos", TTL_PRODUTOS, async () => {
      const snap = await getDocs(collection(db, "produtos"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    })
  ]);

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
    titulo: "Ver Todos os Produtos →",
    link: "produtos.html",
    tipo: "cta"
  });
  return cards;
}

async function init() {
  const container = document.getElementById("home-cards-container");
  if (!container) return;

  let cards = await carregarHomeCards();
  if (cards === null) {
    try {
      cards = await carregarFallback();
    } catch (e) {
      console.error("Erro ao carregar fallback de home cards:", e);
      return;
    }
  }
  if (!cards || cards.length === 0) return;

  const html = cards.map((c) => {
    if (c.tipo === "cta") return renderCardCta({ titulo: c.titulo, link: c.link });
    return renderCardNormal({ titulo: c.titulo, texto: c.texto, imagem: c.imagem_url, link: c.link });
  }).join("");

  container.innerHTML = html;

  // Força .visible nos fade-in inseridos (o IntersectionObserver de script.js já rodou antes).
  container.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
}

document.addEventListener("DOMContentLoaded", init);
