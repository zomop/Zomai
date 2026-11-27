const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ Lihat avatar user')
    .addUserOption(opt => opt.setName('user').setDescription('User (default: kamu)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🖼️ Avatar ${user.username}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
