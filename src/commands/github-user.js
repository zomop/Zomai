const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const github = require('../utils/github');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github-user')
    .setDescription('🐙 Info user GitHub')
    .addStringOption(opt => opt.setName('username').setDescription('Username GitHub').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const username = interaction.options.getString('username');
    try {
      const [user, repos] = await Promise.all([
        github.getUser(username),
        github.getUserRepos(username, 5),
      ]);
      if (!user) return interaction.editReply({ embeds: [errorEmbed(`User GitHub **${username}** tidak ditemukan.`)] });

      const embed = new EmbedBuilder()
        .setColor(0x24292e)
        .setTitle(`🐙 ${user.name || user.login} (@${user.login})`)
        .setURL(user.html_url)
        .setThumbnail(user.avatar_url)
        .setDescription(user.bio || '_Tidak ada bio_')
        .addFields(
          { name: '📁 Public Repos', value: `${user.public_repos}`, inline: true },
          { name: '👥 Followers', value: `${user.followers}`, inline: true },
          { name: '➡️ Following', value: `${user.following}`, inline: true },
          { name: '📍 Lokasi', value: user.location || '—', inline: true },
          { name: '🏢 Company', value: user.company || '—', inline: true },
          { name: '🔗 Blog', value: user.blog || '—', inline: true },
          { name: '📅 Member sejak', value: `<t:${Math.floor(new Date(user.created_at).getTime()/1000)}:D>`, inline: true },
        );

      if (repos?.length) {
        embed.addFields({
          name: '📚 Repo Terbaru',
          value: repos.map(r => `• [${r.name}](${r.html_url}) ⭐${r.stargazers_count}`).join('\n'),
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] });
    }
  },
};
