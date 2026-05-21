// Página de detalhe de uma receita — lê ?id=XXX, busca no Firestore e renderiza.

import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

// Ícones outline (estilo Feather/Lucide) — usam currentColor pra herdar a cor do pai.
const ICON_TEMPO = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

const ICON_PORCOES = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

const ICON_DIFICULDADE = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg>`;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function mostrarErro(msg) {
  $("receita-status").textContent = msg;
  $("receita-status").style.color = "#d32f2f";
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    mostrarErro("Receita não especificada. Use receita.html?id=XXX.");
    return;
  }

  let snap;
  try {
    snap = await getDoc(doc(db, "receitas", id));
  } catch (e) {
    console.error(e);
    mostrarErro("Erro ao carregar a receita. Tente recarregar.");
    return;
  }

  if (!snap.exists()) {
    mostrarErro("Receita não encontrada.");
    return;
  }
  const r = snap.data();
  if (r.ativa === false) {
    mostrarErro("Esta receita está indisponível no momento.");
    return;
  }

  // Title + breadcrumb
  document.title = `${r.titulo} - Receitas - Produtos Tio Luiz`;
  $("bc-nome").textContent = r.titulo || "(sem título)";

  // Hero
  $("receita-imagem").src = r.imagem_url || FALLBACK_IMAGE;
  $("receita-imagem").alt = r.titulo || "";
  $("receita-imagem").onerror = function () { this.src = FALLBACK_IMAGE; };

  $("receita-titulo").textContent = r.titulo || "";
  $("receita-descricao").textContent = r.descricao_curta || "";

  // Meta (tempo, porções, dificuldade) — com ícones SVG outline
  const metaItens = [];
  if (r.tempo)       metaItens.push({ icon: ICON_TEMPO,       label: "Tempo",       valor: r.tempo });
  if (r.porcoes)     metaItens.push({ icon: ICON_PORCOES,     label: "Porções",     valor: r.porcoes });
  if (r.dificuldade) metaItens.push({ icon: ICON_DIFICULDADE, label: "Dificuldade", valor: r.dificuldade });

  $("receita-meta").innerHTML = metaItens.length === 0
    ? ""
    : metaItens.map((m) => `
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="color: var(--color-primary); flex-shrink: 0; display: flex; align-items: center;">${m.icon}</div>
          <div>
            <div style="color: var(--color-gray-600); font-size: 0.8125rem;">${escapeHtml(m.label)}</div>
            <div style="font-weight: 600; font-size: 1.0625rem;">${escapeHtml(m.valor)}</div>
          </div>
        </div>
      `).join("");

  // Ingredientes — uma linha por bullet
  const linhasIng = (r.ingredientes || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (linhasIng.length === 0) {
    $("sec-ingredientes").hidden = true;
  } else {
    $("lista-ingredientes").innerHTML = linhasIng.map((l) => `<li>${escapeHtml(l)}</li>`).join("");
  }

  // Modo de preparo — texto livre com quebras de linha preservadas
  if (!r.modo_preparo || !r.modo_preparo.trim()) {
    $("sec-preparo").hidden = true;
  } else {
    $("conteudo-preparo").textContent = r.modo_preparo;
  }

  // Mostra conteúdo
  $("receita-status").style.display = "none";
  $("receita-conteudo").hidden = false;
}

init();
