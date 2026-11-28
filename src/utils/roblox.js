/**
 * Roblox API Helper
 * Docs: https://create.roblox.com/docs/reference/remote-exceptions
 * Base: https://users.roblox.com/v1, https://thumbnails.roblox.com/v1
 */

const { cached } = require('./cache');

const ROBLOX_API = 'https://users.roblox.com/v1';
const THUMB_API = 'https://thumbnails.roblox.com/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'ZomaiBot/1.0' },
    signal: AbortSignal.timeout(options.timeout || 2500),
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Roblox API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Cari user Roblox berdasarkan username persis
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getUserByUsername(username) {
  return cached(`rbx:name:${String(username).toLowerCase()}`, 5 * 60 * 1000, () => _getUserByUsername(username));
}

async function _getUserByUsername(username) {
  // Endpoint khusus username (1 request, cepat)
  try {
    const exactRes = await fetchJSON('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      timeout: 2000,
    });
    const found = exactRes.data?.[0];
    if (found) return { id: found.id, name: found.name, displayName: found.displayName };
  } catch {}

  // Fallback: pencarian biasa
  const data = await fetchJSON(`${ROBLOX_API}/users/search`, {
    method: 'POST',
    body: JSON.stringify({ keyword: username, excludeBannedUsers: false }),
  });
  const exact = data.data?.find(u => u.name.toLowerCase() === username.toLowerCase());
  return exact || data.data?.[0] || null;
}

/**
 * Ambil detail lengkap user by ID
 */
async function getUserById(userId) {
  return cached(`rbx:id:${userId}`, 3 * 60 * 1000, () => _getUserById(userId));
}

async function _getUserById(userId) {
  // Semua request dijalankan PARALEL (sebelumnya thumbnail 2x jalan berurutan → lambat)
  const [user, counts, presence, bust, head] = await Promise.allSettled([
    fetchJSON(`${ROBLOX_API}/users/${userId}`, { timeout: 2500 }),
    fetchJSON(`${ROBLOX_API}/users/${userId}/followers/counts`, { timeout: 2500 }),
    fetchJSON(`${ROBLOX_API}/users/${userId}/presence`, { timeout: 1200 }),
    fetchJSON(`${THUMB_API}/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`, { timeout: 2000 }),
    fetchJSON(`${THUMB_API}/users/avatar-bust?userIds=${userId}&size=150x150&format=Png`, { timeout: 1500 }),
  ]);

  const userData = user.status === 'fulfilled' ? user.value : null;
  if (!userData) return null;

  const countsData = counts.status === 'fulfilled' ? counts.value : {};
  const presenceData = presence.status === 'fulfilled' ? presence.value : {};
  const avatarUrl = head.status === 'fulfilled' ? head.value.data?.[0]?.imageUrl || null : null;
  const headshotUrl = avatarUrl || (bust.status === 'fulfilled' ? bust.value.data?.[0]?.imageUrl || null : null);

  const isOnline = presenceData.userPresence?.isOnline || false;
  const lastLocation = presenceData.userPresence?.lastLocation || null;

  return {
    id: userData.id,
    name: userData.name,
    displayName: userData.displayName,
    created: userData.created,
    description: userData.description || '',
    isBanned: userData.isBanned || false,
    followers: countsData.followersCount ?? 0,
    followings: countsData.followingsCount ?? 0,
    friends: countsData.friendsCount ?? 0,
    avatarUrl,
    headshotUrl,
    isOnline,
    lastLocation,
    profileUrl: `https://www.roblox.com/users/${userId}/profile`,
  };
}

/**
 * Search user by keyword (untuk /roblox-search)
 */
async function searchUsers(keyword, limit = 5) {
  const data = await cached(`rbx:search:${String(keyword).toLowerCase()}`, 5 * 60 * 1000, () =>
    fetchJSON(`${ROBLOX_API}/users/search`, {
    method: 'POST',
      body: JSON.stringify({ keyword, excludeBannedUsers: false }),
    }),
  );
  return (data.data || []).slice(0, limit);
}

/**
 * Cek apakah username tersedia (belum dipakai)
 * Catatan: Roblox tidak menyediakan endpoint publik resmi untuk cek ketersediaan,
 * jadi kita cek via search - kalau tidak ketemu, kemungkinan tersedia / banned / belum ada.
 */
async function checkUsernameAvailability(username) {
  try {
    const user = await getUserByUsername(username);
    return { available: !user, user };
  } catch {
    return { available: null, user: null };
  }
}

module.exports = { getUserByUsername, getUserById, searchUsers, checkUsernameAvailability };
