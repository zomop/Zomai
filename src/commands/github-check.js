const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const github = require('../utils/github');
const { errorEmbed } = require('../utils/embed');

/**
 * /github-check — cek akun GitHub & tampilkan info lengkap
 * Ini command utama yang diminta: ketik /github-check <username>
 * Contoh: /github-check torvalds
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('github-check')
    .setDescription('🐙 Cek akun GitHub — tampilkan info lengkap user')
    .addStringOption(opt => opt.setName('username').setDescription('Username GitHub (contoh: torvalds)').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const username = interaction.options.getString('username').trim().replace(/^@/, '');

    try {
      const [user, repos] = await Promise.all([
        github.getUser(username),
        github.getUserRepos(username, 5),
      ]);

      if (!user) {
        return interaction.editReply({
          embeds: [errorEmbed(`Akun GitHub **${username}** tidak ditemukan.\nCek lagi ejaannya ya. Contoh: \`/github-check torvalds\``)],
        });
      }

      const joined = new Date(user.created_at);
      const embed = new EmbedBuilder()
        .setColor(0x24292e)
        .setTitle(`🐙 ${user.name || user.login}`)
        .setURL(user.html_url)
        .setThumbnail(user.avatar_url)
        .setDescription(user.bio || '_Tidak ada bio_')
        .addFields(
          { name: '👤 Username', value: `@${user.login}`, inline: true },
          { name: '🆔 ID', value: `${user.id}`, inline: true },
          { name: '🏷️ Type', value: user.type || 'User', inline: true },
          { name: '📁 Public Repos', value: `${user.public_repos}`, inline: true },
          { name: '📁 Private Repos', value: `${user.total_private_repos ?? '—'}`, inline: true },
          { name: '👥 Followers', value: `${user.followers}`, inline: true },
          { name: '➡️ Following', value: `${user.following}`, inline: true },
          { name: '📍 Lokasi', value: user.location || '—', inline: true },
          { name: '🏢 Company', value: user.company || '—', inline: true },
          { name: '🔗 Website', value: user.blog || '—', inline: true },
          { name: '🐦 Twitter', value: user.twitter_username ? `@${user.twitter_username}` : '—', inline: true },
          { name: '📅 Gabung GitHub', value: `<t:${Math.floor(joined.getTime()/1000)}:D>`, inline: true },
        )
        .setFooter({ text: `Profil: github.com/${user.login} • Zomai Bot` })
        .setTimestamp();

      if (repos?.length) {
        embed.addFields({
          name: '📚 5 Repo Terbaru',
          value: repos.map(r => `• [${r.name}](${r.html_url}) ⭐${r.stargazers_count} 🍴${r.forks_count}`).join('\n'),
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[github-check]', err);
      await interaction.editReply({ embeds: [errorEmbed(`Gagal cek GitHub: ${err.message}`)] });
    }
  },
};
