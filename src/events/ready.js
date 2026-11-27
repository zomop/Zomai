const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setActivity('/help • Zomai Bot', { type: ActivityType.Watching });
  },
};
