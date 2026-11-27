/**
 * Store JSON sederhana yang BISA AWET walau bot jalan di GitHub Actions
 * (filesystem runner di-reset tiap sesi).
 *
 * - Kalau ada GITHUB_TOKEN + GITHUB_REPOSITORY → simpan ke file di repo via GitHub API.
 * - Kalau tidak (jalan di laptop/VPS) → simpan ke file lokal biasa.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const API = 'https://api.github.com';

class Store {
  /**
   * @param {string} filePath contoh: 'data/economy.json'
   * @param {object} defaults
   */
  constructor(filePath, defaults = {}) {
    this.filePath = filePath;
    this.defaults = defaults;
    this.data = structuredClone(defaults);
    this.sha = null;
    this.dirty = false;
    this.saving = false;
    this.token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    this.repo = process.env.GITHUB_REPOSITORY || ''; // "owner/repo" otomatis di Actions
    this.branch = process.env.GITHUB_REF_NAME || 'main';

    this._timer = setInterval(() => this.flush().catch(() => {}), 30000);
    this._timer.unref?.();

    process.on('SIGTERM', () => { this.flush().finally(() => process.exit(0)); });
    process.on('SIGINT', () => { this.flush().finally(() => process.exit(0)); });
  }

  get remote() {
    return Boolean(this.token && this.repo);
  }

  async load() {
    if (this.remote) {
      try {
        const res = await fetch(`${API}/repos/${this.repo}/contents/${this.filePath}?ref=${this.branch}`, {
          headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'ZomaiBot/1.0' },
        });
        if (res.ok) {
          const body = await res.json();
          this.sha = body.sha;
          const text = Buffer.from(body.content, 'base64').toString('utf8');
          this.data = { ...structuredClone(this.defaults), ...JSON.parse(text) };
          console.log(`[store] dimuat dari GitHub (${this.filePath})`);
          return;
        }
        if (res.status !== 404) console.warn('[store] gagal ambil dari GitHub:', res.status);
      } catch (e) {
        console.warn('[store] load error:', e.message);
      }
    }

    try {
      const local = path.join(process.cwd(), this.filePath);
      if (fs.existsSync(local)) {
        this.data = { ...structuredClone(this.defaults), ...JSON.parse(fs.readFileSync(local, 'utf8')) };
        console.log(`[store] dimuat dari file lokal (${this.filePath})`);
      }
    } catch (e) {
      console.warn('[store] gagal baca file lokal:', e.message);
    }
  }

  touch() {
    this.dirty = true;
  }

  async flush(force = false) {
    if (!this.dirty && !force) return;
    if (this.saving) return;
    this.saving = true;
    const snapshot = JSON.stringify(this.data, null, 2);
    try {
      if (this.remote) {
        const res = await fetch(`${API}/repos/${this.repo}/contents/${this.filePath}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'ZomaiBot/1.0',
          },
          body: JSON.stringify({
            message: `chore(data): update ${path.basename(this.filePath)} [skip ci]`,
            content: Buffer.from(snapshot).toString('base64'),
            branch: this.branch,
            ...(this.sha ? { sha: this.sha } : {}),
          }),
        });
        if (res.ok) {
          const body = await res.json();
          this.sha = body.content?.sha || this.sha;
          this.dirty = false;
        } else if (res.status === 409) {
          console.warn('[store] konflik versi, ambil ulang nanti');
        } else {
          console.warn('[store] flush gagal:', res.status, (await res.text().catch(() => '')).slice(0, 120));
        }
      } else {
        const local = path.join(process.cwd(), this.filePath);
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, snapshot);
        this.dirty = false;
      }
    } catch (e) {
      console.warn('[store] flush error:', e.message);
    } finally {
      this.saving = false;
    }
  }
}

module.exports = { Store };
