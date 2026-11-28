const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('ℹ️ Info server ini'),
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'ℹ️ Command ini cuma bisa dipakai di server. Coba `userinfo` kalau di DM.', ephemeral: true });
    await guild.members.fetch();
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`ℹ️ ${guild.name}`)
      .setThumbnail(guild.iconURL() || null)
      .addFields(
        { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '🚀 Boost Level', value: `${guild.premiumTier ? `Tier ${guild.premiumTier}` : 'None'}`, inline: true },
        { name: '📅 Dibuat', value: `<t:${Math.floor(guild.createdTimestamp/1000)}:D>`, inline: true },
        { name: '🌍 Region', value: guild.preferredLocale || '—', inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
