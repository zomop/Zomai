/**
 * Deploy slash commands ke Discord
 * Jalankan: npm run deploy
 * Butuh DISCORD_TOKEN & CLIENT_ID di .env
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = require('./config');

async function main() {
  if (!config.token || !config.clientId) {
    console.error('❌ DISCORD_TOKEN dan CLIENT_ID wajib diisi di .env');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data) {
      if (Array.isArray(command.data)) {
        command.data.forEach(c => commands.push(c.toJSON()));
      } else {
        commands.push(command.data.toJSON());
      }
    }
  }

  console.log(`📦 Ditemukan ${commands.length} command(s)`);

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('⏳ Mendaftarkan slash commands...');
    if (config.guildId) {
      // Dev mode: cepat muncul di 1 guild
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Commands didaftarkan ke guild ${config.guildId} (dev mode, langsung muncul)`);
    } else {
      // Production: global (butuh ~1 jam)
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log('✅ Commands didaftarkan secara global (bisa butuh ~1 jam untuk muncul di semua server)');
    }
  } catch (error) {
    console.error('❌ Gagal deploy:', error);
    process.exit(1);
  }
}

main();
