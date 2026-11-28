/**
 * Sistem ekonomi + level (gaya owo bot).
 * Data disimpan lewat Store (awet walau bot di-restart).
 */
'use strict';

const { Store } = require('./store');

const store = new Store('data/economy.json', { users: {} });

const START_COINS = 500;

const JOBS = {
  petani: { label: '🌾 Petani', min: 90, max: 200 },
  nelayan: { label: '🐟 Nelayan', min: 100, max: 230 },
  kurir: { label: '🛵 Kurir', min: 110, max: 260 },
  barista: { label: '☕ Barista', min: 120, max: 280 },
  programmer: { label: '💻 Programmer', min: 150, max: 380 },
  miner: { label: '⛏️ Miner', min: 130, max: 320 },
  streamer: { label: '🎥 Streamer', min: 100, max: 450 },
};

const ANIMALS = [
  { name: '🐰 Kelinci', min: 20, max: 60, chance: 30 },
  { name: '🐦 Burung', min: 15, max: 50, chance: 25 },
  { name: '🦌 Rusa', min: 40, max: 110, chance: 18 },
  { name: '🐗 Babi Hutan', min: 55, max: 140, chance: 12 },
  { name: '🐺 Serigala', min: 80, max: 200, chance: 8 },
  { name: '🐉 Naga Kecil', min: 300, max: 800, chance: 2 },
];

const key = (guildId, userId) => `${guildId || 'dm'}_${userId}`;

function raw(guildId, userId) {
  const k = key(guildId, userId);
  if (!store.data.users[k]) {
    store.data.users[k] = {
      coins: START_COINS,
      xp: 0,
      level: 1,
      job: null,
      daily: 0,
      work: 0,
      hunt: 0,
      streak: 0,
      stats: { gambled: 0, won: 0, hunted: 0, commands: 0 },
      banner: null, // key banner preset atau URL custom
      owned: [], // banner yang sudah dibeli pakai koin
      createdAt: Date.now(),
    };
  }
  const u = store.data.users[k];
  u.stats = u.stats || { gambled: 0, won: 0, hunted: 0, commands: 0 };
  u.banner = u.banner || null;
  if (!Array.isArray(u.owned)) u.owned = [];
  return u;
}

function getUser(guildId, userId) {
  return raw(guildId, userId);
}

function addCoins(guildId, userId, amount) {
  const u = raw(guildId, userId);
  u.coins = Math.max(0, Math.round(u.coins + amount));
  store.touch();
  return u.coins;
}

function addXp(guildId, userId, amount = 15) {
  const u = raw(guildId, userId);
  u.xp += amount;
  u.stats.commands += 1;
  let leveled = false;
  const need = levelCost(u.level);
  while (u.xp >= need) {
    u.xp -= need;
    u.level += 1;
    leveled = true;
  }
  store.touch();
  return { leveled, level: u.level, xp: u.xp, need: levelCost(u.level) };
}

const levelCost = level => 100 + (level - 1) * 75;

const xpBar = u => {
  const need = levelCost(u.level);
  const filled = Math.min(10, Math.round((u.xp / need) * 10));
  return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
};

function top(guildId, limit = 10) {
  return Object.entries(store.data.users)
    .filter(([k]) => k.startsWith(`${guildId || 'dm'}_`))
    .map(([k, v]) => ({ id: k.split('_')[1], ...v }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, limit);
}

/** Sisa cooldown dalam ms (0 = siap) */
function cooldownLeft(last, ms) {
  return Math.max(0, (last || 0) + ms - Date.now());
}

function fmtDuration(ms) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h} jam ${m} menit`;
  if (m) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
}

const coins = n => `${Number(n || 0).toLocaleString('id-ID')} 🪙`;

async function init() {
  await store.load();
}

module.exports = {
  store,
  init,
  getUser,
  addCoins,
  addXp,
  levelCost,
  xpBar,
  top,
  cooldownLeft,
  fmtDuration,
  coins,
  JOBS,
  ANIMALS,
  START_COINS,
};
