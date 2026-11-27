/**
 * Simpan channel notifikasi GitHub per-server (multi-server support)
 * File: data/github-channels.json
 * Format: { "guildId": { "channelId": "...", "repo": "owner/repo" } }
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../../data/github-channels.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function setChannel(guildId, channelId, repo = '') {
  const data = load();
  data[guildId] = { channelId, repo };
  save(data);
}

function getChannel(guildId) {
  return load()[guildId] || null;
}

function removeChannel(guildId) {
  const data = load();
  delete data[guildId];
  save(data);
}

function getAllChannels() {
  return load();
}

module.exports = { setChannel, getChannel, removeChannel, getAllChannels };
