/**
 * Daftarkan slash command ke Discord (sekali jalan).
 * Buka di browser: https://<project>.vercel.app/api/setup?secret=<SETUP_SECRET>
 *
 * Query opsional:
 *   &guild=<guild_id>  → daftarkan ke server tertentu (langsung muncul, tidak perlu 1 jam)
 *
 * Env: DISCORD_TOKEN, CLIENT_ID, SETUP_SECRET
 */
'use strict';

const commands = require('./commands');

function send(res, code, obj) {
  if (res.headersSent) return;
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj, null, 2));
}

function query(req) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

async function handle(req, res) {
  const q = query(req);
  const secret = process.env.SETUP_SECRET;
  if (!secret || q.secret !== secret) {
    return send(res, 401, { error: 'Unauthorized — tambahkan ?secret=<SETUP_SECRET> sesuai env di Vercel' });
  }

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token || !clientId) return send(res, 500, { error: 'DISCORD_TOKEN / CLIENT_ID belum diset di Vercel' });

  const guild = q.guild;
  const url = guild
    ? `https://discord.com/api/v10/applications/${clientId}/guilds/${guild}/commands`
    : `https://discord.com/api/v10/applications/${clientId}/commands`;

  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'ZomaiBot/1.0' },
      body: JSON.stringify(commands),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, 500, { ok: false, status: r.status, error: body.message || body });

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    return send(res, 200, {
      ok: true,
      scope: guild ? `guild ${guild}` : 'global',
      registered: Array.isArray(body) ? body.length : commands.length,
      message: guild ? 'Command langsung muncul di server itu. Buka Discord, ketik /ping.' : 'Command global terdaftar (bisa perlu sampai 1 jam).',
      interactions_endpoint_url: host ? `https://${host}/api/interactions` : null,
      github_webhook_url: host ? `https://${host}/api/github-webhook` : null,
      catatan: 'Tempel interactions_endpoint_url ke Discord Developer Portal → General Information → Interactions Endpoint URL.',
    });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
}

module.exports = async (req, res) => {
  try {
    return await handle(req, res);
  } catch (e) {
    console.error('[setup] fatal:', e);
    return send(res, 500, { error: 'Internal error', detail: e.message });
  }
};
