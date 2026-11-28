/**
 * GitHub API Helper (tanpa token juga bisa, tapi rate limit kecil)
 * Docs: https://docs.github.com/en/rest
 */

const { cached } = require('./cache');

const GITHUB_API = 'https://api.github.com';
const headers = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'ZomaiBot/1.0',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function fetchJSON(path, timeout = 3000) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function getRepo(owner, repo) {
  return cached(`gh:repo:${owner}/${repo}`.toLowerCase(), 3 * 60 * 1000, () => fetchJSON(`/repos/${owner}/${repo}`));
}

async function getUser(username) {
  return cached(`gh:user:${String(username).toLowerCase()}`, 3 * 60 * 1000, () => fetchJSON(`/users/${username}`));
}

async function getOpenPRs(owner, repo, perPage = 5) {
  const data = await cached(`gh:prs:${owner}/${repo}:${perPage}`.toLowerCase(), 60 * 1000, () =>
    fetchJSON(`/repos/${owner}/${repo}/pulls?state=open&per_page=${perPage}&sort=created&direction=desc`),
  );
  return data || [];
}

async function getRecentCommits(owner, repo, perPage = 5) {
  const data = await fetchJSON(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
  return data || [];
}

async function getRepoContributors(owner, repo, perPage = 5) {
  const data = await fetchJSON(`/repos/${owner}/${repo}/contributors?per_page=${perPage}`);
  return data || [];
}

async function getUserRepos(username, perPage = 5) {
  const data = await cached(`gh:repos:${String(username).toLowerCase()}:${perPage}`, 3 * 60 * 1000, () =>
    fetchJSON(`/users/${username}/repos?per_page=${perPage}&sort=updated`),
  );
  return data || [];
}

module.exports = { getRepo, getUser, getOpenPRs, getRecentCommits, getRepoContributors, getUserRepos };
