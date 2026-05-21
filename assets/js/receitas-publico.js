// Lista pública de receitas (receitas.html).
// Renderiza um card por receita ativa, ordenada, com link pra receita.html?id=XXX.

import { db } from "./firebase-config.js";
import { cached } from "./cache.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";
const TTL_RECEITAS = 5 * 60 * 1000;

const BADGE_DESTAQUE = `<span style="position:absolute;top:0.5rem;right:0.5rem;background:#ffb300;color:#000;font-size:0.7rem;font-weight:700;padding:0.2rem 0.55rem;border-radius:999px;letter-spacing:0.02em;box-shadow:0 1px 3px rgba(0,0,0,0.15);z-index:2;">★ DESTAQUE</span>`;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCard(r) {
  const meta = [r.tempo, r.porcoes, r.dificuldade].filter(Boolean).join(" · ");
  return `
    <a href="receita.html?id=${encodeURIComponent(r.id)}" class="card fade-in" style="position:relative;text-decoration:none;color:inherit;">
      ${r.destaque ? BADGE_DESTAQUE : ""}
      <img src="${escapeHtml(r.imagem_url || FALLBACK_IMAGE)}" alt="${escapeHtml(r.titulo)}" class="card__image" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_IMAGE}'">
      <div class="card__content">
        <h3 class="card__title">${escapeHtml(r.titulo)}</h3>
        ${meta ? `<p class="card__text" style="font-size:0.85rem;color:var(--color-gray-700,#555);margin-bottom:0.5rem;">${escapeHtml(meta)}</p>` : ""}
        ${r.descricao_curta ? `<p class="card__text">${escapeHtml(r.descricao_curta)}</p>` : ""}
        <span style="display:inline-block;margin-top:0.75rem;font-size:0.875rem;color:var(--color-primary);font-weight:500;">Ver receita →</span>
      </div>
    </a>
  `;
}

async function carregarReceitas() {
  return cached("receitas", TTL_RECEITAS, async () => {
    const snap = await getDocs(collection(db, "receitas"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.ativa !== false)
      .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  });
}

async function init() {
  const container = document.getElementById("receitas-container");
  const status = document.getElementById("receitas-status");
  if (!container || !status) return;

  let receitas = [];
  try {
    receitas = await carregarReceitas();
  } catch (e) {
    console.error("Erro ao carregar receitas:", e);
    status.textContent = "Erro ao carregar receitas. Veja o console.";
    status.style.color = "#d32f2f";
    return;
  }

  if (receitas.length === 0) {
    status.textContent = "Nenhuma receita cadastrada ainda.";
    return;
  }

  container.innerHTML = receitas.map(renderCard).join("");
  status.style.display = "none";
  container.hidden = false;

  // Força .visible nos fade-in dinâmicos.
  container.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
}

document.addEventListener("DOMContentLoaded", init);
