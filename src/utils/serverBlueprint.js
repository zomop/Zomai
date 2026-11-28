/**
 * Blueprint server lengkap ala komunitas Zomai:
 * role pemisah (separator) + role staff + role biasa + kategori + channel + emoji kustom.
 * Dipakai oleh command owner: `zomai build`
 */
'use strict';

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { icon } = require('./png');

const SEP = {
  owner: '━━━━━━ 👑 OWNER ━━━━━━',
  staff: '━━━━━━ 🛡️ STAFF TEAM ━━━━━━',
  special: '━━━━━━ ⭐ SPESIAL ━━━━━━',
  member: '━━━━━━ 👥 BIASA ━━━━━━',
};

// Urutan dari ATAS ke BAWAH
const ROLES = [
  // 🔹 pemisah OWNER
  { name: SEP.owner, separator: true, color: 0x2b2d31 },
  {
    name: '👑 Owner',
    color: 0xf1c40f,
    hoist: true,
    perms: ['Administrator'],
  },

  // 🔹 pemisah STAFF TEAM
  { name: SEP.staff, separator: true, color: 0x2b2d31 },
  {
    name: '🔰 Admin',
    color: 0xe74c3c,
    hoist: true,
    perms: ['ManageGuild', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ManageChannels', 'ManageRoles', 'ViewAuditLog', 'ManageWebhooks', 'MentionEveryone', 'ManageEvents'],
  },
  {
    name: '🛡️ Moderator',
    color: 0x3498db,
    hoist: true,
    perms: ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog', 'MentionEveryone'],
  },
  {
    name: '🔧 Helper',
    color: 0x2ecc71,
    hoist: true,
    perms: ['ManageMessages', 'ViewAuditLog'],
  },
  {
    name: '🎉 Event Host',
    color: 0xe67e22,
    hoist: true,
    perms: ['MentionEveryone', 'ManageEvents'],
  },
  {
    name: '🤖 Bot Dev',
    color: 0x9b59b6,
    hoist: false,
    perms: ['ViewAuditLog', 'ManageWebhooks'],
  },

  // 🔹 pemisah SPESIAL
  { name: SEP.special, separator: true, color: 0x2b2d31 },
  { name: '💎 VIP', color: 0x1abc9c, hoist: true, perms: [] },
  { name: '🚀 Booster', color: 0xeb459e, hoist: true, perms: [] },
  { name: '🤝 Partner', color: 0xfee75c, hoist: false, perms: [] },
  { name: '🎨 Artist', color: 0xe91e63, hoist: false, perms: [] },

  // 🔹 pemisah BIASA (member)
  { name: SEP.member, separator: true, color: 0x2b2d31 },
  { name: '👤 Member', color: 0x95a5a6, hoist: true, perms: [] },
  { name: '✅ Verified', color: 0x57f287, hoist: false, perms: [] },
  { name: '🌱 Newbie', color: 0x99aab5, hoist: false, perms: [] },
  { name: '🔇 Muted', color: 0x4b4b4b, hoist: false, perms: [], muted: true },
];

const CATEGORIES = [
  {
    name: '📢 INFORMASI',
    channels: [
      { name: 'welcome', topic: 'Selamat datang! Baca #rules dulu ya 👋', readOnly: true },
      { name: 'announcements', topic: 'Pengumuman penting dari staff 📣', readOnly: true },
      { name: 'rules', topic: 'Aturan server — wajib dibaca 📜', readOnly: true },
      { name: 'faq', topic: 'Pertanyaan yang sering ditanya ❓', readOnly: true },
    ],
  },
  {
    name: '💬 KOMUNITAS',
    channels: [
      { name: 'general', topic: 'Ngobrol santai di sini 💬' },
      { name: 'random', topic: 'Apa aja boleh 🎲' },
      { name: 'memes', topic: 'Meme receh harian 😂' },
      { name: 'media', topic: 'Foto, video, karya kamu 🎨' },
    ],
  },
  {
    name: '🤖 ZOMAI & BOT',
    channels: [
      { name: 'bot-commands', topic: 'Pakai bot tanpa slash: `help`, `daily`, `roblox nama` 🤖' },
      { name: 'roblox', topic: 'Cek akun Roblox: `roblox builderman` 🎮' },
      { name: 'github', topic: 'Cek GitHub: `gh zomop` • `github zomop/Zomai` 🐙' },
      { name: 'webhook', topic: 'Notifikasi GitHub otomatis (PR, push, issue) 🔔', readOnly: true },
    ],
  },
  {
    name: '🛡️ STAFF TEAM',
    staffOnly: true,
    channels: [
      { name: 'staff-chat', topic: 'Obrolan internal staff 🗣️' },
      { name: 'staff-log', topic: 'Log aksi staff 📋' },
      { name: 'mod-log', topic: 'Log moderasi otomatis 🔨' },
    ],
  },
  {
    name: '🔊 VOICE',
    channels: [
      { name: 'General', type: 'voice' },
      { name: 'Music', type: 'voice' },
      { name: 'Chill', type: 'voice' },
      { name: 'AFK', type: 'voice' },
    ],
  },
];

const EMOJIS = [
  { name: 'zomai_coin', file: 'coin' },
  { name: 'zomai_heart', file: 'heart' },
  { name: 'zomai_star', file: 'star' },
  { name: 'zomai_shield', file: 'shield' },
  { name: 'zomai_crown', file: 'crown' },
  { name: 'zomai_check', file: 'check' },
];

const permBits = names => (names || []).reduce((acc, n) => acc | (PermissionFlagsBits[n] ?? 0n), 0n);

/** Cek role lama → dipakai supaya build bisa diulang tanpa dobel */
const findRole = (guild, name) => guild.roles.cache.find(r => r.name === name);
const findChannel = (guild, name) => guild.channels.cache.find(c => c.name === name);

async function createRoles(guild, log) {
  const made = [];
  for (const def of ROLES) {
    let role = findRole(guild, def.name);
    if (!role) {
      role = await guild.roles.create({
        name: def.name,
        color: def.color ?? 0x99aab5,
        hoist: Boolean(def.hoist),
        mentionable: false,
        permissions: def.separator ? [] : permBits(def.perms),
        reason: 'Zomai owner build: struktur role server',
      });
      made.push(def.name);
      log?.(`Role dibuat: ${def.name}`);
    } else {
      log?.(`Role sudah ada: ${def.name}`);
    }
    def.__id = role.id;
    def.__muted = Boolean(def.muted);
  }

  // Urutkan role sesuai blueprint (atas ke bawah)
  try {
    const positions = ROLES.filter(d => d.__id).map((d, idx) => ({
      role: d.__id,
      position: ROLES.length - idx,
    }));
    await guild.roles.setPositions(positions);
  } catch (e) {
    log?.(`Gagal atur urutan role: ${e.message}`);
  }
  return made;
}

const roleIdByPrefix = (guild, prefix) => guild.roles.cache.find(r => r.name.includes(prefix))?.id;

async function createChannels(guild, log) {
  const everyone = guild.roles.everyone;
  const staffRoles = [roleIdByPrefix(guild, 'Admin'), roleIdByPrefix(guild, 'Moderator'), roleIdByPrefix(guild, 'Helper')].filter(Boolean);
  const mutedId = roleIdByPrefix(guild, 'Muted');
  const made = [];

  for (const cat of CATEGORIES) {
    let category = guild.channels.cache.find(c => c.name === cat.name && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory, reason: 'Zomai owner build' });
      made.push(cat.name);
      log?.(`Kategori dibuat: ${cat.name}`);
    }

    for (const def of cat.channels) {
      const isVoice = def.type === 'voice';
      const existing = guild.channels.cache.find(c => c.name === def.name && c.parentId === category.id);
      if (existing) {
        log?.(`Channel sudah ada: ${def.name}`);
        continue;
      }
      const overwrites = [];
      if (cat.staffOnly) {
        overwrites.push({ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
        for (const id of staffRoles) overwrites.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
      } else if (def.readOnly) {
        overwrites.push({ id: everyone.id, deny: isVoice ? [PermissionFlagsBits.Speak] : [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads] });
        for (const name of ['Admin', 'Moderator', 'Helper']) {
          const id = roleIdByPrefix(guild, name);
          if (id) overwrites.push({ id, allow: isVoice ? [PermissionFlagsBits.Speak] : [PermissionFlagsBits.SendMessages] });
        }
      }
      if (mutedId && !isVoice) {
        overwrites.push({ id: mutedId, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.Speak] });
      }

      await guild.channels.create({
        name: def.name,
        type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: category.id,
        topic: def.topic,
        permissionOverwrites: overwrites,
        reason: 'Zomai owner build',
      });
      made.push(def.name);
      log?.(`Channel dibuat: ${def.name}`);
    }
  }
  return made;
}

async function createEmojis(guild, log) {
  const made = [];
  for (const e of EMOJIS) {
    if (guild.emojis.cache.find(x => x.name === e.name)) {
      log?.(`Emoji sudah ada: :${e.name}:`);
      continue;
    }
    try {
      await guild.emojis.create({ attachment: icon(e.file), name: e.name, reason: 'Zomai owner build' });
      made.push(e.name);
      log?.(`Emoji dibuat: :${e.name}:`);
    } catch (err) {
      log?.(`Emoji gagal (${e.name}): ${err.message}`);
    }
  }
  return made;
}

/** Kirim pesan sambutan + aturan kalau channel-nya baru dibuat */
async function seedMessages(guild, log) {
  try {
    const welcome = guild.channels.cache.find(c => c.name === 'welcome');
    const rules = guild.channels.cache.find(c => c.name === 'rules');
    if (welcome && !(await welcome.messages.fetch({ limit: 1 })).size) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👋 Selamat datang di ${guild.name}!`)
        .setDescription(
          'Bot **Zomai** siap dipakai di sini — tanpa perlu slash, cukup ketik:\n' +
            '`help` • `daily` • `roblox builderman` • `gh zomop` • `trivia`\n\n' +
            'Baca <#' + (rules?.id || '') + '> dulu ya, dan ambil role **👤 Member** di role list.',
        )
        .setFooter({ text: 'Zomai Bot • bisa dipakai di server mana saja, bahkan di DM' });
      if (guild.iconURL()) embed.setThumbnail(guild.iconURL());
      await welcome.send({ embeds: [embed] });
      log?.('Pesan sambutan dikirim ke #welcome');
    }
    if (rules && !(await rules.messages.fetch({ limit: 1 })).size) {
      await rules.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle('📜 Aturan Server')
            .setDescription(
              [
                '**1.** Saling menghormati, no toxic & no SARA.',
                '**2.** Promosi/jualan hanya di channel yang disediakan.',
                '**3.** Dilarang spam, flood, atau tag @everyone.',
                '**4.** Konten dewasa/NSFW dilarang keras.',
                '**5.** Ikuti arahan staff. Keputusan staff bersifat final.',
              ].join('\n'),
            )
            .setFooter({ text: 'Belum punya role? Ambil 👤 Member di role list.' }),
        ],
      });
      log?.('Aturan dikirim ke #rules');
    }
  } catch (e) {
    log?.(`Gagal kirim pesan awal: ${e.message}`);
  }
}

/**
 * Bangun / lengkapi server.
 * @param {import('discord.js').Guild} guild
 * @param {{ roles?: boolean, channels?: boolean, emojis?: boolean, messages?: boolean, log?: (s:string)=>void }} opts
 */
async function buildServer(guild, opts = {}) {
  const log = opts.log;
  const result = { roles: [], channels: [], emojis: [] };
  if (opts.roles !== false) result.roles = await createRoles(guild, log);
  if (opts.channels !== false) result.channels = await createChannels(guild, log);
  if (opts.emojis !== false) result.emojis = await createEmojis(guild, log);
  if (opts.messages !== false) await seedMessages(guild, log);
  return result;
}

module.exports = { ROLES, CATEGORIES, EMOJIS, SEP, buildServer, createRoles, createChannels, createEmojis, seedMessages };
