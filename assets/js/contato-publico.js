// Atualiza dados publicos de contato.
// Usa cache/snapshot primeiro e confirma Firestore em segundo plano.

import {
  carregarDocumentoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  removerCachePublico,
  salvarCachePublico
} from "./public-data.js";

const STATIC_CONTATO = "data/contato-publico.json";
const CACHE_KEY = "contato";

function semDDD(numero) {
  if (!numero) return "";
  return numero.replace(/^\s*\([^)]*\)\s*/, "").trim();
}

function valor(cfg, tipo) {
  switch (tipo) {
    case "email": return cfg.email || "";
    case "telefone_fixo": return cfg.telefone_fixo || "";
    case "telefone_celular": return cfg.telefone_celular || "";
    case "telefone_combinado":
      if (cfg.telefone_fixo && cfg.telefone_celular) return `${cfg.telefone_fixo} | ${semDDD(cfg.telefone_celular)}`;
      return cfg.telefone_fixo || cfg.telefone_celular || "";
    case "horario_dias_longo": return cfg.horario_dias_longo || "";
    case "horario_dias_curto": return cfg.horario_dias_curto || "";
    case "horario_horario": return cfg.horario_horario || "";
    case "horario_combinado":
      if (cfg.horario_dias_curto && cfg.horario_horario) return `${cfg.horario_dias_curto}: ${cfg.horario_horario}`;
      return cfg.horario_horario || "";
    default: return "";
  }
}

function href(cfg, tipo) {
  switch (tipo) {
    case "whatsapp": {
      if (!cfg.whatsapp_numero) return "";
      const msg = cfg.whatsapp_mensagem ? `?text=${encodeURIComponent(cfg.whatsapp_mensagem)}` : "";
      return `https://wa.me/${cfg.whatsapp_numero}${msg}`;
    }
    case "email":
      return cfg.email ? `mailto:${cfg.email}` : "";
    case "tel-fixo": {
      if (!cfg.telefone_fixo) return "";
      const digits = cfg.telefone_fixo.replace(/\D/g, "");
      return `tel:+55${digits}`;
    }
    default:
      return "";
  }
}

function aplicar(cfg) {
  if (!cfg) return false;
  let mudou = false;

  document.querySelectorAll("[data-contato]").forEach((el) => {
    const v = valor(cfg, el.dataset.contato);
    if (v && el.textContent !== v) {
      el.textContent = v;
      mudou = true;
    }
  });

  document.querySelectorAll("[data-contato-href]").forEach((el) => {
    const v = href(cfg, el.dataset.contatoHref);
    if (v && el.getAttribute("href") !== v) {
      el.setAttribute("href", v);
      mudou = true;
    }
  });

  return mudou;
}

(async () => {
  const cache = lerCachePublico(CACHE_KEY);

  if (cache) {
    aplicar(cache);
  } else {
    try {
      aplicar(await carregarJsonPublico(STATIC_CONTATO));
    } catch (err) {
      console.warn("[contato] Falha ao carregar snapshot:", err);
    }
  }

  try {
    const cfg = await carregarDocumentoFirestore("config/contato");
    if (cfg) {
      salvarCachePublico(CACHE_KEY, cfg);
      aplicar(cfg);
    } else {
      removerCachePublico(CACHE_KEY);
    }
  } catch (err) {
    console.warn("[contato] Falha ao atualizar em segundo plano:", err);
  }
})();
