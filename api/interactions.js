/**
 * Zomai — Discord Interactions endpoint (Vercel serverless, zero dependency)
 *
 * Env wajib:
 *   DISCORD_PUBLIC_KEY   (Discord Developer Portal → General Information → Public Key)
 *   DISCORD_TOKEN        (bot token)
 *   CLIENT_ID            (application id)
 * Env opsional:
 *   GITHUB_CHANNEL_ID    (channel notifikasi GitHub)
 */
'use strict';

const crypto = require('crypto');

const TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
let PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API = 'https://discord.com/api/v10';

const TYPE_PONG = 1;
const TYPE_MESSAGE = 4;
const TYPE_DEFERRED = 5;
const FLAG_EPHEMERAL = 64;

// ==================== utils ====================
/** Kirim response pakai API Node murni (tidak bergantung helper platform) */
function send(res, code, obj) {
  if (res.headersSent) return;
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}


function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
    if (typeof req.body === 'string') return resolve(req.body);
    if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
    if (!req.readable) return resolve('');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Public key bot. Kalau env DISCORD_PUBLIC_KEY belum diisi, ambil otomatis
 * dari Discord (GET /applications/@me → verify_key) lalu di-cache.
 */
async function getPublicKey() {
  if (PUBLIC_KEY) return PUBLIC_KEY;
  const app = await api('/applications/@me');
  if (!app || !app.verify_key) throw new Error('verify_key tidak ada di response Discord');
  PUBLIC_KEY = app.verify_key;
  return PUBLIC_KEY;
}

function verifySignature(publicKeyHex, timestamp, raw, signatureHex) {
  const key = crypto.createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]),
    format: 'der',
    type: 'spki',
  });
  return crypto.verify(null, Buffer.from(timestamp + raw), key, Buffer.from(signatureHex, 'hex'));
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    signal: options.signal || AbortSignal.timeout(3000),
    headers: {
      Authorization: 'Bot ' + TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'ZomaiBot/1.0',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Discord API ${res.status}: ${t.slice(0, 180)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const emb = (title, description, color = 0x5865f2) => {
  const e = { color, title, timestamp: new Date().toISOString() };
  if (description) e.description = description;
  return e;
};
const errEmb = msg => emb('❌ Error', msg, 0xed4245);
const addFields = (e, fields) => {
  e.fields = fields.filter(Boolean);
  return e;
};
const opt = (data, name) => (data.options || []).find(o => o.name === name)?.value;
const unix = d => Math.floor(new Date(d).getTime() / 1000);
const num = n => Number(n || 0).toLocaleString('id-ID');
const fmtCount = n => (typeof n === 'number' ? n.toLocaleString('id-ID') : '—');

// ==================== Roblox / GitHub API ====================

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(options.timeout || 2500),
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'ZomaiBot/1.0', ...(options.headers || {}) },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const t = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${t.slice(0, 150)}`);
  }
  return res.json();
}

const RBX = 'https://users.roblox.com/v1';

async function rbxUserByName(username) {
  const d = await jsonFetch(`${RBX}/users/search`, { method: 'POST', body: JSON.stringify({ keyword: username, excludeBannedUsers: false }) });
  const list = d?.data || [];
  return list.find(u => u.name.toLowerCase() === String(username).toLowerCase()) || list[0] || null;
}

async function rbxUserById(id) {
  const u = await jsonFetch(`${RBX}/users/${id}`);
  if (!u) return null;
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const [fol, fing, fr, presence, thumb] = await Promise.allSettled([
    jsonFetch(`https://friends.roblox.com/v1/users/${id}/followers/count`),
    jsonFetch(`https://friends.roblox.com/v1/users/${id}/followings/count`),
    jsonFetch(`https://friends.roblox.com/v1/users/${id}/friends/count`),
    jsonFetch(`${RBX}/users/${id}/presence`),
    jsonFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png`),
  ]);
  const cnt = r => (r.status === 'fulfilled' && typeof r.value?.count === 'number' ? r.value.count : null);
  const p = presence.status === 'fulfilled' && presence.value ? presence.value.userPresence || {} : {};
  const img = thumb.status === 'fulfilled' && thumb.value ? thumb.value.data?.[0]?.imageUrl : null;
  return {
    id: u.id,
    name: u.name,
    displayName: u.displayName,
    created: u.created,
    description: u.description || '',
    isBanned: !!u.isBanned,
    followers: cnt(fol),
    followings: cnt(fing),
    friends: cnt(fr),
    isOnline: !!p.isOnline,
    lastLocation: p.lastLocation || null,
    avatarUrl: img,
    profileUrl: `https://www.roblox.com/users/${u.id}/profile`,
  };
}

async function rbxSearch(keyword, limit = 5) {
  const d = await jsonFetch(`${RBX}/users/search`, { method: 'POST', body: JSON.stringify({ keyword, excludeBannedUsers: false }) });
  return (d?.data || []).slice(0, limit);
}

const GH = 'https://api.github.com';
const ghFetch = path =>
  jsonFetch(GH + path, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

// ==================== handlers ====================

async function hPing() {
  return emb('🏓 Pong!', 'Bot aktif 24/7 lewat Vercel (mode Interactions — tanpa server).', 0x57f287);
}

async function hRoblox(it) {
  const username = String(opt(it.data, 'username') || '').trim();
  const found = /^\d{1,20}$/.test(username) ? { id: username } : await rbxUserByName(username);
  if (!found) return errEmb(`User **${username}** tidak ditemukan di Roblox.`);
  const d = await rbxUserById(found.id);
  if (!d) return errEmb('Gagal mengambil detail user dari Roblox.');
  const age = Math.floor((Date.now() - new Date(d.created).getTime()) / 86400000);
  const e = emb(`🎮 ${d.displayName} (@${d.name})`, (d.description || '').slice(0, 500) || null, d.isBanned ? 0xed4245 : 0xff3b3b);
  e.url = d.profileUrl;
  if (d.avatarUrl) e.thumbnail = { url: d.avatarUrl };
  return addFields(e, [
    { name: '🆔 User ID', value: '`' + d.id + '`', inline: true },
    { name: '📅 Dibuat', value: `<t:${unix(d.created)}:D> (${num(age)} hari)`, inline: true },
    { name: '🚫 Status', value: d.isBanned ? '⛔ Banned' : '✅ Aktif', inline: true },
    { name: '👥 Followers', value: fmtCount(d.followers), inline: true },
    { name: '➡️ Following', value: fmtCount(d.followings), inline: true },
    { name: '🤝 Friends', value: fmtCount(d.friends), inline: true },
    { name: '🟢 Online', value: d.isOnline ? 'Ya' + (d.lastLocation ? ` • ${d.lastLocation}` : '') : 'Tidak', inline: true },
  ]);
}

async function hRobloxSearch(it) {
  const keyword = opt(it.data, 'keyword');
  const list = await rbxSearch(keyword, 5);
  if (!list.length) return errEmb(`Tidak ada user yang cocok dengan **${keyword}**.`);
  return emb(
    `🔎 Hasil pencarian: "${keyword}"`,
    list.map((u, i) => `**${i + 1}.** [${u.displayName}](https://www.roblox.com/users/${u.id}/profile) (@${u.name}) — ID \`${u.id}\``).join('\n'),
    0xff3b3b,
  );
}

async function hGithubCheck(it) {
  const username = String(opt(it.data, 'username') || '').trim().replace(/^@/, '');
  const [u, reposRaw] = await Promise.all([
    ghFetch(`/users/${username}`),
    ghFetch(`/users/${username}/repos?per_page=5&sort=updated`).catch(() => []),
  ]);
  if (!u) return errEmb(`Akun GitHub **${username}** tidak ditemukan.`);
  const repos = Array.isArray(reposRaw) ? reposRaw : [];
  const e = emb(`🐙 ${u.name || u.login}`, u.bio || '_Tidak ada bio_', 0x24292e);
  e.url = u.html_url;
  if (u.avatar_url) e.thumbnail = { url: u.avatar_url };
  addFields(e, [
    { name: '👤 Username', value: `@${u.login}`, inline: true },
    { name: '🆔 ID', value: String(u.id), inline: true },
    { name: '📁 Public Repos', value: String(u.public_repos), inline: true },
    { name: '👥 Followers', value: num(u.followers), inline: true },
    { name: '➡️ Following', value: num(u.following), inline: true },
    { name: '📍 Lokasi', value: u.location || '—', inline: true },
    { name: '🏢 Company', value: u.company || '—', inline: true },
    { name: '📅 Gabung', value: `<t:${unix(u.created_at)}:D>`, inline: true },
  ]);
  if (Array.isArray(repos) && repos.length) {
    e.fields.push({
      name: '📚 5 Repo Terbaru',
      value: repos.map(r => `• [${r.name}](${r.html_url}) ⭐ ${r.stargazers_count} • 🍴 ${r.forks_count}`).join('\n'),
    });
  }
  return e;
}

const splitRepo = v => {
  const [o, r] = String(v || '').split('/').map(s => (s || '').trim());
  return o && r ? { owner: o, repo: r } : null;
};

async function hGithubRepo(it) {
  const p = splitRepo(opt(it.data, 'repo'));
  if (!p) return errEmb('Format harus **owner/repo**\nContoh: `zomop/Zomai`');
  const d = await ghFetch(`/repos/${p.owner}/${p.repo}`);
  if (!d) return errEmb(`Repo **${p.owner}/${p.repo}** tidak ditemukan atau private.`);
  const e = emb(`🐙 ${d.full_name}`, d.description || '_Tidak ada deskripsi_', 0x24292e);
  e.url = d.html_url;
  if (d.owner?.avatar_url) e.thumbnail = { url: d.owner.avatar_url };
  return addFields(e, [
    { name: '⭐ Stars', value: num(d.stargazers_count), inline: true },
    { name: '🍴 Forks', value: num(d.forks_count), inline: true },
    { name: '🔧 Language', value: d.language || '—', inline: true },
    { name: '📂 Open Issues', value: num(d.open_issues_count), inline: true },
    { name: '🌿 Default Branch', value: d.default_branch || '—', inline: true },
    { name: '👁️ Watchers', value: num(d.subscribers_count), inline: true },
  ]);
}

async function hGithubPR(it) {
  const p = splitRepo(opt(it.data, 'repo'));
  if (!p) return errEmb('Format harus **owner/repo**');
  const prs = await ghFetch(`/repos/${p.owner}/${p.repo}/pulls?state=open&per_page=5&sort=created&direction=desc`);
  const list = Array.isArray(prs) ? prs : [];
  if (!list.length) return emb('✅ Tidak ada PR terbuka', `Repo **${p.owner}/${p.repo}** sedang bersih.`, 0x57f287);
  return emb(
    `🔀 PR Terbuka — ${p.owner}/${p.repo}`,
    list.map(pr => `**[#${pr.number}](${pr.html_url})** ${pr.title}\n👤 @${pr.user.login} • ${pr.draft ? '📝 Draft' : '🔵 Siap review'}`).join('\n\n'),
    0x8957e5,
  );
}

async function hAvatar(it) {
  const id = opt(it.data, 'user') || it.member?.user?.id || it.user?.id;
  const u = await api(`/users/${id}`);
  const url = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith('a_') ? 'gif' : 'png'}?size=1024`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
  const e = emb(`🖼️ Avatar — ${u.global_name || u.username}`, null);
  e.image = { url };
  return e;
}

async function hServerInfo(it) {
  if (!it.guild_id) return errEmb('Command ini cuma bisa dipakai di server. Kalau di DM, coba `userinfo`.');
  const g = await api(`/guilds/${it.guild_id}?with_counts=true`);
  const e = emb(`ℹ️ ${g.name}`, null);
  if (g.icon) e.thumbnail = { url: `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` };
  return addFields(e, [
    { name: '🆔 ID', value: '`' + g.id + '`', inline: true },
    { name: '👑 Owner', value: `<@${g.owner_id}>`, inline: true },
    { name: '👥 Members', value: num(g.approximate_member_count), inline: true },
    { name: '🟢 Online', value: num(g.approximate_presence_count), inline: true },
    { name: '📅 Dibuat', value: `<t:${unix(g.created_at)}:D>`, inline: true },
  ]);
}

async function hUserInfo(it) {
  const id = opt(it.data, 'user') || it.member?.user?.id || it.user?.id;
  const u = await api(`/users/${id}`);
  const e = emb(`ℹ️ ${u.global_name || u.username}`, null);
  if (u.avatar) e.thumbnail = { url: `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` };
  return addFields(e, [
    { name: '👤 Username', value: `@${u.username}`, inline: true },
    { name: '🆔 ID', value: '`' + u.id + '`', inline: true },
    { name: '🤖 Bot?', value: u.bot ? 'Ya' : 'Tidak', inline: true },
  ]);
}

async function hBotInfo() {
  const me = await api('/users/@me');
  const e = emb('🤖 Zomai Bot', 'Bot multifungsi: cek Roblox, cek GitHub, moderasi, fun & utility.\nJalan 24/7 di Vercel (Interactions mode).');
  return addFields(e, [
    { name: '🔗 Invite', value: `[Klik di sini](https://discord.com/oauth2/authorize?client_id=${me.id}&permissions=8&scope=bot%20applications.commands)`, inline: true },
    { name: '📦 Command', value: '25', inline: true },
  ]);
}

async function hHelp() {
  const e = emb('❓ Zomai Bot — Daftar Command', 'Semua command pakai slash `/`');
  return addFields(e, [
    { name: '🎮 Roblox', value: '`/roblox <username>` — cek akun lengkap\n`/roblox-search <keyword>` — cari user' },
    { name: '🐙 GitHub', value: '`/github-check <username>` — cek akun\n`/github <owner/repo>` — info repo\n`/github-pr <owner/repo>` — PR terbuka' },
    { name: '🛠️ Utility', value: '`/ping` `/avatar` `/serverinfo` `/userinfo` `/botinfo` `/invite`' },
    { name: '🎲 Fun', value: '`/8ball <tanya>` `/coinflip` `/dice` `/meme`' },
    { name: '🛡️ Moderasi', value: '`/kick` `/ban` `/timeout` `/warn` `/clear`' },
  ]);
}

async function hInvite() {
  const me = await api('/users/@me');
  return emb('🔗 Invite Zomai Bot', `Klik link ini untuk invite bot ke server kamu:\n\nhttps://discord.com/oauth2/authorize?client_id=${me.id}&permissions=8&scope=bot%20applications.commands`);
}

const ANSWERS = ['Ya, pasti!', 'Tidak, jangan harap.', 'Mungkin aja.', 'Tentu saja!', 'Jangan tanya lagi.', 'Bisa jadi.', '100% ya!', 'Tidak mungkin.', 'Tanya lagi nanti.', 'Sudah pasti!', 'Ragu-ragu nih.', 'Coba lagi deh!'];

async function h8Ball(it) {
  const e = emb('🎱 Magic 8-Ball', null, 0x9b59b6);
  return addFields(e, [
    { name: '❓ Pertanyaan', value: String(opt(it.data, 'pertanyaan') || '—') },
    { name: '💬 Jawaban', value: '**' + ANSWERS[Math.floor(Math.random() * ANSWERS.length)] + '**' },
  ]);
}

async function hCoinflip() {
  return emb('🪙 Coin Flip', `Hasil: **${Math.random() < 0.5 ? 'Heads (Gambar)' : 'Tails (Angka)'}**`, 0xf1c40f);
}

async function hDice(it) {
  const sides = Number(opt(it.data, 'sisi')) || 6;
  return emb('🎲 Lempar Dadu', `Dadu **${sides}** sisi → **${Math.floor(Math.random() * sides) + 1}**`, 0xe74c3c);
}

async function hMeme() {
  const d = await jsonFetch('https://meme-api.com/gimme/wholesomememes');
  const e = emb(d?.title || 'Meme', null, 0xff6b6b);
  if (d?.url) e.image = { url: d.url };
  e.footer = { text: `r/${d?.subreddit || 'memes'} • 👍 ${d?.ups ?? 0}` };
  return e;
}

// ---------- moderasi ----------

async function hKick(it) {
  const id = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  await api(`/guilds/${it.guild_id}/members/${id}`, { method: 'DELETE', headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) } });
  return emb('👢 Member Di-kick', `<@${id}> telah di-kick.\n**Alasan:** ${reason}`, 0x57f287);
}

async function hBan(it) {
  const id = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  await api(`/guilds/${it.guild_id}/bans/${id}`, {
    method: 'PUT',
    headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) },
    body: JSON.stringify({ delete_message_seconds: 0 }),
  });
  return emb('🔨 Member Di-ban', `<@${id}> telah di-ban.\n**Alasan:** ${reason}`, 0x57f287);
}

async function hTimeout(it) {
  const id = opt(it.data, 'user');
  const menit = Number(opt(it.data, 'menit')) || 10;
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  const until = new Date(Date.now() + menit * 60000).toISOString();
  await api(`/guilds/${it.guild_id}/members/${id}`, {
    method: 'PATCH',
    headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) },
    body: JSON.stringify({ communication_disabled_until: until }),
  });
  return emb('⏱️ Timeout', `<@${id}> di-timeout **${menit} menit**.\n**Alasan:** ${reason}`, 0x57f287);
}

async function hClear(it) {
  const amount = Math.min(Math.max(Number(opt(it.data, 'jumlah')) || 10, 1), 100);
  const msgs = (await api(`/channels/${it.channel_id}/messages?limit=${amount}`)) || [];
  const ids = msgs.map(m => m.id);
  if (!ids.length) return emb('🧹 Clear', 'Tidak ada pesan untuk dihapus.', 0xfee75c);
  if (ids.length === 1) await api(`/channels/${it.channel_id}/messages/${ids[0]}`, { method: 'DELETE' });
  else await api(`/channels/${it.channel_id}/messages/bulk-delete`, { method: 'POST', body: JSON.stringify({ messages: ids }) });
  return emb('🧹 Clear', `Berhasil menghapus **${ids.length}** pesan.`, 0x57f287);
}

async function hWarn(it) {
  const id = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  return emb('⚠️ Peringatan', `<@${id}>, kamu mendapat peringatan.\n**Alasan:** ${reason}`, 0xfee75c);
}

// ---------- github channel (mode env) ----------

async function hGithubStatus() {
  const ch = process.env.GITHUB_CHANNEL_ID;
  return emb(
    '📡 Status Notifikasi GitHub',
    ch ? `Notifikasi dikirim ke <#${ch}>.\nUbah dengan mengganti env \`GITHUB_CHANNEL_ID\`.` : 'Belum diset. Isi env `GITHUB_CHANNEL_ID` di Vercel dengan ID channel tujuan.',
    ch ? 0x57f287 : 0xfee75c,
  );
}

async function hSetupGithub(it) {
  const ch = opt(it.data, 'channel');
  const repo = opt(it.data, 'repo');
  const app = process.env.APP_URL || 'https://zomai-bot-andre-dev4.vercel.app';
  const hookUrl = `${app}/api/github-webhook?channel=${ch}${repo ? `&repo=${repo}` : ''}`;
  return emb(
    '⚙️ Setup GitHub — siap pakai',
    `**Buka GitHub → repo → Settings → Webhooks → Add webhook**\n` +
      `• **Payload URL:**\n\`${hookUrl}\`\n` +
      `• **Content type:** \`application/json\`\n` +
      `• **Secret:** \`zomaigh2026\`\n` +
      `• **Events:** Pull requests, Pushes, Issues, Releases, Stars, Forks, Workflow runs\n\n` +
      `Setelah disimpan, PR di-merge / push / issue otomatis masuk ke <#${ch}>.`,
    0x5865f2,
  );
}

async function hGithubDisable() {
  return emb('🛑 Matikan Notifikasi GitHub', 'Hapus env `GITHUB_CHANNEL_ID` di Vercel lalu redeploy.', 0xfee75c);
}


// ---------- fallback: game tanpa ekonomi (dipakai kalau bot gateway sedang mati) ----------

function hNoEconomy(it) {
  const name = it?.data?.name || 'daily';
  return emb(
    '💰 Command ekonomi jalan tanpa slash',
    `Ketik langsung di chat (tanpa \`/\`):\n\n\`${name}\`\n\n` +
      'Alasannya: saldo, level, dan cooldown disimpan oleh bot online, sedangkan slash lewat server Vercel yang nggak punya data itu.\n' +
      'Semua command lain (roblox, github, mod, fun) tetap bisa pakai slash.',
    0xfee75c,
  );
}

const SLOT_ICONS = ['🍒', '🍋', '🍊', '🔔', '💎', '7️⃣'];

async function hSlots() {
  const r = [0, 0, 0].map(() => SLOT_ICONS[Math.floor(Math.random() * SLOT_ICONS.length)]);
  const jackpot = r[0] === r[1] && r[1] === r[2];
  const e = emb(jackpot ? '🎉 JACKPOT!' : '🎰 Slot', '```\n┃ ' + r.join(' ┃ ') + ' ┃\n```', jackpot ? 0xf1c40f : 0x5865f2);
  e.footer = { text: 'Taruhan koin hanya tersedia saat bot online' };
  return e;
}

const RPS_ICON = { batu: '🪨', gunting: '✂️', kertas: '📄' };
const RPS_BEAT = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };

async function hRps(it) {
  const map = { batu: 'batu', gunting: 'gunting', kertas: 'kertas', rock: 'batu', paper: 'kertas', scissors: 'gunting' };
  const me = map[String(opt(it.data, 'pilihan') || '').toLowerCase()];
  if (!me) return errEmb('Pilih: `batu`, `gunting`, atau `kertas`');
  const bot = Object.keys(RPS_ICON)[Math.floor(Math.random() * 3)];
  const win = RPS_BEAT[me] === bot;
  const draw = me === bot;
  return emb(draw ? '🤝 Seri!' : win ? '🎉 Kamu menang!' : '😢 Kamu kalah', `Kamu: ${RPS_ICON[me]} **${me}**\nZomai: ${RPS_ICON[bot]} **${bot}**`, draw ? 0xfee75c : win ? 0x57f287 : 0xed4245);
}

function shortHash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 100;
  return h;
}

async function hShip(it) {
  const target = opt(it.data, 'user');
  const pct = Math.max(1, Math.min(100, shortHash([it.user?.id, target].sort().join(':') + '') + 10));
  const bar = '💖'.repeat(Math.round(pct / 10)) + '🖤'.repeat(10 - Math.round(pct / 10));
  return emb('💘 Love Meter', `${bar}\n**${pct}%**`, 0xff73fa);
}

async function hRate(it) {
  const target = opt(it.data, 'user') || it.user?.id;
  const score = (shortHash(String(target) + Date.now().toString().slice(0, -4)) % 100) + 1;
  return emb('⭐ Rating', `**${score}/100**`, 0xf1c40f);
}


// ---------- /verify & /tiket ----------
async function hVerify(it) {
  if (!it.guild_id) return errEmb('Verifikasi cuma bisa di server, bukan di DM.');
  const userId = it.member?.user?.id || it.user?.id;
  const role = await findRoleByName(it.guild_id, 'Verified');
  if (!role) return errEmb('Role **✅ Verified** belum ada di server ini. Owner server bisa jalankan `zomai build` dulu.');
  const r = await fetch(`${API}/guilds/${it.guild_id}/members/${userId}/roles/${role.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'ZomaiBot/1.0', 'X-Audit-Log-Reason': 'Verifikasi via /verify' },
  }).catch(() => null);
  if (r && (r.ok || r.status === 204)) return emb('✅ Terverifikasi!', `Kamu sekarang punya role **${role.name}**.`, 0x57f287);
  const detail = r ? (await r.text().catch(() => '')).slice(0, 150) : 'gagal konek';
  return errEmb(`Gagal kasih role (pastikan role bot di atas role Verified).\n\`${detail}\``);
}

async function hTicket(it) {
  if (!it.guild_id) return errEmb('Tiket cuma bisa dibuka di server.');
  const aksi = String(opt(it.data, 'aksi') || 'buka').toLowerCase();
  if (['tutup', 'close', 'selesai'].includes(aksi)) {
    return errEmb('Buat menutup tiket, klik tombol **Tutup Tiket** di channel tiket, atau ketik `tiket tutup` di sana.');
  }
  const user = it.member?.user || it.user;
  try {
    const { channel, existing } = await createTicketChannel(it.guild_id, user);
    return emb(
      existing ? '🎫 Tiket kamu sudah ada' : '🎫 Tiket dibuka',
      existing ? `Channel tiket kamu: <#${channel.id}>` : `Channel privat kamu: <#${channel.id}>\nCuma kamu + staff yang bisa lihat.`,
      existing ? 0xfee75c : 0x57f287,
    );
  } catch (e) {
    return errEmb(e.message);
  }
}

// ==================== router ====================

const HANDLERS = {
  owner: () => errEmb('🔒 Command owner cuma bisa lewat chat biasa, dan cuma buat pemilik bot.'),
  ping: hPing,
  roblox: hRoblox,
  'roblox-search': hRobloxSearch,
  'github-check': hGithubCheck,
  'github-user': hGithubCheck,
  github: hGithubRepo,
  verify: hVerify,
  tiket: hTicket,
  'github-pr': hGithubPR,
  avatar: hAvatar,
  serverinfo: hServerInfo,
  userinfo: hUserInfo,
  botinfo: hBotInfo,
  help: hHelp,
  invite: hInvite,
  '8ball': h8Ball,
  coinflip: hCoinflip,
  dice: hDice,
  meme: hMeme,
  kick: hKick,
  ban: hBan,
  timeout: hTimeout,
  clear: hClear,
  warn: hWarn,
  'github-status': hGithubStatus,
  'setup-github': hSetupGithub,
  'github-disable': hGithubDisable,
  // ekonomi (butuh bot online)
  balance: hNoEconomy,
  daily: hNoEconomy,
  work: hNoEconomy,
  job: hNoEconomy,
  hunt: hNoEconomy,
  bet: hNoEconomy,
  pay: hNoEconomy,
  leaderboard: hNoEconomy,
  profile: hNoEconomy,
  banner: hNoEconomy,
  trivia: hNoEconomy,
  // game tanpa ekonomi
  slots: hSlots,
  rps: hRps,
  ship: hShip,
  rate: hRate,
};

// Command yang cepat (tanpa API eksternal) → dijawab langsung, tanpa "thinking"
const INSTANT = new Set([
  'ping', 'help', '8ball', 'coinflip', 'dice', 'github-status', 'github-disable',
  'setup-github', 'warn', 'avatar', 'serverinfo', 'userinfo', 'botinfo', 'invite',
  'kick', 'ban', 'timeout', 'clear', 'verify', 'tiket',
]);

const PERM_CHECKS = {
  kick: [1n << 1n, 'Kick Members'],
  ban: [1n << 2n, 'Ban Members'],
  timeout: [1n << 40n, 'Moderate Members'],
  warn: [1n << 40n, 'Moderate Members'],
  clear: [1n << 13n, 'Manage Messages'],
};

function reply(res, embed, ephemeral) {
  const data = { embeds: [embed] };
  if (ephemeral) data.flags = FLAG_EPHEMERAL;
  send(res, 200, { type: TYPE_MESSAGE, data });
}

async function editOriginal(token, embed) {
  return patchOriginal(token, { embeds: [embed] });
}

async function patchOriginal(token, data) {
  const r = await fetch(`${API}/webhooks/${CLIENT_ID}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) console.error('[zomai] patchOriginal', r.status, (await r.text().catch(() => '')).slice(0, 200));
}


// ==================== tombol (message components) ====================

const compReply = (res, content) =>
  send(res, 200, { type: TYPE_MESSAGE, data: { content, flags: FLAG_EPHEMERAL } });

const findRoleByName = async (guildId, part) => {
  const roles = await api(`/guilds/${guildId}/roles`).catch(() => []);
  return (Array.isArray(roles) ? roles : []).find(r => r.name.includes(part)) || null;
};

async function cVerify(it, res) {
  const guildId = it.guild_id;
  const userId = it.member?.user?.id || it.user?.id;
  compReply(res, '⏳ Sebentar, memverifikasi…');

  const role = await findRoleByName(guildId, 'Verified');
  if (!role) return patchOriginal(it.token, { content: '❌ Role **✅ Verified** belum ada di server ini. Minta owner server jalankan `zomai build` dulu.' });

  const r = await fetch(`${API}/guilds/${guildId}/members/${userId}/roles/${role.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'ZomaiBot/1.0', 'X-Audit-Log-Reason': 'Verifikasi lewat tombol' },
  }).catch(() => null);

  if (r && (r.ok || r.status === 204)) {
    return patchOriginal(it.token, { content: `✅ Terverifikasi! Kamu sekarang punya role **${role.name}**. Selamat bergabung 🎉` });
  }
  const detail = r ? (await r.text().catch(() => '')).slice(0, 150) : 'gagal konek';
  return patchOriginal(it.token, { content: `❌ Gagal kasih role (pastikan role bot di atas role Verified).\n\`${detail}\`` });
}

async function createTicketChannel(guildId, user) {
  const allChannels = await api(`/guilds/${guildId}/channels`).catch(() => []);
  const channels = Array.isArray(allChannels) ? allChannels : [];
  const name = `tiket-${String(user.username || 'user').toLowerCase()}`.slice(0, 90);

  const existing = channels.find(c => c.name === name && c.type === 0);
  if (existing) return { channel: existing, existing: true };

  const roles = await api(`/guilds/${guildId}/roles`).catch(() => []);
  const roleList = Array.isArray(roles) ? roles : [];
  const staff = roleList.filter(r => /Admin|Moderator|Helper/.test(r.name)).map(r => r.id);
  const everyone = roleList.find(r => r.name === '@everyone');
  const category = channels.find(c => c.type === 4 && c.name.includes('TIKET'));

  // bit: ViewChannel 1024 • SendMessages 2048 • ManageMessages 8192 • AttachFiles 32768 • ReadMessageHistory 65536 • AddReactions 64 • ManageChannels 16
  const USER_ALLOW = 1024 + 2048 + 65536 + 32768 + 64;
  const STAFF_ALLOW = 1024 + 2048 + 8192 + 65536;
  const BOT_ALLOW = 1024 + 2048 + 8192 + 65536 + 16;

  const overwrites = [
    { id: everyone?.id || guildId, type: 0, deny: '1024' },
    { id: user.id, type: 1, allow: String(USER_ALLOW) },
    { id: CLIENT_ID, type: 1, allow: String(BOT_ALLOW) },
  ];
  for (const id of staff) overwrites.push({ id, type: 0, allow: String(STAFF_ALLOW) });

  const created = await api(`/guilds/${guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      type: 0,
      parent_id: category?.id || null,
      topic: `Tiket ${user.username} • dibuka lewat Zomai`,
      permission_overwrites: overwrites,
    }),
  }).catch(() => null);

  if (!created?.id) throw new Error('Gagal bikin channel tiket. Pastikan bot punya permission **Manage Channels**.');

  await api(`/channels/${created.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: `<@${user.id}>${staff.length ? ' ' + staff.map(id => `<@&${id}>`).join(' ') : ''}`,
      embeds: [
        {
          color: 0x5865f2,
          title: '🎫 Tiket Dibuka',
          description:
            `Halo <@${user.id}>! Staff bakal bantu sebentar lagi.\n\n` +
            '**Tulis masalah/kebutuhanmu di sini** — jelaskan sedetail mungkin ya.\n' +
            'Channel ini **privat**: cuma kamu + staff yang bisa lihat.',
          footer: { text: 'Zomai Ticket System' },
          timestamp: new Date().toISOString(),
        },
      ],
      components: [{ type: 1, components: [{ type: 2, style: 4, label: 'Tutup Tiket', emoji: { name: '🔒' }, custom_id: 'zomai_ticket_close' }] }],
    }),
  }).catch(() => {});

  return { channel: created, existing: false };
}

async function cTicketOpen(it, res) {
  const user = it.member?.user || it.user;
  compReply(res, '⏳ Membuat channel tiket…');
  try {
    const { channel, existing } = await createTicketChannel(it.guild_id, user);
    return patchOriginal(it.token, {
      content: existing ? `🎫 Kamu sudah punya tiket: <#${channel.id}>` : `🎫 Tiket kamu sudah dibuka: <#${channel.id}>\nCuma kamu + staff yang bisa lihat channel itu.`,
    });
  } catch (e) {
    return patchOriginal(it.token, { content: `❌ ${e.message}` });
  }
}

async function cTicketClose(it, res) {
  const channelId = it.channel_id;
  const user = it.member?.user || it.user;
  compReply(res, '🔒 Menutup tiket…');

  // catat ke #ticket-log kalau ada
  try {
    const channels = await api(`/guilds/${it.guild_id}/channels`).catch(() => []);
    const logCh = (Array.isArray(channels) ? channels : []).find(c => c.name === 'ticket-log');
    if (logCh) {
      await api(`/channels/${logCh.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: `🔒 Tiket <#${channelId}> ditutup oleh <@${user.id}>.` }),
      }).catch(() => {});
    }
  } catch {}

  await fetch(`${API}/channels/${channelId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'ZomaiBot/1.0', 'X-Audit-Log-Reason': 'Tiket ditutup' },
  }).catch(() => {});
}

async function handleComponent(it, res) {
  const id = it.data?.custom_id || '';
  if (!it.guild_id) return compReply(res, 'Tombol ini cuma bisa dipakai di server.');

  try {
    if (id === 'zomai_verify') return await cVerify(it, res);
    if (id === 'zomai_ticket') return await cTicketOpen(it, res);
    if (id === 'zomai_ticket_close') return await cTicketClose(it, res);
    return compReply(res, 'Tombol ini sudah nggak dipakai.');
  } catch (e) {
    console.error('[zomai] component', id, e.message);
    if (!res.headersSent) return compReply(res, `❌ Error: ${e.message}`);
    return patchOriginal(it.token, { content: `❌ Error: ${e.message}` }).catch(() => {});
  }
}

async function handle(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    await getPublicKey();
  } catch (e) {
    console.error('[zomai] gagal ambil public key:', e.message);
    return send(res, 500, { error: 'Public key bot tidak bisa diambil', detail: e.message });
  }

  const raw = await readRawBody(req);
  const sig = req.headers['x-signature-ed25519'];
  const ts = req.headers['x-signature-timestamp'];
  if (!sig || !ts) return send(res, 401, { error: 'Missing signature headers' });

  let ok = false;
  try {
    ok = verifySignature(PUBLIC_KEY, ts, raw, sig);
  } catch (e) {
    console.error('[zomai] verify', e.message);
    return send(res, 401, { error: 'Signature verification failed', detail: e.message });
  }
  if (!ok) return send(res, 401, { error: 'Invalid request signature' });

  let it;
  try {
    it = JSON.parse(raw);
  } catch {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  if (it.type === 1) return send(res, 200, { type: TYPE_PONG });
  if (it.type === 3) return handleComponent(it, res);
  if (it.type !== 2) return send(res, 400, { error: 'Unsupported interaction type' });

  const name = it.data?.name;
  const handler = HANDLERS[name];
  if (!handler) return reply(res, errEmb(`Command **/${name}** belum tersedia.`), true);

  const check = PERM_CHECKS[name];
  if (check) {
    const perms = BigInt(it.member?.permissions || '0');
    if ((perms & check[0]) === 0n) return reply(res, errEmb(`Kamu butuh permission **${check[1]}** untuk memakai \`/${name}\`.`), true);
  }

  // Command cepat → balas langsung (tanpa status "thinking")
  if (INSTANT.has(name)) {
    try {
      return reply(res, await handler(it), false);
    } catch (e) {
      console.error(`[zomai] /${name}:`, e.message);
      return reply(res, errEmb(e.message || 'Terjadi error. Coba lagi nanti.'), true);
    }
  }

  // Command yang manggil API luar (Roblox/GitHub/meme) → defer supaya tidak kena limit 3 detik
  send(res, 200, { type: TYPE_DEFERRED });

  try {
    const embed = await handler(it);
    await editOriginal(it.token, embed);
  } catch (e) {
    console.error(`[zomai] /${name}:`, e.message);
    await editOriginal(it.token, errEmb(e.message || 'Terjadi error. Coba lagi nanti.')).catch(() => {});
  }
};

module.exports = async (req, res) => {
  try {
    return await handle(req, res);
  } catch (e) {
    console.error('[zomai] fatal:', e);
    return send(res, 500, { error: 'Internal error', detail: e.message });
  }
};
