// CRUD do painel admin. Depende de admin/painel.html + Bootstrap 5 (bundle).

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const FALLBACK_IMAGE = "../assets/images/todos_os_produtos.webp";

const $ = (id) => document.getElementById(id);
const state = {
  produtos: [],          // { id, ...campos }
  categorias: [],        // [{ id, nome, tipo, ordem }]
  filtroCategoria: "",
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

// ---------- Data ----------

async function carregarCategorias() {
  const res = await fetch("../data/categorias.json");
  if (!res.ok) throw new Error("Falha ao carregar categorias.json");
  state.categorias = await res.json();
}

async function carregarProdutos() {
  const snap = await getDocs(collection(db, "produtos"));
  state.produtos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Render ----------

function renderCategoriaFiltro() {
  const sel = $("filtro-categoria");
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' +
    state.categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  sel.value = atual;
}

function renderCategoriaForm() {
  const sel = $("produto-categoria");
  sel.innerHTML = '<option value="">— escolha —</option>' +
    state.categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
}

function categoriaInfo(id) {
  return state.categorias.find((c) => c.id === id) || { nome: id, tipo: "regular" };
}

function aplicarFiltros() {
  let lista = state.produtos.slice();
  if (state.filtroCategoria) {
    lista = lista.filter((p) => p.categoria === state.filtroCategoria);
  }
  if (state.filtroBusca) {
    const q = state.filtroBusca.toLowerCase();
    lista = lista.filter((p) => (p.nome || "").toLowerCase().includes(q));
  }
  lista.sort((a, b) => {
    const ca = categoriaInfo(a.categoria).ordem ?? 99;
    const cb = categoriaInfo(b.categoria).ordem ?? 99;
    if (ca !== cb) return ca - cb;
    return (a.ordem || 0) - (b.ordem || 0);
  });
  return lista;
}

function renderTabela() {
  const lista = aplicarFiltros();
  const body = $("tabela-body");
  $("contagem").textContent = `${lista.length} de ${state.produtos.length} produto(s)`;

  if (lista.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="state-message">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  body.innerHTML = lista.map((p) => {
    const cat = categoriaInfo(p.categoria);
    const isPet = cat.tipo === "pet";
    const inativo = p.ativo === false ? " row-inactive" : "";
    return `
      <tr class="${inativo}" data-id="${p.id}">
        <td>
          <img src="${p.imagem_url || FALLBACK_IMAGE}" class="thumb" onerror="this.src='${FALLBACK_IMAGE}'" alt="">
        </td>
        <td>
          <div class="fw-medium">${escapeHtml(p.nome || "(sem nome)")}</div>
          ${p.nome_curto ? `<div class="small text-muted">${escapeHtml(p.nome_curto)}</div>` : ""}
        </td>
        <td><span class="badge badge-cat${isPet ? " badge-cat--pet" : ""}">${escapeHtml(cat.nome)}</span></td>
        <td class="text-muted small">${escapeHtml(p.embalagem || "—")}</td>
        <td class="text-center">${p.ordem ?? "—"}</td>
        <td class="text-center">
          <span class="toggle-chip toggle-chip--${p.ativo !== false ? "on" : "off"}" data-action="toggle" data-field="ativo">
            ${p.ativo !== false ? "Sim" : "Não"}
          </span>
        </td>
        <td class="text-center">
          <span class="toggle-chip toggle-chip--${p.destaque ? "on" : "off"}" data-action="toggle" data-field="destaque">
            ${p.destaque ? "Sim" : "Não"}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary" data-action="editar">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="remover">Remover</button>
        </td>
      </tr>
    `;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Modal ----------

let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("produto-modal"));
  return modalInstance;
}

function abrirModalNovo() {
  $("modal-titulo").textContent = "Novo produto";
  $("produto-id").value = "";
  $("produto-nome").value = "";
  $("produto-nome-curto").value = "";
  $("produto-categoria").value = "";
  $("produto-descricao").value = "";
  $("produto-embalagem").value = "";
  $("produto-imagem").value = "";
  $("produto-ordem").value = "1";
  $("produto-ativo").checked = true;
  $("produto-destaque").checked = false;
  $("form-erro").classList.add("d-none");
  getModal().show();
}

function abrirModalEditar(p) {
  $("modal-titulo").textContent = `Editar: ${p.nome}`;
  $("produto-id").value = p.id;
  $("produto-nome").value = p.nome || "";
  $("produto-nome-curto").value = p.nome_curto || "";
  $("produto-categoria").value = p.categoria || "";
  $("produto-descricao").value = p.descricao || "";
  $("produto-embalagem").value = p.embalagem || "";
  $("produto-imagem").value = p.imagem_url || "";
  $("produto-ordem").value = p.ordem ?? 1;
  $("produto-ativo").checked = p.ativo !== false;
  $("produto-destaque").checked = !!p.destaque;
  $("form-erro").classList.add("d-none");
  getModal().show();
}

async function salvarProduto(e) {
  e.preventDefault();
  const id = $("produto-id").value;
  const nome = $("produto-nome").value.trim();
  const categoria = $("produto-categoria").value;
  const errEl = $("form-erro");

  if (!nome || !categoria) {
    errEl.textContent = "Nome e categoria são obrigatórios.";
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    nome,
    nome_curto: $("produto-nome-curto").value.trim(),
    categoria,
    descricao: $("produto-descricao").value.trim(),
    embalagem: $("produto-embalagem").value.trim(),
    imagem_url: $("produto-imagem").value.trim(),
    ordem: Number($("produto-ordem").value) || 0,
    ativo: $("produto-ativo").checked,
    destaque: $("produto-destaque").checked,
    atualizado_em: serverTimestamp()
  };

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    if (id) {
      await updateDoc(doc(db, "produtos", id), payload);
      toast(`"${nome}" atualizado.`);
    } else {
      payload.criado_em = serverTimestamp();
      await addDoc(collection(db, "produtos"), payload);
      toast(`"${nome}" adicionado.`);
    }
    getModal().hide();
    await carregarProdutos();
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

async function toggleCampo(id, field) {
  const p = state.produtos.find((x) => x.id === id);
  if (!p) return;
  const novoValor = !(field === "ativo" ? p.ativo !== false : !!p[field]);
  try {
    await updateDoc(doc(db, "produtos", id), {
      [field]: novoValor,
      atualizado_em: serverTimestamp()
    });
    p[field] = novoValor;
    renderTabela();
  } catch (err) {
    toast(err.message || "Erro ao atualizar.", "error");
  }
}

async function removerProduto(id) {
  const p = state.produtos.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Remover "${p.nome}"? Não tem como desfazer.`)) return;
  try {
    await deleteDoc(doc(db, "produtos", id));
    state.produtos = state.produtos.filter((x) => x.id !== id);
    renderTabela();
    toast(`"${p.nome}" removido.`);
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
  const action = btn.dataset.action;
  if (action === "editar") {
    const p = state.produtos.find((x) => x.id === id);
    if (p) abrirModalEditar(p);
  } else if (action === "remover") {
    removerProduto(id);
  } else if (action === "toggle") {
    toggleCampo(id, btn.dataset.field);
  }
}

// ---------- Boot ----------

async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;

  // Se logout em outra aba, manda voltar pra tela de login.
  watchAuth((u) => {
    if (!u) window.location.replace("index.html");
  });

  try {
    await carregarCategorias();
    await carregarProdutos();
    renderCategoriaFiltro();
    renderCategoriaForm();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="8" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("filtro-categoria").addEventListener("change", (e) => {
    state.filtroCategoria = e.target.value;
    renderTabela();
  });

  $("filtro-busca").addEventListener("input", (e) => {
    state.filtroBusca = e.target.value.trim();
    renderTabela();
  });

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("produto-form").addEventListener("submit", salvarProduto);
  $("tabela-body").addEventListener("click", handleTabelaClick);

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
