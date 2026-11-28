/**
 * Daftar banner animasi (GIF) buat `zomai profile`.
 *
 * File GIF-nya ada di `assets/banners/*.gif` dan disajikan lewat CDN publik,
 * jadi Discord bisa langsung memutarnya di dalam embed.
 * Kalau mau pakai CDN lain: set env BANNER_CDN ke folder-nya.
 */
'use strict';

const CDN = (
  process.env.BANNER_CDN || 'https://cdn.jsdelivr.net/gh/zomop/Zomai@main/assets/banners'
).replace(/\/+$/, '');

const LIST = [
  { key: 'neon', label: 'Neon', emoji: '🌆', color: 0x9b59ff, level: 0, price: 0 },
  { key: 'ocean', label: 'Ocean', emoji: '🌊', color: 0x0ea5e9, level: 0, price: 0 },
  { key: 'sakura', label: 'Sakura', emoji: '🌸', color: 0xff7aa2, level: 0, price: 0 },
  { key: 'galaxy', label: 'Galaxy', emoji: '🌌', color: 0x6d5cff, level: 3, price: 0 },
  { key: 'fire', label: 'Fire', emoji: '🔥', color: 0xff6b1a, level: 5, price: 0 },
  { key: 'aurora', label: 'Aurora', emoji: '🌠', color: 0x2dd4bf, level: 8, price: 0 },
  { key: 'matrix', label: 'Matrix', emoji: '🟩', color: 0x22c55e, level: 10, price: 0 },
  { key: 'gold', label: 'Gold VIP', emoji: '👑', color: 0xffc93c, level: 0, price: 5000 },
];

const DEFAULT = 'neon';

const byKey = key => LIST.find(b => b.key === String(key || '').toLowerCase()) || null;

const assetUrl = key => `${CDN}/${key}.gif`;

/** status: 'free' (boleh langsung pakai), 'owned' (sudah dibeli), 'buy' (perlu beli), 'level' (kurang level) */
function state(user, banner) {
  if (!banner) return 'free';
  if (banner.price > 0) {
    const owned = Array.isArray(user?.owned) ? user.owned : [];
    return owned.includes(banner.key) ? 'owned' : 'buy';
  }
  if (banner.level > 0 && (user?.level || 1) < banner.level) return 'level';
  return 'free';
}

/** Banner yang lagi dipakai user (preset atau URL custom). */
function resolve(value) {
  if (!value) {
    const def = byKey(DEFAULT);
    return { ...def, url: assetUrl(def.key), custom: false };
  }
  const preset = byKey(value);
  if (preset) return { ...preset, url: assetUrl(preset.key), custom: false };
  return { key: 'custom', label: 'Custom', emoji: '🖼️', color: 0x5865f2, url: String(value), custom: true };
}

const isUrl = v => /^https?:\/\/\S+$/i.test(String(v || '').trim());

const IMAGE_EXT = /\.(gif|png|jpe?g|webp|avif)(\?|#|$)/i;

/** Cek URL gambar: HTTPS + kelihatan kayak gambar (tanpa perlu fetch). */
function looksLikeImage(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    return IMAGE_EXT.test(u.pathname) || /(tenor|giphy|discordapp|discord)/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Coba fetch HEAD buat mastiin itu gambar (best effort, timeout 4 detik). */
async function verifyImage(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1023', 'User-Agent': 'ZomaiBot/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok && res.status !== 206) return { ok: false, reason: `HTTP ${res.status}` };
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type && !type.startsWith('image/')) return { ok: false, reason: `bukan gambar (${type})` };
    return { ok: true, type: type || 'image/*' };
  } catch (e) {
    return { ok: false, reason: e.name === 'TimeoutError' ? 'timeout' : e.message };
  }
}

/** Semua banner + status buat user ini */
function listFor(user) {
  return LIST.map(b => ({ ...b, url: assetUrl(b.key), status: state(user, b) }));
}

module.exports = { LIST, DEFAULT, CDN, byKey, assetUrl, state, resolve, isUrl, looksLikeImage, verifyImage, listFor };
