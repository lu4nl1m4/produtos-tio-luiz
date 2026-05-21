// Painel das mensagens submetidas pelos formulários públicos.

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const state = {
  mensagens: [],
  filtroTipo: "",
  filtroStatus: "",
  filtroBusca: ""
};

// ---------- Toasts ----------
function toast(msg, type = "success") {
  const wrap = $("toast-area");
  const cls = type === "error" ? "alert-danger" : type === "warn" ? "alert-warning" : "alert-success";
  const el = document.createElement("div");
  el.className = `alert ${cls} shadow-sm py-2 px-3 mb-0`;
  el.style.minWidth = "240px";
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatarData(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ---------- Data ----------
async function carregarMensagens() {
  try {
    const q = query(collection(db, "mensagens"), orderBy("criado_em", "desc"));
    const snap = await getDocs(q);
    state.mensagens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Se não tiver índice ainda, faz sort no client
    const snap = await getDocs(collection(db, "mensagens"));
    state.mensagens = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.criado_em?.toMillis?.() ?? 0;
        const tb = b.criado_em?.toMillis?.() ?? 0;
        return tb - ta;
      });
  }
}

function mensagensFiltradas() {
  let lista = state.mensagens.slice();
  if (state.filtroTipo) lista = lista.filter((m) => m.tipo === state.filtroTipo);
  if (state.filtroStatus === "nao-lidas") lista = lista.filter((m) => m.lida !== true);
  if (state.filtroStatus === "lidas") lista = lista.filter((m) => m.lida === true);
  if (state.filtroBusca) {
    const q = state.filtroBusca.toLowerCase();
    lista = lista.filter((m) =>
      (m.nome || m.responsavel || m.estabelecimento || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  }
  return lista;
}

// ---------- Render ----------
function tipoBadge(tipo) {
  if (tipo === "revendedor") return `<span class="badge bg-warning text-dark">Revendedor</span>`;
  return `<span class="badge bg-info text-dark">Contato</span>`;
}

function renderLista() {
  const container = $("lista-container");
  const lista = mensagensFiltradas();
  const naoLidas = state.mensagens.filter((m) => m.lida !== true).length;

  $("contagem").textContent = `${lista.length} de ${state.mensagens.length} | ${naoLidas} não lida(s)`;

  // Badge no nav
  const badge = $("unread-badge");
  if (naoLidas > 0) {
    badge.textContent = naoLidas;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }

  if (state.mensagens.length === 0) {
    container.innerHTML = `<div class="state-message">Nenhuma mensagem recebida ainda. Os submits dos formulários do site aparecem aqui.</div>`;
    return;
  }
  if (lista.length === 0) {
    container.innerHTML = `<div class="state-message">Nenhuma mensagem corresponde aos filtros.</div>`;
    return;
  }

  container.innerHTML = lista.map((m) => {
    const naoLida = m.lida !== true;
    const nome = m.nome || m.responsavel || m.estabelecimento || "(sem nome)";
    const resumo = m.tipo === "revendedor"
      ? (m.cidade ? `${m.tipo_estabelecimento || "—"} · ${m.cidade}` : (m.tipo_estabelecimento || "—"))
      : (m.assunto || "Sem assunto") + (m.mensagem ? ` — ${m.mensagem.substring(0, 100)}${m.mensagem.length > 100 ? "..." : ""}` : "");
    return `
      <div class="card mb-2 msg-card${naoLida ? " msg-card--unread" : ""}" data-id="${m.id}" style="cursor: pointer; ${naoLida ? "border-left: 4px solid var(--admin-primary);" : ""}">
        <div class="card-body py-3">
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div style="flex: 1; min-width: 0;">
              <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                ${tipoBadge(m.tipo)}
                <strong${naoLida ? "" : ' style="font-weight: 500; color: #666;"'}>${escapeHtml(nome)}</strong>
                ${m.email ? `<span class="small text-muted">${escapeHtml(m.email)}</span>` : ""}
                ${naoLida ? `<span class="small text-danger" style="font-weight:600;">● Nova</span>` : ""}
              </div>
              <div class="small ${naoLida ? "text-body" : "text-muted"}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(resumo)}
              </div>
            </div>
            <div class="text-end small text-muted" style="flex-shrink: 0;">
              ${formatarData(m.criado_em)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- Modal de detalhes ----------
let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("msg-modal"));
  return modalInstance;
}

function row(label, valor) {
  if (!valor) return "";
  return `
    <div class="row mb-2">
      <div class="col-md-3 text-muted small">${escapeHtml(label)}</div>
      <div class="col-md-9">${escapeHtml(valor)}</div>
    </div>
  `;
}

async function abrirDetalhes(id) {
  const m = state.mensagens.find((x) => x.id === id);
  if (!m) return;

  // Marca como lida automaticamente
  if (m.lida !== true) {
    try {
      await updateDoc(doc(db, "mensagens", id), { lida: true, atualizado_em: serverTimestamp() });
      m.lida = true;
      renderLista();
    } catch (e) { console.warn("Falha ao marcar como lida:", e); }
  }

  $("modal-titulo").textContent = m.tipo === "revendedor" ? "Cadastro de revendedor" : "Mensagem de contato";

  let body = `
    <div class="mb-3 text-muted small">${tipoBadge(m.tipo)} · ${escapeHtml(formatarData(m.criado_em))}</div>
  `;

  if (m.tipo === "revendedor") {
    body += row("Estabelecimento", m.estabelecimento);
    body += row("Tipo", m.tipo_estabelecimento);
    body += row("Responsável", m.responsavel);
    body += row("Email", m.email);
    body += row("Telefone", m.telefone);
    body += row("Cidade", m.cidade);
  } else {
    body += row("Nome", m.nome);
    body += row("Email", m.email);
    body += row("Telefone", m.telefone);
    body += row("Assunto", m.assunto);
    if (m.mensagem) {
      body += `
        <div class="row mb-2">
          <div class="col-md-3 text-muted small">Mensagem</div>
          <div class="col-md-9" style="white-space: pre-wrap;">${escapeHtml(m.mensagem)}</div>
        </div>
      `;
    }
  }

  // Ações rápidas (mailto / WhatsApp)
  if (m.email || m.telefone) {
    body += `<hr><div class="d-flex gap-2 flex-wrap">`;
    if (m.email) body += `<a href="mailto:${escapeHtml(m.email)}" class="btn btn-sm btn-outline-primary">Responder por email</a>`;
    if (m.telefone) {
      const tel = m.telefone.replace(/\D/g, "");
      body += `<a href="https://wa.me/55${tel}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-success">Abrir WhatsApp</a>`;
    }
    body += `</div>`;
  }

  $("modal-body").innerHTML = body;
  $("modal-deletar").dataset.id = id;
  getModal().show();
}

async function deletarMensagem(id) {
  if (!confirm("Excluir esta mensagem permanentemente? Não tem como desfazer.")) return;
  try {
    await deleteDoc(doc(db, "mensagens", id));
    state.mensagens = state.mensagens.filter((x) => x.id !== id);
    getModal().hide();
    renderLista();
    toast("Mensagem excluída.");
  } catch (err) {
    toast(err.message || "Erro ao excluir.", "error");
  }
}

// ---------- Boot ----------
async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;
  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregarMensagens();
    renderLista();
  } catch (err) {
    $("lista-container").innerHTML = `<div class="state-message text-danger">${escapeHtml(err.message)}</div>`;
    return;
  }

  $("filtro-tipo").addEventListener("change", (e) => {
    state.filtroTipo = e.target.value;
    renderLista();
  });
  $("filtro-status").addEventListener("change", (e) => {
    state.filtroStatus = e.target.value;
    renderLista();
  });
  $("filtro-busca").addEventListener("input", (e) => {
    state.filtroBusca = e.target.value.trim();
    renderLista();
  });

  // Delegação no container — click no card abre modal
  $("lista-container").addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (card) abrirDetalhes(card.dataset.id);
  });

  $("modal-deletar").addEventListener("click", () => {
    const id = $("modal-deletar").dataset.id;
    if (id) deletarMensagem(id);
  });

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
