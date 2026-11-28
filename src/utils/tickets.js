/**
 * Sistem tiket: channel privat per user + staff.
 * Dipakai command `tiket` (chat biasa) dan tombol di #buat-tiket (via Vercel).
 */
'use strict';

const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const STAFF_LABELS = ['Admin', 'Moderator', 'Helper'];

const staffRoleIds = guild => STAFF_LABELS.map(l => guild.roles.cache.find(r => r.name.includes(l))?.id).filter(Boolean);

function ticketCategory(guild) {
  return guild.channels.cache.find(c => c.name === '🎫 TIKET & BANTUAN' && c.type === ChannelType.GuildCategory);
}

/** Buka tiket. Mengembalikan { channel, existing } */
async function openTicket(guild, user, { reason = '', log } = {}) {
  const existing = guild.channels.cache.find(c => c.name === `tiket-${user.username}`.toLowerCase());
  if (existing) return { channel: existing, existing: true };

  const everyone = guild.roles.everyone;
  const overwrites = [
    { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.AddReactions],
    },
  ];
  for (const id of staffRoleIds(guild)) {
    overwrites.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }
  if (guild.members.me) {
    overwrites.push({
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: `tiket-${user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: ticketCategory(guild)?.id,
    topic: `Tiket ${user.tag}${reason ? ` • ${reason}` : ''}`,
    permissionOverwrites: overwrites,
    reason: `Tiket dibuka oleh ${user.tag}`,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Tiket Dibuka')
    .setDescription(
      `Halo <@${user.id}>! Staff bakal bantu sebentar lagi.\n\n` +
        '**Tulis masalah/kebutuhanmu di sini** — jelaskan sedetail mungkin ya.\n' +
        'Channel ini **privat**: cuma kamu + staff yang bisa lihat.\n\n' +
        'Kalau sudah selesai, klik tombol **Tutup Tiket**.',
    )
    .setFooter({ text: 'Zomai Ticket System' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('zomai_ticket_close').setLabel('Tutup Tiket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `<@${user.id}> ${staffRoleIds(guild).map(id => `<@&${id}>`).join(' ')}`.trim(), embeds: [embed], components: [row] });
  log?.(`Tiket dibuat: #${channel.name}`);
  return { channel, existing: false };
}

/** Tutup tiket: catat ke #ticket-log lalu hapus channel */
async function closeTicket(channel, { by } = {}) {
  const guild = channel.guild;
  const logChannel = guild?.channels.cache.find(c => c.name === 'ticket-log');
  if (logChannel) {
    await logChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('🔒 Tiket ditutup')
            .setDescription(`Channel: \`${channel.name}\`\nDitutup oleh: ${by ? `<@${by.id}>` : '—'}`)
            .setTimestamp(),
        ],
      })
      .catch(() => {});
  }
  await channel.delete(`Tiket ditutup${by ? ` oleh ${by.tag}` : ''}`).catch(() => {});
}

module.exports = { openTicket, closeTicket, staffRoleIds };
