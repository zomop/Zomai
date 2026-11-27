/**
 * GitHub Webhook Server
 * Terima event dari GitHub (PR, push, issue, dll) dan kirim ke Discord channel.
 *
 * Cara pasang:
 * 1. Deploy server ini (Railway/Render/VPS) atau jalankan bareng bot
 * 2. Di GitHub Repo > Settings > Webhooks > Add webhook
 *    - Payload URL: https://domain-kamu.com/webhook/github
 *    - Content type: application/json
 *    - Secret: sama dengan GITHUB_WEBHOOK_SECRET di .env
 *    - Events: Pull requests, Pushes, Issues, Releases, Stars, Forks (atau Send me everything)
 * 3. Isi GITHUB_CHANNEL_ID di .env dengan ID channel Discord tujuan
 *
 * Jalankan terpisah: npm run webhook
 * Atau gabung dengan bot: lihat src/index.js (tambah require webhook)
 */
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const app = express();

// Raw body untuk verifikasi signature GitHub
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

function verifySignature(req) {
  const secret = config.githubWebhookSecret;
  if (!secret) return true; // kalau secret kosong, skip verifikasi (dev only)
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody || Buffer.from(JSON.stringify(req.body || {})));
  const expected = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function sendToDiscord(embed) {
  if (!config.githubChannelId) {
    console.warn('⚠️ GITHUB_CHANNEL_ID belum diisi, notifikasi tidak dikirim. Payload:', JSON.stringify(embed.toJSON()).slice(0, 500));
    return;
  }
  // Kirim via Discord Webhook REST API (tanpa perlu bot login)
  // Kita pakai fetch ke channel? Lebih baik pakai bot client.
  // Di sini kita log + coba kirim via webhook URL jika ada.
  // Untuk integrasi penuh, jalankan webhook server bareng bot (lihat bawah).
  console.log('[webhook] → Discord:', embed.data?.title || embed.toJSON?.().title);
}

// Kalau bot client tersedia (dijalankan bareng), pakai client untuk kirim
let discordClient = null;
function setDiscordClient(client) { discordClient = client; }

async function notifyDiscord(embed) {
  if (discordClient && config.githubChannelId) {
    try {
      const channel = await discordClient.channels.fetch(config.githubChannelId);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] });
        return;
      }
    } catch (e) {
      console.error('[webhook] gagal kirim ke Discord:', e.message);
    }
  }
  await sendToDiscord(embed);
}

// ===== Event Handlers =====

function handlePullRequest(payload) {
  const pr = payload.pull_request;
  const repo = payload.repository.full_name;
  const action = payload.action;

  if (action === 'opened') {
    const embed = new EmbedBuilder()
      .setColor(0x8957E5)
      .setTitle(`🔀 PR Dibuka: #${pr.number}`)
      .setURL(pr.html_url)
      .setDescription(pr.body?.slice(0, 500) || '_Tidak ada deskripsi_')
      .addFields(
        { name: '📦 Repo', value: repo, inline: true },
        { name: '👤 Author', value: `@${pr.user.login}`, inline: true },
        { name: '🌿 Branch', value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: true },
      )
      .setTimestamp();
    return notifyDiscord(embed);
  }

  if (action === 'closed' && pr.merged) {
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`✅ PR Di-merge: #${pr.number}`)
      .setURL(pr.html_url)
      .setDescription(`**${pr.title}**\nDi-merge oleh @${pr.merged_by?.login || 'unknown'}`)
      .addFields(
        { name: '📦 Repo', value: repo, inline: true },
        { name: '👤 Author', value: `@${pr.user.login}`, inline: true },
      )
      .setTimestamp();
    return notifyDiscord(embed);
  }

  if (action === 'closed' && !pr.merged) {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`❌ PR Ditutup: #${pr.number}`)
      .setURL(pr.html_url)
      .setDescription(`**${pr.title}**`)
      .addFields({ name: '📦 Repo', value: repo, inline: true })
      .setTimestamp();
    return notifyDiscord(embed);
  }

  if (action === 'reopened') {
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`🔄 PR Dibuka Kembali: #${pr.number}`)
      .setURL(pr.html_url)
      .setDescription(`**${pr.title}**`)
      .setTimestamp();
    return notifyDiscord(embed);
  }
}

function handlePush(payload) {
  const repo = payload.repository.full_name;
  const branch = payload.ref.replace('refs/heads/', '');
  const commits = payload.commits || [];
  if (!commits.length) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📤 Push ke ${repo} (${branch})`)
    .setURL(payload.repository.html_url)
    .setDescription(commits.slice(0, 5).map(c => 
      `• [${c.message.split('\n')[0].slice(0, 80)}](${c.url}) — @${c.author?.username || c.author?.name || 'unknown'}`
    ).join('\n'))
    .setFooter({ text: `${commits.length} commit(s) • ${payload.pusher?.name || ''}` })
    .setTimestamp();
  return notifyDiscord(embed);
}

function handleIssues(payload) {
  const issue = payload.issue;
  const repo = payload.repository.full_name;
  const action = payload.action;

  if (action === 'opened') {
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`🐛 Issue Dibuka: #${issue.number}`)
      .setURL(issue.html_url)
      .setDescription(issue.body?.slice(0, 500) || '_Tidak ada deskripsi_')
      .addFields(
        { name: '📦 Repo', value: repo, inline: true },
        { name: '👤 Author', value: `@${issue.user.login}`, inline: true },
        { name: '🏷️ Labels', value: issue.labels?.map(l => `\`${l.name}\``).join(' ') || '—', inline: true },
      )
      .setTimestamp();
    return notifyDiscord(embed);
  }

  if (action === 'closed') {
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`✅ Issue Ditutup: #${issue.number}`)
      .setURL(issue.html_url)
      .setDescription(`**${issue.title}**`)
      .setTimestamp();
    return notifyDiscord(embed);
  }
}

function handleRelease(payload) {
  const release = payload.release;
  const repo = payload.repository.full_name;
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`🚀 Release: ${release.tag_name}`)
    .setURL(release.html_url)
    .setDescription(release.body?.slice(0, 800) || '_Tidak ada notes_')
    .addFields({ name: '📦 Repo', value: repo, inline: true })
    .setTimestamp();
  return notifyDiscord(embed);
}

function handleStar(payload) {
  const repo = payload.repository.full_name;
  const user = payload.sender?.login;
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`⭐ ${repo} dapat star baru!`)
    .setURL(payload.repository.html_url)
    .setDescription(`@${user} memberikan star ke **${repo}**`)
    .setTimestamp();
  return notifyDiscord(embed);
}

function handleFork(payload) {
  const repo = payload.repository.full_name;
  const forkee = payload.forkee?.full_name;
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🍴 ${repo} di-fork!`)
    .setURL(payload.forkee?.html_url || payload.repository.html_url)
    .setDescription(`Fork baru: **${forkee}**`)
    .setTimestamp();
  return notifyDiscord(embed);
}

function handleWorkflowRun(payload) {
  const run = payload.workflow_run;
  const repo = payload.repository.full_name;
  const status = run.conclusion === 'success' ? '✅ Sukses' : run.conclusion === 'failure' ? '❌ Gagal' : `⏳ ${run.status}`;
  const embed = new EmbedBuilder()
    .setColor(run.conclusion === 'success' ? 0x57F287 : run.conclusion === 'failure' ? 0xED4245 : 0xFEE75C)
    .setTitle(`⚙️ Workflow: ${run.name}`)
    .setURL(run.html_url)
    .setDescription(`${status} — branch \`${run.head_branch}\``)
    .addFields({ name: '📦 Repo', value: repo, inline: true })
    .setTimestamp();
  return notifyDiscord(embed);
}

// ===== Routes =====

app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: 'Zomai GitHub Webhook', uptime: process.uptime() });
});

app.post('/webhook/github', async (req, res) => {
  // Verifikasi signature
  if (!verifySignature(req)) {
    console.warn('⚠️ Invalid GitHub signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];
  const payload = req.body;
  const repoFullName = payload.repository?.full_name;

  // Filter repo jika diset
  if (config.githubRepoFilter && repoFullName && repoFullName !== config.githubRepoFilter) {
    return res.json({ ok: true, skipped: 'repo filter' });
  }

  console.log(`[webhook] Event: ${event} | Repo: ${repoFullName || '—'}`);

  try {
    switch (event) {
      case 'pull_request':
        await handlePullRequest(payload);
        break;
      case 'push':
        await handlePush(payload);
        break;
      case 'issues':
        await handleIssues(payload);
        break;
      case 'release':
        await handleRelease(payload);
        break;
      case 'star':
        await handleStar(payload);
        break;
      case 'fork':
        await handleFork(payload);
        break;
      case 'workflow_run':
        await handleWorkflowRun(payload);
        break;
      case 'ping':
        console.log('🏓 GitHub ping received');
        break;
      default:
        console.log(`[webhook] Unhandled event: ${event}`);
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
  }

  res.json({ ok: true, event });
});

// Export untuk dipakai bareng bot
function startWebhookServer(client) {
  if (client) setDiscordClient(client);
  const server = app.listen(config.port, () => {
    console.log(`🌐 GitHub Webhook server listening on port ${config.port}`);
    console.log(`📍 Endpoint: POST /webhook/github`);
    console.log(`💡 Pasang webhook di GitHub dengan URL: https://<domain-kamu>/webhook/github`);
  });
  return server;
}

// Kalau dijalankan langsung: node src/webhook/server.js
if (require.main === module) {
  startWebhookServer(null);
}

module.exports = { app, startWebhookServer, setDiscordClient };
