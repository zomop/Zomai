/**
 * Discord Interactions Endpoint (Vercel Serverless)
 * Menangani semua slash command via HTTP — tanpa gateway, tanpa server 24 jam.
 * Cocok untuk Vercel (gratis, tanpa kartu kredit).
 *
 * Env wajib:
 * - DISCORD_PUBLIC_KEY  (Discord Developer Portal > General Information > Public Key)
 * - DISCORD_TOKEN       (bot token, untuk REST API)
 * - CLIENT_ID           (application ID)
 * Opsional:
 * - GITHUB_CHANNEL_ID   (channel notifikasi GitHub untuk /github-status)
 */
const crypto = require('crypto');
const { InteractionType, InteractionResponseType, InteractionResponseFlags } = require('discord-interactions');
const { EmbedBuilder } = require('discord.js');

const roblox = require('../src/utils/roblox');
const github = require('../src/utils/github');

const TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';
const API = 'https://discord.com/api/v10';

// ===== Helper =====

/** Baca raw body (Vercel Node functions tidak parse body otomatis) */
async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  if (!req.readable) return '';
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function discordAPI(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ZomaiBot/1.0 (https://github.com/zomop/Zomai, 1.0)',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord API ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function embed(title, description, color = 0x5865F2) {
  const e = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
  if (description) e.setDescription(description);
  return e;
}

function errEmbed(msg) {
  return embed('❌ Error', msg, 0xED4245);
}

function opt(data, name) {
  return data.options?.find(o => o.name === name)?.value;
}

function unix(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

function hasPerm(interaction, bit) {
  if (!interaction.member) return false;
  const perms = BigInt(interaction.member.permissions || '0');
  return (perms & BigInt(bit)) !== 0n;
}

const PERMS = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MANAGE_MESSAGES: 1n << 13n,
  MODERATE_MEMBERS: 1n << 40n,
};

// ===== Command handlers (semua menerima interaction, return EmbedBuilder) =====

async function handlePing() {
  return embed('🏓 Pong!', 'Bot aktif 24/7 lewat Vercel (mode Interactions — tanpa server).', 0x57F287);
}

async function handleRoblox(it) {
  const username = opt(it.data, 'username');
  const found = await roblox.getUserByUsername(username);
  if (!found) return errEmbed(`User **${username}** tidak ditemukan di Roblox.`);
  const d = await roblox.getUserById(found.id);
  if (!d) return errEmbed('Gagal mengambil detail user dari Roblox.');
  const created = new Date(d.created);
  const age = Math.floor((Date.now() - created.getTime()) / 86400000);
  const e = new EmbedBuilder()
    .setColor(d.isBanned ? 0xED4245 : 0xFF3B3B)
    .setTitle(`🎮 ${d.displayName} (@${d.name})`)
    .setURL(d.profileUrl)
    .setTimestamp();
  if (d.avatarUrl) e.setThumbnail(d.avatarUrl);
  if (d.description) e.setDescription(d.description.slice(0, 500));
  e.addFields(
    { name: '🆔 User ID', value: `\`${d.id}\``, inline: true },
    { name: '📅 Dibuat', value: `<t:${unix(created)}:D> (${age} hari lalu)`, inline: true },
    { name: '🚫 Status', value: d.isBanned ? '⛔ Banned' : '✅ Aktif', inline: true },
    { name: '👥 Followers', value: `${d.followers.toLocaleString('id-ID')}`, inline: true },
    { name: '➡️ Following', value: `${d.followings.toLocaleString('id-ID')}`, inline: true },
    { name: '🤝 Friends', value: `${d.friends.toLocaleString('id-ID')}`, inline: true },
    { name: '🟢 Online', value: d.isOnline ? `Ya${d.lastLocation ? ` • ${d.lastLocation}` : ''}` : 'Tidak', inline: true },
  );
  return e;
}

async function handleRobloxSearch(it) {
  const keyword = opt(it.data, 'keyword');
  const results = await roblox.searchUsers(keyword, 5);
  if (!results.length) return errEmbed(`Tidak ada user yang cocok dengan **${keyword}**`);
  return embed(
    `🔎 Hasil pencarian: "${keyword}"`,
    results.map((u, i) => `**${i + 1}.** [${u.displayName}](https://www.roblox.com/users/${u.id}/profile) (@${u.name}) — ID \`${u.id}\``).join('\n'),
    0xFF3B3B,
  );
}

async function handleGithubCheck(it) {
  const username = String(opt(it.data, 'username') || '').trim().replace(/^@/, '');
  const user = await github.getUser(username);
  if (!user) return errEmbed(`Akun GitHub **${username}** tidak ditemukan.`);
  const repos = await github.getUserRepos(username, 5);
  const e = new EmbedBuilder()
    .setColor(0x24292E)
    .setTitle(`🐙 ${user.name || user.login}`)
    .setURL(user.html_url)
    .setTimestamp();
  if (user.avatar_url) e.setThumbnail(user.avatar_url);
  e.setDescription(user.bio || '_Tidak ada bio_');
  e.addFields(
    { name: '👤 Username', value: `@${user.login}`, inline: true },
    { name: '🆔 ID', value: `${user.id}`, inline: true },
    { name: '📁 Public Repos', value: `${user.public_repos}`, inline: true },
    { name: '👥 Followers', value: `${user.followers}`, inline: true },
    { name: '➡️ Following', value: `${user.following}`, inline: true },
    { name: '📍 Lokasi', value: user.location || '—', inline: true },
    { name: '🏢 Company', value: user.company || '—', inline: true },
    { name: '📅 Gabung', value: `<t:${unix(user.created_at)}:D>`, inline: true },
  );
  if (repos?.length && Array.isArray(repos)) {
    e.addFields({
      name: '📚 5 Repo Terbaru',
      value: repos.map(r => `• [${r.name}](${r.html_url}) ⭐ ${r.stargazers_count} • 🍴 ${r.forks_count}`).join('\n'),
    });
  }
  return e;
}

function splitRepo(value) {
  const [owner, repo] = String(value || '').split('/').map(s => s?.trim());
  return owner && repo ? { owner, repo } : null;
}

async function handleGithubRepo(it) {
  const parsed = splitRepo(opt(it.data, 'repo'));
  if (!parsed) return errEmbed('Format harus **owner/repo**\nContoh: `zomop/Zomai`');
  const d = await github.getRepo(parsed.owner, parsed.repo);
  if (!d) return errEmbed(`Repo **${parsed.owner}/${parsed.repo}** tidak ditemukan atau private.`);
  const e = new EmbedBuilder()
    .setColor(0x24292E)
    .setTitle(`🐙 ${d.full_name}`)
    .setURL(d.html_url)
    .setDescription(d.description || '_Tidak ada deskripsi_')
    .setTimestamp();
  if (d.owner?.avatar_url) e.setThumbnail(d.owner.avatar_url);
  e.addFields(
    { name: '⭐ Stars', value: `${d.stargazers_count}`, inline: true },
    { name: '🍴 Forks', value: `${d.forks_count}`, inline: true },
    { name: '🔧 Language', value: d.language || '—', inline: true },
    { name: '📂 Open Issues', value: `${d.open_issues_count}`, inline: true },
    { name: '🌿 Default Branch', value: d.default_branch || '—', inline: true },
  );
  return e;
}

async function handleGithubPR(it) {
  const parsed = splitRepo(opt(it.data, 'repo'));
  if (!parsed) return errEmbed('Format harus **owner/repo**');
  const prs = await github.getOpenPRs(parsed.owner, parsed.repo, 5);
  if (!Array.isArray(prs) || !prs.length) {
    return embed('✅ Tidak ada PR terbuka', `Repo **${parsed.owner}/${parsed.repo}** sedang bersih.`, 0x57F287);
  }
  return embed(
    `🔀 PR Terbuka — ${parsed.owner}/${parsed.repo}`,
    prs.map(pr => `**[#${pr.number}](${pr.html_url})** ${pr.title}\n👤 @${pr.user.login} • ${pr.draft ? '📝 Draft' : '🔵 Siap review'}`).join('\n\n'),
    0x8957E5,
  );
}

async function handleAvatar(it) {
  const userId = opt(it.data, 'user') || it.member?.user?.id || it.user?.id;
  const user = await discordAPI(`/users/${userId}`);
  const url = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=1024`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  return embed(`🖼️ Avatar — ${user.global_name || user.username}`, null).setImage(url);
}

async function handleServerInfo(it) {
  const guild = await discordAPI(`/guilds/${it.guild_id}?with_counts=true`);
  const e = embed(`ℹ️ ${guild.name}`, null);
  if (guild.icon) e.setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`);
  e.addFields(
    { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
    { name: '👑 Owner', value: `<@${guild.owner_id}>`, inline: true },
    { name: '👥 Members', value: `${guild.approximate_member_count ?? '—'}`, inline: true },
    { name: '🟢 Online', value: `${guild.approximate_presence_count ?? '—'}`, inline: true },
    { name: '📅 Dibuat', value: `<t:${unix(guild.created_at)}:D>`, inline: true },
  );
  return e;
}

async function handleUserInfo(it) {
  const userId = opt(it.data, 'user') || it.member?.user?.id || it.user?.id;
  const user = await discordAPI(`/users/${userId}`);
  const e = embed(`ℹ️ ${user.global_name || user.username}`, null);
  if (user.avatar) e.setThumbnail(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`);
  e.addFields(
    { name: '👤 Username', value: `@${user.username}`, inline: true },
    { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
    { name: '🤖 Bot?', value: user.bot ? 'Ya' : 'Tidak', inline: true },
    { name: '📅 Akun Dibuat', value: `<t:${unix(user.createdAt || Date.now())}:D>`, inline: true },
  );
  return e;
}

async function handleBotInfo() {
  const me = await discordAPI('/users/@me');
  return embed('🤖 Zomai Bot', 'Bot multifungsi: cek Roblox, cek GitHub, moderasi, fun & utility.\nJalan 24/7 di Vercel (Interactions mode).')
    .addFields(
      { name: '🔗 Invite', value: `[Klik di sini](https://discord.com/oauth2/authorize?client_id=${me.id}&permissions=8&scope=bot%20applications.commands)`, inline: true },
      { name: '📦 Total Command', value: '22+', inline: true },
    );
}

async function handleHelp() {
  return embed('❓ Zomai Bot — Daftar Command', 'Semua command pakai slash `/`')
    .addFields(
      { name: '🎮 Roblox', value: '`/roblox <username>` — cek akun lengkap\n`/roblox-search <keyword>` — cari user' },
      { name: '🐙 GitHub', value: '`/github-check <username>` — cek akun GitHub\n`/github <owner/repo>` — info repo\n`/github-pr <owner/repo>` — PR terbuka' },
      { name: '🛠️ Utility', value: '`/ping` `/avatar` `/serverinfo` `/userinfo` `/botinfo` `/invite`' },
      { name: '🎲 Fun', value: '`/8ball <tanya>` `/coinflip` `/dice` `/meme`' },
      { name: '🛡️ Moderasi', value: '`/kick` `/ban` `/timeout` `/warn` `/clear`' },
    );
}

async function handleInvite() {
  const me = await discordAPI('/users/@me');
  return embed('🔗 Invite Zomai Bot', `Klik link ini untuk invite bot ke server kamu:\n\nhttps://discord.com/oauth2/authorize?client_id=${me.id}&permissions=8&scope=bot%20applications.commands`);
}

const ANSWERS = ['Ya, pasti!', 'Tidak, jangan harap.', 'Mungkin aja.', 'Tentu saja!', 'Jangan tanya lagi.', 'Bisa jadi.', '100% ya!', 'Tidak mungkin.', 'Tanya lagi nanti.', 'Sudah pasti!', 'Ragu-ragu nih.', 'Coba lagi deh!'];

async function handle8Ball(it) {
  const a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  return embed('🎱 Magic 8-Ball', null, 0x9B59B6)
    .addFields({ name: '❓ Pertanyaan', value: opt(it.data, 'pertanyaan') || '—' }, { name: '💬 Jawaban', value: `**${a}**` });
}

async function handleCoinflip() {
  return embed('🪙 Coin Flip', `Hasil: **${Math.random() < 0.5 ? 'Heads (Gambar)' : 'Tails (Angka)'}**`, 0xF1C40F);
}

async function handleDice(it) {
  const sides = Number(opt(it.data, 'sisi')) || 6;
  return embed('🎲 Lempar Dadu', `Dadu **${sides}** sisi → **${Math.floor(Math.random() * sides) + 1}**`, 0xE74C3C);
}

async function handleMeme() {
  const res = await fetch('https://meme-api.com/gimme/wholesomememes');
  const d = await res.json();
  const e = embed(d.title || 'Meme', null, 0xFF6B6B);
  if (d.url) e.setImage(d.url);
  e.setFooter({ text: `r/${d.subreddit || 'memes'} • 👍 ${d.ups ?? 0}` });
  return e;
}

// ===== Moderasi (REST API) =====

async function handleKick(it) {
  const userId = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  await discordAPI(`/guilds/${it.guild_id}/members/${userId}`, {
    method: 'DELETE',
    headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) },
  });
  return embed('👢 Member Di-kick', `<@${userId}> telah di-kick.\n**Alasan:** ${reason}`, 0x57F287);
}

async function handleBan(it) {
  const userId = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  await discordAPI(`/guilds/${it.guild_id}/bans/${userId}`, {
    method: 'PUT',
    headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) },
    body: JSON.stringify({ delete_message_seconds: 0 }),
  });
  return embed('🔨 Member Di-ban', `<@${userId}> telah di-ban.\n**Alasan:** ${reason}`, 0x57F287);
}

async function handleTimeout(it) {
  const userId = opt(it.data, 'user');
  const minutes = Number(opt(it.data, 'menit')) || 10;
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  await discordAPI(`/guilds/${it.guild_id}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'X-Audit-Log-Reason': encodeURIComponent(reason) },
    body: JSON.stringify({ communication_disabled_until: until }),
  });
  return embed('⏱️ Timeout', `<@${userId}> di-timeout **${minutes} menit**.\n**Alasan:** ${reason}`, 0x57F287);
}

async function handleClear(it) {
  const amount = Math.min(Math.max(Number(opt(it.data, 'jumlah')) || 10, 1), 100);
  const messages = await discordAPI(`/channels/${it.channel_id}/messages?limit=${amount}`);
  const ids = (messages || []).map(m => m.id);
  if (!ids.length) return embed('🧹 Clear', 'Tidak ada pesan untuk dihapus.', 0xFEE75C);
  if (ids.length === 1) {
    await discordAPI(`/channels/${it.channel_id}/messages/${ids[0]}`, { method: 'DELETE' });
  } else {
    await discordAPI(`/channels/${it.channel_id}/messages/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ messages: ids }),
    });
  }
  return embed('🧹 Clear', `Berhasil menghapus **${ids.length}** pesan.`, 0x57F287);
}

async function handleWarn(it) {
  const userId = opt(it.data, 'user');
  const reason = opt(it.data, 'alasan') || 'Tidak ada alasan';
  return embed('⚠️ Peringatan', `<@${userId}>, kamu mendapat peringatan.\n**Alasan:** ${reason}`, 0xFEE75C);
}

// ===== GitHub channel (mode env, karena serverless tanpa storage) =====

async function handleGithubStatus() {
  const ch = process.env.GITHUB_CHANNEL_ID;
  return embed('📡 Status Notifikasi GitHub', ch
    ? `Notifikasi dikirim ke <#${ch}>.\nUbah dengan mengganti env \`GITHUB_CHANNEL_ID\` di Vercel.`
    : 'Belum diset. Isi env `GITHUB_CHANNEL_ID` di Vercel dengan ID channel tujuan.', ch ? 0x57F287 : 0xFEE75C);
}

async function handleSetupGithub(it) {
  const channel = opt(it.data, 'channel');
  const repo = opt(it.data, 'repo');
  return embed('⚙️ Setup GitHub (Mode Vercel)', `Channel yang kamu pilih: <#${channel}>${repo ? `\nFilter repo: \`${repo}\`` : ''}\n\n**Langkah selanjutnya:**\n1. Buka Vercel → Settings → Environment Variables\n2. Tambah/ubah \`GITHUB_CHANNEL_ID\` = \`${channel}\`\n3. Redeploy (Deployments → ⋯ → Redeploy)\n4. Di GitHub → Settings → Webhooks → URL: \`https://<project>.vercel.app/api/github-webhook\``, 0x5865F2);
}

async function handleGithubDisable() {
  return embed('🛑 Matikan Notifikasi GitHub', 'Hapus env `GITHUB_CHANNEL_ID` di Vercel lalu redeploy untuk menghentikan notifikasi.', 0xFEE75C);
}

// ===== Router =====

const HANDLERS = {
  ping: handlePing,
  roblox: handleRoblox,
  'roblox-search': handleRobloxSearch,
  'github-check': handleGithubCheck,
  'github-user': handleGithubCheck,
  github: handleGithubRepo,
  'github-pr': handleGithubPR,
  avatar: handleAvatar,
  serverinfo: handleServerInfo,
  userinfo: handleUserInfo,
  botinfo: handleBotInfo,
  help: handleHelp,
  invite: handleInvite,
  '8ball': handle8Ball,
  coinflip: handleCoinflip,
  dice: handleDice,
  meme: handleMeme,
  kick: handleKick,
  ban: handleBan,
  timeout: handleTimeout,
  clear: handleClear,
  warn: handleWarn,
  'github-status': handleGithubStatus,
  'setup-github': handleSetupGithub,
  'github-disable': handleGithubDisable,
};

// Command yang butuh permission khusus — dicek sebelum defer supaya bisa ephemeral
const PERM_CHECKS = {
  kick: { bit: PERMS.KICK_MEMBERS, name: 'Kick Members' },
  ban: { bit: PERMS.BAN_MEMBERS, name: 'Ban Members' },
  timeout: { bit: PERMS.MODERATE_MEMBERS, name: 'Moderate Members' },
  warn: { bit: PERMS.MODERATE_MEMBERS, name: 'Moderate Members' },
  clear: { bit: PERMS.MANAGE_MESSAGES, name: 'Manage Messages' },
};

function sendEmbed(res, embedBuilder, ephemeral = false) {
  return res.status(200).json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embedBuilder.toJSON()],
      ...(ephemeral ? { flags: InteractionResponseFlags.EPHEMERAL } : {}),
    },
  });
}

async function editOriginal(token, embedBuilder) {
  const res = await fetch(`${API}/webhooks/${CLIENT_ID}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embedBuilder.toJSON()] }),
  });
  if (!res.ok) console.error('[interactions] editOriginal failed:', res.status, await res.text().catch(() => ''));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const raw = await readRawBody(req);
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (!PUBLIC_KEY) {
    console.error('[interactions] DISCORD_PUBLIC_KEY belum diset');
    return res.status(500).json({ error: 'DISCORD_PUBLIC_KEY belum diset di environment variables' });
  }
  if (!signature || !timestamp) return res.status(401).json({ error: 'Missing signature headers' });

  const valid = crypto.verify(
    null,
    Buffer.from(timestamp + raw),
    crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(PUBLIC_KEY, 'hex')]), format: 'der', type: 'spki' }),
    Buffer.from(signature, 'hex'),
  );
  if (!valid) return res.status(401).json({ error: 'Invalid request signature' });

  let interaction;
  try {
    interaction = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (interaction.type === InteractionType.PING) {
    return res.status(200).json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
    return res.status(400).json({ error: 'Unsupported interaction type' });
  }

  const name = interaction.data?.name;
  const handler = HANDLERS[name];
  if (!handler) {
    return sendEmbed(res, errEmbed(`Command **/${name}** belum tersedia di bot ini.`), true);
  }

  const check = PERM_CHECKS[name];
  if (check && !hasPerm(interaction, check.bit)) {
    return sendEmbed(res, errEmbed(`Kamu butuh permission **${check.name}** untuk memakai \`/${name}\`.`), true);
  }

  // Defer (thinking) supaya tidak kena batas 3 detik Discord
  res.status(200).json({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  });

  try {
    const result = await handler(interaction);
    await editOriginal(interaction.token, result);
  } catch (e) {
    console.error(`[interactions] /${name}:`, e);
    await editOriginal(interaction.token, errEmbed(e.message || 'Terjadi error. Coba lagi nanti.')).catch(() => {});
  }
};
