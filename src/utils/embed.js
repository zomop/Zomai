const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(title)
    .setDescription(description || null)
    .setFooter({ text: 'Zomai Bot • github.com/zomop/Zomai', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' })
    .setTimestamp();
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('❌ Error')
    .setDescription(message)
    .setTimestamp();
}

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = { baseEmbed, errorEmbed, successEmbed };
