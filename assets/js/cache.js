// Cache simples em sessionStorage com TTL.
// Reduz fetches do Firestore durante a navegação interna do site
// (categorias, produtos e home_cards mudam raramente — TTL curto resolve).

const PREFIX = "tioluiz_cache_v1:";

function safeGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { ts, ttl, data } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function safeSet(key, data, ttl) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ ts: Date.now(), ttl, data }));
  } catch {
    // QuotaExceeded ou modo privado — ignora.
  }
}

// Envolve uma factory async com cache. Se houver versão válida em cache, retorna ela.
// Senão chama a factory, persiste o resultado e retorna.
export async function cached(key, ttlMs, factory) {
  const hit = safeGet(key);
  if (hit !== null) return hit;
  const fresh = await factory();
  safeSet(key, fresh, ttlMs);
  return fresh;
}

// Invalida uma chave (útil se algum dia o admin público fizer write).
export function invalidate(key) {
  try { sessionStorage.removeItem(PREFIX + key); } catch {}
}
