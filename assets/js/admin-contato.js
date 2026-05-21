// Admin do doc /config/contato — informações de contato do site.
// Atualiza rodapés (todas as páginas), botão WhatsApp flutuante e cards da página /contato.html.

import { db } from "./firebase-config.js";
import { requireAuth, logout, watchAuth } from "./auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

// Defaults derivados do HTML atual — usado pelo botão "Importar defaults".
const DEFAULTS = {
  telefone_fixo: "(79) 3431-0068",
  telefone_celular: "(79) 99898-5386",
  whatsapp_numero: "5579998985386",
  whatsapp_mensagem: "Olá! Gostaria de saber mais sobre os Produtos Tio Luiz",
  email: "sac@distribuidoratioluiz.com.br",
  horario_dias_longo: "Segunda a Sexta",
  horario_dias_curto: "Seg-Sex",
  horario_horario: "8h às 12h | 14h às 18h"
};

const CAMPOS = Object.keys(DEFAULTS);

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

function invalidarCachePublico() {
  try { sessionStorage.removeItem("contato_publico_v1"); } catch {}
}

async function carregar() {
  const snap = await getDoc(doc(db, "config", "contato"));
  if (!snap.exists()) {
    $("import-banner").classList.remove("d-none");
    $("import-banner").classList.add("d-flex");
    return;
  }
  $("import-banner").classList.add("d-none");
  const data = snap.data();
  for (const campo of CAMPOS) {
    if (data[campo] != null) $(campo).value = data[campo];
  }
}

async function salvar(e) {
  e.preventDefault();
  const errEl = $("form-erro");
  errEl.classList.add("d-none");

  const payload = {};
  for (const campo of CAMPOS) {
    payload[campo] = $(campo).value.trim();
  }

  if (!payload.whatsapp_numero) {
    errEl.textContent = "Número do WhatsApp é obrigatório.";
    errEl.classList.remove("d-none");
    return;
  }
  if (!/^\d{10,13}$/.test(payload.whatsapp_numero)) {
    errEl.textContent = "Número do WhatsApp deve ter só dígitos (10–13). Ex: 5579998985386.";
    errEl.classList.remove("d-none");
    return;
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errEl.textContent = "Email parece inválido.";
    errEl.classList.remove("d-none");
    return;
  }

  payload.atualizado_em = serverTimestamp();

  const btn = $("salvar-btn");
  btn.disabled = true;
  btn.textContent = "Salvando...";
  try {
    await setDoc(doc(db, "config", "contato"), payload, { merge: true });
    invalidarCachePublico();
    toast("Contato atualizado.");
    $("import-banner").classList.add("d-none");
  } catch (err) {
    errEl.textContent = err.message || "Erro ao salvar.";
    errEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar";
  }
}

async function importarDefaults() {
  const btn = $("import-btn");
  btn.disabled = true;
  btn.textContent = "Importando...";
  try {
    await setDoc(doc(db, "config", "contato"), {
      ...DEFAULTS,
      atualizado_em: serverTimestamp()
    });
    invalidarCachePublico();
    for (const campo of CAMPOS) {
      $(campo).value = DEFAULTS[campo];
    }
    $("import-banner").classList.add("d-none");
    toast("Defaults importados. Edite o que precisar e salve.");
  } catch (err) {
    toast(err.message || "Erro ao importar.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Importar defaults";
  }
}

async function init() {
  const user = await requireAuth("index.html");
  if (!user) return;
  $("user-email").textContent = user.email;
  watchAuth((u) => { if (!u) window.location.replace("index.html"); });

  try {
    await carregar();
  } catch (err) {
    const errEl = $("form-erro");
    errEl.textContent = err.message || "Erro ao carregar.";
    errEl.classList.remove("d-none");
  }

  $("contato-form").addEventListener("submit", salvar);
  $("import-btn").addEventListener("click", importarDefaults);

  $("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.replace("index.html");
  });
}

init();
