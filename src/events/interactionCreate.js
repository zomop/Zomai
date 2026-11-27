const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[interaction] ${interaction.commandName}:`, error);
      const msg = { embeds: [errorEmbed('Terjadi error saat menjalankan command ini. Coba lagi nanti.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
