# 🤖 Zomai — Discord Bot

Bot Discord multifungsi: cek Roblox, cek GitHub, sync notifikasi GitHub, moderasi, fun & utility.
**Bisa dipakai di semua server** — tinggal invite bot, semua command langsung bisa dipakai.

## ✨ Fitur

### 🎮 Roblox
| Command | Deskripsi |
|---|---|
| `/roblox <username>` | Cek akun Roblox lengkap: avatar, join date, followers, status banned, online |
| `/roblox-search <keyword>` | Cari user Roblox berdasarkan kata kunci |

### 🐙 GitHub (cek akun & repo langsung dari Discord)
| Command | Deskripsi |
|---|---|
| `/github-check <username>` | **Cek akun GitHub** — info lengkap user + 5 repo terbaru |
| `/github <owner/repo>` | Info repository (stars, forks, language, dll) |
| `/github-user <username>` | Info user GitHub + repo terbaru |
| `/github-pr <owner/repo>` | List Pull Request yang terbuka |
| `/setup-github #channel` | Admin: atur channel notifikasi GitHub untuk server ini |
| `/github-status` | Lihat status sync GitHub server ini |
| `/github-disable` | Matikan notifikasi GitHub server ini |

**Webhook otomatis** — bot kirim notifikasi ke channel yang sudah diatur setiap ada:
- 🔀 PR dibuka / di-merge (accept) / ditutup / dibuka kembali
- 📤 Push commit baru
- 🐛 Issue dibuka / ditutup
- 🚀 Release baru
- ⭐ Star baru
- 🍴 Fork baru
- ⚙️ Workflow run selesai/gagal

### 🛠️ Utility
`/ping` `/avatar` `/serverinfo` `/userinfo` `/botinfo` `/invite` `/help`

### 🎲 Fun
`/8ball <pertanyaan>` `/coinflip` `/dice` `/meme`

### 🛡️ Moderasi
`/kick` `/ban` `/timeout` `/clear` `/warn` (butuh permission admin/mod)

---

## 💡 Soal "Channel" — penjelasan simpel

**Channel** = tempat chat di Discord. Contoh: `#general`, `#pengumuman`, `#github-log`.

Bot ini punya 2 cara kerja:

1. **Command manual (tanpa channel)** — semua command seperti `/github-check torvalds` atau `/roblox builderman` bisa dipakai langsung di channel mana saja, di server mana saja. **Tidak butuh setting channel.**

2. **Notifikasi otomatis (pakai channel)** — kalau mau bot *otomatis* kirim info setiap ada PR/push di GitHub, bot butuh tahu harus kirim ke channel mana. Caranya:
   - Admin server ketik: `/setup-github #github-log`
   - Selesai! Bot akan kirim notifikasi GitHub ke `#github-log` di server itu.
   - Tiap server bisa pilih channel sendiri-sendiri. Bot tetap 1 bot untuk semua server.

Jadi: **command = langsung pakai. Notifikasi otomatis = atur channel sekali pakai `/setup-github`.**

---

## 🚀 Deploy 24 Jam (dari HP)

Lihat **[DEPLOY.md](./DEPLOY.md)** — deploy ke Railway/Render dalam 2 menit dari browser HP, bot online 24 jam tanpa laptop.

## 🚀 Cara Setup (lokal / laptop)

### 1. Buat Discord Application & Bot

1. Buka https://discord.com/developers/applications → **New Application**
2. Catat **Application ID** (General Information)
3. Menu **Bot** → **Reset Token** → copy token bot
4. Aktifkan **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Invite bot ke server kamu:
   ```
   https://discord.com/oauth2/authorize?client_id=1573709992291475497&permissions=8&scope=bot%20applications.commands
   ```

### 2. Install & Konfigurasi

```bash
git clone https://github.com/zomop/Zomai.git
cd Zomai
npm install
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=token_bot_kamu
CLIENT_ID=application_id_kamu
GUILD_ID=           # kosong = global (semua server), isi ID server = cepat muncul
GITHUB_WEBHOOK_SECRET=secret_random
PORT=3000
```

### 3. Deploy Commands & Jalankan

```bash
npm run deploy   # daftarkan slash commands (sekali saja)
npm start        # jalankan bot + webhook server
```

> ⚠️ `npm run deploy` dan `npm start` harus dijalankan dari komputer/server yang bisa akses internet ke `discord.com` (misal laptop kamu, bukan sandbox yang diblokir).

---

## 🔗 Pasang GitHub Webhook (opsional, untuk notifikasi otomatis)

1. Deploy bot ke server (Railway/Render/VPS) atau jalankan lokal dengan ngrok:
   ```bash
   ngrok http 3000
   ```
2. Di GitHub Repo → **Settings** → **Webhooks** → **Add webhook**:
   - **Payload URL:** `https://domain-kamu.com/webhook/github`
   - **Content type:** `application/json`
   - **Secret:** sama persis dengan `GITHUB_WEBHOOK_SECRET` di `.env`
   - **Events:** pilih *Pull requests, Pushes, Issues, Releases, Stars, Forks, Workflow runs*
3. Di Discord, admin ketik `/setup-github #channel` untuk pilih channel tujuan.
4. Test dengan buat PR / push commit → notifikasi muncul di channel 🎉

---

## 📁 Struktur Project

```
Zomai/
├── src/
│   ├── index.js              # Entry point bot
│   ├── deploy-commands.js    # Deploy slash commands
│   ├── config/               # Config dari .env
│   ├── commands/             # Semua slash commands
│   ├── events/               # Event handlers (ready, interaction)
│   ├── utils/                # Helper Roblox API, GitHub API, embed
│   └── webhook/              # GitHub webhook server (Express)
├── data/                     # Channel GitHub per-server (otomatis dibuat)
├── .env.example
└── package.json
```

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| Command tidak muncul | Jalankan `npm run deploy` lagi. Global command butuh ~1 jam, pakai `GUILD_ID` untuk instan |
| Bot tidak bisa kick/ban | Pastikan role bot di atas role user, dan permission sudah di-enable |
| Webhook 401 | Secret di GitHub harus sama persis dengan `.env` |
| Roblox API error | Coba lagi, rate limit Roblox kadang ketat |
| `DISCORD_TOKEN` error | Token salah / bot belum di-invite |

---

## 📝 Lisensi

MIT — bebas dipakai & dimodifikasi.
