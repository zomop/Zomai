/**
 * 💰 Ekonomi ala owo: balance, daily, work, job, hunt, bet, pay, leaderboard, profile
 * Bisa dipakai dengan slash (/daily) ATAU tanpa slash (daily / .daily)
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../utils/economy');
const { errorEmbed } = require('../utils/embed');

const C = 0x2ecc71;

const needGuild = i => !i.guild;

function userRow(id, u) {
  return `**#${id}** <@${u.id}> — ${eco.coins(u.coins)} • Lv.${u.level}`;
}

async function balance(i) {
  const target = i.options.getUser('user') || i.user;
  const u = eco.getUser(i.guild.id, target.id);
  const job = u.job && eco.JOBS[u.job] ? eco.JOBS[u.job].label : '_Belum kerja_';
  const embed = new EmbedBuilder()
    .setColor(C)
    .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
    .setTitle('💰 Dompet')
    .addFields(
      { name: '🪙 Koin', value: eco.coins(u.coins), inline: true },
      { name: '⭐ Level', value: `${u.level} (${u.xp}/${eco.levelCost(u.level)} XP)`, inline: true },
      { name: '💼 Pekerjaan', value: job, inline: true },
      { name: '📊 Progres', value: eco.xpBar(u), inline: false },
    )
    .setFooter({ text: 'Ketik: daily, work, hunt, slots, bet • atau pakai /daily' })
    .setTimestamp();
  return i.reply({ embeds: [embed] });
}

async function daily(i) {
  const u = eco.getUser(i.guild.id, i.user.id);
  const left = eco.cooldownLeft(u.daily, 24 * 3600 * 1000);
  if (left > 0) return i.reply({ embeds: [errorEmbed(`Kamu sudah ambil daily. Coba lagi dalam **${eco.fmtDuration(left)}**.`)] });

  const yesterday = u.daily && Date.now() - u.daily < 48 * 3600 * 1000;
  u.streak = yesterday ? (u.streak || 0) + 1 : 1;
  u.daily = Date.now();
  const reward = Math.min(2000, 500 + (u.streak - 1) * 150);
  eco.addCoins(i.guild.id, i.user.id, reward);

  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(C)
        .setTitle('🎁 Daily Reward')
        .setDescription(`Kamu dapat **${eco.coins(reward)}**!\n🔥 Streak: **${u.streak} hari** berturut-turut`)
        .setFooter({ text: 'Streak makin lama = hadiah makin besar (maks 2.000)' })
        .setTimestamp(),
    ],
  });
}

async function work(i) {
  const u = eco.getUser(i.guild.id, i.user.id);
  const left = eco.cooldownLeft(u.work, 45 * 60 * 1000);
  if (left > 0) return i.reply({ embeds: [errorEmbed(`Kamu masih capek 😴 Coba lagi dalam **${eco.fmtDuration(left)}**.`)] });

  if (!u.job) {
    const jobs = Object.keys(eco.JOBS);
    u.job = jobs[Math.floor(Math.random() * jobs.length)];
  }
  const job = eco.JOBS[u.job];
  const pay = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
  u.work = Date.now();
  eco.addCoins(i.guild.id, i.user.id, pay);

  const flavor = [
    'Kamu menyelesaikan pekerjaan dengan rapi.',
    'Bos kamu bilang "kerja bagus!"',
    'Hari yang melelahkan, tapi worth it.',
    'Kamu lembur sampai larut.',
    'Rekan kerja kamu traktir kopi.',
  ];
  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(C)
        .setTitle(`${job.label} — Gajian!`)
        .setDescription(`${flavor[Math.floor(Math.random() * flavor.length)]}\n\n💵 Upah: **${eco.coins(pay)}**`)
        .setFooter({ text: 'Ganti pekerjaan: job • Cooldown 45 menit' })
        .setTimestamp(),
    ],
  });
}

async function job(i) {
  const pick = (i.options.getString('nama') || '').toLowerCase();
  const u = eco.getUser(i.guild.id, i.user.id);

  if (!pick) {
    const list = Object.entries(eco.JOBS)
      .map(([k, v]) => `• \`${k}\` — ${v.label} (${v.min}–${v.max} koin)`)
      .join('\n');
    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(C)
          .setTitle('💼 Daftar Pekerjaan')
          .setDescription(list)
          .setFooter({ text: `Pekerjaan kamu: ${u.job ? eco.JOBS[u.job]?.label || u.job : 'belum ada'}\nGanti: job programmer` }),
      ],
    });
  }

  if (!eco.JOBS[pick]) return i.reply({ embeds: [errorEmbed(`Pekerjaan **${pick}** tidak ada.\nKetik \`job\` untuk lihat daftar.`)] });
  u.job = pick;
  eco.store.touch();
  return i.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle('✅ Pekerjaan Diganti').setDescription(`Sekarang kamu bekerja sebagai **${eco.JOBS[pick].label}**.\nGaji: ${eco.JOBS[pick].min}–${eco.JOBS[pick].max} koin per shift.`)] });
}

async function hunt(i) {
  const u = eco.getUser(i.guild.id, i.user.id);
  const left = eco.cooldownLeft(u.hunt, 30 * 1000);
  if (left > 0) return i.reply({ embeds: [errorEmbed(`Hutan masih sepi... tunggu **${eco.fmtDuration(left)}**.`)] });

  const total = eco.ANIMALS.reduce((a, b) => a + b.chance, 0);
  let roll = Math.random() * total;
  let got = eco.ANIMALS[0];
  for (const a of eco.ANIMALS) {
    roll -= a.chance;
    if (roll <= 0) { got = a; break; }
  }
  const reward = Math.floor(Math.random() * (got.max - got.min + 1)) + got.min;
  u.hunt = Date.now();
  u.stats.hunted = (u.stats.hunted || 0) + 1;
  eco.addCoins(i.guild.id, i.user.id, reward);

  const rare = got.name.includes('Naga');
  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(rare ? 0xf1c40f : C)
        .setTitle(rare ? '🐉 LUAR BIASA! Kamu menemukan Naga Kecil!' : '🏹 Berburu')
        .setDescription(`Kamu menangkap **${got.name}**\n💰 Dapat **${eco.coins(reward)}**`)
        .setFooter({ text: `Total buruan: ${u.stats.hunted} • Cooldown 30 detik` })
        .setTimestamp(),
    ],
  });
}

async function bet(i) {
  const u = eco.getUser(i.guild.id, i.user.id);
  const amount = i.options.getInteger('jumlah') || 100;
  if (amount < 10) return i.reply({ embeds: [errorEmbed('Minimal taruhan **10** koin.')] });
  if (u.coins < amount) return i.reply({ embeds: [errorEmbed(`Koin kamu kurang. Saldo: ${eco.coins(u.coins)}`)] });

  u.stats.gambled = (u.stats.gambled || 0) + amount;
  const win = Math.random() < 0.48;
  if (win) {
    u.stats.won = (u.stats.won || 0) + amount;
    eco.addCoins(i.guild.id, i.user.id, amount);
  } else {
    eco.addCoins(i.guild.id, i.user.id, -amount);
  }
  const now = eco.getUser(i.guild.id, i.user.id);
  return i.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(win ? 0x57f287 : 0xed4245)
        .setTitle(win ? '🪙 Menang!' : '💸 Kalah...')
        .setDescription(`Kamu ${win ? 'mendapat' : 'kehilangan'} **${eco.coins(amount)}**\nSaldo sekarang: **${eco.coins(now.coins)}**`)
        .setTimestamp(),
    ],
  });
}

async function pay(i) {
  const target = i.options.getUser('user');
  const amount = i.options.getInteger('jumlah');
  if (!target) return i.reply({ embeds: [errorEmbed('Tag user tujuan, contoh: `pay @teman 100`')] });
  if (target.id === i.user.id) return i.reply({ embeds: [errorEmbed('Gak bisa transfer ke diri sendiri 😅')] });
  if (target.bot) return i.reply({ embeds: [errorEmbed('Gak bisa transfer ke bot.')] });
  if (!amount || amount < 1) return i.reply({ embeds: [errorEmbed('Jumlahnya harus lebih dari 0.')] });

  const me = eco.getUser(i.guild.id, i.user.id);
  if (me.coins < amount) return i.reply({ embeds: [errorEmbed(`Koin kamu kurang. Saldo: ${eco.coins(me.coins)}`)] });

  eco.addCoins(i.guild.id, i.user.id, -amount);
  eco.addCoins(i.guild.id, target.id, amount);
  return i.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle('💸 Transfer Berhasil').setDescription(`<@${i.user.id}> → <@${target.id}>\nJumlah: **${eco.coins(amount)}**`)] });
}

async function leaderboard(i) {
  const rows = eco.top(i.guild.id, 10);
  if (!rows.length) return i.reply({ embeds: [errorEmbed('Belum ada data. Ketik `daily` untuk mulai!')] });
  const medals = ['🥇', '🥈', '🥉'];
  const desc = rows.map((u, idx) => `${medals[idx] || `**${idx + 1}.**`} <@${u.id}> — ${eco.coins(u.coins)} • Lv.${u.level}`).join('\n');
  return i.reply({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 Papan Peringkat').setDescription(desc).setTimestamp()] });
}

async function profile(i) {
  const target = i.options.getUser('user') || i.user;
  const u = eco.getUser(i.guild.id, target.id);
  const embed = new EmbedBuilder()
    .setColor(C)
    .setAuthor({ name: `Profil ${target.username}`, iconURL: target.displayAvatarURL() })
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '🪙 Koin', value: eco.coins(u.coins), inline: true },
      { name: '⭐ Level', value: `${u.level}`, inline: true },
      { name: '💼 Kerja', value: u.job ? eco.JOBS[u.job]?.label || u.job : '—', inline: true },
      { name: '🎯 Total Command', value: `${u.stats.commands || 0}`, inline: true },
      { name: '🏹 Total Buruan', value: `${u.stats.hunted || 0}`, inline: true },
      { name: '🎲 Total Taruhan', value: `${u.stats.gambled || 0}`, inline: true },
    )
    .setFooter({ text: 'Zomai Economy • ketik: daily, work, hunt' })
    .setTimestamp();
  return i.reply({ embeds: [embed] });
}

module.exports = {
  data: [
    new SlashCommandBuilder().setName('balance').setDescription('💰 Lihat saldo koin & level')
      .addUserOption(o => o.setName('user').setDescription('User (default: kamu)')),
    new SlashCommandBuilder().setName('daily').setDescription('🎁 Ambil hadiah harian (streak)'),
    new SlashCommandBuilder().setName('work').setDescription('💼 Kerja dapet koin (cooldown 45 menit)'),
    new SlashCommandBuilder().setName('job').setDescription('💼 Lihat/ganti pekerjaan')
      .addStringOption(o => o.setName('nama').setDescription('Nama pekerjaan (kosongkan untuk lihat daftar)')),
    new SlashCommandBuilder().setName('hunt').setDescription('🏹 Berburu hewan dapet koin'),
    new SlashCommandBuilder().setName('bet').setDescription('🪙 Taruhan koin (48% menang)')
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah koin (default 100)').setMinValue(10)),
    new SlashCommandBuilder().setName('pay').setDescription('💸 Kirim koin ke user lain')
      .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah koin').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('leaderboard').setDescription('🏆 10 orang terkaya di server ini'),
    new SlashCommandBuilder().setName('profile').setDescription('📊 Profil ekonomi user')
      .addUserOption(o => o.setName('user').setDescription('User (default: kamu)')),
  ],
  async execute(i) {
    if (needGuild(i)) return i.reply({ embeds: [errorEmbed('Command ini cuma bisa dipakai di server.')] });
    const map = { balance, daily, work, job, hunt, bet, pay, leaderboard, profile };
    return map[i.commandName](i);
  },
};
