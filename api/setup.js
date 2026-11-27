/**
 * One-time setup endpoint: daftarkan slash commands ke Discord.
 * Buka sekali di browser: https://<project>.vercel.app/api/setup?secret=<SETUP_SECRET>
 * Env: DISCORD_TOKEN, CLIENT_ID, SETUP_SECRET (isi bebas, misal: zomai123)
 */
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.query?.secret !== process.env.SETUP_SECRET || !process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Isi SETUP_SECRET di Vercel env dulu.' });
  }

  const { REST, Routes } = require('discord.js');
  const commands = [];
  const dir = path.join(__dirname, '..', 'src', 'commands');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(dir, file));
    if (!cmd.data) continue;
    if (Array.isArray(cmd.data)) cmd.data.forEach(c => commands.push(c.toJSON()));
    else commands.push(cmd.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    return res.json({ ok: true, message: `Berhasil daftarkan ${commands.length} command! Tunggu ~1 jam atau refresh Discord.` });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
