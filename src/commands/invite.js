const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('🔗 Link invite bot'),
  async execute(interaction) {
    const url = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔗 Invite Zomai Bot')
      .setDescription(`Klik link di bawah untuk invite bot ke server kamu:\n\n${url}\n\n**Permissions yang dibutuhkan:**\n• Send Messages, Embed Links\n• Kick/Ban/Timeout (untuk moderasi)\n• Manage Messages (untuk /clear)`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
