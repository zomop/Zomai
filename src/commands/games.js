/**
 * 🎮 Mini games: slots, rps, trivia, ship, rate
 * Bisa dipakai tanpa slash: slots 100 / rps batu 50 / trivia
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../utils/economy');
const { errorEmbed } = require('../utils/embed');
const TRIVIA_BANK = require('../utils/triviaBank');

// Anti-exploit trivia
const activeTrivia = new Map(); // channelId -> waktu mulai
const triviaCooldown = new Map(); // userId -> timestamp terakhir main
const TRIVIA_COOLDOWN = 90 * 1000; // 1x per 90 detik per orang
const TRIVIA_REWARD = 200;
const TRIVIA_ATTEMPTS = 3;

const SLOT = ['🍒', '🍋', '🍊', '🔔', '💎', '7️⃣'];

// Angka dalam kata -> digit, biar "delapan" sama dengan "8"
const NUM_WORDS = {
  nol: '0', kosong: '0', satu: '1', dua: '2', tiga: '3', empat: '4', lima: '5',
  enam: '6', tujuh: '7', delapan: '8', sembilan: '9', sepuluh: '10', sebelas: '11',
  'dua belas': '12', 'dua puluh': '20', 'tiga puluh': '30', seratus: '100',
};

function normText(s) {
  let t = ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
  t = t.replace(/\bdua belas\b/g, '12').replace(/\bdua puluh\b/g, '20').replace(/\btiga puluh\b/g, '30');
  for (const [w, d] of Object.entries(NUM_WORDS)) t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  return t;
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Cocokkan jawaban user dengan daftar jawaban benar */
function isAnswer(text, answers) {
  const t = normText(text);
  return answers.some(a => {
    const na = normText(a).trim();
    if (!na) return false;
        // jawaban pendek ("8", "12") harus cocok utuh; jawaban panjang boleh substring
    return na.length <= 3 ? new RegExp(`(^|\\s)${esc(na)}($|\\s)`).test(t) : t.includes(na);
  });
}

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

async function trivia(i) {
  const now = Date.now();
  const last = triviaCooldown.get(i.user.id) || 0;
  if (now - last < TRIVIA_COOLDOWN) {
    return i.reply({ embeds: [errorEmbed(`Sabar ya 😅 Kamu bisa main trivia lagi dalam **${eco.fmtDuration(last + TRIVIA_COOLDOWN - now)}**.`)] });
  }

  const busy = activeTrivia.get(i.channel.id);
  if (busy && now - busy < 45000) {
    return i.reply({ embeds: [errorEmbed('Masih ada trivia berjalan di channel ini. Tunggu selesai dulu ya.')] });
  }

  const item = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
  const unique = Array.from(new Set(item.a));
  triviaCooldown.set(i.user.id, now);
  activeTrivia.set(i.channel.id, now);

  await i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🧠 Trivia')
        .setDescription(
          `**${item.q}**\n\nJawab langsung di chat — hadiah **${TRIVIA_REWARD} 🪙**\n` +
            `⏳ Waktu 20 detik • maksimal **${TRIVIA_ATTEMPTS}** tebakan • 1x per 90 detik/orang`,
        )
        .setFooter({ text: 'Salah satu tebakan langsung dibalas benar/salah' }),
    ],
  });

  const channel = i.channel;
  const guildId = i.guild.id;
  const tries = new Map(); // userId -> jumlah salah (jatah per orang, bukan per channel)
  let total = 0;           // batas pesan diproses, biar nggak bisa di-spam
  let done = false;

  const collector = channel.createMessageCollector({
    filter: m => !m.author.bot && m.content.trim().length > 0,
    time: 20000,
  });

  const finish = embed => {
    if (done) return;
    done = true;
    activeTrivia.delete(channel.id);
    collector.stop('selesai');
    channel.send({ embeds: [embed] }).catch(() => {});
  };

  // Balas tiap tebakan secara real-time (bukan nunggu 20 detik)
  collector.on('collect', msg => {
    if (done) return;
    total += 1;
    if (total > 8) return; // anti-spam: maksimal 8 tebakan per soal

    if (isAnswer(msg.content, unique)) {
      eco.addCoins(guildId, msg.author.id, TRIVIA_REWARD);
      finish(
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`✅ <@${msg.author.id}> benar! Jawaban: **${unique[0]}** — dapat **${TRIVIA_REWARD} 🪙**`),
      );
      return;
    }

    const used = (tries.get(msg.author.id) || 0) + 1;
    tries.set(msg.author.id, used);
    const left = TRIVIA_ATTEMPTS - used;

    msg.react('❌').catch(() => {});
    channel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(left > 0 ? 0xfee75c : 0xed4245)
            .setDescription(
              left > 0
                ? `❌ <@${msg.author.id}> **salah**. Sisa tebakan kamu: **${left}**`
                : `❌ <@${msg.author.id}> **salah**. Tebakan kamu habis, tunggu orang lain atau waktu selesai.`,
            ),
        ],
      })
      .catch(() => {});
  });

  collector.on('end', () => {
    activeTrivia.delete(channel.id);
    if (done) return;
    done = true;
    channel
      .send({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`⏰ Waktu habis. Jawaban: **${unique[0]}**`)] })
      .catch(() => {});
  });
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
    new SlashCommandBuilder().setName('trivia').setDescription('🧠 Kuis kilat, jawab di chat, menang 200 koin'),
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
