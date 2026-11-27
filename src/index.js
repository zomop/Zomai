/**
 * Zomai Discord Bot — Main Entry
 * Jalankan: npm start
 * Deploy commands dulu: npm run deploy
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');

if (!config.token) {
  console.error('❌ DISCORD_TOKEN belum diisi! Copy .env.example ke .env lalu isi token.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data) {
    if (Array.isArray(command.data)) {
      command.data.forEach(c => client.commands.set(c.name, command));
    } else {
      client.commands.set(command.data.name, command);
    }
    console.log(`📄 Loaded command: ${file}`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`📄 Loaded event: ${file}`);
}

// Error handling
client.on('error', err => console.error('[client error]', err));
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err));

// Start GitHub webhook server bareng bot (opsional, aktif kalau GITHUB_CHANNEL_ID diisi)
if (config.githubChannelId) {
  try {
    const { startWebhookServer } = require('./webhook/server');
    startWebhookServer(client);
  } catch (e) {
    console.warn('⚠️ Webhook server tidak jalan:', e.message);
  }
} else {
  console.log('ℹ️ GITHUB_CHANNEL_ID kosong — webhook GitHub nonaktif. Isi di .env untuk aktifkan sync GitHub.');
}

// Login
client.login(config.token).catch(err => {
  console.error('❌ Gagal login:', err.message);
  console.error('💡 Cek DISCORD_TOKEN di .env, dan pastikan bot sudah di-invite dengan scope bot + applications.commands');
  process.exit(1);
});
