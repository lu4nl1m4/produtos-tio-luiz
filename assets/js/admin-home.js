// CRUD dos cards da home (coleção `home_cards` no Firestore).
// Suporta drag-and-drop, upload de imagem via Cloudinary e import inicial das categorias.

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import { uploadImagem, cloudinaryConfigurado } from "./cloudinary-upload.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const state = { cards: [] };
let sortableInstance = null;

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
function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

// ---------- Data ----------

async function carregarCards() {
  const snap = await getDocs(collection(db, "home_cards"));
  state.cards = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

// Importa os cards iniciais a partir das categorias regulares (uma vez só).
async function importarDasCategorias() {
  const snap = await getDocs(collection(db, "categorias"));
  const cats = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => (c.tipo || "regular") !== "pet")
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));

  const batch = writeBatch(db);
  let ordem = 1;
  for (const c of cats) {
    const ref = doc(collection(db, "home_cards"));
    batch.set(ref, {
      titulo: c.nome || c.id,
      texto: c.subtitulo || "",
      imagem_url: c.imagem_secao || "",
      link: `produtos.html#${c.id}`,
      tipo: "normal",
      ativo: true,
      ordem: ordem++,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    });
  }
  // Card "Ver Todos" como CTA no fim
  const ctaRef = doc(collection(db, "home_cards"));
  batch.set(ctaRef, {
    titulo: "Ver Todos os Produtos →",
    texto: "",
    imagem_url: "",
    link: "produtos.html",
    tipo: "cta",
    ativo: true,
    ordem: ordem++,
    criado_em: serverTimestamp(),
    atualizado_em: serverTimestamp()
  });
  await batch.commit();
}

// ---------- Render ----------

function renderTabela() {
  const body = $("tabela-body");
  $("contagem").textContent = `${state.cards.length} card(s)`;

  if (state.cards.length === 0) {
    body.innerHTML = `<tr><td colspan="9" class="state-message">Nenhum card cadastrado.</td></tr>`;
    $("import-banner").classList.remove("d-none");
    $("import-banner").classList.add("d-flex");
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    return;
  }
  $("import-banner").classList.add("d-none");
  $("import-banner").classList.remove("d-flex");

  body.innerHTML = state.cards.map((c, i) => {
    const inativo = c.ativo === false ? " row-inactive" : "";
    const tipoBadge = c.tipo === "cta"
      ? `<span class="badge bg-warning text-dark">CTA</span>`
      : `<span class="badge badge-cat">Normal</span>`;
    return `
      <tr class="${inativo}" data-id="${c.id}">
        <td class="drag-handle text-center" title="Arrastar para reordenar" style="cursor: grab; color: #aaa; user-select: none;">⋮⋮</td>
        <td class="text-center text-muted small">${i + 1}</td>
        <td>${c.imagem_url ? `<img src="${escapeAttr(c.imagem_url)}" class="thumb" onerror="this.style.display='none'" alt="">` : "—"}</td>
        <td class="fw-medium">${escapeHtml(c.titulo || "(sem título)")}</td>
        <td class="small text-muted">${escapeHtml(c.texto || "")}</td>
        <td class="small"><code>${escapeHtml(c.link || "")}</code></td>
        <td class="text-center">${tipoBadge}</td>
        <td class="text-center">
          <span class="toggle-chip toggle-chip--${c.ativo !== false ? "on" : "off"}" data-action="toggle">
            ${c.ativo !== false ? "Sim" : "Não"}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-action="editar">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="remover">Remover</button>
        </td>
      </tr>
    `;
  }).join("");

  initSortable();
}

function initSortable() {
  const SortableLib = window.Sortable;
  if (!SortableLib) {
    console.warn("SortableJS não carregado.");
    return;
  }
  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new SortableLib($("tabela-body"), {
    handle: ".drag-handle",
    animation: 150,
    ghostClass: "table-active",
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      await persistirNovaOrdem();
    }
  });
}

async function persistirNovaOrdem() {
  const ids = Array.from($("tabela-body").querySelectorAll("tr[data-id]")).map((tr) => tr.dataset.id);
  const batch = writeBatch(db);
  let mudou = 0;
  ids.forEach((id, i) => {
    const c = state.cards.find((x) => x.id === id);
    const novaOrdem = i + 1;
    if (c && c.ordem !== novaOrdem) {
      c.ordem = novaOrdem;
      batch.set(doc(db, "home_cards", id), { ordem: novaOrdem, atualizado_em: serverTimestamp() }, { merge: true });
      mudou++;
    }
  });
  if (mudou === 0) return;
  try {
    await batch.commit();
    state.cards.sort((a, b) => a.ordem - b.ordem);
    renderTabela();
    toast(`Ordem atualizada (${mudou} card(s)).`);
  } catch (e) {
    toast(e.message || "Erro ao salvar nova ordem.", "error");
    await carregarCards();
    renderTabela();
  }
}

// ---------- Modal ----------

let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("card-modal"));
  return modalInstance;
}

function atualizarPreviewImagem() {
  const url = $("card-imagem").value.trim();
  const img = $("card-imagem-preview");
  if (url) {
    img.src = url;
    img.style.display = "block";
    img.onerror = () => { img.style.display = "none"; };
  } else {
    img.style.display = "none";
  }
}

async function handleUploadImagem(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const statusEl = $("card-imagem-status");
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
    const url = await uploadImagem(file, {
      onProgress: (pct) => { statusEl.textContent = `Enviando ${pct}%...`; }
    });
    $("card-imagem").value = url;
    atualizarPreviewImagem();
    statusEl.textContent = "✓ Imagem enviada.";
    statusEl.className = "small text-success";
  } catch (err) {
    statusEl.textContent = err.message || "Erro no upload.";
    statusEl.className = "small text-danger";
  } finally {
    fileInput.disabled = false;
    fileInput.value = "";
  }
}

function abrirModalNovo() {
  $("modal-titulo").textContent = "Novo card";
  $("card-id").value = "";
  $("card-titulo").value = "";
  $("card-texto").value = "";
  $("card-link").value = "";
  $("card-tipo").value = "normal";
  $("card-imagem").value = "";
  $("card-imagem-status").textContent = "";
  $("card-ativo").checked = true;
  atualizarPreviewImagem();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

function abrirModalEditar(c) {
  $("modal-titulo").textContent = `Editar: ${c.titulo}`;
  $("card-id").value = c.id;
  $("card-titulo").value = c.titulo || "";
  $("card-texto").value = c.texto || "";
  $("card-link").value = c.link || "";
  $("card-tipo").value = c.tipo || "normal";
  $("card-imagem").value = c.imagem_url || "";
  $("card-imagem-status").textContent = "";
  $("card-ativo").checked = c.ativo !== false;
  atualizarPreviewImagem();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

async function salvarCard(e) {
  e.preventDefault();
  const id = $("card-id").value;
  const titulo = $("card-titulo").value.trim();
  const link = $("card-link").value.trim();
  const errEl = $("form-erro");

  if (!titulo || !link) {
    errEl.textContent = "Título e link são obrigatórios.";
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    titulo,
    texto: $("card-texto").value.trim(),
    link,
    tipo: $("card-tipo").value,
    imagem_url: $("card-imagem").value.trim(),
    ativo: $("card-ativo").checked,
    atualizado_em: serverTimestamp()
  };

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    if (id) {
      await updateDoc(doc(db, "home_cards", id), payload);
      toast(`"${titulo}" atualizado.`);
    } else {
      const maxOrdem = state.cards.length > 0 ? Math.max(...state.cards.map((c) => c.ordem ?? 0)) : 0;
      payload.ordem = maxOrdem + 1;
      payload.criado_em = serverTimestamp();
      await addDoc(collection(db, "home_cards"), payload);
      toast(`"${titulo}" adicionado.`);
    }
    getModal().hide();
    await carregarCards();
    renderTabela();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

// ---------- Ações da tabela ----------

async function toggleAtivo(id) {
  const c = state.cards.find((x) => x.id === id);
  if (!c) return;
  const novo = !(c.ativo !== false);
  try {
    await updateDoc(doc(db, "home_cards", id), {
      ativo: novo,
      atualizado_em: serverTimestamp()
    });
    c.ativo = novo;
    renderTabela();
  } catch (err) {
    toast(err.message || "Erro ao atualizar.", "error");
  }
}

async function removerCard(id) {
  const c = state.cards.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Remover card "${c.titulo}"? Não tem como desfazer.`)) return;
  try {
    await deleteDoc(doc(db, "home_cards", id));
    state.cards = state.cards.filter((x) => x.id !== id);
    renderTabela();
    toast(`"${c.titulo}" removido.`);
  } catch (err) {
    toast(err.message || "Erro ao remover.", "error");
  }
}

function handleTabelaClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr[data-id]");
  if (!tr) return;
  const id = tr.dataset.id;
  if (btn.dataset.action === "editar") {
    const c = state.cards.find((x) => x.id === id);
    if (c) abrirModalEditar(c);
  } else if (btn.dataset.action === "remover") {
    removerCard(id);
  } else if (btn.dataset.action === "toggle") {
    toggleAtivo(id);
  }
}

// ---------- Boot ----------

async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;

  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregarCards();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="9" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("card-form").addEventListener("submit", salvarCard);
  $("tabela-body").addEventListener("click", handleTabelaClick);
  $("card-imagem-file").addEventListener("change", handleUploadImagem);
  $("card-imagem").addEventListener("input", atualizarPreviewImagem);

  $("import-btn").addEventListener("click", async () => {
    $("import-btn").disabled = true;
    $("import-btn").textContent = "Importando...";
    try {
      await importarDasCategorias();
      await carregarCards();
      renderTabela();
      toast("Cards importados das categorias regulares.");
    } catch (err) {
      toast(err.message || "Erro ao importar.", "error");
    } finally {
      $("import-btn").disabled = false;
      $("import-btn").textContent = "Importar das categorias";
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
