/**
 * GitHub Webhook Endpoint (Vercel Serverless)
 * Terima event GitHub → kirim notifikasi ke Discord via REST API (bot token).
 *
 * Env:
 * - DISCORD_TOKEN
 * - GITHUB_CHANNEL_ID (channel tujuan notifikasi)
 * - GITHUB_WEBHOOK_SECRET (opsional, untuk verifikasi signature)
 */
const crypto = require('crypto');
const { EmbedBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN || '';
const CHANNEL_ID = process.env.GITHUB_CHANNEL_ID || '';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

async function sendToDiscord(embed) {
  if (!CHANNEL_ID) {
    console.warn('GITHUB_CHANNEL_ID belum diisi');
    return;
  }
  const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ZomaiBot/1.0',
    },
    body: JSON.stringify({ embeds: [embed.toJSON()] }),
  });
  if (!res.ok) {
    console.error('Discord send failed:', res.status, await res.text().catch(() => ''));
  }
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  if (!req.readable) return '';
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function verify(raw, sig) {
  if (!SECRET) return true;
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  const expected = Buffer.from('sha256=' + hmac);
  const received = Buffer.from(String(sig));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const raw = await readRawBody(req);
  if (!verify(raw, req.headers['x-hub-signature-256'])) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let p = {};
  try {
    p = raw ? JSON.parse(raw) : {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = req.headers['x-github-event'];
  const repo = p.repository?.full_name || '—';

  try {
    if (event === 'pull_request') {
      const pr = p.pull_request;
      if (p.action === 'opened') {
        await sendToDiscord(new EmbedBuilder().setColor(0x8957E5)
          .setTitle(`🔀 PR Dibuka: #${pr.number}`).setURL(pr.html_url)
          .setDescription((pr.body || '_Tidak ada deskripsi_').slice(0, 500))
          .addFields({ name: '📦 Repo', value: repo, inline: true }, { name: '👤 Author', value: `@${pr.user.login}`, inline: true })
          .setTimestamp());
      } else if (p.action === 'closed' && pr.merged) {
        await sendToDiscord(new EmbedBuilder().setColor(0x57F287)
          .setTitle(`✅ PR Di-merge: #${pr.number}`).setURL(pr.html_url)
          .setDescription(`**${pr.title}**\nDi-merge oleh @${pr.merged_by?.login || 'unknown'}`)
          .setTimestamp());
      } else if (p.action === 'closed') {
        await sendToDiscord(new EmbedBuilder().setColor(0xED4245)
          .setTitle(`❌ PR Ditutup: #${pr.number}`).setURL(pr.html_url)
          .setDescription(`**${pr.title}**`).setTimestamp());
      }
    } else if (event === 'push') {
      const commits = p.commits || [];
      if (commits.length) {
        const branch = (p.ref || '').replace('refs/heads/', '');
        await sendToDiscord(new EmbedBuilder().setColor(0x5865F2)
          .setTitle(`📤 Push ke ${repo} (${branch})`).setURL(p.repository.html_url)
          .setDescription(commits.slice(0, 5).map(c => `• [${c.message.split('\n')[0].slice(0, 80)}](${c.url})`).join('\n'))
          .setTimestamp());
      }
    } else if (event === 'issues') {
      const issue = p.issue;
      if (p.action === 'opened') {
        await sendToDiscord(new EmbedBuilder().setColor(0xFEE75C)
          .setTitle(`🐛 Issue Dibuka: #${issue.number}`).setURL(issue.html_url)
          .setDescription((issue.body || '').slice(0, 500)).setTimestamp());
      } else if (p.action === 'closed') {
        await sendToDiscord(new EmbedBuilder().setColor(0x57F287)
          .setTitle(`✅ Issue Ditutup: #${issue.number}`).setURL(issue.html_url)
          .setDescription(`**${issue.title}**`).setTimestamp());
      }
    } else if (event === 'release') {
      await sendToDiscord(new EmbedBuilder().setColor(0xF1C40F)
        .setTitle(`🚀 Release: ${p.release.tag_name}`).setURL(p.release.html_url)
        .setDescription((p.release.body || '').slice(0, 800)).setTimestamp());
    } else if (event === 'star') {
      await sendToDiscord(new EmbedBuilder().setColor(0xF1C40F)
        .setTitle(`⭐ ${repo} dapat star baru!`).setURL(p.repository.html_url)
        .setDescription(`@${p.sender?.login} memberikan star`).setTimestamp());
    } else if (event === 'fork') {
      await sendToDiscord(new EmbedBuilder().setColor(0x5865F2)
        .setTitle(`🍴 ${repo} di-fork!`).setURL(p.forkee?.html_url || p.repository.html_url)
        .setDescription(`Fork baru: **${p.forkee?.full_name}**`).setTimestamp());
    }
  } catch (e) {
    console.error('[github-webhook]', e);
  }

  return res.json({ ok: true, event });
};
