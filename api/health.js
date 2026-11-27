/**
 * Cek cepat: apakah function Vercel jalan & env sudah lengkap.
 * Buka: https://<project>.vercel.app/api/health
 */
'use strict';

module.exports = (req, res) => {
  const env = {
    DISCORD_TOKEN: !!process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID || null,
    DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY ? 'set' : 'auto-fetch',
    GITHUB_CHANNEL_ID: process.env.GITHUB_CHANNEL_ID || null,
    SETUP_SECRET: process.env.SETUP_SECRET ? 'set' : 'missing',
  };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, service: 'zomai-bot', node: process.version, env, time: new Date().toISOString() }, null, 2));
};
