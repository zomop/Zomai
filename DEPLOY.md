# 🚀 Deploy Bot 24 Jam (dari HP, tanpa laptop)

Bot Discord butuh **jalan terus 24 jam** (koneksi permanen).

- ✅ **Render (gratis)** — rekomendasi utama, dari browser HP
- ✅ **Replit (gratis)** — paling gampang, ada aplikasi HP
- ✅ **Oracle Cloud (gratis selamanya)** — paling awet, tapi setup lebih ribet
- ❌ **Vercel** — tidak cocok untuk bot gateway (serverless, mati setelah beberapa detik)
- ⚠️ **Railway** — bagus, tapi trial gratis cepat habis

---

## Opsi 1: Render — GRATIS, rekomendasi utama ⭐

Render free tier: 750 jam/bulan (cukup untuk 1 bot 24 jam). Kelemahan: tidur setelah 15 menit tidak ada yang akses. Solusinya pakai **UptimeRobot** (gratis) untuk ping tiap 5 menit biar tidak tidur.

### Langkah 1: Deploy ke Render
1. Buka https://render.com di browser HP → daftar/login pakai GitHub
2. **New → Web Service** → pilih repo `zomop/Zomai`
3. Isi:
   - **Name:** `zomai-bot`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Environment Variables** → tambah:
   - `DISCORD_TOKEN` = token bot kamu
   - `CLIENT_ID` = `1573709992291475497`
   - `PORT` = `3000`
5. Klik **Create Web Service** → tunggu 2-3 menit → bot online! 🎉
6. Catat URL-nya, contoh: `https://zomai-bot.onrender.com`

### Langkah 2: Biar tidak tidur (UptimeRobot, gratis)
1. Buka https://uptimerobot.com → daftar gratis
2. **Add New Monitor** → HTTP(s) → URL: `https://zomai-bot.onrender.com/health`
3. Interval: 5 menit → Save.
4. Selesai! Bot tidak akan tidur lagi.

> Render free kadang masih tidur 1-2 menit saat pertama diakses setelah lama. Itu normal. Bot akan otomatis online lagi.

---

## Opsi 2: Replit — GRATIS, paling gampang dari HP

Replit ada aplikasi HP-nya, jadi paling nyaman kalau cuma punya HP.

1. Buka https://replit.com atau install aplikasi Replit di HP → daftar
2. **+ Create** → **Import from GitHub** → paste `https://github.com/zomop/Zomai`
3. Di **Secrets** (ikon gembok), tambah:
   - `DISCORD_TOKEN` = token bot kamu
   - `CLIENT_ID` = `1573709992291475497`
4. Klik **Run** ▶️ → bot online!
5. Biar tidak tidur: pasang UptimeRobot seperti di atas, URL-nya dari Replit (klik **Webview** → copy URL).

> Replit free tidur setelah ~20 menit. UptimeRobot menjaga biar tetap nyala.

---

## Opsi 3: Oracle Cloud — GRATIS SELAMANYA (paling awet)

Oracle Cloud kasih VPS gratis selamanya (Always Free). Tidak tidur, tidak ada batas jam.

1. Buka https://oracle.com/cloud/free → daftar (butuh kartu kredit untuk verifikasi, tidak dipotong)
2. Buat **Compute Instance** (VM.Standard.E2.Micro / Ampere ARM) → Ubuntu
3. SSH masuk, install Node.js, clone repo, isi `.env`, jalankan `npm start` pakai `pm2` biar jalan terus.

> Setup-nya lebih ribet dari HP. Kalau mau, tanya aku step-by-step-nya.

---

## Setelah bot online — 2 langkah terakhir

### 1. Daftarkan slash commands (sekali saja)
Command global butuh didaftarkan ke Discord. Cara paling gampang dari HP:
- Isi `GUILD_ID` (ID server kamu) di Environment Variables platform deploy, lalu restart. Command langsung muncul di server itu.
- Atau jalankan `npm run deploy` sekali dari HP pakai Termux / Replit Shell.

> Cara dapat Server ID: Discord → klik kanan nama server → Copy Server ID.

### 2. Invite bot ke server
Buka link ini di HP (sudah pakai Application ID kamu):
```
https://discord.com/oauth2/authorize?client_id=1573709992291475497&permissions=8&scope=bot%20applications.commands
```
Pilih server → Authorize. Selesai! Bot bisa dipakai di semua server yang meng-invite.

## Test bot
Di Discord ketik:
- `/ping` → harus balas Pong
- `/github-check torvalds` → info akun GitHub
- `/roblox builderman` → info akun Roblox

## Notifikasi GitHub otomatis
1. Di Discord: admin ketik `/setup-github #channel` (pilih channel tujuan)
2. Di GitHub repo → Settings → Webhooks → Add webhook:
   - Payload URL: `https://<url-deploy-kamu>/webhook/github`
   - Secret: isi bebas, lalu isi juga di Variables sebagai `GITHUB_WEBHOOK_SECRET`
3. Test: buat PR / push commit → notifikasi muncul di channel Discord 🎉
