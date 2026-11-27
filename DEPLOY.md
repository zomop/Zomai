# 🚀 Deploy Zomai 24 Jam dari HP (GRATIS, tanpa kartu kredit)

Bot Zomai sekarang punya **2 mode**:

| Mode | Butuh server? | Status online | Cocok untuk |
|---|---|---|---|
| **Interactions (Vercel)** ⭐ | ❌ Tidak | Selalu siap (serverless) | HP, gratis, tanpa kartu |
| Gateway (Node biasa) | ✅ Ya | Online 24 jam | VPS/Render/Railway |

**Mode yang dipakai sekarang: Interactions di Vercel.** Bot tidak butuh server nyala 24 jam — Discord memanggil URL bot setiap kali ada yang memakai slash command. Gratis, tanpa kartu kredit.

---

## Yang sudah ter-deploy

- **URL bot:** `https://zomai-bot-andre-dev4.vercel.app`
- **Endpoint Discord:** `https://zomai-bot-andre-dev4.vercel.app/api/interactions`
- **Endpoint GitHub webhook:** `https://zomai-bot-andre-dev4.vercel.app/api/github-webhook`
- **Project Vercel:** `zomai-bot` (repo `zomop/Zomai`, branch `arena/76523376-zomai`)

Setiap kali kode di-push, Vercel otomatis build & deploy ulang.

---

## 3 langkah sekali saja

### 1. Pasang Interactions Endpoint URL di Discord
1. Buka https://discord.com/developers/applications → pilih aplikasi Zomai
2. Menu **General Information**
3. Di kolom **Interactions Endpoint URL**, tempel:
   ```
   https://zomai-bot-andre-dev4.vercel.app/api/interactions
   ```
4. Klik **Save Changes**. Kalau muncul "All your edits are saved" → berarti bot merespons dengan benar ✅

> Public key TIDAK perlu diisi manual — bot mengambilnya sendiri dari Discord.

### 2. Daftarkan slash command
Buka di browser HP:
```
https://zomai-bot-andre-dev4.vercel.app/api/setup?secret=zomai2026&guild=ISI_SERVER_ID
```
Ganti `ISI_SERVER_ID` dengan ID server Discord kamu (klik kanan nama server → Copy Server ID).

Kalau berhasil, muncul JSON `{"ok":true, ...}` dan command langsung ada di server itu.

### 3. Invite bot ke server
```
https://discord.com/oauth2/authorize?client_id=1573709992291475497&permissions=8&scope=bot%20applications.commands
```

Test: ketik `/ping` di Discord → bot balas Pong 🏓

---

## Notifikasi GitHub otomatis (tanpa redeploy)

1. Di Discord, admin ketik `/setup-github #channel`
2. Bot langsung kasih **Payload URL** siap tempel, bentuknya:
   `https://zomai-bot-andre-dev4.vercel.app/api/github-webhook?channel=<ID_CHANNEL>`
   (bisa tambah `&repo=owner/nama` kalau cuma mau repo tertentu)
3. Buka GitHub repo → **Settings → Webhooks → Add webhook**:
   - **Payload URL:** tempel URL dari bot
   - **Content type:** `application/json`
   - **Secret:** `zomaigh2026`
   - **Events:** Pull requests, Pushes, Issues, Releases, Stars, Forks, Workflow runs
4. Simpan. GitHub akan kirim test ping → di Discord muncul "✅ Webhook Terhubung".

Event yang masuk ke Discord: PR dibuka/di-merge/ditutup/reopen, push commit, issue buka/tutup, release, star, fork, workflow run.

## Catatan penting

- **Bot tidak muncul "online"** di daftar member. Itu normal untuk mode Interactions; semua slash command tetap jalan.
- **Slash command butuh ±1 jam** kalau didaftarkan global (tanpa `?guild=`). Pakai `?guild=` supaya langsung muncul.
- **Ganti token/env:** Vercel → Settings → Environment Variables → Redeploy.
- **Kalau mau bot tampil online 24 jam** (butuh server), jalankan mode gateway: `npm install && npm start` di VPS/Render. Kode gateway tetap ada di `src/`.

## Env yang dipakai Vercel

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | token bot |
| `CLIENT_ID` | `1573709992291475497` |
| `SETUP_SECRET` | `zomai2026` (untuk `/api/setup`) |
| `GITHUB_WEBHOOK_SECRET` | `zomaigh2026` |
| `GITHUB_CHANNEL_ID` | (isi kalau mau notifikasi GitHub) |
