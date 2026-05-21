// Admin dos banners das páginas públicas.
// Coleção `banners` com docs id = slug da página (home, sobre, produtos, ...).

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import { uploadImagem, cloudinaryConfigurado } from "./cloudinary-upload.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const state = { banners: {} };  // { slug: { titulo, subtitulo, imagem_url } }

// Lista fixa de páginas que têm banner. Cada item: slug, label (admin), arquivo (URL do site público).
const PAGINAS = [
  { slug: "home",            label: "Home",           url: "../index.html" },
  { slug: "sobre",           label: "Sobre Nós",      url: "../sobre.html" },
  { slug: "produtos",        label: "Produtos",       url: "../produtos.html" },
  { slug: "pet-food",        label: "Linha Pet Food", url: "../pet-food.html" },
  { slug: "receitas",        label: "Receitas",       url: "../receitas.html" },
  { slug: "onde-encontrar",  label: "Onde Encontrar", url: "../onde-encontrar.html" },
  { slug: "contato",         label: "Contato",        url: "../contato.html" }
];

// Defaults derivados do HTML estático atual — usado pelo botão "Importar dos defaults".
const DEFAULTS = {
  "home":           { titulo: "Sua Família Feliz",     subtitulo: "Qualidade e tradição em cada produto",                    imagem_url: "https://res.cloudinary.com/dwy3jzhyz/image/upload/f_auto,q_auto/v1779331317/hero_banner_1770150132774_jrrlka.jpg" },
  "sobre":          { titulo: "Sobre Nós",             subtitulo: "Conheça nossa história e compromisso com sua família",    imagem_url: "https://res.cloudinary.com/dwy3jzhyz/image/upload/f_auto,q_auto/v1779331317/tradicao_oqvvhj.jpg" },
  "produtos":       { titulo: "Nossos Produtos",       subtitulo: "Variedade e qualidade para todas as ocasiões",            imagem_url: "" },
  "pet-food":       { titulo: "Linha Pet Food",        subtitulo: "Nutrição completa para pássaros e cães com a qualidade Tio Luiz", imagem_url: "https://res.cloudinary.com/dwy3jzhyz/image/upload/f_auto,q_auto/v1779331704/pet_foot_aves_g7egg2.gif" },
  "receitas":       { titulo: "Receitas",              subtitulo: "Pratos tradicionais com a qualidade Tio Luiz",            imagem_url: "" },
  "onde-encontrar": { titulo: "Onde Encontrar",        subtitulo: "Disponíveis em supermercados em todo o estado de Sergipe", imagem_url: "" },
  "contato":        { titulo: "Entre em Contato",      subtitulo: "Estamos prontos para atendê-lo",                          imagem_url: "" }
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
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }

// ---------- Data ----------
async function carregarBanners() {
  const snap = await getDocs(collection(db, "banners"));
  state.banners = {};
  snap.docs.forEach((d) => { state.banners[d.id] = d.data(); });
}

async function importarDefaults() {
  const batch = writeBatch(db);
  for (const slug in DEFAULTS) {
    const ref = doc(db, "banners", slug);
    batch.set(ref, {
      ...DEFAULTS[slug],
      atualizado_em: serverTimestamp()
    });
  }
  await batch.commit();
}

// ---------- Render ----------
function renderTabela() {
  const body = $("tabela-body");
  const total = Object.keys(state.banners).length;
  $("contagem").textContent = `${total} de ${PAGINAS.length} configurado(s)`;

  if (total === 0) {
    $("import-banner").classList.remove("d-none");
    $("import-banner").classList.add("d-flex");
  } else {
    $("import-banner").classList.add("d-none");
    $("import-banner").classList.remove("d-flex");
  }

  body.innerHTML = PAGINAS.map((p) => {
    const b = state.banners[p.slug] || {};
    const semConfig = !b.titulo && !b.subtitulo && !b.imagem_url;
    const opacity = semConfig ? "0.55" : "1";
    return `
      <tr data-slug="${p.slug}" style="opacity: ${opacity};">
        <td class="fw-medium">${escapeHtml(p.label)}<div class="small text-muted">${escapeHtml(p.slug)}</div></td>
        <td>${b.imagem_url ? `<img src="${escapeAttr(b.imagem_url)}" style="width:80px;height:48px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'" alt="">` : `<div style="width:80px;height:48px;background:#eee;border-radius:4px;"></div>`}</td>
        <td>${escapeHtml(b.titulo || "(usa fallback do HTML)")}</td>
        <td class="small text-muted">${escapeHtml(b.subtitulo || "—")}</td>
        <td class="text-end">
          <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary" title="Abrir página em nova aba">↗</a>
          <button class="btn btn-sm btn-primary" data-action="editar">Editar</button>
        </td>
      </tr>
    `;
  }).join("");
}

// ---------- Modal ----------
let modalInstance = null;
function getModal() {
  if (!modalInstance) modalInstance = new bootstrap.Modal($("banner-modal"));
  return modalInstance;
}

function atualizarPreviewImagem() {
  const url = $("banner-imagem").value.trim();
  const img = $("banner-imagem-preview");
  if (url) { img.src = url; img.style.display = "block"; img.onerror = () => { img.style.display = "none"; }; }
  else { img.style.display = "none"; }
}

async function handleUploadImagem(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const statusEl = $("banner-imagem-status");
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
    $("banner-imagem").value = url;
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

function abrirModalEditar(slug) {
  const pagina = PAGINAS.find((p) => p.slug === slug);
  if (!pagina) return;
  const b = state.banners[slug] || {};
  $("modal-titulo").textContent = `Editar banner: ${pagina.label}`;
  $("banner-id").value = slug;
  $("banner-pagina-label").textContent = pagina.label;
  $("banner-pagina-url").textContent = pagina.url.replace("../", "");
  $("banner-titulo").value = b.titulo || "";
  $("banner-subtitulo").value = b.subtitulo || "";
  $("banner-imagem").value = b.imagem_url || "";
  $("banner-imagem-status").textContent = "";
  atualizarPreviewImagem();
  $("form-erro").classList.add("d-none");
  getModal().show();
}

async function salvarBanner(e) {
  e.preventDefault();
  const slug = $("banner-id").value;
  const titulo = $("banner-titulo").value.trim();
  const errEl = $("form-erro");

  if (!titulo) {
    errEl.textContent = "Título é obrigatório.";
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    titulo,
    subtitulo: $("banner-subtitulo").value.trim(),
    imagem_url: $("banner-imagem").value.trim(),
    atualizado_em: serverTimestamp()
  };

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    await setDoc(doc(db, "banners", slug), payload, { merge: true });
    state.banners[slug] = { ...state.banners[slug], ...payload };
    toast(`Banner "${slug}" atualizado.`);
    getModal().hide();
    renderTabela();
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

function handleTabelaClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr[data-slug]");
  if (!tr) return;
  if (btn.dataset.action === "editar") abrirModalEditar(tr.dataset.slug);
}

// ---------- Boot ----------
async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;
  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregarBanners();
    renderTabela();
  } catch (err) {
    $("tabela-body").innerHTML = `<tr><td colspan="5" class="state-message text-danger">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  $("banner-form").addEventListener("submit", salvarBanner);
  $("tabela-body").addEventListener("click", handleTabelaClick);
  $("banner-imagem-file").addEventListener("change", handleUploadImagem);
  $("banner-imagem").addEventListener("input", atualizarPreviewImagem);

  $("import-btn").addEventListener("click", async () => {
    $("import-btn").disabled = true;
    $("import-btn").textContent = "Importando...";
    try {
      await importarDefaults();
      await carregarBanners();
      renderTabela();
      toast("Banners importados dos defaults.");
    } catch (err) {
      toast(err.message || "Erro ao importar.", "error");
    } finally {
      $("import-btn").disabled = false;
      $("import-btn").textContent = "Importar dos defaults";
    }
  });

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
