const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const github = require('../utils/github');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('🐙 Info repository GitHub')
    .addStringOption(opt => opt.setName('repo').setDescription('Format: owner/repo (contoh: zomop/Zomai)').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('repo');
    const parts = input.split('/');
    if (parts.length !== 2) {
      return interaction.editReply({ embeds: [errorEmbed('Format harus **owner/repo**\nContoh: `zomop/Zomai`')] });
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
