/**
 * GitHub webhook → Discord (Vercel serverless, zero dependency)
 * URL: https://<project>.vercel.app/api/github-webhook
 *
 * Env:
 *   DISCORD_TOKEN, GITHUB_CHANNEL_ID, GITHUB_WEBHOOK_SECRET (opsional tapi disarankan)
 */
'use strict';

const crypto = require('crypto');

const TOKEN = process.env.DISCORD_TOKEN || '';
const CHANNEL_ID = process.env.GITHUB_CHANNEL_ID || '';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const API = 'https://discord.com/api/v10';

function sendJson(res, code, obj) {
  if (res.headersSent) return;
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
    if (typeof req.body === 'string') return resolve(req.body);
    if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
    if (!req.readable) return resolve('');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function verify(raw, sig) {
  if (!SECRET) return true;
  if (!sig) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex'));
  const got = Buffer.from(String(sig));
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

async function send(embed, channelOverride) {
  const target = channelOverride || CHANNEL_ID;
  if (!target) return console.warn('[github-webhook] channel belum diset (env GITHUB_CHANNEL_ID atau ?channel=)');
  const res = await fetch(`${API}/channels/${target}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'ZomaiBot/1.0' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) console.error('[github-webhook] send failed', res.status, (await res.text().catch(() => '')).slice(0, 200));
}

let CH_OVERRIDE = null;
const sendTo = (embed) => send(embed, CH_OVERRIDE);

const emb = (title, description, color, url) => {
  const e = { title, color, timestamp: new Date().toISOString() };
  if (description) e.description = String(description).slice(0, 900);
  if (url) e.url = url;
  return e;
};
const fields = (e, f) => {
  e.fields = f;
  return e;
};

async function handle(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const raw = await readRawBody(req);
  if (!verify(raw, req.headers['x-hub-signature-256'])) return sendJson(res, 401, { error: 'Invalid signature' });

  let p;
  try {
    p = raw ? JSON.parse(raw) : {};
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

  let q = {};
  try {
    q = Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams.entries());
  } catch {}
  const channelOverride = /^\d{15,25}$/.test(q.channel || '') ? q.channel : null;
  CH_OVERRIDE = channelOverride;
  const repoFilter = (q.repo || '').trim().toLowerCase();

  const event = req.headers['x-github-event'];
  const repo = p.repository?.full_name || '—';
  if (repoFilter && repo.toLowerCase() !== repoFilter) {
    return sendJson(res, 200, { ok: true, skipped: 'repo tidak cocok filter' });
  }

  try {
    if (event === 'ping') {
      await sendTo(emb('✅ Webhook Terhubung', `Repo **${repo}** berhasil terhubung ke Zomai Bot.`, 0x57f287, p.repository?.html_url));
    } else if (event === 'pull_request') {
      const pr = p.pull_request || {};
      if (p.action === 'opened') {
        await sendTo(fields(emb(`🔀 PR Dibuka: #${pr.number}`, pr.title + '\n\n' + (pr.body || '').slice(0, 400), 0x8957e5, pr.html_url), [
          { name: '📦 Repo', value: repo, inline: true },
          { name: '👤 Author', value: `@${pr.user?.login || '?'}`, inline: true },
        ]));
      } else if (p.action === 'closed' && pr.merged) {
        await sendTo(emb(`✅ PR Di-merge: #${pr.number}`, `**${pr.title}**\nDi-merge oleh @${pr.merged_by?.login || '?'}`, 0x57f287, pr.html_url));
      } else if (p.action === 'closed') {
        await sendTo(emb(`❌ PR Ditutup: #${pr.number}`, `**${pr.title}**`, 0xed4245, pr.html_url));
      } else if (p.action === 'reopened') {
        await sendTo(emb(`🔄 PR Dibuka Ulang: #${pr.number}`, `**${pr.title}**`, 0xfee75c, pr.html_url));
      }
    } else if (event === 'push') {
      const commits = p.commits || [];
      if (commits.length) {
        const branch = String(p.ref || '').replace('refs/heads/', '');
        await sendTo(emb(`📤 Push ke ${repo} (${branch})`, commits.slice(0, 5).map(c => `• ${String(c.message).split('\n')[0].slice(0, 80)}`).join('\n'), 0x5865f2, p.compare));
      }
    } else if (event === 'issues') {
      const issue = p.issue || {};
      if (p.action === 'opened') {
        await sendTo(emb(`🐛 Issue Dibuka: #${issue.number}`, `**${issue.title}**\n\n${(issue.body || '').slice(0, 400)}`, 0xfee75c, issue.html_url));
      } else if (p.action === 'closed') {
        await sendTo(emb(`✅ Issue Ditutup: #${issue.number}`, `**${issue.title}**`, 0x57f287, issue.html_url));
      }
    } else if (event === 'release') {
      await sendTo(emb(`🚀 Release ${p.release?.tag_name}`, (p.release?.body || '').slice(0, 700), 0xf1c40f, p.release?.html_url));
    } else if (event === 'star') {
      await sendTo(emb('⭐ Star Baru!', `**${repo}** dapat star dari @${p.sender?.login || '?'}`, 0xf1c40f, p.repository?.html_url));
    } else if (event === 'fork') {
      await sendTo(emb('🍴 Repo Di-fork!', `Fork baru: **${p.forkee?.full_name}**`, 0x5865f2, p.forkee?.html_url));
    } else if (event === 'workflow_run') {
      const w = p.workflow_run || {};
      const okRun = w.conclusion === 'success';
      await sendTo(emb(`${okRun ? '✅' : '❌'} Workflow ${w.name}: ${w.conclusion || w.status}`, `Branch: \`${w.head_branch || '?'}\``, okRun ? 0x57f287 : 0xed4245, w.html_url));
    }
  } catch (e) {
    console.error('[github-webhook]', e.message);
  }

  return sendJson(res, 200, { ok: true, event });
};

module.exports = async (req, res) => {
  try {
    return await handle(req, res);
  } catch (e) {
    console.error('[github-webhook] fatal:', e);
    return sendJson(res, 500, { error: 'Internal error', detail: e.message });
  }
};
