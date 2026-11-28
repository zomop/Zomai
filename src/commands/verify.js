/**
 * ✅ Verifikasi — dapat role ✅ Verified.
 * Join server otomatis dapat 👤 Member; Verified didapat kalau mau (command ini / tombol di #verify).
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder().setName('verify').setDescription('✅ Ambil role Verified buat diri sendiri'),
  async execute(i) {
    if (!i.guild) return i.reply({ embeds: [errorEmbed('Verifikasi cuma bisa di server (bukan DM).')], ephemeral: true });

    const member = i.member || (await i.guild.members.fetch(i.user.id).catch(() => null));
    if (!member) return i.reply({ embeds: [errorEmbed('Gagal ambil data member. Coba lagi.')] });

    const role = i.guild.roles.cache.find(r => r.name.includes('Verified'));
    if (!role) {
      return i.reply({ embeds: [errorEmbed('Role **✅ Verified** belum ada di server ini. Owner server bisa jalankan `zomai build` dulu.')] });
    }
    if (member.roles.cache.has(role.id)) {
      return i.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('Kamu sudah terverifikasi ✅')] });
    }

    try {
      await member.roles.add(role, 'Verifikasi lewat command verify');
      return i.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Terverifikasi!').setDescription(`Kamu sekarang punya role **${role.name}**. Selamat bergabung! 🎉`)] });
    } catch (err) {
      return i.reply({ embeds: [errorEmbed(`Gagal kasih role: ${err.message}`)], ephemeral: true });
    }
  },
};
