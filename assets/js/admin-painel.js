// CRUD do painel admin (produtos).
// Layout: produtos agrupados por categoria em mini-tabelas. Cada mini-tabela
// suporta drag-and-drop para reordenar produtos dentro da sua categoria.
// Depende de admin/painel.html + Bootstrap 5 + SortableJS (CDN).

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
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

const FALLBACK_IMAGE = "../assets/images/todos_os_produtos.webp";

const $ = (id) => document.getElementById(id);
const state = {
  produtos: [],
  categorias: [],
  filtroCategoria: "",
  filtroBusca: ""
};
const sortables = {};  // categoria.id -> Sortable instance

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

function ordenarCategorias(lista) {
  return lista.sort((a, b) => {
    const ta = a.tipo === "pet" ? 1 : 0;
    const tb = b.tipo === "pet" ? 1 : 0;
    if (ta !== tb) return ta - tb;
    return (a.ordem ?? 99) - (b.ordem ?? 99);
  });
}

async function carregarCategorias() {
  try {
    const snap = await getDocs(collection(db, "categorias"));
    if (snap.size > 0) {
      state.categorias = ordenarCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      return;
    }
  } catch (e) {
    console.warn("Falha ao ler categorias do Firestore, usando JSON:", e);
  }
  const res = await fetch("../data/categorias.json");
  if (!res.ok) throw new Error("Falha ao carregar categorias.");
  state.categorias = ordenarCategorias(await res.json());
}

async function carregarProdutos() {
  const snap = await getDocs(collection(db, "produtos"));
  state.produtos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function produtosDaCategoria(catId) {
  let lista = state.produtos
    .filter((p) => p.categoria === catId)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  if (state.filtroBusca) {
    const q = state.filtroBusca.toLowerCase();
    lista = lista.filter((p) => (p.nome || "").toLowerCase().includes(q));
  }
  return lista;
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

function renderProdutoRow(p, index) {
  const inativo = p.ativo === false ? " row-inactive" : "";
  return `
    <tr class="${inativo}" data-id="${p.id}">
      <td class="drag-handle text-center" title="Arrastar para reordenar" style="cursor: grab; color: #aaa; user-select: none;">⋮⋮</td>
      <td class="text-center text-muted small">${index + 1}</td>
      <td>
        <img src="${escapeAttr(p.imagem_url || FALLBACK_IMAGE)}" class="thumb" onerror="this.src='${FALLBACK_IMAGE}'" alt="">
      </td>
      <td>
        <div class="fw-medium">${escapeHtml(p.nome || "(sem nome)")}</div>
        ${p.nome_curto ? `<div class="small text-muted">${escapeHtml(p.nome_curto)}</div>` : ""}
      </td>
      <td class="text-muted small">${escapeHtml(p.embalagem || "—")}</td>
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
}

function renderMiniTabela(cat) {
  const produtos = produtosDaCategoria(cat.id);
  const isPet = cat.tipo === "pet";
  const badgeClass = isPet ? "badge-cat--pet" : "";

  const rowsHtml = produtos.length === 0
    ? `<tr><td colspan="8" class="state-message">Nenhum produto nesta categoria${state.filtroBusca ? " (busca aplicada)" : ""}.</td></tr>`
    : produtos.map((p, i) => renderProdutoRow(p, i)).join("");

  return `
    <div class="mini-tabela mb-4" data-categoria-id="${cat.id}">
      <h5 class="d-flex align-items-center gap-2 mb-2">
        <span>${escapeHtml(cat.nome)}</span>
        <span class="badge badge-cat ${badgeClass}">${produtos.length} produto(s)</span>
      </h5>
      <div class="card-table">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:36px;"></th>
                <th class="text-center" style="width:50px;">#</th>
                <th style="width:64px;"></th>
                <th>Nome</th>
                <th style="width:120px;">Embalagem</th>
                <th class="text-center" style="width:100px;">Ativo</th>
                <th class="text-center" style="width:100px;">Destaque</th>
                <th class="text-end" style="width:160px;">Ações</th>
              </tr>
            </thead>
            <tbody data-categoria-id="${cat.id}">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderGrupos() {
  const container = $("grupos-container");

  // Determina quais categorias mostrar (respeitando filtro de categoria, se houver)
  let categoriasParaMostrar = state.categorias;
  if (state.filtroCategoria) {
    categoriasParaMostrar = categoriasParaMostrar.filter((c) => c.id === state.filtroCategoria);
  }

  const regulares = categoriasParaMostrar.filter((c) => c.tipo !== "pet");
  const pets = categoriasParaMostrar.filter((c) => c.tipo === "pet");

  let html = "";

  if (regulares.length > 0) {
    html += `<h4 class="mb-3">Categorias Regulares <small class="text-muted fw-normal">— produtos.html</small></h4>`;
    html += regulares.map(renderMiniTabela).join("");
  }

  if (pets.length > 0) {
    html += `<h4 class="mb-3 mt-4">Categorias Pet <small class="text-muted fw-normal">— pet-food.html</small></h4>`;
    html += pets.map(renderMiniTabela).join("");
  }

  if (!html) {
    html = `<div class="state-message">Nenhuma categoria cadastrada. <a href="categorias.html">Vá para Categorias</a> para importar as padrões.</div>`;
  }

  container.innerHTML = html;

  // Atualiza contagem
  const totalVisivel = categoriasParaMostrar
    .map((c) => produtosDaCategoria(c.id).length)
    .reduce((a, b) => a + b, 0);
  $("contagem").textContent = `${totalVisivel} de ${state.produtos.length} produto(s)`;

  initSortableProdutos();
}

function initSortableProdutos() {
  const SortableLib = window.Sortable;
  if (!SortableLib) {
    console.warn("SortableJS não carregado — drag-and-drop indisponível.");
    return;
  }

  Object.values(sortables).forEach((s) => s.destroy());
  Object.keys(sortables).forEach((k) => delete sortables[k]);

  document.querySelectorAll("tbody[data-categoria-id]").forEach((tbody) => {
    const catId = tbody.dataset.categoriaId;
    sortables[catId] = new SortableLib(tbody, {
      handle: ".drag-handle",
      animation: 150,
      ghostClass: "table-active",
      onEnd: async (evt) => {
        if (evt.oldIndex === evt.newIndex) return;
        await persistirOrdemProdutos(catId);
      }
    });
  });
}

async function persistirOrdemProdutos(catId) {
  const tbody = document.querySelector(`tbody[data-categoria-id="${catId}"]`);
  if (!tbody) return;
  const ids = Array.from(tbody.querySelectorAll("tr[data-id]")).map((tr) => tr.dataset.id);
  const batch = writeBatch(db);
  let mudou = 0;
  ids.forEach((id, i) => {
    const p = state.produtos.find((x) => x.id === id);
    const novaOrdem = i + 1;
    if (p && p.ordem !== novaOrdem) {
      p.ordem = novaOrdem;
      batch.set(doc(db, "produtos", id), { ordem: novaOrdem, atualizado_em: serverTimestamp() }, { merge: true });
      mudou++;
    }
  });
  if (mudou === 0) return;
  try {
    await batch.commit();
    renderGrupos();
    toast(`Ordem atualizada (${mudou} produto(s)).`);
  } catch (e) {
    toast(e.message || "Erro ao salvar nova ordem.", "error");
    await carregarProdutos();
    renderGrupos();
  }
}

// ---------- Modal ----------

let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("produto-modal"));
  return modalInstance;
}

function resetTabs() {
  document.querySelectorAll("#produto-modal .nav-link").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  document.querySelectorAll("#produto-modal .tab-pane").forEach((p, i) => {
    p.classList.toggle("show", i === 0);
    p.classList.toggle("active", i === 0);
  });
}

const NUTRIENTES_ANVISA = [
  "Valor energético (kcal)",
  "Carboidratos totais (g)",
  "Açúcares totais (g)",
  "Açúcares adicionados (g)",
  "Proteínas (g)",
  "Gorduras totais (g)",
  "Gorduras saturadas (g)",
  "Gorduras trans (g)",
  "Fibra alimentar (g)",
  "Sódio (mg)"
];

function addNutriRow(nome = "", per100 = "", por_porcao = "", vd = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="form-control form-control-sm nutri-nome"   value="${escapeAttr(nome)}"       placeholder="Carboidratos totais (g)"></td>
    <td><input type="text" class="form-control form-control-sm nutri-per100" value="${escapeAttr(per100)}"     placeholder="76"></td>
    <td><input type="text" class="form-control form-control-sm nutri-porcao" value="${escapeAttr(por_porcao)}" placeholder="38"></td>
    <td><input type="text" class="form-control form-control-sm nutri-vd"     value="${escapeAttr(vd)}"         placeholder="13"></td>
    <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger nutri-remove" aria-label="Remover linha">×</button></td>
  `;
  tr.querySelector(".nutri-remove").addEventListener("click", () => tr.remove());
  $("nutri-body").appendChild(tr);
}

function preencherPresetAnvisa() {
  const existentes = $("nutri-body").querySelectorAll("tr").length;
  if (existentes > 0 && !confirm(`A tabela já tem ${existentes} linha(s). Substituir pela lista padrão ANVISA?`)) return;
  $("nutri-body").innerHTML = "";
  NUTRIENTES_ANVISA.forEach((nome) => addNutriRow(nome));
}

function limparTabelaNutricional() {
  if (!confirm("Limpar todas as linhas da tabela nutricional?")) return;
  $("nutri-body").innerHTML = "";
}

function lerInfoNutricional() {
  const porcao = $("produto-porcao").value.trim();
  const medida_caseira = $("produto-medida-caseira").value.trim();
  const porcoesRaw = $("produto-porcoes").value;
  const porcoes_por_embalagem = porcoesRaw ? Number(porcoesRaw) : null;

  const valores = Array.from($("nutri-body").querySelectorAll("tr")).map((tr) => ({
    nome:       tr.querySelector(".nutri-nome").value.trim(),
    per100:     tr.querySelector(".nutri-per100").value.trim(),
    por_porcao: tr.querySelector(".nutri-porcao").value.trim(),
    vd:         tr.querySelector(".nutri-vd").value.trim()
  })).filter((v) => v.nome || v.per100 || v.por_porcao || v.vd);

  const temAlgo = porcao || medida_caseira || porcoes_por_embalagem || valores.length > 0;
  if (!temAlgo) return null;
  return { porcao, medida_caseira, porcoes_por_embalagem, valores };
}

function preencherInfoNutricional(info) {
  $("nutri-body").innerHTML = "";
  if (!info) {
    $("produto-porcao").value = "";
    $("produto-medida-caseira").value = "";
    $("produto-porcoes").value = "";
    return;
  }
  $("produto-porcao").value = info.porcao || "";
  $("produto-medida-caseira").value = info.medida_caseira || "";
  $("produto-porcoes").value = info.porcoes_por_embalagem ?? "";
  (info.valores || []).forEach((v) => {
    const per100     = v.per100 ?? "";
    const por_porcao = v.por_porcao ?? v.quantidade ?? "";
    addNutriRow(v.nome, per100, por_porcao, v.vd);
  });
}

function abrirModalNovo() {
  $("modal-titulo").textContent = "Novo produto";
  $("produto-id").value = "";
  $("produto-nome").value = "";
  $("produto-nome-curto").value = "";
  $("produto-categoria").value = state.filtroCategoria || "";  // pré-seleciona se filtrado
  $("produto-descricao").value = "";
  $("produto-embalagem").value = "";
  $("produto-imagem").value = "";
  $("produto-ativo").checked = true;
  $("produto-destaque").checked = false;
  $("produto-descricao-longa").value = "";
  $("produto-ingredientes").value = "";
  $("produto-alergenos").value = "";
  $("produto-validade").value = "";
  $("produto-modo-preparo").value = "";
  preencherInfoNutricional(null);
  $("form-erro").classList.add("d-none");
  resetTabs();
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
  $("produto-ativo").checked = p.ativo !== false;
  $("produto-destaque").checked = !!p.destaque;
  $("produto-descricao-longa").value = p.descricao_longa || "";
  $("produto-ingredientes").value = p.ingredientes || "";
  $("produto-alergenos").value = p.alergenos || "";
  $("produto-validade").value = p.validade || "";
  $("produto-modo-preparo").value = p.modo_preparo || "";
  preencherInfoNutricional(p.info_nutricional);
  $("form-erro").classList.add("d-none");
  resetTabs();
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
    ativo: $("produto-ativo").checked,
    destaque: $("produto-destaque").checked,
    descricao_longa: $("produto-descricao-longa").value.trim(),
    ingredientes: $("produto-ingredientes").value.trim(),
    alergenos: $("produto-alergenos").value.trim(),
    validade: $("produto-validade").value.trim(),
    modo_preparo: $("produto-modo-preparo").value.trim(),
    info_nutricional: lerInfoNutricional(),
    atualizado_em: serverTimestamp()
  };

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    if (id) {
      // Edit: preserva ordem atual
      await updateDoc(doc(db, "produtos", id), payload);
      toast(`"${nome}" atualizado.`);
    } else {
      // Novo: ordem = fim da categoria escolhida
      const naCategoria = state.produtos.filter((p) => p.categoria === categoria);
      const maxOrdem = naCategoria.length > 0 ? Math.max(...naCategoria.map((p) => p.ordem ?? 0)) : 0;
      payload.ordem = maxOrdem + 1;
      payload.criado_em = serverTimestamp();
      await addDoc(collection(db, "produtos"), payload);
      toast(`"${nome}" adicionado.`);
    }
    getModal().hide();
    await carregarProdutos();
    renderGrupos();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

// ---------- Ações ----------

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
    renderGrupos();
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
    renderGrupos();
    toast(`"${p.nome}" removido.`);
  } catch (err) {
    toast(err.message || "Erro ao remover.", "error");
  }
}

function handleGruposClick(e) {
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

  watchAuth((u) => {
    if (!u) window.location.replace("index.html");
  });

  try {
    await carregarCategorias();
    await carregarProdutos();
    renderCategoriaFiltro();
    renderCategoriaForm();
    renderGrupos();
  } catch (err) {
    $("grupos-container").innerHTML = `<div class="state-message text-danger">${escapeHtml(err.message)}</div>`;
    return;
  }

  $("filtro-categoria").addEventListener("change", (e) => {
    state.filtroCategoria = e.target.value;
    renderGrupos();
  });

  $("filtro-busca").addEventListener("input", (e) => {
    state.filtroBusca = e.target.value.trim();
    renderGrupos();
  });

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("produto-form").addEventListener("submit", salvarProduto);
  $("grupos-container").addEventListener("click", handleGruposClick);
  $("nutri-add").addEventListener("click", () => addNutriRow());
  $("nutri-preset").addEventListener("click", preencherPresetAnvisa);
  $("nutri-clear").addEventListener("click", limparTabelaNutricional);

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
