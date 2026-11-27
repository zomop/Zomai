# 🚀 Deploy Bot 24 Jam (dari HP, tanpa laptop)

Bot Discord butuh **jalan terus 24 jam** (koneksi permanen). Platform yang cocok:
- ✅ **Railway** / **Render** — server selalu nyala, gratis/terjangkau
- ❌ **Vercel** — tidak cocok untuk bot gateway (serverless, mati setelah beberapa detik, bot tidak bisa online terus)

## Opsi 1: Railway (paling gampang, 2 menit dari HP)

1. Buka https://railway.app di browser HP → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo** → pilih `zomop/Zomai`
3. Masuk ke project → tab **Variables** → tambah:
   - `DISCORD_TOKEN` = token bot kamu
   - `CLIENT_ID` = `1573709992291475497`
   - `PORT` = `3000`
4. Tunggu deploy selesai (1-2 menit) → bot online! 🎉
5. Cek log: harus ada tulisan `✅ Logged in as ...`

> Railway kasih kredit gratis $5/bulan untuk akun baru. Bot kecil ini cuma pakai ~$1-2/bulan.

## Opsi 2: Render (gratis, tapi tidur kalau tidak ada aktivitas)

1. Buka https://render.com → **New → Web Service** → pilih repo `zomop/Zomai`
2. Isi Environment Variables: `DISCORD_TOKEN`, `CLIENT_ID`
3. Deploy → bot online.

> Free tier Render tidur setelah 15 menit tidak ada aktivitas. Bot Discord pakai WebSocket jadi biasanya tetap kebangun, tapi kadang delay. Railway lebih stabil.

## Setelah bot online — 2 langkah terakhir

### 1. Daftarkan slash commands (sekali saja)
Command global butuh didaftarkan ke Discord. Cara paling gampang dari HP:
- Buka https://discord.com/developers/applications → application kamu → **Bot** → pastikan bot sudah di-invite ke server
- Jalankan sekali dari Railway: masuk ke project → **Deployments** → **Run Command**? 
- Atau: pakai GitHub Actions? Paling simpel: jalankan `npm run deploy` sekali dari komputer/HP dengan Termux, atau minta aku bantu via PR.

> Alternatif cepat: isi `GUILD_ID` (ID server kamu) di Variables Railway, lalu restart. Command langsung muncul di server itu (tanpa tunggu 1 jam).

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
   - Payload URL: `https://<domain-railway-kamu>/webhook/github`
   - Secret: isi bebas, lalu isi juga di Variables Railway sebagai `GITHUB_WEBHOOK_SECRET`
3. Test: buat PR / push commit → notifikasi muncul di channel Discord 🎉
