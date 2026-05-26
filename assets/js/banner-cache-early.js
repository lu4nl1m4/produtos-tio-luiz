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

  var banner = read("banner:" + hero.dataset.pageBanner);
  if (!banner) return;

  if (banner.imagem_url) {
    var img = hero.querySelector(".hero__background");
    if (img && img.getAttribute("src") !== banner.imagem_url) {
      img.src = banner.imagem_url;
    }
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
