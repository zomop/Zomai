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
  const [user, counts, presence] = await Promise.allSettled([
    fetchJSON(`${ROBLOX_API}/users/${userId}`),
    fetchJSON(`${ROBLOX_API}/users/${userId}/followers/counts`),
    fetchJSON(`${ROBLOX_API}/users/${userId}/presence`),
  ]);

  const userData = user.status === 'fulfilled' ? user.value : null;
  if (!userData) return null;

  const countsData = counts.status === 'fulfilled' ? counts.value : {};
  const presenceData = presence.status === 'fulfilled' ? presence.value : {};

  // Avatar thumbnail
  let avatarUrl = null;
  try {
    const thumb = await fetchJSON(`${THUMB_API}/users/avatar-bust?userIds=${userId}&size=150x150&format=Png`);
    avatarUrl = thumb.data?.[0]?.imageUrl || null;
  } catch {}

  // Headshot
  let headshotUrl = null;
  try {
    const thumb = await fetchJSON(`${THUMB_API}/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
    headshotUrl = thumb.data?.[0]?.imageUrl || null;
  } catch {}

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
