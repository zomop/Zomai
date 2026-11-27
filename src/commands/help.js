const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Daftar semua command'),
  async execute(interaction) {
    const p = (process.env.PREFIX || '.').split(',')[0].trim() || '.';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❓ Zomai Bot — Help')
      .setDescription(
        `Bisa pakai **slash** (\`/roblox\`) **atau tanpa slash** cukup ketik nama command-nya.\n` +
          `Contoh: \`roblox builderman\` • \`${p}roblox builderman\` • \`rbx builderman\` — semuanya jalan.`,
      )
      .addFields(
        { name: '🎮 Roblox', value: '`roblox <username>` / `rbx <username>`\n`roblox-search <keyword>`', inline: false },
        { name: '🐙 GitHub', value: '`github-check <username>` / `gh <username>`\n`github <owner/repo>` — info repo\n`github-pr <owner/repo>` — PR terbuka\n`setup-github #channel` — atur notifikasi (admin)', inline: false },
        { name: '💰 Ekonomi (ala owo)', value: '`balance` — saldo & level\n`daily` — hadiah harian + streak\n`work` — kerja dapet koin (45 menit)\n`job [nama]` — pilih pekerjaan\n`hunt` — berburu hewan (30 detik)\n`bet <koin>` — taruhan 48%\n`pay @user <koin>` / `tf` — transfer\n`profile` `leaderboard` / `lb`', inline: false },
        { name: '🎮 Mini games', value: '`slots <taruhan>`\n`rps batu|gunting|kertas [taruhan]`\n`trivia` — jawab di chat, menang 300 koin\n`ship @user` `rate @user`\n`8ball` `coinflip` `dice` `meme`', inline: false },
        { name: '🛠️ Utility', value: '`ping` `avatar` `serverinfo` `userinfo` `botinfo` `invite`', inline: false },
        { name: '🛡️ Moderasi', value: '`kick` `ban` `timeout` `clear` `warn` (butuh permission)', inline: false },
      )
      .setFooter({ text: `Prefix default: ${p} • Zomai Bot v2.0` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
