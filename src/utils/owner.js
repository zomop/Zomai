/**
 * Owner bot = pemilik aplikasi Discord (orang yang bikin bot di Developer Portal).
 * Dideteksi otomatis dari Discord, tanpa perlu isi ID manual.
 * Bisa juga ditambah lewat env OWNER_IDS (dipisah koma) atau data/owners.json.
 */
'use strict';

const { Store } = require('./store');

const store = new Store('data/owners.json', { extra: [] });

let appOwners = null; // Set<string> | null = belum dideteksi

async function init() {
  try {
    await store.load();
  } catch {
    /* offline: pakai default */
  }
  return store.data;
}

function envIds() {
  return (process.env.OWNER_IDS || '')
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

async function detect(client) {
  appOwners = new Set(envIds());

  // 1) Lewat objek discord.js
  try {
    let app = client?.application;
    if (!app || !app.owner) app = await client.application?.fetch?.();
    const owner = app?.owner;
    if (owner) {
      if (owner.ownerId) {
        appOwners.add(owner.ownerId); // aplikasi milik Team → ownerId adalah user id
      } else if (owner.members) {
        for (const m of owner.members.values()) {
          const uid = m.user?.id || m.userId;
          if (uid) appOwners.add(uid);
        }
      } else if (owner.id) {
        appOwners.add(owner.id); // aplikasi milik user biasa
      }
    }
  } catch {
    /* lanjut ke REST */
  }

  // 2) Fallback REST kalau objeknya kosong
  if (appOwners.size === 0 && process.env.DISCORD_TOKEN) {
    try {
      const res = await fetch('https://discord.com/api/v10/applications/@me', {
        headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const j = await res.json();
        const owner = j?.owner;
        if (owner?.ownerId) appOwners.add(owner.ownerId);
        else if (owner?.id && !owner.members) appOwners.add(owner.id);
      }
    } catch {
      /* offline */
    }
  }

  for (const id of store.data.extra || []) appOwners.add(id);
  if (appOwners.size) console.log(`👑 Owner terdeteksi: ${[...appOwners].join(', ')}`);
  return appOwners;
}

async function ownerIds(client) {
  return appOwners ?? (await detect(client));
}

async function isOwner(client, userId) {
  if (!userId) return false;
  const ids = await ownerIds(client);
  return ids.has(String(userId));
}

/** Tambah owner manual (disimpan di data/owners.json) */
async function addOwner(client, userId) {
  const id = String(userId);
  if (!store.data.extra.includes(id)) {
    store.data.extra.push(id);
    await store.flush(true).catch(() => {});
  }
  (await ownerIds(client)).add(id);
  return true;
}

module.exports = { init, isOwner, ownerIds, addOwner, store };
