const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latency bot'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pong!', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
        { name: 'API Latency', value: `${interaction.client.ws.ping}ms`, inline: true },
        { name: 'Uptime', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
      )
      .setTimestamp();
    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
