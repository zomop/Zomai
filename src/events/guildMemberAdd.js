/**
 * Auto-role: setiap orang yang join otomatis dapat role 👤 Member.
 * Role ✅ Verified didapat sendiri lewat tombol / command `verify`.
 */
'use strict';

const { Events } = require('discord.js');
const economy = require('../utils/economy');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const guild = member.guild;

      // 1) role 👤 Member (kalau server sudah di-build)
      const memberRole = guild.roles.cache.find(r => r.name.includes('Member'));
      if (memberRole && !member.roles.cache.has(memberRole.id)) {
        await member.roles.add(memberRole, 'Auto-role: member baru join').catch(() => {});
      }

      // 2) data ekonomi awal (biar balance langsung ada)
      economy.getUser(guild.id, member.id);

      // 3) sapaan singkat di #welcome
      const welcome = guild.channels.cache.find(c => c.name === 'welcome');
      if (welcome) {
        await welcome
          .send({
            content: `👋 Selamat datang <@${member.id}> di **${guild.name}**! Kamu udah dapat role **👤 Member**`,
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('[guildMemberAdd]', e?.message || e);
    }
  },
};
