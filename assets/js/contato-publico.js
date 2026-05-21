// Substitui texto/href em elementos com data-contato / data-contato-href.
// Lê /config/contato no Firestore (com cache em sessionStorage).
//
// Tipos suportados em data-contato (textContent):
//   email | telefone_fixo | telefone_celular | telefone_combinado
//   horario_dias_longo | horario_dias_curto | horario_horario | horario_combinado
//
// Tipos suportados em data-contato-href (atributo href):
//   whatsapp  → https://wa.me/<numero>?text=<msg-padrao-encoded>
//   email     → mailto:<email>
//   tel-fixo  → tel:+<numero>

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const CACHE_KEY = "contato_publico_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function carregar() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch {}

  const snap = await getDoc(doc(db, "config", "contato"));
  if (!snap.exists()) return null;
  const data = snap.data();
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  return data;
}

// "(79) 99898-5386" → "99898-5386" (remove parêntese + DDD do início).
function semDDD(numero) {
  if (!numero) return "";
  return numero.replace(/^\s*\([^)]*\)\s*/, "").trim();
}

function valor(cfg, tipo) {
  switch (tipo) {
    case "email":              return cfg.email || "";
    case "telefone_fixo":      return cfg.telefone_fixo || "";
    case "telefone_celular":   return cfg.telefone_celular || "";
    case "telefone_combinado":
      if (cfg.telefone_fixo && cfg.telefone_celular) return `${cfg.telefone_fixo} | ${semDDD(cfg.telefone_celular)}`;
      return cfg.telefone_fixo || cfg.telefone_celular || "";
    case "horario_dias_longo":  return cfg.horario_dias_longo  || "";
    case "horario_dias_curto":  return cfg.horario_dias_curto  || "";
    case "horario_horario":     return cfg.horario_horario     || "";
    case "horario_combinado":
      if (cfg.horario_dias_curto && cfg.horario_horario) return `${cfg.horario_dias_curto}: ${cfg.horario_horario}`;
      return cfg.horario_horario || "";
    default: return "";
  }
}

function href(cfg, tipo) {
  switch (tipo) {
    case "whatsapp":
      if (!cfg.whatsapp_numero) return "";
      const msg = cfg.whatsapp_mensagem ? `?text=${encodeURIComponent(cfg.whatsapp_mensagem)}` : "";
      return `https://wa.me/${cfg.whatsapp_numero}${msg}`;
    case "email":
      return cfg.email ? `mailto:${cfg.email}` : "";
    case "tel-fixo":
      if (!cfg.telefone_fixo) return "";
      const digits = cfg.telefone_fixo.replace(/\D/g, "");
      return `tel:+55${digits}`;
    default: return "";
  }
}

function aplicar(cfg) {
  if (!cfg) return;

  document.querySelectorAll("[data-contato]").forEach((el) => {
    const tipo = el.dataset.contato;
    const v = valor(cfg, tipo);
    if (v) el.textContent = v;
  });

  document.querySelectorAll("[data-contato-href]").forEach((el) => {
    const tipo = el.dataset.contatoHref;
    const v = href(cfg, tipo);
    if (v) el.setAttribute("href", v);
  });
}

(async () => {
  try {
    const cfg = await carregar();
    aplicar(cfg);
  } catch (err) {
    console.error("[contato] Falha ao carregar:", err);
  }
})();
