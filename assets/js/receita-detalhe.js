// Pagina de detalhe de receita.
// Usa cache/snapshot para abrir rapido e revalida a receita no Firestore REST.

import {
  carregarDocumentoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  removerCachePublico,
  salvarCachePublico
} from "./public-data.js";

const STATIC_RECEITAS = "data/receitas-publico.json";
const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

const ICON_TEMPO = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>`;
const ICON_PORCOES = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/></svg>`;
const ICON_DIFICULDADE = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/><path d="M9 9a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/><path d="M15 5a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"/></svg>`;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function mostrarErro(msg) {
  $("receita-status").textContent = msg;
  $("receita-status").style.color = "#d32f2f";
}

function renderizarReceita(r) {
  if (!r || r.ativa === false) {
    $("receita-conteudo").hidden = true;
    $("receita-status").style.display = "";
    mostrarErro("Esta receita esta indisponivel no momento.");
    return true;
  }

  document.title = `${r.titulo} - Receitas - Produtos Tio Luiz`;
  $("bc-nome").textContent = r.titulo || "(sem titulo)";

  $("receita-imagem").src = r.imagem_url || FALLBACK_IMAGE;
  $("receita-imagem").alt = r.titulo || "";
  $("receita-imagem").onerror = function () { this.src = FALLBACK_IMAGE; };

  $("receita-titulo").textContent = r.titulo || "";
  $("receita-descricao").textContent = r.descricao_curta || "";

  const metaItens = [];
  if (r.tempo) metaItens.push({ icon: ICON_TEMPO, label: "Tempo", valor: r.tempo });
  if (r.porcoes) metaItens.push({ icon: ICON_PORCOES, label: "Porcoes", valor: r.porcoes });
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

  const linhasIng = (r.ingredientes || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (linhasIng.length === 0) {
    $("sec-ingredientes").hidden = true;
    $("lista-ingredientes").innerHTML = "";
  } else {
    $("sec-ingredientes").hidden = false;
    $("lista-ingredientes").innerHTML = linhasIng.map((l) => `<li>${escapeHtml(l)}</li>`).join("");
  }

  if (!r.modo_preparo || !r.modo_preparo.trim()) {
    $("sec-preparo").hidden = true;
    $("conteudo-preparo").textContent = "";
  } else {
    $("sec-preparo").hidden = false;
    $("conteudo-preparo").textContent = r.modo_preparo;
  }

  $("receita-status").style.display = "none";
  $("receita-conteudo").hidden = false;
  return true;
}

async function carregarReceitaEstatica(id) {
  const receitas = await carregarJsonPublico(STATIC_RECEITAS);
  return (receitas || []).find((r) => r.id === id) || null;
}

async function init() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    mostrarErro("Receita nao especificada. Use receita.html?id=XXX.");
    return;
  }

  let renderizou = false;
  const receitaCache = lerCachePublico(`receita:${id}`);
  const listaCache = lerCachePublico("receitas");

  if (receitaCache) {
    renderizou = renderizarReceita(receitaCache);
  } else if (Array.isArray(listaCache)) {
    const receita = listaCache.find((r) => r.id === id);
    if (receita) renderizou = renderizarReceita(receita);
  }

  if (!renderizou) {
    try {
      const receita = await carregarReceitaEstatica(id);
      if (receita) renderizou = renderizarReceita(receita);
    } catch (e) {
      console.warn("Falha ao carregar snapshot de receita:", e);
    }
  }

  try {
    const receita = await carregarDocumentoFirestore(`receitas/${id}`);
    if (!receita) {
      removerCachePublico(`receita:${id}`);
      $("receita-conteudo").hidden = true;
      $("receita-status").style.display = "";
      mostrarErro("Receita nao encontrada.");
      return;
    }
    salvarCachePublico(`receita:${id}`, receita);
    renderizou = renderizarReceita(receita) || renderizou;
  } catch (e) {
    if (!renderizou) {
      console.error(e);
      mostrarErro("Erro ao carregar a receita. Tente recarregar.");
    } else {
      console.warn("Falha ao atualizar receita em segundo plano:", e);
    }
  }
}

init();
