/**
 * 🖼️ Banner profil — GIF animasi yang gerak di kartu profil.
 *
 *   banner               → galeri semua banner + status
 *   banner neon          → pakai banner (kalau kebuka)
 *   banner random        → pilih acak dari yang kebuka
 *   banner beli gold     → beli pakai koin (VIP)
 *   banner <url gif/png> → banner custom
 *   banner off           → balik ke default
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eco = require('../utils/economy');
const banners = require('../utils/banners');
const { errorEmbed } = require('../utils/embed');
const { makePrivate } = require('../utils/private');
const { scopeId } = require('../utils/scope');

const STATUS_TEXT = {
  free: '✅ siap pakai',
  owned: '✅ sudah kamu beli',
  buy: '🛒 perlu dibeli',
  level: '🔒 belum cukup level',
};

const statusLine = b => {
  if (b.status === 'buy') return `${STATUS_TEXT.buy} — \`banner beli ${b.key}\` (${eco.coins(b.price)})`;
  if (b.status === 'level') return `${STATUS_TEXT.level} (butuh **Lv.${b.level}**)`;
  return STATUS_TEXT[b.status] || STATUS_TEXT.free;
};

function galleryEmbed(user) {
  const list = banners.listFor(user);
  const current = banners.resolve(user.banner);
  const fields = list.map(b => ({
    name: `${b.emoji} ${b.label}${!current.custom && current.key === b.key ? ' ← dipakai' : ''}`,
    value: `\`${b.key}\` — ${statusLine(b)}`,
    inline: false,
  }));
  return new EmbedBuilder()
    .setColor(current.color)
    .setTitle('🖼️ Galeri Banner Profil')
    .setDescription(
      `Banner aktif: **${current.emoji} ${current.label}**\n` +
        'Semua banner **bergerak** (GIF) di kartu profil kamu.\n\n' +
        '`banner <nama>` — pakai\n' +
        '`banner random` — acak\n' +
        '`banner beli <nama>` — beli pakai koin\n' +
        '`banner <link gif>` — banner custom\n' +
        '`banner off` — balik ke default',
    )
    .addFields(...fields)
    .setImage(current.url)
    .setFooter({ text: 'Ketik: profile — lihat kartu profil kamu' })
    .setTimestamp();
}

/** Coba set banner, balikin embed hasilnya */
function applyBanner(user, value) {
  user.banner = value;
  eco.store.touch();
  return banners.resolve(value);
}

function previewEmbed(active, note) {
  const e = new EmbedBuilder()
    .setColor(active.color)
    .setTitle(`🖼️ Banner dipasang: ${active.emoji} ${active.label}`)
    .setImage(active.url)
    .setFooter({ text: 'Ketik: profile — lihat kartu profil kamu' });
  if (note) e.setDescription(note);
  return e;
}

async function execute(i) {
  const priv = makePrivate(i);
  const argRaw = (i.options.getString('nama') || '').trim();
  const arg = argRaw.toLowerCase();
  const user = eco.getUser(scopeId(i), i.user.id);

  // ---------- tanpa argumen: galeri ----------
  if (!arg) {
    await priv.reply({ embeds: [galleryEmbed(user)] });
    priv.autoCleanup(90 * 1000);
    return;
  }

  // ---------- matikan ----------
  if (['off', 'hapus', 'reset', 'default', 'mati'].includes(arg)) {
    const active = applyBanner(user, null);
    await priv.reply({ embeds: [previewEmbed(active, 'Banner balik ke default. Bisa ganti kapan aja: `banner`')] });
    priv.autoCleanup(45 * 1000);
    return;
  }

  // ---------- acak ----------
  if (['random', 'acak', 'r'].includes(arg)) {
    const pool = banners.listFor(user).filter(b => b.status === 'free' || b.status === 'owned');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const active = applyBanner(user, pick.key);
    await priv.reply({ embeds: [previewEmbed(active, `🎲 Dapet **${pick.emoji} ${pick.label}**`)] });
    priv.autoCleanup(60 * 1000);
    return;
  }

  // ---------- beli ----------
  const buyMatch = arg.match(/^(beli|buy)\s+(.+)$/);
  if (buyMatch) {
    const b = banners.byKey(buyMatch[2].trim());
    if (!b) return priv.reply({ embeds: [errorEmbed(`Banner **${buyMatch[2].trim()}** nggak ada. Ketik \`banner\` buat lihat daftar.`)] });
    if (b.price <= 0) return priv.reply({ embeds: [errorEmbed(`**${b.label}** gratis kok — langsung \`banner ${b.key}\` aja.`)] });
    if (banners.state(user, b) === 'owned') return priv.reply({ embeds: [errorEmbed(`**${b.label}** udah kamu punya. Pakai: \`banner ${b.key}\``)] });
    if (user.coins < b.price) {
      return priv.reply({
        embeds: [errorEmbed(`Koin kamu kurang buat **${b.label}**.`)],
      }).then(() => priv.autoCleanup(20 * 1000));
    }
    eco.addCoins(scopeId(i), i.user.id, -b.price);
    user.owned.push(b.key);
    const active = applyBanner(user, b.key);
    await priv.reply({
      embeds: [previewEmbed(active, `🛒 Berhasil beli **${b.emoji} ${b.label}** seharga **${eco.coins(b.price)}**\nSaldo sekarang: **${eco.coins(user.coins)}**`)],
    });
    priv.autoCleanup(60 * 1000);
    return;
  }

  // ---------- URL custom ----------
  if (banners.isUrl(argRaw)) {
    if (!banners.looksLikeImage(argRaw)) {
      return priv.reply({ embeds: [errorEmbed('Link-nya harus gambar: `.gif`, `.png`, `.jpg`, `.webp` (atau link Tenor/Giphy).')] });
    }
    await priv.defer();
    const check = await banners.verifyImage(argRaw);
    if (!check.ok) {
      return priv.reply({ embeds: [errorEmbed(`Link gambar nggak bisa dibuka (${check.reason}). Coba upload ulang / pakai link lain.`)] });
    }
    const active = applyBanner(user, argRaw);
    await priv.reply({
      embeds: [previewEmbed(active, `🖼️ Banner custom dipasang${check.type.includes('gif') ? ' — dan ini GIF, jadi **bergerak** pas dilihat' : ''}.`)],
    });
    priv.autoCleanup(60 * 1000);
    return;
  }

  // ---------- banner preset ----------
  const b = banners.byKey(arg);
  if (!b) {
    const names = banners.LIST.map(x => `\`${x.key}\``).join(' • ');
    return priv.reply({ embeds: [errorEmbed(`Banner **${argRaw}** nggak ada.\nPilihan: ${names}\n\nKetik \`banner\` buat lihat galeri.`)] });
  }

  const st = banners.state(user, b);
  if (st === 'buy') {
    return priv.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(b.color)
          .setTitle(`🛒 ${b.emoji} ${b.label} — ${eco.coins(b.price)}`)
          .setDescription(`Banner ini premium. Beli dulu:\n\`banner beli ${b.key}\`\n\nSaldo kamu: **${eco.coins(user.coins)}**`)
          .setImage(banners.assetUrl(b.key)),
      ],
    }).then(() => priv.autoCleanup(45 * 1000));
  }
  if (st === 'level') {
    return priv.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle(`🔒 ${b.emoji} ${b.label} masih terkunci`)
          .setDescription(`Butuh **Level ${b.level}** — level kamu sekarang **${user.level}**.\nNaik level: pakai command apa aja (tiap command dapat XP) atau \`daily\`.`)
          .setImage(banners.assetUrl(b.key)),
      ],
    }).then(() => priv.autoCleanup(30 * 1000));
  }

  const active = applyBanner(user, b.key);
  await priv.reply({ embeds: [previewEmbed(active, 'Pas lihat profil, bannernya gerak 🎞️')] });
  priv.autoCleanup(60 * 1000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('🖼️ Ganti banner kartu profil (GIF animasi)')
    .addStringOption(o =>
      o
        .setName('nama')
        .setDescription('nama banner / "random" / "off" / "beli <nama>" / link gambar'),
    ),
  execute,
  // dipakai juga sama command profile
  galleryEmbed,
  applyBanner,
};
