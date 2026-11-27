/**
 * 🎮 Mini games: slots, rps, trivia, ship, rate
 * Bisa dipakai tanpa slash: slots 100 / rps batu 50 / trivia
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../utils/economy');
const { errorEmbed } = require('../utils/embed');

const SLOT = ['🍒', '🍋', '🍊', '🔔', '💎', '7️⃣'];

async function slots(i) {
  const bet = i.options.getInteger('taruhan') || 50;
  const u = eco.getUser(i.guild.id, i.user.id);
  if (bet < 10) return i.reply({ embeds: [errorEmbed('Minimal taruhan **10** koin.')] });
  if (u.coins < bet) return i.reply({ embeds: [errorEmbed(`Koin kurang. Saldo: ${eco.coins(u.coins)}`)] });

  const r = [0, 0, 0].map(() => SLOT[Math.floor(Math.random() * SLOT.length)]);
  const line = `┃ ${r.join(' ┃ ')} ┃`;

  let multiplier = 0;
  let title = '🎰 Kalah';
  if (r[0] === r[1] && r[1] === r[2]) {
    multiplier = r[0] === '💎' ? 10 : r[0] === '7️⃣' ? 20 : 4;
    title = '🎉 JACKPOT!';
  } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
    multiplier = 1.5;
    title = '✨ Menang kecil!';
  }

  const delta = Math.round(bet * multiplier) - bet;
  eco.addCoins(i.guild.id, i.user.id, delta);
  u.stats.gambled = (u.stats.gambled || 0) + bet;
  eco.store.touch();
  const after = eco.getUser(i.guild.id, i.user.id);

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(multiplier >= 4 ? 0xf1c40f : multiplier > 0 ? 0x57f287 : 0xed4245)
        .setTitle(title)
        .setDescription(`\`\`\`\n${line}\n\`\`\`\n${delta >= 0 ? '💰 Menang' : '💸 Kalah'} **${eco.coins(Math.abs(delta))}**\nSaldo: **${eco.coins(after.coins)}**`)
        .setFooter({ text: `Taruhan: ${eco.coins(bet)}` }),
    ],
  });
}

const RPS = { batu: '🪨', gunting: '✂️', kertas: '📄' };
const BEAT = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };

async function rps(i) {
  const pick = (i.options.getString('pilihan') || '').toLowerCase();
  const map = { batu: 'batu', gunting: 'gunting', kertas: 'kertas', rock: 'batu', paper: 'kertas', scissors: 'gunting' };
  const me = map[pick];
  if (!me) return i.reply({ embeds: [errorEmbed('Pilih: `batu`, `gunting`, atau `kertas`.\nContoh: `rps batu 50`')] });

  const bet = i.options.getInteger('taruhan') || 0;
  const u = eco.getUser(i.guild.id, i.user.id);
  if (bet > 0 && u.coins < bet) return i.reply({ embeds: [errorEmbed(`Koin kurang. Saldo: ${eco.coins(u.coins)}`)] });

  const bot = Object.keys(RPS)[Math.floor(Math.random() * 3)];
  const draw = me === bot;
  const win = BEAT[me] === bot;
  let delta = 0;
  if (bet > 0) delta = draw ? 0 : win ? bet : -bet;
  if (delta) eco.addCoins(i.guild.id, i.user.id, delta);

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(draw ? 0xfee75c : win ? 0x57f287 : 0xed4245)
        .setTitle(draw ? '🤝 Seri!' : win ? '🎉 Kamu menang!' : '😢 Kamu kalah')
        .setDescription(`Kamu: ${RPS[me]} **${me}**\nZomai: ${RPS[bot]} **${bot}**${bet > 0 ? `\n\n${delta >= 0 ? '+' : ''}${delta} 🪙` : ''}`),
    ],
  });
}

const TRIVIA = [
  { q: 'Ibu kota Indonesia?', a: ['jakarta'] },
  { q: 'Planet terdekat dari Matahari?', a: ['merkurius'] },
  { q: 'Hewan tercepat di darat?', a: ['cheetah', 'citah'] },
  { q: 'Berapa 12 x 12?', a: ['144'] },
  { q: 'Lagu kebangsaan Indonesia?', a: ['indonesia raya'] },
  { q: 'Gas yang dihirup manusia?', a: ['oksigen', 'o2'] },
  { q: 'Negara asal anime?', a: ['jepang'] },
  { q: 'Roblox didirikan tahun?', a: ['2006'] },
  { q: 'Warna campuran biru + kuning?', a: ['hijau'] },
  { q: 'Satuan arus listrik?', a: ['ampere', 'amp'] },
];

async function trivia(i) {
  const item = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
  await i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🧠 Trivia')
        .setDescription(`**${item.q}**\n\nJawab langsung di chat (20 detik). Hadiah: **300 🪙**`)
        .setFooter({ text: 'Ketik jawabanmu biasa aja, tanpa command' }),
    ],
  });

  const channel = i.channel;
  const filter = m => !m.author.bot && item.a.some(a => m.content.toLowerCase().includes(a));
  const collected = await channel.awaitMessages({ filter, max: 1, time: 20000 }).catch(() => null);
  const msg = collected?.first?.();
  if (!msg) {
    return channel.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`⏰ Waktu habis! Jawaban: **${item.a[0]}**`)] }).catch(() => {});
  }
  eco.addCoins(i.guild.id, msg.author.id, 300);
  return channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ <@${msg.author.id}> benar! Jawaban: **${item.a[0]}** — dapat **300 🪙**`)] }).catch(() => {});
}

function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 100;
  return h;
}

async function ship(i) {
  const a = i.user;
  const b = i.options.getUser('user');
  if (!b) return i.reply({ embeds: [errorEmbed('Tag orangnya: `ship @teman`')] });
  const pct = Math.max(1, Math.min(100, hash([a.id, b.id].sort().join(':')) + 10));
  const bar = '💖'.repeat(Math.round(pct / 10)) + '🖤'.repeat(10 - Math.round(pct / 10));
  const verdict = pct > 80 ? 'Jodoh banget! 💍' : pct > 60 ? 'Cocok nih 😍' : pct > 40 ? 'Bisa dicoba 😏' : pct > 20 ? 'Hmm... 😐' : 'Mending jomblo 💔';
  return i.reply({ embeds: [new EmbedBuilder().setColor(0xff73fa).setTitle('💘 Love Meter').setDescription(`${a} ❤️ ${b}\n\n${bar}\n**${pct}%** — ${verdict}`)] });
}

async function rate(i) {
  const target = i.options.getUser('user') || i.user;
  const score = (hash(target.id + Date.now().toString().slice(0, -4)) % 100) + 1;
  const comment = score > 85 ? 'Gila, sempurna! 🔥' : score > 60 ? 'Keren sih 👍' : score > 40 ? 'Lumayan 😌' : score > 20 ? 'Biasa aja 🤷' : 'Yaa... gitu deh 😬';
  return i.reply({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle(`⭐ Rating ${target.username}`).setDescription(`**${score}/100**\n${comment}`)] });
}

module.exports = {
  data: [
    new SlashCommandBuilder().setName('slots').setDescription('🎰 Main slot taruhan koin')
      .addIntegerOption(o => o.setName('taruhan').setDescription('Jumlah koin (default 50)').setMinValue(10)),
    new SlashCommandBuilder().setName('rps').setDescription('🪨 Gunting batu kertas lawan bot')
      .addStringOption(o => o.setName('pilihan').setDescription('batu / gunting / kertas').setRequired(true)
        .addChoices({ name: 'batu', value: 'batu' }, { name: 'gunting', value: 'gunting' }, { name: 'kertas', value: 'kertas' }))
      .addIntegerOption(o => o.setName('taruhan').setDescription('Taruhan koin (opsional)').setMinValue(10)),
    new SlashCommandBuilder().setName('trivia').setDescription('🧠 Kuis kilat, jawab di chat, menang 300 koin'),
    new SlashCommandBuilder().setName('ship').setDescription('💘 Hitung kecocokan kamu dengan seseorang')
      .addUserOption(o => o.setName('user').setDescription('Orang yang mau di-ship').setRequired(true)),
    new SlashCommandBuilder().setName('rate').setDescription('⭐ Kasih rating random')
      .addUserOption(o => o.setName('user').setDescription('User (default: kamu)')),
  ],
  async execute(i) {
    if (!i.guild) return i.reply({ embeds: [errorEmbed('Command ini cuma bisa dipakai di server.')] });
    const map = { slots, rps, trivia, ship, rate };
    return map[i.commandName](i);
  },
};
