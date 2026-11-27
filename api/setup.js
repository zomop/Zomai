/**
 * Daftarkan slash command ke Discord (sekali jalan).
 * Buka di browser: https://<project>.vercel.app/api/setup?secret=<SETUP_SECRET>
 *
 * Query opsional:
 *   ?guild=<guild_id>  → daftarkan ke server tertentu (langsung muncul, tidak perlu 1 jam)
 *
 * Env: DISCORD_TOKEN, CLIENT_ID, SETUP_SECRET
 */
'use strict';

const commands = require('./commands');

module.exports = async (req, res) => {
  const secret = process.env.SETUP_SECRET;
  const given = (req.query && req.query.secret) || '';
  if (!secret || given !== secret) {
    return res.status(401).json({ error: 'Unauthorized — isi ?secret=<SETUP_SECRET> sesuai env di Vercel' });
  }

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!process.env.DISCORD_PUBLIC_KEY) {
    console.warn('[setup] DISCORD_PUBLIC_KEY belum diset — jangan lupa untuk endpoint interactions');
  }
  if (!token || !clientId) return res.status(500).json({ error: 'DISCORD_TOKEN / CLIENT_ID belum diset' });

  const guild = req.query && req.query.guild;
  const url = guild
    ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guild}/commands`
    : `https://discord.com/api/v10/applications/${clientId}/commands`;

  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ZomaiBot/1.0',
      },
      body: JSON.stringify(commands),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(500).json({ ok: false, status: r.status, error: body.message || body });
    }
    return res.status(200).json({
      ok: true,
      scope: guild ? `guild ${guild}` : 'global',
      registered: Array.isArray(body) ? body.length : commands.length,
      message: guild
        ? 'Command langsung muncul di server itu. Buka Discord, ketik /ping.'
        : 'Command global terdaftar. Bisa perlu sampai 1 jam untuk muncul di semua server.',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
