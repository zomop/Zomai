const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const channels = require('../utils/github-channels');
const { errorEmbed, successEmbed } = require('../utils/embed');

/**
 * /setup-github — admin atur channel notifikasi GitHub untuk server ini
 * Jadi bot bisa dipakai di SEMUA server, masing-masing server pilih channel sendiri.
 */
const setup = new SlashCommandBuilder()
  .setName('setup-github')
  .setDescription('⚙️ Atur channel notifikasi GitHub untuk server ini (admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel untuk notifikasi GitHub').setRequired(true))
  .addStringOption(opt => opt.setName('repo').setDescription('Repo yang dipantau (opsional, format: owner/repo)'));

const status = new SlashCommandBuilder()
  .setName('github-status')
  .setDescription('📊 Lihat status sync GitHub server ini');

const disable = new SlashCommandBuilder()
  .setName('github-disable')
  .setDescription('🚫 Matikan notifikasi GitHub untuk server ini')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports = {
  data: [setup, status, disable],
  async execute(interaction) {
    const cmd = interaction.commandName;

    if (cmd === 'setup-github') {
      const channel = interaction.options.getChannel('channel');
      const repo = interaction.options.getString('repo') || '';
      channels.setChannel(interaction.guildId, channel.id, repo);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Sync GitHub Aktif!')
        .setDescription(`Notifikasi GitHub akan dikirim ke ${channel} di server ini.\n${repo ? `Hanya untuk repo: **${repo}**` : 'Untuk semua repo yang webhook-nya terpasang.'}\n\nSekarang pasang webhook di GitHub dengan URL bot kamu, atau pakai command \`/github-check\` untuk cek manual kapan saja.`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'github-status') {
      const cfg = channels.getChannel(interaction.guildId);
      if (!cfg) {
        return interaction.reply({
          embeds: [errorEmbed('Sync GitHub belum diatur untuk server ini.\nAdmin bisa atur dengan `/setup-github #channel`')],
          ephemeral: true,
        });
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Status Sync GitHub')
        .addFields(
          { name: '📢 Channel notifikasi', value: `<#${cfg.channelId}>`, inline: true },
          { name: '📦 Repo dipantau', value: cfg.repo || 'Semua repo', inline: true },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'github-disable') {
      channels.removeChannel(interaction.guildId);
      return interaction.reply({ embeds: [successEmbed('🚫 Sync GitHub dimatikan', 'Notifikasi GitHub untuk server ini sudah dimatikan.')] });
    }
  },
};
