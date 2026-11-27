/**
 * Command TANPA slash — cukup ketik di chat:
 *   .roblox builderman
 *   roblox builderman
 *   !gh zomop
 *   daily
 */
'use strict';

const { Events } = require('discord.js');
const { createAdapter } = require('../utils/textAdapter');
const { errorEmbed } = require('../utils/embed');
const economy = require('../utils/economy');

const PREFIXES = (process.env.PREFIX || '.')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .concat(['z!', '!']);

// Nama panggilan biar cepat ngetiknya
const ALIASES = {
  rb: 'roblox',
  rbx: 'roblox',
  'cek-roblox': 'roblox',
  gh: 'github-check',
  'cek-github': 'github-check',
  repo: 'github',
  pr: 'github-pr',
  bal: 'balance',
  duit: 'balance',
  harian: 'daily',
  kerja: 'work',
  cari: 'hunt',
  buru: 'hunt',
  taruhan: 'bet',
  tf: 'pay',
  transfer: 'pay',
  lb: 'leaderboard',
  papan: 'leaderboard',
  profil: 'profile',
  slot: 'slots',
  suten: 'rps',
  tanya: 'trivia',
  kapal: 'ship',
  nilai: 'rate',
  job: 'job',
  pekerjaan: 'job',
  p: 'ping',
  bantuan: 'help',
  menu: 'help',
};

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message || message.author?.bot) return;
    const content = (message.content || '').trim();
    if (!content) return;

    // 1. Cek prefix (., !, z!)
    let body = null;
    for (const prefix of PREFIXES) {
      if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
        body = content.slice(prefix.length).trim();
        break;
      }
    }

    // 2. Tanpa prefix: hanya kalau kata pertamanya memang nama command / alias
    if (body === null) {
      const first = content.split(/\s+/)[0].toLowerCase().replace(/^[^\w-]+/, '');
      const candidate = ALIASES[first] || first;
      if (!client.commands.has(candidate)) return;
      body = content;
    }

    const [rawName, ...args] = body.split(/\s+/);
    if (!rawName) return;
    const name = (ALIASES[rawName.toLowerCase()] || rawName.toLowerCase()).replace(/^[^\w-]+/, '');
    const command = client.commands.get(name);
    if (!command) return;

    // XP tiap pakai command
    try {
      if (message.guild) {
        const res = economy.addXp(message.guild.id, message.author.id, 12);
        if (res.leveled) {
          message.channel
            .send(`🎉 <@${message.author.id}> naik ke **Level ${res.level}**!`)
            .catch(() => {});
        }
      }
    } catch {}

    try {
      const adapter = await createAdapter(command, args, message, name);
      await command.execute(adapter);
    } catch (err) {
      console.error(`[text:${name}]`, err);
      message.reply({ embeds: [errorEmbed('Terjadi error saat menjalankan command ini. Coba lagi.')] }).catch(() => {});
    }
  },
};
