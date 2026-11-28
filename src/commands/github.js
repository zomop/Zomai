const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const github = require('../utils/github');
const { errorEmbed } = require('../utils/embed');

/** Embed profil user GitHub (dipakai kalau input tanpa "/") */
async function userEmbed(username) {
  const [user, repos] = await Promise.all([github.getUser(username), github.getUserRepos(username, 5)]);
  if (!user) return errorEmbed(`User GitHub **${username}** tidak ditemukan.\nCoba: \`github zomop/Zomai\` untuk repo.`);

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
      { name: '📅 Member sejak', value: `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:D>`, inline: true },
    );

  if (repos?.length) {
    embed.addFields({
      name: '📚 Repo Terbaru',
      value: repos.map(r => `• [${r.name}](${r.html_url}) ⭐${r.stargazers_count}`).join('\n'),
    });
  }
  embed.setFooter({ text: 'Ketik `github owner/repo` untuk lihat detail repo' });
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('🐙 Info repo GitHub (owner/repo) atau profil user (username)')
    .addStringOption(opt => opt.setName('repo').setDescription('Username, atau owner/repo (contoh: zomop atau zomop/Zomai)').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('repo');
    const parts = input.split('/');

    // Tanpa "/" -> dianggap username, tampilkan profil user
    if (parts.length !== 2) {
      const name = input.replace(/^@+/, '').trim();
      if (!/^[\w.-]{1,39}$/.test(name)) {
        return interaction.editReply({ embeds: [errorEmbed('Format: `github username` atau `github owner/repo`\nContoh: `github zomop` • `github zomop/Zomai`')] });
      }
      try {
        return interaction.editReply({ embeds: [await userEmbed(name)] });
      } catch (err) {
        return interaction.editReply({ embeds: [errorEmbed(err.message)] });
      }
    }

    const [owner, repo] = parts.map(s => s.trim());
    try {
      const data = await github.getRepo(owner, repo);
      if (!data) return interaction.editReply({ embeds: [errorEmbed(`Repo **${owner}/${repo}** tidak ditemukan atau private.`)] });

      const embed = new EmbedBuilder()
        .setColor(0x24292e)
        .setTitle(`🐙 ${data.full_name}`)
        .setURL(data.html_url)
        .setDescription(data.description || '_Tidak ada deskripsi_')
        .setThumbnail(data.owner?.avatar_url || null)
        .addFields(
          { name: '⭐ Stars', value: `${data.stargazers_count}`, inline: true },
          { name: '🍴 Forks', value: `${data.forks_count}`, inline: true },
          { name: '👁️ Watchers', value: `${data.watchers_count}`, inline: true },
          { name: '🔧 Language', value: data.language || '—', inline: true },
          { name: '📂 Open Issues', value: `${data.open_issues_count}`, inline: true },
          { name: '🕒 Updated', value: `<t:${Math.floor(new Date(data.updated_at).getTime()/1000)}:R>`, inline: true },
        )
        .setFooter({ text: `Default branch: ${data.default_branch} • ${data.visibility}` })
        .setTimestamp();

      if (data.topics?.length) {
        embed.addFields({ name: '🏷️ Topics', value: data.topics.map(t => `\`${t}\``).join(' ') });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] });
    }
  },
};
