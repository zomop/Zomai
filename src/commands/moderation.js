const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embed');

const kick = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('👢 Kick member dari server')
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption(o => o.setName('user').setDescription('User yang akan di-kick').setRequired(true))
  .addStringOption(o => o.setName('alasan').setDescription('Alasan kick'));

const ban = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('🔨 Ban member dari server')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption(o => o.setName('user').setDescription('User yang akan di-ban').setRequired(true))
  .addStringOption(o => o.setName('alasan').setDescription('Alasan ban'));

const timeout = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('⏱️ Timeout member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(o => o.setName('user').setDescription('User yang akan di-timeout').setRequired(true))
  .addIntegerOption(o => o.setName('menit').setDescription('Durasi dalam menit').setRequired(true))
  .addStringOption(o => o.setName('alasan').setDescription('Alasan timeout'));

const clear = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('🧹 Hapus pesan di channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah pesan (1-100)').setRequired(true));

const warn = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('⚠️ Beri peringatan ke user')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(o => o.setName('user').setDescription('User yang diperingatkan').setRequired(true))
  .addStringOption(o => o.setName('alasan').setDescription('Alasan peringatan').setRequired(true));

module.exports = {
  data: [kick, ban, timeout, clear, warn],
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [errorEmbed('Command moderasi cuma bisa dipakai di server. Di DM nggak ada member yang bisa di-moderasi 🙂')] , ephemeral: true });
    }
    const cmd = interaction.commandName;

    if (cmd === 'kick') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';
      try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick(reason);
        return interaction.reply({ embeds: [successEmbed('👢 Kicked', `${user} telah di-kick.\nAlasan: ${reason}`)] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(`Gagal kick: ${e.message}\nPastikan bot punya permission Kick Members dan role bot di atas user tersebut.`)], ephemeral: true });
      }
    }

    if (cmd === 'ban') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';
      try {
        await interaction.guild.members.ban(user, { reason });
        return interaction.reply({ embeds: [successEmbed('🔨 Banned', `${user} telah di-ban.\nAlasan: ${reason}`)] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(`Gagal ban: ${e.message}`)], ephemeral: true });
      }
    }

    if (cmd === 'timeout') {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('menit');
      const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';
      try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(minutes * 60 * 1000, reason);
        return interaction.reply({ embeds: [successEmbed('⏱️ Timeout', `${user} di-timeout selama **${minutes} menit**.\nAlasan: ${reason}`)] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(`Gagal timeout: ${e.message}`)], ephemeral: true });
      }
    }

    if (cmd === 'clear') {
      const amount = interaction.options.getInteger('jumlah');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ embeds: [errorEmbed('Jumlah harus 1-100')], ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.editReply({ embeds: [successEmbed('🧹 Cleared', `Berhasil hapus **${deleted.size}** pesan.`)] });
    }

    if (cmd === 'warn') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('alasan');
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⚠️ Peringatan')
        .setDescription(`${user}, kamu diperingatkan oleh ${interaction.user}:\n**${reason}**`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      try {
        await user.send({ embeds: [embed] });
      } catch {}
      return;
    }
  },
};
