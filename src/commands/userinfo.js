const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('ℹ️ Info user Discord')
    .addUserOption(opt => opt.setName('user').setDescription('User (default: kamu)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`ℹ️ ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
        { name: '🤖 Bot?', value: user.bot ? 'Ya' : 'Tidak', inline: true },
        { name: '📅 Akun dibuat', value: `<t:${Math.floor(user.createdTimestamp/1000)}:D>`, inline: true },
      )
      .setTimestamp();
    if (member) {
      embed.addFields(
        { name: '📥 Join server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp/1000)}:D>` : '—', inline: true },
        { name: '🎭 Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(' ').slice(0, 500) || '—' : '—', inline: false },
      );
    }
    await interaction.reply({ embeds: [embed] });
  },
};
