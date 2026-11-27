const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('🤖 Info tentang Zomai Bot'),
  async execute(interaction) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Zomai Bot')
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription('Bot multifungsi: cek Roblox, sync GitHub, moderasi, fun & utility.\n\n**Fitur utama:**\n• `/roblox` — cek akun Roblox lengkap\n• `/github` — info repo & sync webhook\n• `/github-pr` — list PR terbuka\n• Moderasi: `/kick` `/ban` `/timeout` `/clear`\n• Fun: `/8ball` `/coinflip` `/dice` `/meme`\n• Utility: `/avatar` `/serverinfo` `/userinfo`')
      .addFields(
        { name: '👥 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👤 Users', value: `${client.users.cache.size}`, inline: true },
        { name: '⚡ Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '⏱️ Uptime', value: `${Math.floor(client.uptime / 1000 / 60)} menit`, inline: true },
        { name: '📦 Version', value: 'v1.0.0', inline: true },
        { name: '🔗 Invite', value: `[Klik di sini](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`, inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
