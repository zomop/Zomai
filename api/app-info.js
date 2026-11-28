/**
 * Cek konfigurasi aplikasi Discord milik bot (intent, jumlah server, dll).
 * Buka: https://<project>.vercel.app/api/app-info?secret=<SETUP_SECRET>
 */
'use strict';

function send(res, code, obj) {
  if (res.headersSent) return;
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj, null, 2));
}

const FLAG_MESSAGE_CONTENT = 1 << 18; // 262144
const FLAG_MESSAGE_CONTENT_LIMITED = 1 << 19; // 524288

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://x');
  if (url.searchParams.get('secret') !== process.env.SETUP_SECRET) {
    return send(res, 401, { error: 'Unauthorized' });
  }

  const token = process.env.DISCORD_TOKEN;
  const headers = { Authorization: `Bot ${token}`, 'User-Agent': 'ZomaiBot/1.0' };

  const [appRes, guildsRes] = await Promise.all([
    fetch('https://discord.com/api/v10/applications/@me', { headers }),
    fetch('https://discord.com/api/v10/users/@me/guilds', { headers }),
  ]);

  const app = appRes.ok ? await appRes.json() : {};
  const guilds = guildsRes.ok ? await guildsRes.json() : [];
  const flags = app.flags || 0;

  // Pemilik aplikasi = owner bot (hidden command `zomai` aktif untuk akun ini)
  const owner = app.owner ? app.owner.ownerId || (app.owner.members ? null : app.owner.id) : null;
  const ownerIds = [
    ...(owner ? [owner] : []),
    ...String(process.env.OWNER_IDS || '')
      .split(/[,\s]+/)
      .filter(Boolean),
  ];

  return send(res, 200, {
    bot: `${app.name}#${app.discriminator || ''}`,
    owner_id: owner,
    owner_ids: ownerIds,
    owner_note: owner
      ? `Akun ${owner} = owner bot → ketik \`zomai\` di chat (juga bisa lewat DM) buat buka panel owner.`
      : 'Owner belum kedetect — isi env OWNER_IDS, atau ketik `zomai claim <kode>` lewat DM.',
    team: app.team ? { name: app.team.name, members: (app.team.members || []).length } : null,
    bot_id: app.id,
    servers: Array.isArray(guilds) ? guilds.map(g => ({ id: g.id, name: g.name })) : [],
    server_count: Array.isArray(guilds) ? guilds.length : null,
    message_content_intent: Boolean(flags & (FLAG_MESSAGE_CONTENT | FLAG_MESSAGE_CONTENT_LIMITED)),
    note: Boolean(flags & (FLAG_MESSAGE_CONTENT | FLAG_MESSAGE_CONTENT_LIMITED))
      ? 'Command tanpa slash AKTIF ✅'
      : 'Command tanpa slash BELUM aktif — nyalakan Message Content Intent di Developer Portal → Bot.',
    raw_flags: flags,
  });
}

module.exports = async (req, res) => {
  try {
    return await handle(req, res);
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
};
