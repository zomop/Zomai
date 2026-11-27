const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 8ball
const eightBall = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('🎱 Tanya Magic 8-Ball')
  .addStringOption(o => o.setName('pertanyaan').setDescription('Pertanyaan kamu').setRequired(true));

// coinflip
const coinflip = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('🪙 Lempar koin');

// dice
const dice = new SlashCommandBuilder()
  .setName('dice')
  .setDescription('🎲 Lempar dadu')
  .addIntegerOption(o => o.setName('sisi').setDescription('Jumlah sisi (default 6)').setMinValue(2).setMaxValue(100));

// meme
const meme = new SlashCommandBuilder()
  .setName('meme')
  .setDescription('😂 Meme random dari Reddit');

const answers = [
  'Ya, pasti!', 'Tidak, jangan harap.', 'Mungkin.', 'Tentu saja!',
  'Jangan tanya lagi.', 'Bisa jadi.', '100% ya!', 'Tidak mungkin.',
  'Tanya lagi nanti.', 'Sudah pasti!', 'Ragu-ragu.', 'Coba lagi!',
];

module.exports = {
  data: [eightBall, coinflip, dice, meme],
  async execute(interaction) {
    const cmd = interaction.commandName;

    if (cmd === '8ball') {
      const q = interaction.options.getString('pertanyaan');
      const a = answers[Math.floor(Math.random() * answers.length)];
      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🎱 Magic 8-Ball')
        .addFields(
          { name: '❓ Pertanyaan', value: q },
          { name: '💬 Jawaban', value: `**${a}**` },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'coinflip') {
      const result = Math.random() < 0.5 ? '🪙 Heads (Gambar)' : '🪙 Tails (Angka)';
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🪙 Coin Flip')
        .setDescription(`Hasil: **${result}**`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'dice') {
      const sides = interaction.options.getInteger('sisi') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎲 Lempar Dadu')
        .setDescription(`Dadu ${sides} sisi: **${result}**`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'meme') {
      await interaction.deferReply();
      try {
        const res = await fetch('https://meme-api.com/gimme/wholesomememes');
        const data = await res.json();
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle(data.title || '😂 Meme')
          .setURL(data.url)
          .setImage(data.url)
          .setFooter({ text: `r/${data.subreddit} • 👍 ${data.ups}` })
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      } catch {
        return interaction.editReply({ content: 'Gagal ambil meme, coba lagi!' });
      }
    }
  },
};
