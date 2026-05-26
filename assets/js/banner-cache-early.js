// Applies a cached page banner as soon as the hero markup exists.
// This avoids showing the HTML fallback for a frame on repeat visits.
(function () {
  var PREFIX = "tioluiz_public_v2:";
  var hero = document.querySelector("[data-page-banner]");
  if (!hero || !hero.dataset.pageBanner) return;

  function read(key) {
    var raw = null;
    try { raw = localStorage.getItem(PREFIX + key); } catch {}
    if (!raw) {
      try { raw = sessionStorage.getItem(PREFIX + key); } catch {}
    }
    if (!raw) return null;
    try { return JSON.parse(raw).data || null; } catch { return null; }
  }

  function optimizeBannerImage(url, slug) {
    if (!url || (slug !== "produtos" && slug !== "receitas") || !url.includes("res.cloudinary.com")) return url;
    return url.replace(
      /\/image\/upload\/(?:[^/]+\/)?(v\d+\/)/,
      "/image/upload/f_auto,q_auto,c_limit,w_1200/$1"
    );
  }

  function swapImageWhenReady(img, url) {
    if (!img || img.getAttribute("src") === url) return;
    img.dataset.bannerSrcPending = url;
    var nextImage = new Image();
    nextImage.decoding = "async";
    nextImage.onload = function () {
      if (img.dataset.bannerSrcPending === url && img.getAttribute("src") !== url) {
        img.src = url;
      }
    };
    nextImage.src = url;
  }

  var banner = read("banner:" + hero.dataset.pageBanner);
  if (!banner) return;

  if (banner.imagem_url) {
    var imageUrl = optimizeBannerImage(banner.imagem_url, hero.dataset.pageBanner);
    swapImageWhenReady(hero.querySelector(".hero__background"), imageUrl);
  }

  if (banner.titulo) {
    var title = hero.querySelector(".hero__title");
    if (title && title.textContent !== banner.titulo) title.textContent = banner.titulo;
  }

  if (banner.subtitulo) {
    var subtitle = hero.querySelector(".hero__subtitle");
    if (subtitle && subtitle.textContent !== banner.subtitulo) subtitle.textContent = banner.subtitulo;
  }
})();
