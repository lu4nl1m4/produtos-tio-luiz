// Aplica o banner configurado no admin/banners ao hero da página.
// Procura <section ... data-page-banner="slug">. Se houver banner cadastrado
// pra esse slug, substitui imagem de fundo, título e subtítulo. Senão, mantém
// o conteúdo estático do HTML (fallback).

import { db } from "./firebase-config.js";
import { cached } from "./cache.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const TTL_BANNER = 10 * 60 * 1000;  // 10 min — banners mudam raramente

async function carregarBanner(slug) {
  return cached(`banner:${slug}`, TTL_BANNER, async () => {
    try {
      const snap = await getDoc(doc(db, "banners", slug));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn(`Falha ao ler banner '${slug}':`, e);
      return null;
    }
  });
}

function aplicarBanner(heroEl, banner) {
  if (!banner) return;
  if (banner.imagem_url) {
    const img = heroEl.querySelector(".hero__background");
    if (img && img.getAttribute("src") !== banner.imagem_url) img.src = banner.imagem_url;
  }
  if (banner.titulo) {
    const t = heroEl.querySelector(".hero__title");
    if (t && t.textContent !== banner.titulo) t.textContent = banner.titulo;
  }
  if (banner.subtitulo) {
    const s = heroEl.querySelector(".hero__subtitle");
    if (s && s.textContent !== banner.subtitulo) s.textContent = banner.subtitulo;
  }
}

async function init() {
  const heroEl = document.querySelector("[data-page-banner]");
  if (!heroEl) return;
  const slug = heroEl.dataset.pageBanner;
  if (!slug) return;
  const banner = await carregarBanner(slug);
  aplicarBanner(heroEl, banner);
}

document.addEventListener("DOMContentLoaded", init);
