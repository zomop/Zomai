const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Daftar semua command'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❓ Zomai Bot — Help')
      .setDescription('Semua command pakai slash `/`')
      .addFields(
        { name: '🎮 Roblox', value: '`/roblox <username>` — cek akun lengkap\n`/roblox-search <keyword>` — cari user', inline: false },
        { name: '🐙 GitHub', value: '`/github-check <username>` — cek akun GitHub\n`/github <owner/repo>` — info repo\n`/github-user <username>` — info user\n`/github-pr <owner/repo>` — PR terbuka\n`/setup-github #channel` — atur channel notifikasi (admin)', inline: false },
        { name: '🛠️ Utility', value: '`/ping` `/avatar` `/serverinfo` `/userinfo` `/botinfo` `/invite`', inline: false },
        { name: '🎲 Fun', value: '`/8ball <pertanyaan>` `/coinflip` `/dice` `/meme`', inline: false },
        { name: '🛡️ Moderasi (butuh permission)', value: '`/kick` `/ban` `/timeout` `/clear` `/warn`', inline: false },
      )
      .setFooter({ text: 'Zomai Bot v1.0.0' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
