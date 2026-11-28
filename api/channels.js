/**
 * Diagnostik: daftar channel bot di semua server.
 * Buka: https://<project>.vercel.app/api/channels?secret=<SETUP_SECRET>
 * Opsional: &find=staff-log  → cuma tampilkan yang cocok
 */
'use strict';

function send(res, code, obj) {
  if (res.headersSent) return;
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj, null, 2));
}

const TYPES = { 0: 'text', 2: 'voice', 4: 'category', 5: 'announcement', 13: 'stage', 15: 'forum', 16: 'media' };

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://x');
  if (url.searchParams.get('secret') !== process.env.SETUP_SECRET) return send(res, 401, { error: 'Unauthorized' });

  const token = process.env.DISCORD_TOKEN;
  const h = { Authorization: `Bot ${token}`, 'User-Agent': 'ZomaiBot/1.0' };
  const get = async p => {
    const r = await fetch(`https://discord.com/api/v10${p}`, { headers: h, signal: AbortSignal.timeout(4000) }).catch(() => null);
    return r && r.ok ? r.json().catch(() => null) : null;
  };

  const find = (url.searchParams.get('find') || '').toLowerCase();
  const guilds = (await get('/users/@me/guilds')) || [];
  const out = [];

  for (const g of guilds) {
    const chans = (await get(`/guilds/${g.id}/channels`)) || [];
    const list = (Array.isArray(chans) ? chans : [])
      .filter(c => !find || String(c.name).toLowerCase().includes(find))
      .map(c => ({ id: c.id, name: c.name, type: TYPES[c.type] || c.type, parent_id: c.parent_id || null }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    out.push({ guild: g.name, guild_id: g.id, channels: list });
  }

  const suggestion = (() => {
    for (const g of out) {
      for (const name of ['staff-log', 'github', 'webhook', 'mod-log', 'staff-chat']) {
        const f = g.channels.find(c => c.name === name && c.type === 'text');
        if (f) return { guild: g.guild, channel: f.name, channel_id: f.id };
      }
    }
    return null;
  })();

  // opsional: &logs=1 → tampilkan 3 pesan terakhir di channel auto (cek notifikasi masuk)
  let recent = null;
  if (url.searchParams.get('logs') === '1' && suggestion) {
    const msgs = await get(`/channels/${suggestion.channel_id}/messages?limit=3`);
    recent = (Array.isArray(msgs) ? msgs : []).map(m => ({
      author: m.author?.username,
      bot: m.author?.bot,
      title: m.embeds?.[0]?.title || null,
      content: (m.content || '').slice(0, 120),
      at: m.timestamp,
    }));
  }

  return send(res, 200, {
    ok: true,
    recent,
    total_guild: out.length,
    auto_channel: suggestion,
    note: suggestion
      ? `Notifikasi GitHub otomatis dikirim ke #${suggestion.channel} (${suggestion.channel_id}).`
      : 'Belum ada channel bernama staff-log. Bikin channel "staff-log" atau set env GITHUB_CHANNEL_ID.',
    guilds: out,
  });
}

module.exports = async (req, res) => {
  try {
    return await handle(req, res);
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
