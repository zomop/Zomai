/**
 * Kirim notifikasi aktivitas repo ke channel Discord (staff-log) — otomatis.
 * Dipanggil dari .github/workflows/github-to-discord.yml
 *
 * Env:
 *   DISCORD_TOKEN          (wajib, sudah ada di Actions secrets)
 *   DISCORD_CHANNEL_ID     (opsional; kalau kosong, auto-deteksi channel bernama staff-log)
 *   GITHUB_EVENT_NAME      (dari Actions)
 *   GITHUB_EVENT_PATH      (dari Actions)
 */
import fs from 'node:fs';

const API = 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_TOKEN;
const PREFERRED = ['staff-log', 'github', 'webhook', 'mod-log', 'staff-chat'];

const DRY = process.env.DRY_RUN === '1';

if (!TOKEN && !DRY) {
  console.log('⏭️ DISCORD_TOKEN kosong — lewati notifikasi.');
  process.exit(0);
}

const headers = { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'ZomaiBot/1.0', 'Content-Type': 'application/json' };

async function api(path, options = {}) {
  const res = await fetch(API + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!res.ok) throw new Error(`Discord ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

/** Cari channel staff-log di semua server bot */
async function detectChannel() {
  if (/^\d{15,25}$/.test(process.env.DISCORD_CHANNEL_ID || '')) return process.env.DISCORD_CHANNEL_ID;
  const guilds = await api('/users/@me/guilds');
  for (const g of guilds || []) {
    let channels = [];
    try {
      channels = await api(`/guilds/${g.id}/channels`);
    } catch {
      continue;
    }
    const texts = channels.filter(c => c.type === 0);
    for (const name of PREFERRED) {
      const found = texts.find(c => c.name === name);
      if (found) return found.id;
    }
  }
  return null;
}

// ---------- payload ----------
const event = process.env.GITHUB_EVENT_NAME || 'unknown';
let payload = {};
try {
  payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
} catch {
  payload = {};
}

const repo = payload.repository?.full_name || process.env.GITHUB_REPOSITORY || 'zomop/Zomai';
const repoUrl = payload.repository?.html_url || `https://github.com/${repo}`;
const actor = payload.sender?.login || process.env.GITHUB_ACTOR || '?';
const short = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 900);

const base = { color: 0x5865f2, footer: { text: `Zomai • ${repo}` }, timestamp: new Date().toISOString() };

function build() {
  if (event === 'push') {
    const commits = payload.commits || [];
    const branch = String(payload.ref || '').replace('refs/heads/', '');
    if (!commits.length) return null; // mis. hapus branch
    const first = String(commits[0]?.message || '').split('\n')[0];
    return {
      ...base,
      color: 0x5865f2,
      title: `📤 Push • ${branch}`,
      url: payload.compare,
      description: commits
        .slice(0, 6)
        .map(c => `• ${short(String(c.message || '').split('\n')[0]).slice(0, 80)} — \`${String(c.id).slice(0, 7)}\``)
        .join('\n'),
      fields: [
        { name: '👤 Oleh', value: `@${actor}`, inline: true },
        { name: '📦 Commit', value: `${commits.length}`, inline: true },
      ],
    };
  }

  if (event === 'pull_request') {
    const pr = payload.pull_request || {};
    const a = payload.action;
    if (!['opened', 'closed', 'reopened', 'ready_for_review'].includes(a)) return null;
    const merged = a === 'closed' && pr.merged;
    const map = {
      opened: ['🔀 PR Dibuka', 0x8957e5],
      reopened: ['🔄 PR Dibuka Ulang', 0xfee75c],
      ready_for_review: ['👀 PR Siap Review', 0x57f287],
      closed: merged ? ['✅ PR Di-merge', 0x57f287] : ['❌ PR Ditutup', 0xed4245],
    };
    const [title, color] = map[a];
    return {
      ...base,
      color,
      title: `${title} #${pr.number}`,
      url: pr.html_url,
      description: `**${short(pr.title)}**${merged ? `\nDi-merge oleh @${pr.merged_by?.login || actor}` : ''}`,
      fields: [
        { name: '📦 Repo', value: repo, inline: true },
        { name: '🌿 Branch', value: `\`${pr.head?.ref || '?'}\` → \`${pr.base?.ref || '?'}\``, inline: true },
      ],
    };
  }

  if (event === 'issues') {
    const issue = payload.issue || {};
    const a = payload.action;
    if (!['opened', 'closed', 'reopened'].includes(a)) return null;
    const map = { opened: ['🐛 Issue Dibuka', 0xfee75c], reopened: ['🔄 Issue Dibuka Ulang', 0xfee75c], closed: ['✅ Issue Ditutup', 0x57f287] };
    const [title, color] = map[a];
    return { ...base, color, title: `${title} #${issue.number}`, url: issue.html_url, description: `**${short(issue.title)}**\n${short(issue.body || '').slice(0, 400)}` };
  }

  if (event === 'release') {
    const r = payload.release || {};
    return { ...base, color: 0xf1c40f, title: `🚀 Release ${r.tag_name || ''}`, url: r.html_url, description: short(r.body || r.name || '') };
  }

  if (event === 'watch') {
    return { ...base, color: 0xf1c40f, title: '⭐ Star Baru!', url: repoUrl, description: `**${repo}** dapat star dari @${actor}\nTotal: **${payload.repository?.stargazers_count ?? '?'}** ⭐` };
  }

  if (event === 'fork') {
    return { ...base, color: 0x5865f2, title: '🍴 Repo Di-fork!', url: payload.forkee?.html_url, description: `Fork baru: **${payload.forkee?.full_name || '?'}** oleh @${actor}` };
  }

  if (event === 'workflow_dispatch') {
    return { ...base, color: 0x57f287, title: '🔔 Tes Notifikasi', url: repoUrl, description: `Koneksi repo **${repo}** → channel staff-log **aktif** ✅` };
  }

  if (event === 'workflow_run') {
    const w = payload.workflow_run || {};
    if (!['completed'].includes(payload.action)) return null;
    const ok = w.conclusion === 'success';
    return { ...base, color: ok ? 0x57f287 : 0xed4245, title: `${ok ? '✅' : '❌'} Workflow ${w.name || ''}: ${w.conclusion || ''}`, url: w.html_url, description: `Branch: \`${w.head_branch || '?'}\`\nCommit: \`${String(w.head_sha || '').slice(0, 7)}\`` };
  }

  return null;
}

const embed = build();
if (!embed) {
  console.log(`⏭️ Event ${event} (${payload.action || '-'}) tidak perlu dikirim.`);
  process.exit(0);
}

if (DRY) {
  console.log(JSON.stringify(embed, null, 2));
  process.exit(0);
}

try {
  const channelId = await detectChannel();
  if (!channelId) {
    console.log('⚠️ Channel staff-log nggak ketemu. Bikin channel bernama "staff-log" atau isi env DISCORD_CHANNEL_ID.');
    process.exit(0);
  }
  await api(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
  });
  console.log(`✅ Terkirim ke channel ${channelId}: ${embed.title}`);
} catch (e) {
  console.error('❌ Gagal kirim:', e.message);
  process.exit(1);
}
