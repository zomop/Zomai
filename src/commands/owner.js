/**
 * 🔒 OWNER ONLY (hidden) — nggak muncul di help, nggak ada di daftar slash.
 * Akses: pemilik aplikasi bot (otomatis) / env OWNER_IDS.
 *
 * Contoh (tanpa slash):
 *   zomai              → panel owner
 *   zomai build        → bangun server lengkap (role + pemisah + channel + emoji)
 *   zomai roles        → cuma role
 *   zomai channels     → cuma channel
 *   zomai emoji        → cuma emoji kustom
 *   zomai say halo     → kirim pengumuman
 *   zomai stats        → statistik bot
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isOwner, ownerIds, addOwner } = require('../utils/owner');
const { buildServer, createRoles, createChannels, createEmojis, seedMessages, ROLES, CATEGORIES, EMOJIS } = require('../utils/serverBlueprint');
const { fmtDuration } = require('../utils/economy');
const eco = require('../utils/economy');

const COLOR = 0x2b2d31;

const panelEmbed = guildCount => {
  const e = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🔒 Owner Panel — Zomai')
    .setDescription('Command ini **cuma muncul buat akun owner**. Orang lain ngetik `zomai` nggak dibalas apa-apa.')
    .addFields(
      {
        name: '🏗️ Bangun server',
        value: '`zomai build` — role + role pemisah + semua channel + emoji kustom\n`zomai roles` — cuma role\n`zomai channels` — cuma channel\n`zomai emoji` — cuma emoji kustom',
        inline: false,
      },
      {
        name: '📣 Lainnya',
        value: '`zomai say <pesan>` — kirim pengumuman ke channel ini\n`zomai stats` — statistik bot\n`zomai whoami` — cek ID kamu',
        inline: false,
      },
      {
        name: '🧱 Isi build',
        value: `**${ROLES.length}** role (termasuk **4 role pemisah**: OWNER, STAFF TEAM, SPESIAL, BIASA)\n` +
          `**${CATEGORIES.length}** kategori • **${CATEGORIES.reduce((a, c) => a + c.channels.length, 0)}** channel\n` +
          `**${EMOJIS.length}** emoji kustom (:zomai_coin: :zomai_heart: :zomai_star: dll)`,
        inline: false,
      },
    )
    .setFooter({ text: guildCount ? `Bot ada di ${guildCount} server • hidden command` : 'hidden command' })
    .setTimestamp();
  return e;
};

/** Log progres dengan throttle biar nggak kena rate limit */
function makeProgress(interaction) {
  const lines = [];
  let last = 0;
  let pending = null;
  const render = async () => {
    last = Date.now();
    const body = lines.slice(-12).join('\n') || '…';
    const embed = new EmbedBuilder().setColor(COLOR).setTitle('🏗️ Membangun server…').setDescription('```\n' + body + '\n```');
    await interaction.editReply({ embeds: [embed] }).catch(() => {});
  };
  return {
    log: msg => {
      lines.push(msg);
      const now = Date.now();
      if (now - last > 1500 && !pending) {
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
    lines,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('🔒 Owner only')
    .addStringOption(o => o.setName('aksi').setDescription('build / roles / channels / emoji / say / stats / panel').setRequired(false))
    .addStringOption(o => o.setName('isi').setDescription('Teks tambahan (untuk say)').setRequired(false)),
  async execute(interaction) {
    const client = interaction.client;
    const owner = await isOwner(client, interaction.user?.id);
    if (!owner) {
      // Hidden: di chat biasa dibiarkan diam, di slash dibalas senyap
      if (!interaction.__message) await interaction.reply({ content: '❌ Command ini cuma buat owner bot.', ephemeral: true }).catch(() => {});
      return;
    }

    const aksi = (interaction.options.getString('aksi') || 'panel').toLowerCase();
    const isi = interaction.options.getString('isi') || '';
    const guild = interaction.guild;

    if (['panel', 'help', 'menu'].includes(aksi)) {
      return interaction.reply({ embeds: [panelEmbed(client.guilds.cache.size)], ephemeral: !interaction.__message });
    }

    // Darurat: kalau owner nggak terdeteksi otomatis (aplikasi milik akun lain),
    // pemilik asli bisa klaim pakai kode rahasia SETUP_SECRET.
    if (aksi === 'claim') {
      const ids = await ownerIds(client);
      if (ids.size > 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Owner sudah terdeteksi, claim nggak perlu.')], ephemeral: !interaction.__message });
      }
      const secret = process.env.OWNER_SECRET || process.env.SETUP_SECRET || 'zomai2026';
      if (isi.trim() !== secret) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Kode salah.')], ephemeral: !interaction.__message });
      }
      await addOwner(client, interaction.user.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Akun <@${interaction.user.id}> sekarang jadi owner bot.`)], ephemeral: !interaction.__message });
    }

    if (aksi === 'whoami') {
      const ids = [...(await ownerIds(client))];
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🪪 Siapa kamu')
            .setDescription(`ID kamu: \`${interaction.user.id}\`\nOwner terdaftar: ${ids.map(i => `\`${i}\``).join(', ') || '—'}`),
        ],
        ephemeral: !interaction.__message,
      });
    }

    if (aksi === 'stats') {
      const ids = [...(await ownerIds(client))];
      const economyUsers = Object.keys(eco.store?.data?.users || {}).length;
      return interaction.reply({
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
              { name: '👑 Owner', value: ids.map(i => `<@${i}>`).join(', ') || '—', inline: false },
            )
            .setTimestamp(),
        ],
        ephemeral: !interaction.__message,
      });
    }

    if (aksi === 'say') {
      const text = isi.trim();
      if (!text) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Tulis pesannya: `zomai say halo semua`')] });
      }
      if (!interaction.__message) await interaction.reply({ content: '📣 Dikirim.', ephemeral: true }).catch(() => {});
      return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(text).setFooter({ text: `📣 Pengumuman owner` })] });
    }

    // === command builder butuh server ===
    if (!guild) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('Command ini cuma bisa di server (bukan DM).')], ephemeral: !interaction.__message });
    }

    const me = guild.members.me;
    const need = PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageGuild;
    const canAdmin = me?.permissions.has(PermissionFlagsBits.Administrator);
    if (!canAdmin && me && (me.permissions.missing(need).length > 0)) {
      return response(interaction, `Bot butuh permission **Manage Roles + Manage Channels** (atau Administrator) di server ini.\nKurang: ${me.permissions.missing(need).join(', ')}`);
    }

    const progress = makeProgress(interaction);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLOR).setTitle('🏗️ Membangun server…').setDescription('```\nMulai…\n```')],
      ephemeral: !interaction.__message,
    });

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
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`Aksi \`${aksi}\` nggak dikenal.\nPilihan: \`build\`, \`roles\`, \`channels\`, \`emoji\`, \`say\`, \`stats\`, \`panel\``)],
        });
      }

      await progress.flush();
      const total = result.roles.length + result.channels.length + result.emojis.length;
      const embed = new EmbedBuilder()
        .setColor(total ? 0x57f287 : 0xfee75c)
        .setTitle(total ? '✅ Server siap dipakai!' : 'ℹ️ Semua sudah ada')
        .setDescription('Server ini sudah dibangun lengkap. Kalau ada yang kurang, jalankan `zomai build` lagi — nggak akan dobel.')
        .addFields(
          { name: '🎭 Role baru', value: result.roles.length ? result.roles.join('\n').slice(0, 1000) : '—', inline: true },
          { name: '📁 Channel baru', value: result.channels.length ? result.channels.join('\n').slice(0, 1000) : '—', inline: true },
          { name: '😄 Emoji baru', value: result.emojis.length ? result.emojis.map(e => `:${e}:`).join(' ') : '—', inline: true },
        )
        .setFooter({ text: 'Role pemisah: 👑 OWNER • 🛡️ STAFF TEAM • ⭐ SPESIAL • 👥 BIASA' })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[owner]', err);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('❌ Gagal build').setDescription(`${err.message}\n\nPastikan bot punya role paling atas dengan permission **Manage Roles / Manage Channels**.`)],
      });
    }
  },
};

async function response(interaction, text) {
  return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(text)], ephemeral: !interaction.__message });
}
