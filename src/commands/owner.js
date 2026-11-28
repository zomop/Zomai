/**
 * 🔒 OWNER — command tersembunyi.
 *
 * Ada 2 tingkat akses:
 *   1) FOUNDER bot (pemilik aplikasi Discord / env OWNER_IDS) → akses tertinggi, semua aksi, bisa di mana saja.
 *   2) OWNER SERVER (pemilik server / punya Administrator) → boleh bangun server-nya sendiri
 *      (build/roles/channels/emoji/say), TIDAK bisa aksi tingkat bot (stats/claim).
 *
 * Privasi: balasan di chat biasa otomatis dihapus (30 detik) dan pesan pemicunya juga dihapus.
 * Di slash → ephemeral (cuma yang ngetik yang lihat). Ada juga `zomai dm` buat kirim panel ke DM.
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isOwner, ownerIds, addOwner } = require('../utils/owner');
const { buildServer, createRoles, createChannels, createEmojis, seedMessages, ROLES, CATEGORIES, EMOJIS, SEP } = require('../utils/serverBlueprint');
const { fmtDuration } = require('../utils/economy');
const eco = require('../utils/economy');
const { openTicket } = require('../utils/tickets');

const COLOR = 0x2b2d31;
const AUTO_DELETE_MS = 30000;

// ==================== privasi ====================
/** Balasan yang cuma kelihatan 1 orang: ephemeral (slash) atau auto-hapus (chat biasa) */
function makePrivate(interaction) {
  const isText = Boolean(interaction.__message);
  const cleanup = [];
  const priv = {
    isText,
    async reply(payload) {
      if (!isText) return interaction.reply({ ...payload, ephemeral: true });
      const sent = await interaction.reply(payload);
      if (sent) cleanup.push(sent);
      if (interaction.__message?.deletable) cleanup.push(interaction.__message);
      return sent;
    },
    async edit(payload) {
      if (!isText) return interaction.editReply(payload).catch(() => {});
      const sent = await interaction.editReply(payload).catch(() => null);
      if (sent) cleanup.push(sent);
      return sent;
    },
    /** Jadwalkan hapus pesan supaya nggak numpuk di channel */
    autoCleanup(ms = AUTO_DELETE_MS) {
      if (!isText) return;
      setTimeout(() => {
        for (const m of cleanup) m?.delete?.().catch?.(() => {});
      }, ms).unref?.();
    },
  };
  return priv;
}

// ==================== panel ====================
const panelEmbed = (guildCount, tier) => {
  const e = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🔒 Owner Panel — Zomai')
    .setDescription(
      tier === 'founder'
        ? 'Kamu **founder bot** — akses tertinggi. Balasan ini cuma kelihatan kamu.'
        : 'Kamu **owner server** — bisa bangun server ini. Balasan ini cuma kelihatan kamu.',
    )
    .addFields(
      ...[
      {
        name: '🏗️ Bangun server',
        value: '`zomai build` — role + pemisah + semua channel + emoji + panel tiket/verify\n`zomai roles` • `zomai channels` • `zomai emoji`',
        inline: false,
      },
      {
        name: '🧰 Lainnya',
        value: '`zomai dm` — kirim panel ini ke DM kamu\n`zomai say <pesan>` — pengumuman\n`zomai tiket` — buka tiket buat kamu\n`zomai whoami` — cek ID kamu',
        inline: false,
      },
      tier === 'founder'
        ? { name: '👑 Khusus founder', value: '`zomai stats` — statistik bot\n`zomai claim <kode>` — klaim owner darurat', inline: false }
        : false,
      {
        name: '🧱 Isi build',
        value:
          `**${ROLES.length} role** + **${Object.keys(SEP).length} role pemisah** (OWNER • STAFF TEAM • SPESIAL • BIASA • WARNA)\n` +
          `**${CATEGORIES.length} kategori** • **${CATEGORIES.reduce((a, c) => a + c.channels.length, 0)} channel**\n` +
          `**${EMOJIS.length} emoji kustom** • panel **verifikasi** & **tiket** otomatis`,
        inline: false,
      },
      ].filter(Boolean),
    )
    .setFooter({ text: guildCount ? `Bot ada di ${guildCount} server • hidden command` : 'hidden command' })
    .setTimestamp();
  return e;
};

/** Log progres build dengan throttle */
function makeProgress(priv) {
  const lines = [];
  let last = 0;
  let pending = null;
  const render = async () => {
    last = Date.now();
    const body = lines.slice(-12).join('\n') || '…';
    await priv.edit({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('🏗️ Membangun server…').setDescription('```\n' + body + '\n```')] });
  };
  return {
    log: msg => {
      lines.push(msg);
      if (Date.now() - last > 1500 && !pending) {
        pending = setTimeout(() => {
          pending = null;
          render();
        }, 100);
      }
    },
    flush: async () => {
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      await render();
    },
  };
}

// ==================== command ====================
module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('🔒 Owner only')
    .addStringOption(o => o.setName('aksi').setDescription('build / roles / channels / emoji / say / dm / panel').setRequired(false))
    .addStringOption(o => o.setName('isi').setDescription('Teks tambahan (untuk say / claim)').setRequired(false)),
  async execute(interaction) {
    const client = interaction.client;
    const user = interaction.user;
    const guild = interaction.guild;

    const founder = await isOwner(client, user?.id);
    const isServerOwner = Boolean(guild && guild.ownerId === user?.id);
    const isAdmin = Boolean(guild && (interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)));
    const canBuild = founder || isServerOwner || isAdmin;
    const priv = makePrivate(interaction);

    // Bukan siapa-siapa → diam total di chat biasa, senyap di slash
    if (!canBuild) {
      if (!interaction.__message) await interaction.reply({ content: '❌ Command ini cuma buat owner server.', ephemeral: true }).catch(() => {});
      return;
    }

    const aksi = (interaction.options.getString('aksi') || 'panel').toLowerCase();
    const isi = interaction.options.getString('isi') || '';
    const tier = founder ? 'founder' : 'server';

    // ---------- panel / dm / whoami ----------
    if (['panel', 'help', 'menu'].includes(aksi)) {
      await priv.reply({ embeds: [panelEmbed(client.guilds.cache.size, tier)] });
      priv.autoCleanup();
      return;
    }

    if (aksi === 'dm') {
      const sent = await user.send({ embeds: [panelEmbed(client.guilds.cache.size, tier)] }).catch(() => null);
      if (interaction.__message) await interaction.__message.delete().catch(() => {});
      if (sent && !interaction.__message) await interaction.reply({ content: '📩 Panel dikirim ke DM kamu.', ephemeral: true }).catch(() => {});
      return;
    }

    if (aksi === 'whoami') {
      const ids = [...(await ownerIds(client))];
      await priv.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🪪 Akses kamu')
            .setDescription(
              `ID: \`${user.id}\`\n` +
                `Founder bot: ${founder ? '✅ ya' : '—'}\n` +
                `Owner server ini: ${isServerOwner ? '✅ ya' : '—'}\n` +
                `Admin server ini: ${isAdmin ? '✅ ya' : '—'}\n\n` +
                `Founder terdaftar: ${ids.map(i => `\`${i}\``).join(', ') || '—'}`,
            ),
        ],
      });
      priv.autoCleanup();
      return;
    }

    // ---------- khusus founder ----------
    if (aksi === 'claim') {
      const ids = await ownerIds(client);
      if (ids.size > 0 && !founder) {
        await priv.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Owner sudah terdeteksi, claim nggak perlu.')] });
        priv.autoCleanup();
        return;
      }
      const secret = process.env.OWNER_SECRET || process.env.SETUP_SECRET || 'zomai2026';
      if (isi.trim() !== secret) {
        await priv.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Kode salah.')] });
        priv.autoCleanup();
        return;
      }
      await addOwner(client, user.id);
      await priv.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ <@${user.id}> sekarang founder bot (akses tertinggi).`)] });
      priv.autoCleanup();
      return;
    }

    if (aksi === 'stats') {
      if (!founder) {
        await priv.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('`zomai stats` cuma buat founder bot.')] });
        priv.autoCleanup();
        return;
      }
      const ids = [...(await ownerIds(client))];
      const economyUsers = Object.keys(eco.store?.data?.users || {}).length;
      await priv.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('📊 Statistik Zomai')
            .addFields(
              { name: '🏠 Server', value: `${client.guilds.cache.size}`, inline: true },
              { name: '👥 User cache', value: `${client.users.cache.size}`, inline: true },
              { name: '📡 Ping', value: `${Math.round(client.ws.ping)} ms`, inline: true },
              { name: '⏱️ Uptime', value: fmtDuration(client.uptime || 0), inline: true },
              { name: '💰 Data ekonomi', value: `${economyUsers} akun`, inline: true },
              { name: '👑 Founder', value: ids.map(i => `<@${i}>`).join(', ') || '—', inline: false },
            )
            .setTimestamp(),
        ],
      });
      priv.autoCleanup();
      return;
    }

    // ---------- butuh server ----------
    if (!guild) {
      await priv.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Aksi ini cuma bisa di server (bukan DM).')] });
      priv.autoCleanup();
      return;
    }

    if (aksi === 'say') {
      const text = isi.trim();
      if (!text) {
        await priv.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Tulis pesannya: `zomai say halo semua`')] });
        priv.autoCleanup();
        return;
      }
      if (interaction.__message) await interaction.__message.delete().catch(() => {});
      else await interaction.reply({ content: '📣 Dikirim.', ephemeral: true }).catch(() => {});
      return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(text).setFooter({ text: '📣 Pengumuman' })] });
    }

    if (aksi === 'tiket' || aksi === 'ticket') {
      const { channel, existing } = await openTicket(guild, user, { reason: isi });
      await priv.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(existing ? 0xfee75c : 0x57f287)
            .setDescription(existing ? `Tiket kamu sudah ada: <#${channel.id}>` : `🎫 Tiket dibuka: <#${channel.id}>`),
        ],
      });
      priv.autoCleanup();
      return;
    }

    const me = guild.members.me;
    const need = PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageGuild;
    const canAdmin = me?.permissions.has(PermissionFlagsBits.Administrator);
    if (!canAdmin && me && me.permissions.missing(need).length > 0) {
      await priv.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`Bot butuh permission **Manage Roles + Manage Channels** (atau Administrator).\nKurang: ${me.permissions.missing(need).join(', ')}`),
        ],
      });
      priv.autoCleanup();
      return;
    }

    const progress = makeProgress(priv);
    await priv.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('🏗️ Membangun server…').setDescription('```\nMulai…\n```')] });

    try {
      let result = { roles: [], channels: [], emojis: [] };
      if (aksi === 'build' || aksi === 'server') {
        result = await buildServer(guild, { log: progress.log });
      } else if (aksi === 'roles') {
        result.roles = await createRoles(guild, progress.log);
      } else if (aksi === 'channels') {
        result.channels = await createChannels(guild, progress.log);
        await seedMessages(guild, progress.log);
      } else if (aksi === 'emoji' || aksi === 'emojis') {
        result.emojis = await createEmojis(guild, progress.log);
      } else {
        await priv.edit({
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`Aksi \`${aksi}\` nggak dikenal.\nPilihan: \`build\`, \`roles\`, \`channels\`, \`emoji\`, \`say\`, \`dm\`, \`tiket\`, \`stats\`, \`panel\``)],
        });
        priv.autoCleanup();
        return;
      }

      await progress.flush();
      const total = result.roles.length + result.channels.length + result.emojis.length;
      const embed = new EmbedBuilder()
        .setColor(total ? 0x57f287 : 0xfee75c)
        .setTitle(total ? '✅ Server siap dipakai!' : 'ℹ️ Semua sudah ada')
        .setDescription('Server ini sudah dibangun lengkap. Jalankan `zomai build` lagi kalau ada yang kurang — nggak akan dobel.')
        .addFields(
          { name: '🎭 Role baru', value: result.roles.length ? result.roles.join('\n').slice(0, 1000) : '—', inline: true },
          { name: '📁 Channel baru', value: result.channels.length ? result.channels.join('\n').slice(0, 1000) : '—', inline: true },
          { name: '😄 Emoji baru', value: result.emojis.length ? result.emojis.map(e => `:${e}:`).join(' ') : '—', inline: true },
        )
        .setFooter({ text: 'Role pemisah: 👑 OWNER • 🛡️ STAFF TEAM • ⭐ SPESIAL • 👥 BIASA • 🎨 WARNA' })
        .setTimestamp();
      await priv.edit({ embeds: [embed] });
      priv.autoCleanup(60000);
    } catch (err) {
      console.error('[owner]', err);
      await priv.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('❌ Gagal build')
            .setDescription(`${err.message}\n\nPastikan role bot ada di posisi paling atas dan punya **Manage Roles / Manage Channels**.`),
        ],
      });
      priv.autoCleanup(60000);
    }
  },
};
