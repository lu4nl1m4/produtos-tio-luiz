// Aplica o banner configurado no admin.
// Usa cache/snapshot primeiro e revalida o Firestore em segundo plano.

import {
  carregarDocumentoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  removerCachePublico,
  salvarCachePublico
} from "./public-data.js";

const STATIC_BANNERS = "data/banners-publico.json";

function aplicarBanner(heroEl, banner) {
  if (!banner) return false;
  let mudou = false;

  if (banner.imagem_url) {
    const img = heroEl.querySelector(".hero__background");
    if (img && img.getAttribute("src") !== banner.imagem_url) {
      const nextImage = new Image();
      nextImage.decoding = "async";
      nextImage.onload = () => {
        img.src = banner.imagem_url;
      };
      nextImage.src = banner.imagem_url;
      mudou = true;
    }
  }

  if (banner.titulo) {
    const t = heroEl.querySelector(".hero__title");
    if (t && t.textContent !== banner.titulo) {
      t.textContent = banner.titulo;
      mudou = true;
    }
  }

  if (banner.subtitulo) {
    const s = heroEl.querySelector(".hero__subtitle");
    if (s && s.textContent !== banner.subtitulo) {
      s.textContent = banner.subtitulo;
      mudou = true;
    }
  }

  return mudou;
}

async function init() {
  const heroEl = document.querySelector("[data-page-banner]");
  if (!heroEl) return;

  const slug = heroEl.dataset.pageBanner;
  if (!slug) return;

  const cacheKey = `banner:${slug}`;
  const cache = lerCachePublico(cacheKey);

  if (cache) {
    aplicarBanner(heroEl, cache);
  } else {
    try {
      const banners = await carregarJsonPublico(STATIC_BANNERS);
      if (banners?.[slug]) aplicarBanner(heroEl, banners[slug]);
    } catch (e) {
      console.warn(`Falha ao carregar snapshot do banner '${slug}':`, e);
    }
  }

  try {
    const banner = await carregarDocumentoFirestore(`banners/${slug}`);
    if (banner) {
      salvarCachePublico(cacheKey, banner);
      aplicarBanner(heroEl, banner);
    } else {
      removerCachePublico(cacheKey);
    }
  } catch (e) {
    console.warn(`Falha ao atualizar banner '${slug}' em segundo plano:`, e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
