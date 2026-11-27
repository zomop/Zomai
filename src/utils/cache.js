/**
 * Cache sederhana dengan TTL — supaya pencarian Roblox/GitHub yang sama
 * tidak bolak-balik nembak API (ini penyebab utama "thinking" lama).
 */
'use strict';

const store = new Map();

/**
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fn
 */
async function cached(key, ttlMs, fn) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.value;

  const promise = fn();
  store.set(key, { value: promise, exp: now + ttlMs });
  try {
    const value = await promise;
    store.set(key, { value, exp: now + ttlMs });
    return value;
  } catch (e) {
    store.delete(key);
    throw e;
  }
}

function clear() {
  store.clear();
}

// Bersihkan entri kedaluwarsa tiap 10 menit
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.exp <= now) store.delete(k);
}, 600000).unref?.();

module.exports = { cached, clear };
