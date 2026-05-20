// Renderiza seções inteiras de categorias (com cards dentro) a partir do Firestore.
// Cada página pública (produtos.html, pet-food.html) tem um único elemento
// <div id="secoes-container" data-tipo="regular|pet"></div> que é preenchido aqui.
// A ordem das seções segue o campo `ordem` da coleção `categorias` no admin.

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

const BADGE_DESTAQUE = `<span class="card__destaque-badge" style="position:absolute;top:0.5rem;right:0.5rem;background:#ffb300;color:#000;font-size:0.7rem;font-weight:700;padding:0.2rem 0.55rem;border-radius:999px;letter-spacing:0.02em;box-shadow:0 1px 3px rgba(0,0,0,0.15);z-index:2;">★ DESTAQUE</span>`;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Cards ----------

function renderRegularCard(p, isFirst) {
  const active = isFirst ? " active" : "";
  return `
    <div class="card product-card${active}" data-category="${escapeHtml(p.categoria)}" data-image="${escapeHtml(p.imagem_url || "")}" style="position:relative;">
      ${p.destaque ? BADGE_DESTAQUE : ""}
      <div class="card__content">
        <h4 class="card__title" style="font-size: 1.125rem;">${escapeHtml(p.nome)}${p.embalagem ? ` - ${escapeHtml(p.embalagem)}` : ""}</h4>
        <p class="card__text">${escapeHtml(p.descricao || "")}</p>
        <a href="produto.html?id=${encodeURIComponent(p.id)}" data-no-card-action class="card__details-link" style="display:inline-block;margin-top:0.5rem;font-size:0.875rem;color:var(--color-primary);font-weight:500;text-decoration:none;">+ Detalhes →</a>
      </div>
    </div>
  `;
}

function renderPetCard(p) {
  const badge = p.nome_curto || p.nome;
  return `
    <div class="pet-card" style="position:relative;">
      ${p.destaque ? BADGE_DESTAQUE : ""}
      <span class="pet-badge">${escapeHtml(badge)}</span>
      <img src="${escapeHtml(p.imagem_url || FALLBACK_IMAGE)}" alt="${escapeHtml(badge)}" class="pet-card__image" onerror="this.src='${FALLBACK_IMAGE}'">
      <h4 class="card__title" style="color: #ff6f00;">${escapeHtml(p.nome)}</h4>
      <p class="card__text">${escapeHtml(p.descricao || "")}</p>
      <div class="pet-card__footer">
        <p style="font-size: 0.875rem; color: var(--color-gray-600); margin: 0;">
          <strong>Embalagem:</strong> ${escapeHtml(p.embalagem || "-")}
        </p>
        <a href="produto.html?id=${encodeURIComponent(p.id)}" class="card__details-link" style="display:inline-block;margin-top:0.5rem;font-size:0.875rem;color:#ff6f00;font-weight:500;text-decoration:none;">+ Detalhes →</a>
      </div>
    </div>
  `;
}

function renderCardsHtml(produtos, tipo) {
  return produtos
    .map((p, i) => (tipo === "pet" ? renderPetCard(p) : renderRegularCard(p, i === 0)))
    .join("");
}

// ---------- Seções ----------

function renderSecaoRegular(cat, produtos, index) {
  // Alterna fundo claro/branco e lado da imagem usando o índice de exibição.
  const isLight = index % 2 === 1;
  const imagemDireita = index % 2 === 1;
  const sectionClass = isLight ? "section section--light" : "section";

  const primeiroProduto = produtos[0];
  const imagemSrc = primeiroProduto?.imagem_url || cat.imagem_secao || FALLBACK_IMAGE;
  const imagemAlt = primeiroProduto?.nome || cat.nome || "";

  const subtituloHtml = cat.subtitulo
    ? `<p class="section-subtitle">${escapeHtml(cat.subtitulo)}</p>`
    : "";

  const fraseHtml = cat.frase_destaque
    ? `<h3 style="color: var(--color-primary); font-size: 2rem; margin-bottom: 1.5rem;">${escapeHtml(cat.frase_destaque)}</h3>`
    : "";

  const imagemBloco = `
    <div class="fade-in"${imagemDireita ? ' style="order: 2;"' : ""}>
      <img id="${escapeHtml(cat.id)}-image" src="${escapeHtml(imagemSrc)}" alt="${escapeHtml(imagemAlt)}" class="product-image" style="width: 100%;" onerror="this.src='${FALLBACK_IMAGE}'">
    </div>
  `;

  const cardsHtml = produtos.length === 0
    ? `<p style="color: var(--color-gray-600); grid-column: 1 / -1; text-align: center;">Nenhum produto disponível nesta categoria.</p>`
    : renderCardsHtml(produtos, "regular");

  const contentBloco = `
    <div class="fade-in"${imagemDireita ? ' style="order: 1;"' : ""}>
      ${fraseHtml}
      <div class="grid grid--2 product-cards" style="gap: 1rem;" data-category="${escapeHtml(cat.id)}">
        ${cardsHtml}
      </div>
    </div>
  `;

  return `
    <section class="${sectionClass}" id="${escapeHtml(cat.id)}">
      <div class="container">
        <div class="fade-in section-header--centered">
          <h2 class="section-title">${escapeHtml(cat.nome)}</h2>
          ${subtituloHtml}
        </div>

        <div class="grid grid--2" style="gap: 3rem; align-items: center; margin-bottom: 3rem;">
          ${imagemBloco}
          ${contentBloco}
        </div>
      </div>
    </section>
  `;
}

function renderSecaoPet(cat, produtos) {
  const gridClass = cat.id === "pet-caes" ? "grid grid--3 grid--arroz-caes pet-cards" : "grid grid--3 pet-cards";

  const cardsHtml = produtos.length === 0
    ? `<p style="color: var(--color-gray-600); grid-column: 1 / -1; text-align: center;">Nenhum produto disponível nesta categoria.</p>`
    : renderCardsHtml(produtos, "pet");

  return `
    <div style="margin-bottom: 4rem;" id="${escapeHtml(cat.id)}">
      <h3 style="color: #ff6f00; font-size: 2rem; margin-bottom: 2rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 1rem;">
        ${escapeHtml(cat.nome)}
      </h3>
      <div class="${gridClass}" data-category="${escapeHtml(cat.id)}">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// ---------- Carregamento ----------

async function carregarCategorias() {
  try {
    const snap = await getDocs(collection(db, "categorias"));
    if (snap.size > 0) {
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
    }
  } catch (e) {
    console.warn("Falha ao ler categorias do Firestore, usando JSON:", e);
  }
  // Fallback: data/categorias.json
  const res = await fetch("data/categorias.json");
  if (!res.ok) throw new Error("Falha ao carregar categorias.");
  const lista = await res.json();
  return lista.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

async function carregarProdutos() {
  const snap = await getDocs(collection(db, "produtos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function produtosDaCategoria(produtos, catId) {
  return produtos
    .filter((p) => p.categoria === catId && p.ativo !== false)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

// ---------- Entry point ----------

async function init() {
  const container = document.getElementById("secoes-container");
  if (!container) return;
  const tipoDesejado = container.dataset.tipo || "regular";

  let categorias, produtos;
  try {
    [categorias, produtos] = await Promise.all([carregarCategorias(), carregarProdutos()]);
  } catch (e) {
    console.error("Erro ao carregar dados do Firestore:", e);
    container.innerHTML = `<p style="color: #d32f2f; text-align: center; padding: 2rem;">Erro ao carregar produtos. Veja o console para detalhes.</p>`;
    return;
  }

  // Filtra por tipo e re-ordena (ordens são independentes entre regulares e pet).
  const doTipo = categorias
    .filter((c) => (c.tipo || "regular") === tipoDesejado)
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  if (doTipo.length === 0) {
    container.innerHTML = `<p style="color: var(--color-gray-600); text-align: center; padding: 2rem;">Nenhuma categoria cadastrada${tipoDesejado === "pet" ? " na linha Pet Food" : ""}.</p>`;
    return;
  }

  const html = doTipo.map((cat, i) => {
    const prods = produtosDaCategoria(produtos, cat.id);
    return tipoDesejado === "pet" ? renderSecaoPet(cat, prods) : renderSecaoRegular(cat, prods, i);
  }).join("");

  container.innerHTML = html;

  // O IntersectionObserver de fade-in (script.js) já rodou antes da inserção
  // dinâmica e não enxerga os novos elementos. Marca como visíveis manualmente.
  container.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
}

document.addEventListener("DOMContentLoaded", init);
