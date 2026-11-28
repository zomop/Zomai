const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByUsername, getUserById } = require('../utils/roblox');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox')
    .setDescription('🔍 Cek akun Roblox lengkap')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const username = interaction.options.getString('username');

    try {
      // Kalau yang diketik angka (User ID), langsung ambil detailnya — 1 request lebih cepat
      const found = /^\d{1,20}$/.test(username) ? { id: username } : await getUserByUsername(username);
      if (!found) {
        return interaction.editReply({ embeds: [errorEmbed(`User **${username}** tidak ditemukan di Roblox.\nPastikan ejaan username benar (case-sensitive untuk nama).`)] });
      }

      const detail = await getUserById(found.id);
      if (!detail) {
        return interaction.editReply({ embeds: [errorEmbed('Gagal mengambil detail user. Coba lagi nanti.')] });
      }

      const createdDate = new Date(detail.created);
      const accountAgeDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor(detail.isBanned ? 0xED4245 : 0xFF3B3B)
        .setTitle(`🎮 ${detail.displayName} (@${detail.name})`)
        .setURL(detail.profileUrl)
        .setThumbnail(detail.avatarUrl || null)
        .addFields(
          { name: '🆔 User ID', value: `\`${detail.id}\``, inline: true },
          { name: '📅 Dibuat', value: `<t:${Math.floor(createdDate.getTime()/1000)}:D> (${accountAgeDays} hari)`, inline: true },
          { name: '🚫 Status', value: detail.isBanned ? '⛔ Banned' : '✅ Aktif', inline: true },
          { name: '👥 Followers', value: `${detail.followers.toLocaleString()}`, inline: true },
          { name: '➡️ Followings', value: `${detail.followings.toLocaleString()}`, inline: true },
          { name: '🤝 Friends', value: `${detail.friends.toLocaleString()}`, inline: true },
          { name: '🟢 Online?', value: detail.isOnline ? `Ya${detail.lastLocation ? ` di **${detail.lastLocation}**` : ''}` : 'Tidak', inline: true },
        )
        .setFooter({ text: 'Data dari Roblox API • Zomai Bot' })
        .setTimestamp();

      if (detail.description) {
        embed.setDescription(detail.description.slice(0, 500));
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[roblox]', err);
      await interaction.editReply({ embeds: [errorEmbed(`Gagal cek Roblox: ${err.message}`)] });
    }
  },
};
