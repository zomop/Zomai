/**
 * 🎫 Tiket bantuan — bisa tanpa slash: `tiket` / `tiket tutup`
 * Channel privat cuma user + staff.
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { openTicket, closeTicket } = require('../utils/tickets');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tiket')
    .setDescription('🎫 Buka / tutup tiket bantuan (channel privat dengan staff)')
    .addStringOption(o => o.setName('aksi').setDescription('buka (default) / tutup').setRequired(false))
    .addStringOption(o => o.setName('alasan').setDescription('Alasan singkat (opsional)').setRequired(false)),
  async execute(i) {
    if (!i.guild) return i.reply({ embeds: [errorEmbed('Tiket cuma bisa dibuka di server, bukan di DM. Kalau mau chat staff, DM mereka langsung ya 🙂')], ephemeral: true });

    const aksi = (i.options.getString('aksi') || 'buka').toLowerCase();
    const alasan = i.options.getString('alasan') || '';

    if (['tutup', 'close', 'selesai'].includes(aksi)) {
      const isTicket = /^tiket-/i.test(i.channel.name || '');
      if (!isTicket) return i.reply({ embeds: [errorEmbed('Command ini cuma bisa dipakai di dalam channel tiket (`tiket-...`).')] });

      await i.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('🔒 Menutup tiket…')] }).catch(() => {});
      await closeTicket(i.channel, { by: i.user });
      return;
    }

    try {
      const { channel, existing } = await openTicket(i.guild, i.user, { reason: alasan });
      if (!existing && i.channel.id !== channel.id) {
        await i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle('🎫 Tiket Dibuka')
              .setDescription(`Channel privat kamu: <#${channel.id}>\nCuma kamu + staff yang bisa lihat.`),
          ],
          ephemeral: true,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[tiket]', err);
      return i.reply({ embeds: [errorEmbed(`Gagal buka tiket: ${err.message}`)] }).catch(() => {});
    }
  },
};
