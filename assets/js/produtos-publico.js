// Renderiza os cards de produtos a partir do Firestore.
// Faz um único fetch de toda a coleção e distribui nos containers da página
// — evita queries compostas (que exigiriam índices) e reduz roundtrips.

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

function renderRegularCard(p, isFirst) {
  const active = isFirst ? " active" : "";
  return `
    <div class="card product-card${active}" data-category="${p.categoria}" data-image="${p.imagem_url}">
      <div class="card__content">
        <h4 class="card__title" style="font-size: 1.125rem;">${p.nome}${p.embalagem ? ` - ${p.embalagem}` : ""}</h4>
        <p class="card__text">${p.descricao || ""}</p>
      </div>
    </div>
  `;
}

function renderPetCard(p) {
  const badge = p.nome_curto || p.nome;
  return `
    <div class="pet-card">
      <span class="pet-badge">${badge}</span>
      <img src="${p.imagem_url}" alt="${badge}" class="pet-card__image" onerror="this.src='${FALLBACK_IMAGE}'">
      <h4 class="card__title" style="color: #ff6f00;">${p.nome}</h4>
      <p class="card__text">${p.descricao || ""}</p>
      <div class="pet-card__footer">
        <p style="font-size: 0.875rem; color: var(--color-gray-600); margin: 0;">
          <strong>Embalagem:</strong> ${p.embalagem || "-"}
        </p>
      </div>
    </div>
  `;
}

function preencherContainer(container, produtos) {
  const categoria = container.dataset.category;
  if (!categoria) return;

  const isPet = categoria.startsWith("pet-");

  const daCategoria = produtos
    .filter((p) => p.categoria === categoria && p.ativo !== false)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  if (daCategoria.length === 0) {
    container.innerHTML = `<p style="color: var(--color-gray-600); grid-column: 1 / -1; text-align: center;">Nenhum produto disponível nesta categoria.</p>`;
    return;
  }

  container.innerHTML = daCategoria
    .map((p, i) => (isPet ? renderPetCard(p) : renderRegularCard(p, i === 0)))
    .join("");

  // Para categorias regulares, sincroniza a imagem de destaque com o primeiro produto.
  if (!isPet) {
    const destaque = document.getElementById(`${categoria}-image`);
    if (destaque && daCategoria[0]?.imagem_url) {
      destaque.src = daCategoria[0].imagem_url;
      destaque.alt = daCategoria[0].nome;
    }
  }
}

async function carregarProdutos() {
  const containers = document.querySelectorAll("[data-category].product-cards, [data-category].pet-cards");
  if (containers.length === 0) return;

  try {
    const snap = await getDocs(collection(db, "produtos"));
    const produtos = snap.docs.map((d) => d.data());
    containers.forEach((c) => preencherContainer(c, produtos));
  } catch (e) {
    console.error("Erro ao carregar produtos do Firestore:", e);
    containers.forEach((c) => {
      c.innerHTML = `<p style="color: #d32f2f; grid-column: 1 / -1; text-align: center;">Erro ao carregar produtos. Veja o console para detalhes.</p>`;
    });
  }
}

document.addEventListener("DOMContentLoaded", carregarProdutos);
