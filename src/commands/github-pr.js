const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const github = require('../utils/github');
const { errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github-pr')
    .setDescription('🔀 List Pull Request terbuka')
    .addStringOption(opt => opt.setName('repo').setDescription('Format: owner/repo').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('repo');
    const [owner, repo] = input.split('/').map(s => s?.trim());
    if (!owner || !repo) return interaction.editReply({ embeds: [errorEmbed('Format harus **owner/repo**')] });
    try {
      const prs = await github.getOpenPRs(owner, repo, 5);
      if (!prs.length) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('✅ Tidak ada PR terbuka').setDescription(`Repo **${owner}/${repo}** bersih, tidak ada PR yang menunggu review.`) ] });
      }
      const embed = new EmbedBuilder()
        .setColor(0x8957E5)
        .setTitle(`🔀 PR Terbuka — ${owner}/${repo}`)
        .setDescription(prs.map(pr => 
          `**[#${pr.number}](${pr.html_url})** ${pr.title}\n👤 @${pr.user.login} • <t:${Math.floor(new Date(pr.created_at).getTime()/1000)}:R>`
        ).join('\n\n'))
        .setFooter({ text: `Menampilkan ${prs.length} PR terbaru` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(err.message)] });
    }
  },
};
