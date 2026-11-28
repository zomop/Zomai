const { Events, ActivityType } = require('discord.js');
const owner = require('../utils/owner');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`📩 Siap dipakai di DM siapa saja (command tanpa slash)`);
    const prefix = (process.env.PREFIX || '.').split(',')[0].trim() || '.';
    client.user.setActivity(`${prefix}help • bisa di DM`, { type: ActivityType.Watching });

    owner
      .ownerIds(client)
      .then(ids => ids.size && console.log(`👑 Owner: ${[...ids].join(', ')}`))
      .catch(() => {});
  },
};
