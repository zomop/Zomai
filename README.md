# 🤖 Zomai — Discord Bot

Bot Discord multifungsi dengan fitur cek Roblox, sync GitHub real-time, moderasi, fun & utility.

## ✨ Fitur

### 🎮 Roblox
| Command | Deskripsi |
|---|---|
| `/roblox <username>` | Cek akun Roblox lengkap: avatar, join date, followers, status banned, online |
| `/roblox-search <keyword>` | Cari user Roblox berdasarkan kata kunci |

### 🐙 GitHub Sync
| Command | Deskripsi |
|---|---|
| `/github <owner/repo>` | Info repository (stars, forks, language, dll) |
| `/github-user <username>` | Info user GitHub + repo terbaru |
| `/github-pr <owner/repo>` | List Pull Request yang terbuka |

**Webhook otomatis** — bot kirim notifikasi ke channel Discord setiap ada:
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

## 🚀 Cara Setup (5 menit)

### 1. Buat Discord Application & Bot

1. Buka https://discord.com/developers/applications → **New Application**
2. Catat **Application ID** (General Information)
3. Menu **Bot** → **Reset Token** → copy token bot
4. Aktifkan **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Invite bot ke server kamu:
   ```
   https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&permissions=8&scope=bot%20applications.commands
   ```
   Pilih permissions: Send Messages, Embed Links, Kick/Ban/Timeout, Manage Messages

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
GUILD_ID=           # opsional, isi ID server untuk dev cepat
GITHUB_WEBHOOK_SECRET=secret_random
GITHUB_CHANNEL_ID=id_channel_discord
PORT=3000
```

> **Cara dapat Channel ID:** Discord Settings → Advanced → aktifkan Developer Mode → klik kanan channel → Copy Channel ID

### 3. Deploy Commands & Jalankan

```bash
npm run deploy   # daftarkan slash commands (sekali saja, ulangi kalau tambah command)
npm start        # jalankan bot + webhook server
```

Untuk development dengan auto-restart:
```bash
npm run dev
```

---

## 🔗 Pasang GitHub Webhook

1. Deploy bot ke server (Railway/Render/VPS) atau jalankan lokal dengan ngrok:
   ```bash
   ngrok http 3000
   ```
2. Di GitHub Repo → **Settings** → **Webhooks** → **Add webhook**:
   - **Payload URL:** `https://domain-kamu.com/webhook/github`
   - **Content type:** `application/json`
   - **Secret:** sama persis dengan `GITHUB_WEBHOOK_SECRET` di `.env`
   - **Events:** pilih *Pull requests, Pushes, Issues, Releases, Stars, Forks, Workflow runs* (atau *Send me everything*)
3. Klik **Add webhook** → test dengan buat PR / push commit → notifikasi muncul di channel Discord 🎉

---

## 📁 Struktur Project

```
Zomai/
├── src/
│   ├── index.js              # Entry point bot
│   ├── deploy-commands.js    # Deploy slash commands
│   ├── config/               # Config dari .env
│   ├── commands/             # Semua slash commands
│   │   ├── roblox.js
│   │   ├── github.js
│   │   ├── moderation.js
│   │   └── ...
│   ├── events/               # Event handlers (ready, interaction)
│   ├── utils/                # Helper Roblox API, GitHub API, embed
│   └── webhook/              # GitHub webhook server (Express)
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
