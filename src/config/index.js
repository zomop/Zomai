require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  githubChannelId: process.env.GITHUB_CHANNEL_ID || '',
  githubRepoFilter: process.env.GITHUB_REPO_FILTER || '',
  port: parseInt(process.env.PORT || '3000', 10),
  ownerId: process.env.OWNER_ID || '',
  embedColor: parseInt((process.env.EMBED_COLOR || '5865F2').replace('#', ''), 16),
};
