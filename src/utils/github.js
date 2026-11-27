/**
 * GitHub API Helper (tanpa token juga bisa, tapi rate limit kecil)
 * Docs: https://docs.github.com/en/rest
 */

const GITHUB_API = 'https://api.github.com';
const headers = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'ZomaiBot/1.0',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function fetchJSON(path) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function getRepo(owner, repo) {
  return fetchJSON(`/repos/${owner}/${repo}`);
}

async function getUser(username) {
  return fetchJSON(`/users/${username}`);
}

async function getOpenPRs(owner, repo, perPage = 5) {
  const data = await fetchJSON(`/repos/${owner}/${repo}/pulls?state=open&per_page=${perPage}&sort=created&direction=desc`);
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
  const data = await fetchJSON(`/users/${username}/repos?per_page=${perPage}&sort=updated`);
  return data || [];
}

module.exports = { getRepo, getUser, getOpenPRs, getRecentCommits, getRepoContributors, getUserRepos };
