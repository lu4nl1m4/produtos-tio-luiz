// CRUD da coleção `receitas` no Firestore.
// Suporta drag-and-drop, upload de imagem via Cloudinary e import de 3 exemplos.

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
const state = { receitas: [], filtroBusca: "" };
let sortableInstance = null;

// ---------- 3 receitas de exemplo (para o botão de importação inicial) ----------

const RECEITAS_EXEMPLO = [
  {
    titulo: "Feijão Carioca Caseiro",
    descricao_curta: "Receita tradicional na panela de pressão — soltinho, saboroso e o acompanhamento perfeito.",
    tempo: "1h 10min",
    porcoes: "6 porções",
    dificuldade: "Fácil",
    ingredientes: "2 xícaras de Feijão Carioca Tio Luiz\n1 cebola média picada\n3 dentes de alho amassados\n2 folhas de louro\n2 colheres (sopa) de óleo\n1 colher (chá) de sal\nÁgua suficiente para cobrir 2 dedos acima",
    modo_preparo: "1. Deixe o feijão de molho na água por pelo menos 4 horas (ou de um dia para o outro).\n2. Escorra e coloque na panela de pressão com água nova, cobrindo 2 dedos acima do feijão.\n3. Adicione as folhas de louro e cozinhe por 25 minutos após pegar pressão.\n4. Aqueça o óleo numa frigideira e refogue a cebola até dourar; adicione o alho e mexa até liberar o aroma.\n5. Despeje o refogado na panela com o feijão cozido. Acerte o sal e cozinhe por mais 10 minutos sem pressão, com a panela parcialmente tampada — o caldo engrossa.\n6. Sirva quente com arroz branco e farofa.",
    imagem_url: ""
  },
  {
    titulo: "Cuscuz Nordestino com Flocão",
    descricao_curta: "Café da manhã tradicional do Nordeste — rápido, prático e cheio de sabor.",
    tempo: "15 min",
    porcoes: "2 porções",
    dificuldade: "Fácil",
    ingredientes: "1 xícara de Flocão Premium Tio Luiz\n1/2 xícara de água\n1 pitada generosa de sal\nManteiga a gosto (para servir)\nQueijo coalho ou Queijo Parmesão Ralado Tio Luiz a gosto",
    modo_preparo: "1. Numa tigela, misture o flocão com o sal.\n2. Adicione a água aos poucos, mexendo com a mão até a massa ficar levemente úmida — quando você aperta na mão, ela forma uma bola que se desmancha sozinha.\n3. Coloque a massa no cuscuzeiro sem apertar (deixa o vapor circular).\n4. Cozinhe no vapor por 8 a 10 minutos, ou até o cuscuz estar firme.\n5. Desenforme num prato, espalhe manteiga por cima até derreter e finalize com o queijo. Sirva imediatamente.",
    imagem_url: ""
  },
  {
    titulo: "Tapioca de Queijo",
    descricao_curta: "Tapioca crocante por fora, queijo derretido por dentro — café da tarde clássico em 10 minutos.",
    tempo: "10 min",
    porcoes: "1 tapioca",
    dificuldade: "Fácil",
    ingredientes: "1/2 xícara de Massa para Tapioca Tio Luiz\nQueijo coalho ou mussarela em fatias finas\n1 pitada de sal (opcional)\nManteiga ou orégano a gosto (opcional)",
    modo_preparo: "1. Peneire a massa de tapioca direto sobre uma frigideira antiaderente bem quente, formando um disco fino e uniforme.\n2. Em poucos segundos a massa se compacta e forma uma película — você verá quando começar a soltar das bordas (em ~1 min).\n3. Vire a tapioca com cuidado usando uma espátula.\n4. Coloque o queijo no centro e dobre a tapioca ao meio.\n5. Aguarde mais 1-2 minutos até o queijo derreter e a tapioca ficar levemente dourada nas bordas.\n6. Sirva imediatamente, ainda quente.",
    imagem_url: ""
  }
];

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

// ---------- Data ----------

async function carregarReceitas() {
  const snap = await getDocs(collection(db, "receitas"));
  state.receitas = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
}

async function importarExemplos() {
  const batch = writeBatch(db);
  let ordem = 1;
  for (const r of RECEITAS_EXEMPLO) {
    const ref = doc(collection(db, "receitas"));
    batch.set(ref, {
      ...r,
      ativa: true,
      destaque: false,
      ordem: ordem++,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp()
    });
  }
  await batch.commit();
}

function receitasFiltradas() {
  if (!state.filtroBusca) return state.receitas;
  const q = state.filtroBusca.toLowerCase();
  return state.receitas.filter((r) => (r.titulo || "").toLowerCase().includes(q));
}

// ---------- Render ----------

function renderTabela() {
  const lista = receitasFiltradas();
  const body = $("tabela-body");
  $("contagem").textContent = `${lista.length} de ${state.receitas.length} receita(s)`;

  if (state.receitas.length === 0) {
    body.innerHTML = `<tr><td colspan="10" class="state-message">Nenhuma receita cadastrada.</td></tr>`;
    $("import-banner").classList.remove("d-none");
    $("import-banner").classList.add("d-flex");
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    return;
  }
  $("import-banner").classList.add("d-none");
  $("import-banner").classList.remove("d-flex");

  if (lista.length === 0) {
    body.innerHTML = `<tr><td colspan="10" class="state-message">Nenhuma receita encontrada com este filtro.</td></tr>`;
    return;
  }

  body.innerHTML = lista.map((r, i) => {
    const inativa = r.ativa === false ? " row-inactive" : "";
    return `
      <tr class="${inativa}" data-id="${r.id}">
        <td class="drag-handle text-center" title="Arrastar para reordenar" style="cursor: grab; color: #aaa; user-select: none;">⋮⋮</td>
        <td class="text-center text-muted small">${i + 1}</td>
        <td>${r.imagem_url ? `<img src="${escapeAttr(r.imagem_url)}" class="thumb" onerror="this.style.display='none'" alt="">` : `<div class="thumb" style="background:#eee;"></div>`}</td>
        <td class="fw-medium">${escapeHtml(r.titulo || "(sem título)")}</td>
        <td class="small text-muted">${escapeHtml(r.descricao_curta || "—")}</td>
        <td class="text-center small">${escapeHtml(r.tempo || "—")}</td>
        <td class="text-center small">${escapeHtml(r.dificuldade || "—")}</td>
        <td class="text-center">
          <span class="toggle-chip toggle-chip--${r.ativa !== false ? "on" : "off"}" data-action="toggle" data-field="ativa">
            ${r.ativa !== false ? "Sim" : "Não"}
          </span>
        </td>
        <td class="text-center">
          <span class="toggle-chip toggle-chip--${r.destaque ? "on" : "off"}" data-action="toggle" data-field="destaque">
            ${r.destaque ? "Sim" : "Não"}
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
  if (!SortableLib) return;
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
    const r = state.receitas.find((x) => x.id === id);
    const novaOrdem = i + 1;
    if (r && r.ordem !== novaOrdem) {
      r.ordem = novaOrdem;
      batch.set(doc(db, "receitas", id), { ordem: novaOrdem, atualizado_em: serverTimestamp() }, { merge: true });
      mudou++;
    }
  });
  if (mudou === 0) return;
  try {
    await batch.commit();
    state.receitas.sort((a, b) => a.ordem - b.ordem);
    renderTabela();
    toast(`Ordem atualizada (${mudou} receita(s)).`);
  } catch (e) {
    toast(e.message || "Erro ao salvar nova ordem.", "error");
    await carregarReceitas();
    renderTabela();
  }
}

// ---------- Modal ----------

let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("receita-modal"));
  return modalInstance;
}
function resetTabs() {
  document.querySelectorAll("#receita-modal .nav-link").forEach((b, i) => b.classList.toggle("active", i === 0));
  document.querySelectorAll("#receita-modal .tab-pane").forEach((p, i) => {
    p.classList.toggle("show", i === 0);
    p.classList.toggle("active", i === 0);
  });
}

function atualizarPreviewImagem() {
  const url = $("rec-imagem").value.trim();
  const img = $("rec-imagem-preview");
  if (url) { img.src = url; img.style.display = "block"; img.onerror = () => { img.style.display = "none"; }; }
  else { img.style.display = "none"; }
}

async function handleUploadImagem(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const statusEl = $("rec-imagem-status");
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
    const url = await uploadImagem(file, { onProgress: (pct) => { statusEl.textContent = `Enviando ${pct}%...`; } });
    $("rec-imagem").value = url;
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
  $("modal-titulo").textContent = "Nova receita";
  $("receita-id").value = "";
  $("rec-titulo").value = "";
  $("rec-descricao").value = "";
  $("rec-tempo").value = "";
  $("rec-porcoes").value = "";
  $("rec-dificuldade").value = "";
  $("rec-imagem").value = "";
  $("rec-imagem-status").textContent = "";
  $("rec-ingredientes").value = "";
  $("rec-preparo").value = "";
  $("rec-ativa").checked = true;
  $("rec-destaque").checked = false;
  atualizarPreviewImagem();
  resetTabs();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

function abrirModalEditar(r) {
  $("modal-titulo").textContent = `Editar: ${r.titulo}`;
  $("receita-id").value = r.id;
  $("rec-titulo").value = r.titulo || "";
  $("rec-descricao").value = r.descricao_curta || "";
  $("rec-tempo").value = r.tempo || "";
  $("rec-porcoes").value = r.porcoes || "";
  $("rec-dificuldade").value = r.dificuldade || "";
  $("rec-imagem").value = r.imagem_url || "";
  $("rec-imagem-status").textContent = "";
  $("rec-ingredientes").value = r.ingredientes || "";
  $("rec-preparo").value = r.modo_preparo || "";
  $("rec-ativa").checked = r.ativa !== false;
  $("rec-destaque").checked = !!r.destaque;
  atualizarPreviewImagem();
  resetTabs();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

async function salvarReceita(e) {
  e.preventDefault();
  const id = $("receita-id").value;
  const titulo = $("rec-titulo").value.trim();
  const ingredientes = $("rec-ingredientes").value.trim();
  const modo_preparo = $("rec-preparo").value.trim();
  const errEl = $("form-erro");

  if (!titulo) {
    errEl.textContent = "Título é obrigatório.";
    errEl.classList.remove("d-none");
    return;
  }
  if (!ingredientes || !modo_preparo) {
    errEl.textContent = "Ingredientes e modo de preparo são obrigatórios (aba Preparo).";
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    titulo,
    descricao_curta: $("rec-descricao").value.trim(),
    tempo: $("rec-tempo").value.trim(),
    porcoes: $("rec-porcoes").value.trim(),
    dificuldade: $("rec-dificuldade").value,
    imagem_url: $("rec-imagem").value.trim(),
    ingredientes,
    modo_preparo,
    ativa: $("rec-ativa").checked,
    destaque: $("rec-destaque").checked,
    atualizado_em: serverTimestamp()
  };

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    if (id) {
      await updateDoc(doc(db, "receitas", id), payload);
      toast(`"${titulo}" atualizada.`);
    } else {
      const maxOrdem = state.receitas.length > 0 ? Math.max(...state.receitas.map((r) => r.ordem ?? 0)) : 0;
      payload.ordem = maxOrdem + 1;
      payload.criado_em = serverTimestamp();
      await addDoc(collection(db, "receitas"), payload);
      toast(`"${titulo}" adicionada.`);
    }
    getModal().hide();
    await carregarReceitas();
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
  const r = state.receitas.find((x) => x.id === id);
  if (!r) return;
  const novo = !(field === "ativa" ? r.ativa !== false : !!r[field]);
  try {
    await updateDoc(doc(db, "receitas", id), { [field]: novo, atualizado_em: serverTimestamp() });
    r[field] = novo;
    renderTabela();
  } catch (err) {
    toast(err.message || "Erro ao atualizar.", "error");
  }
}

async function removerReceita(id) {
  const r = state.receitas.find((x) => x.id === id);
  if (!r) return;
  if (!confirm(`Remover receita "${r.titulo}"? Não tem como desfazer.`)) return;
  try {
    await deleteDoc(doc(db, "receitas", id));
    state.receitas = state.receitas.filter((x) => x.id !== id);
    renderTabela();
    toast(`"${r.titulo}" removida.`);
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
    const r = state.receitas.find((x) => x.id === id);
    if (r) abrirModalEditar(r);
  } else if (btn.dataset.action === "remover") {
    removerReceita(id);
  } else if (btn.dataset.action === "toggle") {
    toggleCampo(id, btn.dataset.field);
  }
}

// ---------- Boot ----------

async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;
  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregarReceitas();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="10" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("novo-btn").addEventListener("click", abrirModalNovo);
  $("receita-form").addEventListener("submit", salvarReceita);
  $("tabela-body").addEventListener("click", handleTabelaClick);
  $("rec-imagem-file").addEventListener("change", handleUploadImagem);
  $("rec-imagem").addEventListener("input", atualizarPreviewImagem);
  $("filtro-busca").addEventListener("input", (e) => {
    state.filtroBusca = e.target.value.trim();
    renderTabela();
  });

  $("import-btn").addEventListener("click", async () => {
    $("import-btn").disabled = true;
    $("import-btn").textContent = "Importando...";
    try {
      await importarExemplos();
      await carregarReceitas();
      renderTabela();
      toast("3 receitas de exemplo importadas.");
    } catch (err) {
      toast(err.message || "Erro ao importar.", "error");
    } finally {
      $("import-btn").disabled = false;
      $("import-btn").textContent = "Importar 3 exemplos";
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
