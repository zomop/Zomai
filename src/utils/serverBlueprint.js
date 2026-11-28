/**
 * Blueprint server lengkap ala komunitas Zomai:
 * role pemisah + role staff + role biasa + role warna + kategori + channel + emoji + panel tiket/verifikasi.
 * Dipakai: `zomai build` (owner server / founder bot).
 */
'use strict';

const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { icon } = require('./png');

const SEP = {
  owner: '━━━━━━ 👑 OWNER ━━━━━━',
  staff: '━━━━━━ 🛡️ STAFF TEAM ━━━━━━',
  special: '━━━━━━ ⭐ SPESIAL ━━━━━━',
  member: '━━━━━━ 👥 BIASA ━━━━━━',
  color: '━━━━━━ 🎨 WARNA ━━━━━━',
};

// Urutan dari ATAS ke BAWAH — tiap role warnanya beda
const ROLES = [
  { name: SEP.owner, separator: true, color: 0x2b2d31 },
  { name: '👑 Owner', color: 0xf1c40f, hoist: true, perms: ['Administrator'] },

  { name: SEP.staff, separator: true, color: 0x2b2d31 },
  {
    name: '🔰 Admin',
    color: 0xe74c3c,
    hoist: true,
    perms: ['ManageGuild', 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ManageChannels', 'ManageRoles', 'ViewAuditLog', 'ManageWebhooks', 'MentionEveryone', 'ManageEvents'],
  },
  { name: '🛡️ Moderator', color: 0x3498db, hoist: true, perms: ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ViewAuditLog', 'MentionEveryone', 'ManageChannels'] },
  { name: '🔧 Helper', color: 0x2ecc71, hoist: true, perms: ['ManageMessages', 'ViewAuditLog'] },
  { name: '🎉 Event Host', color: 0xe67e22, hoist: true, perms: ['MentionEveryone', 'ManageEvents'] },
  { name: '🤖 Bot Dev', color: 0x9b59b6, hoist: false, perms: ['ViewAuditLog', 'ManageWebhooks'] },

  { name: SEP.special, separator: true, color: 0x2b2d31 },
  { name: '💎 VIP', color: 0x1abc9c, hoist: true, perms: [] },
  { name: '🚀 Booster', color: 0xeb459e, hoist: true, perms: [] },
  { name: '🏆 Legend', color: 0xf39c12, hoist: true, perms: [] },
  { name: '🤝 Partner', color: 0xfee75c, hoist: false, perms: [] },
  { name: '🎨 Artist', color: 0xe91e63, hoist: false, perms: [] },

  { name: SEP.member, separator: true, color: 0x2b2d31 },
  { name: '👤 Member', color: 0x95a5a6, hoist: true, perms: [], auto: true },
  { name: '✅ Verified', color: 0x57f287, hoist: true, perms: [] },
  { name: '🔥 Aktif', color: 0xff7f50, hoist: false, perms: [] },
  { name: '🌱 Newbie', color: 0x74b9ff, hoist: false, perms: [] },
  { name: '💤 AFK', color: 0x636e72, hoist: false, perms: [] },
  { name: '🔇 Muted', color: 0x4b4b4b, hoist: false, perms: [], muted: true },

  { name: SEP.color, separator: true, color: 0x2b2d31 },
  { name: '🔴 Merah', color: 0xff3b30, hoist: false, perms: [], selfAssign: true },
  { name: '🟠 Oranye', color: 0xff9500, hoist: false, perms: [], selfAssign: true },
  { name: '🟡 Kuning', color: 0xffd60a, hoist: false, perms: [], selfAssign: true },
  { name: '🟢 Hijau', color: 0x34c759, hoist: false, perms: [], selfAssign: true },
  { name: '🔵 Biru', color: 0x0a84ff, hoist: false, perms: [], selfAssign: true },
  { name: '🟣 Ungu', color: 0xbf5af2, hoist: false, perms: [], selfAssign: true },
  { name: '🟤 Coklat', color: 0xa2845e, hoist: false, perms: [], selfAssign: true },
  { name: '⚫ Hitam', color: 0x23272a, hoist: false, perms: [], selfAssign: true },
];

const CATEGORIES = [
  {
    name: '📢 INFORMASI',
    channels: [
      { name: 'welcome', topic: 'Selamat datang! Baca #rules dulu ya 👋', readOnly: true },
      { name: 'announcements', topic: 'Pengumuman penting dari staff 📣', readOnly: true },
      { name: 'rules', topic: 'Aturan server — wajib dibaca 📜', readOnly: true },
      { name: 'faq', topic: 'Pertanyaan yang sering ditanya ❓', readOnly: true },
      { name: 'verify', topic: 'Klik tombol ✅ Verifikasi biar dapat role Verified', readOnly: true },
    ],
  },
  {
    name: '💬 KOMUNITAS',
    channels: [
      { name: 'general', topic: 'Ngobrol santai di sini 💬' },
      { name: 'random', topic: 'Apa aja boleh 🎲' },
      { name: 'memes', topic: 'Meme receh harian 😂' },
      { name: 'media', topic: 'Foto, video, karya kamu 🎨' },
      { name: 'saran', topic: 'Ide & saran buat server 💡' },
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
    name: '🎫 TIKET & BANTUAN',
    channels: [
      { name: 'buat-tiket', topic: 'Klik tombol 🎫 Buka Tiket — bantuan dari staff', readOnly: true },
      { name: 'ticket-log', topic: 'Catatan tiket yang dibuka/ditutup 📋', staffOnly: true },
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

const findRole = (guild, name) => guild.roles.cache.find(r => r.name === name);
const roleIdWith = (guild, emojiOrName) => guild.roles.cache.find(r => r.name.includes(emojiOrName))?.id;

async function createRoles(guild, log) {
  const made = [];
  for (const def of ROLES) {
    let role = findRole(guild, def.name);
    if (!role) {
      role = await guild.roles.create({
        name: def.name,
        color: def.color ?? 0x99aab5,
        hoist: Boolean(def.hoist),
        mentionable: def.separator ? false : Boolean(def.hoist),
        permissions: def.separator ? [] : permBits(def.perms),
        reason: 'Zomai owner build: struktur role server',
      });
      made.push(def.name);
      log?.(`Role dibuat: ${def.name}`);
    } else {
      log?.(`Role sudah ada: ${def.name}`);
    }
    def.__id = role.id;
  }

  try {
    const positions = ROLES.filter(d => d.__id).map((d, idx) => ({ role: d.__id, position: ROLES.length - idx }));
    await guild.roles.setPositions(positions);
  } catch (e) {
    log?.(`Gagal atur urutan role: ${e.message}`);
  }
  return made;
}

async function createChannels(guild, log) {
  const everyone = guild.roles.everyone;
  const staffRoles = [roleIdWith(guild, 'Admin'), roleIdWith(guild, 'Moderator'), roleIdWith(guild, 'Helper')].filter(Boolean);
  const mutedId = roleIdWith(guild, 'Muted');
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
          const id = roleIdWith(guild, name);
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

const isEmpty = async channel => !(await channel.messages.fetch({ limit: 1 })).size;

/** Pesan awal: sambutan, aturan, panel verifikasi, panel tiket */
async function seedMessages(guild, log) {
  try {
    const c = name => guild.channels.cache.find(x => x.name === name);

    const welcome = c('welcome');
    if (welcome && (await isEmpty(welcome))) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👋 Selamat datang di ${guild.name}!`)
        .setDescription(
          'Kamu otomatis dapat role **👤 Member** begitu join 🎉\n\n' +
            '**Langkah cepat:**\n' +
            '1️⃣ Baca <#' + (c('rules')?.id || '') + '>\n' +
            '2️⃣ Klik tombol di <#' + (c('verify')?.id || '') + '> buat dapat role **✅ Verified**\n' +
            '3️⃣ Butuh bantuan? Buka tiket di <#' + (c('buat-tiket')?.id || '') + '>\n\n' +
            '**Coba bot-nya** (tanpa slash): `help` • `daily` • `roblox builderman` • `gh zomop` • `trivia`',
        )
        .setFooter({ text: 'Zomai Bot • bisa dipakai di server mana saja, bahkan di DM' });
      if (guild.iconURL()) embed.setThumbnail(guild.iconURL());
      await welcome.send({ embeds: [embed] });
      log?.('Pesan sambutan dikirim ke #welcome');
    }

    const rules = c('rules');
    if (rules && (await isEmpty(rules))) {
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
            .setFooter({ text: 'Join = otomatis dapat role 👤 Member' }),
        ],
      });
      log?.('Aturan dikirim ke #rules');
    }

    const verify = c('verify');
    if (verify && (await isEmpty(verify))) {
      await verify.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Verifikasi')
            .setDescription('Klik tombol di bawah buat dapat role **✅ Verified**.\nCuma butuh 1 klik, nggak ada syarat ribet.'),
        ],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('zomai_verify').setLabel('Verifikasi').setEmoji('✅').setStyle(ButtonStyle.Success))],
      });
      log?.('Panel verifikasi dikirim ke #verify');
    }

    const tiket = c('buat-tiket');
    if (tiket && (await isEmpty(tiket))) {
      await tiket.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎫 Butuh Bantuan?')
            .setDescription(
              'Klik tombol **Buka Tiket** di bawah.\n\n' +
                'Bot akan bikin channel privat cuma buat kamu + staff, jadi **nggak kelihatan member lain**.\n' +
                'Udah selesai? Klik **Tutup Tiket** di dalam channel tiket.',
            )
            .setFooter({ text: 'Jangan buka tiket buat hal yang bisa ditanya di #faq ya' }),
        ],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('zomai_ticket').setLabel('Buka Tiket').setEmoji('🎫').setStyle(ButtonStyle.Primary))],
      });
      log?.('Panel tiket dikirim ke #buat-tiket');
    }

    const faq = c('faq');
    if (faq && (await isEmpty(faq))) {
      await faq.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('❓ FAQ singkat')
            .setDescription(
              [
                '**Gimana cara pakai bot?** Ketik `help` — semua command bisa tanpa slash.',
                '**Kok nggak dapat role?** Join otomatis dapat 👤 Member. Verified lewat tombol di #verify.',
                '**Mau lapor/ngobrol sama staff?** Buka tiket di #buat-tiket.',
                '**Bot-nya bisa di DM?** Bisa, langsung chat bot-nya.',
              ].join('\n'),
            ),
        ],
      });
      log?.('FAQ dikirim ke #faq');
    }
  } catch (e) {
    log?.(`Gagal kirim pesan awal: ${e.message}`);
  }
}

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
