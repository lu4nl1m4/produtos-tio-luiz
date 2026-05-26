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
const BANNERS_OTIMIZADOS = new Set(["produtos", "receitas"]);

function otimizarImagemBanner(url, slug) {
  if (!url || !BANNERS_OTIMIZADOS.has(slug) || !url.includes("res.cloudinary.com")) return url;
  return url.replace(
    /\/image\/upload\/(?:[^/]+\/)?(v\d+\/)/,
    "/image/upload/f_auto,q_auto,c_limit,w_1200/$1"
  );
}

function trocarImagemAposCarregar(img, url) {
  img.dataset.bannerSrcPending = url;
  const nextImage = new Image();
  nextImage.decoding = "async";
  nextImage.onload = () => {
    if (img.dataset.bannerSrcPending === url && img.getAttribute("src") !== url) {
      img.src = url;
    }
  };
  nextImage.src = url;
}

function aplicarBanner(heroEl, banner) {
  if (!banner) return false;
  let mudou = false;
  const slug = heroEl.dataset.pageBanner || "";

  if (banner.imagem_url) {
    const imagemUrl = otimizarImagemBanner(banner.imagem_url, slug);
    const img = heroEl.querySelector(".hero__background");
    if (img && img.getAttribute("src") !== imagemUrl) {
      trocarImagemAposCarregar(img, imagemUrl);
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
