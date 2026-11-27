const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchUsers } = require('../utils/roblox');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox-search')
    .setDescription('🔎 Cari user Roblox berdasarkan kata kunci')
    .addStringOption(opt => opt.setName('keyword').setDescription('Kata kunci pencarian').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const keyword = interaction.options.getString('keyword');
    try {
      const results = await searchUsers(keyword, 5);
      if (!results.length) {
        return interaction.editReply({ embeds: [errorEmbed(`Tidak ada user yang cocok dengan **${keyword}**`)] });
      }
      const embed = new EmbedBuilder()
        .setColor(0xFF3B3B)
        .setTitle(`🔎 Hasil pencarian: "${keyword}"`)
        .setDescription(results.map((u, i) => 
          `**${i+1}.** [${u.displayName}](https://www.roblox.com/users/${u.id}/profile) (@${u.name}) — ID: \`${u.id}\``
        ).join('\n'))
        .setFooter({ text: 'Gunakan /roblox <username> untuk detail lengkap' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] });
    }
  },
};
