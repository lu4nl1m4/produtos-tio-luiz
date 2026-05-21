// CRUD da coleção `downloads` — links que aparecem na coluna "Downloads" do rodapé.
// Cada doc: { titulo, url, ordem, ativo, criado_em }.

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import { uploadArquivo, cloudinaryConfigurado } from "./cloudinary-upload.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const state = { itens: [] };

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
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }

// Invalida o cache público — assim, ao reabrir o site, os novos downloads aparecem.
function invalidarCachePublico() {
  try { sessionStorage.removeItem("downloads_publicos_v1"); } catch {}
}

// ---------- Data ----------
async function carregar() {
  const snap = await getDocs(collection(db, "downloads"));
  state.itens = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999));
}

// ---------- Render ----------
function renderTabela() {
  const body = $("tabela-body");
  $("contagem").textContent = `${state.itens.length} item(ns) · ${state.itens.filter((i) => i.ativo !== false).length} ativo(s)`;

  if (!state.itens.length) {
    body.innerHTML = `<tr><td colspan="5" class="state-message">Nenhum download cadastrado. Clique em "+ Novo download" para começar.</td></tr>`;
    return;
  }

  body.innerHTML = state.itens.map((it) => {
    const ativo = it.ativo !== false;
    return `
      <tr data-id="${escapeAttr(it.id)}" style="opacity: ${ativo ? "1" : "0.55"};">
        <td class="fw-medium">${it.ordem ?? 0}</td>
        <td>${escapeHtml(it.titulo || "(sem título)")}</td>
        <td class="small text-truncate" style="max-width: 360px;">
          <a href="${escapeAttr(it.url)}" target="_blank" rel="noopener" class="text-decoration-none">${escapeHtml(it.url || "—")}</a>
        </td>
        <td>
          <span class="badge ${ativo ? "bg-success" : "bg-secondary"}">${ativo ? "Sim" : "Não"}</span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-action="toggle">${ativo ? "Desativar" : "Ativar"}</button>
          <button class="btn btn-sm btn-primary" data-action="editar">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="excluir">×</button>
        </td>
      </tr>
    `;
  }).join("");
}

// ---------- Modal ----------
let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("download-modal"));
  return modalInstance;
}

function limparModal() {
  $("download-id").value = "";
  $("download-titulo").value = "";
  $("download-url").value = "";
  $("download-ordem").value = state.itens.length;
  $("download-ativo").checked = true;
  $("download-arquivo-status").textContent = "";
  $("download-arquivo-file").value = "";
  $("form-erro").classList.add("d-none");
}

function abrirModalNovo() {
  limparModal();
  $("modal-titulo").textContent = "Novo download";
  getModal().show();
}

function abrirModalEditar(id) {
  const it = state.itens.find((x) => x.id === id);
  if (!it) return;
  limparModal();
  $("modal-titulo").textContent = "Editar download";
  $("download-id").value = it.id;
  $("download-titulo").value = it.titulo || "";
  $("download-url").value = it.url || "";
  $("download-ordem").value = it.ordem ?? 0;
  $("download-ativo").checked = it.ativo !== false;
  getModal().show();
}

async function handleUploadArquivo(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const statusEl = $("download-arquivo-status");
  const fileInput = e.target;
  if (!cloudinaryConfigurado()) {
    statusEl.textContent = "Cloudinary não configurado.";
    statusEl.className = "small text-danger";
    fileInput.value = "";
    return;
  }
  statusEl.textContent = "Enviando 0%...";
  statusEl.className = "small text-muted";
  fileInput.disabled = true;
  try {
    const url = await uploadArquivo(file, { onProgress: (pct) => { statusEl.textContent = `Enviando ${pct}%...`; } });
    $("download-url").value = url;
    statusEl.textContent = "✓ Arquivo enviado.";
    statusEl.className = "small text-success";
  } catch (err) {
    statusEl.textContent = err.message || "Erro no upload.";
    statusEl.className = "small text-danger";
  } finally {
    fileInput.disabled = false;
    fileInput.value = "";
  }
}

async function salvar(e) {
  e.preventDefault();
  const id = $("download-id").value;
  const titulo = $("download-titulo").value.trim();
  const url = $("download-url").value.trim();
  const ordem = parseInt($("download-ordem").value, 10) || 0;
  const ativo = $("download-ativo").checked;
  const errEl = $("form-erro");

  if (!titulo) {
    errEl.textContent = "Título é obrigatório.";
    errEl.classList.remove("d-none");
    return;
  }
  if (!url) {
    errEl.textContent = "URL é obrigatória (faça upload ou cole uma URL externa).";
    errEl.classList.remove("d-none");
    return;
  }
  try { new URL(url); } catch {
    errEl.textContent = "URL inválida.";
    errEl.classList.remove("d-none");
    return;
  }

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    if (id) {
      await updateDoc(doc(db, "downloads", id), {
        titulo, url, ordem, ativo,
        atualizado_em: serverTimestamp()
      });
      toast("Download atualizado.");
    } else {
      await addDoc(collection(db, "downloads"), {
        titulo, url, ordem, ativo,
        criado_em: serverTimestamp()
      });
      toast("Download criado.");
    }
    invalidarCachePublico();
    await carregar();
    renderTabela();
    getModal().hide();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

async function toggleAtivo(id) {
  const it = state.itens.find((x) => x.id === id);
  if (!it) return;
  const novoAtivo = !(it.ativo !== false);
  try {
    await updateDoc(doc(db, "downloads", id), {
      ativo: novoAtivo,
      atualizado_em: serverTimestamp()
    });
    it.ativo = novoAtivo;
    invalidarCachePublico();
    renderTabela();
    toast(`Download ${novoAtivo ? "ativado" : "desativado"}.`);
  } catch (err) {
    toast(err.message || "Erro ao atualizar.", "error");
  }
}

async function excluir(id) {
  const it = state.itens.find((x) => x.id === id);
  if (!it) return;
  if (!confirm(`Excluir "${it.titulo}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await deleteDoc(doc(db, "downloads", id));
    state.itens = state.itens.filter((x) => x.id !== id);
    invalidarCachePublico();
    renderTabela();
    toast("Download excluído.");
  } catch (err) {
    toast(err.message || "Erro ao excluir.", "error");
  }
}

function handleTabelaClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr[data-id]");
  if (!tr) return;
  const id = tr.dataset.id;
  if (btn.dataset.action === "editar") abrirModalEditar(id);
  else if (btn.dataset.action === "toggle") toggleAtivo(id);
  else if (btn.dataset.action === "excluir") excluir(id);
}

// ---------- Boot ----------
async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;
  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregar();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="5" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("download-form").addEventListener("submit", salvar);
  $("tabela-body").addEventListener("click", handleTabelaClick);
  $("download-arquivo-file").addEventListener("change", handleUploadArquivo);

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
