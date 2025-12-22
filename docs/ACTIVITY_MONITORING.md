# Activity Monitoring - Documentation

Panduan lengkap untuk fitur **Browser Activity Tracking** pada SecDash VPN Dashboard.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Instalasi Agent](#2-instalasi-agent)
3. [Menggunakan Dashboard](#3-menggunakan-dashboard)
4. [API Reference](#4-api-reference)
5. [Konfigurasi Lanjutan](#5-konfigurasi-lanjutan)
6. [Privacy & Compliance](#6-privacy--compliance)

---

## 1. Gambaran Umum

Fitur **Activity Monitoring** memungkinkan Anda melacak aktivitas browsing dari perangkat yang terhubung melalui VPN. Fitur ini berguna untuk:

- 👥 **Employee Monitoring** - Pantau produktivitas karyawan
- 👨‍👩‍👧‍👦 **Parental Control** - Lindungi anak dari konten berbahaya
- 🔒 **Network Security** - Deteksi akses mencurigakan

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| Real-time Feed | Lihat aktivitas browsing secara langsung |
| Domain Tracking | Catat semua domain yang dikunjungi |
| URL Logging | Log URL lengkap untuk analisis detail |
| Auto-Categorization | Kategorisasi otomatis (social, video, news, dll) |
| Statistics | Statistik browsing 24h/7d/30d |
| Filtering | Filter by domain, category, client |

### Arsitektur

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Activity   │────▶│   Dashboard  │
│    Agent     │     │     API      │     │     UI       │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  POST /api/        │  JSON files        │  Vue.js
       │  activity-agent    │  (wg-db/           │  /activity-
       │                    │   activity_logs/)  │   monitor
       └────────────────────┴────────────────────┘
```

---

## 2. Instalasi Agent

Ada beberapa cara untuk menginstal agent tracker pada perangkat:

### Opsi 1: Browser Console (Sementara)

Cara paling sederhana untuk testing. Buka browser console (F12 → Console) dan paste:

```javascript
(function() {
  const SERVER = 'https://your-dashboard-url.com';
  const CLIENT_ID = 'device-' + Math.random().toString(36).substr(2, 9);
  
  function report() {
    fetch(SERVER + '/api/activity-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: location.href,
        title: document.title,
        client_id: CLIENT_ID
      })
    }).catch(() => {});
  }
  
  report();
  window.addEventListener('popstate', report);
  console.log('✅ Activity Tracker Active - ID:', CLIENT_ID);
})();
```

> ⚠️ Script ini hanya aktif untuk tab tersebut dan hilang saat refresh.

### Opsi 2: Chrome Extension (Rekomendasi)

1. Download folder extension dari `public/agent/extension/`
2. Buka `chrome://extensions` di browser
3. Aktifkan **Developer mode** (toggle di pojok kanan atas)
4. Klik **Load unpacked**
5. Pilih folder `extension` yang sudah di-download
6. Klik icon extension → Isi **Server URL**
7. Klik **Save Settings**

### Opsi 3: Install Script via Tag

Tambahkan ke halaman atau inject via proxy:

```html
<script>
  window.ACTIVITY_TRACKER_SERVER = 'https://your-dashboard.com';
  window.ACTIVITY_TRACKER_DEVICE_NAME = 'Laptop Kantor';
</script>
<script src="https://your-dashboard.com/agent/activity-tracker.js"></script>
```

### Opsi 4: Bookmarklet

Seret link ini ke bookmark bar:

```
javascript:(function(){...})();
```

Atau gunakan modal **Install Agent** di dashboard untuk mendapatkan bookmarklet yang sudah dikonfigurasi.

---

## 3. Menggunakan Dashboard

### Akses Dashboard

1. Login ke SecDash VPN
2. Klik **Activity Monitor** di sidebar
3. Dashboard akan menampilkan data aktivitas

### Panel Statistik

| Panel | Deskripsi |
|-------|-----------|
| Total Visits | Jumlah total kunjungan halaman |
| Unique Domains | Jumlah domain unik yang dikunjungi |
| Top Category | Kategori paling banyak dikunjungi |
| Time Period | Pilih periode: 24h, 7d, atau 30d |

### Top Domains

Menampilkan 10 domain paling sering dikunjungi beserta jumlah kunjungan.

### Categories

Breakdown aktivitas berdasarkan kategori:

| Kategori | Contoh Domain |
|----------|---------------|
| 📱 Social | facebook.com, instagram.com, x.com |
| 🎬 Video | youtube.com, netflix.com, twitch.tv |
| 📰 News | detik.com, kompas.com, bbc.com |
| 🛒 Shopping | tokopedia.com, shopee.co.id |
| 💼 Work | slack.com, github.com, notion.so |
| 📧 Email | gmail.com, outlook.com |
| 🔍 Search | google.com, bing.com |
| 🎮 Gaming | steam.com, roblox.com |
| 📂 Other | Domain lainnya |

### Filter & Search

- **Search**: Cari berdasarkan nama domain
- **Category Filter**: Filter berdasarkan kategori

### Real-time Feed

Daftar aktivitas terbaru dengan informasi:
- Domain yang dikunjungi
- Page title
- Full URL
- Timestamp
- Client ID

---

## 4. API Reference

### Log Activity

```http
POST /api/activity-agent
Content-Type: application/json
X-Client-Id: device-abc123

{
  "url": "https://example.com/page",
  "title": "Page Title",
  "device_name": "John's Laptop"
}
```

**Response:**
```json
{
  "success": true,
  "logged_count": 1,
  "timestamp": "2025-12-22T11:00:00.000Z"
}
```

### Get Activity Logs

```http
GET /api/activity-logs?limit=100&category=social&domain=facebook
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Max records to return (default: 100) |
| client_id | string | Filter by client ID |
| category | string | Filter by category |
| domain | string | Filter by domain (partial match) |
| start_date | string | ISO date start range |
| end_date | string | ISO date end range |

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "1703232000000-abc123",
      "client_id": "device-xyz",
      "device_name": "John's Laptop",
      "url": "https://facebook.com/feed",
      "domain": "facebook.com",
      "title": "Facebook",
      "category": "social",
      "source": "agent",
      "timestamp": "2025-12-22T11:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Get Statistics

```http
GET /api/activity-logs?stats=true&period=24h
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| stats | boolean | Set to `true` for stats mode |
| period | string | `24h`, `7d`, or `30d` |
| client_id | string | Filter stats by client |

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_visits": 150,
    "unique_domains": 25,
    "top_domains": [
      { "domain": "google.com", "count": 45 },
      { "domain": "youtube.com", "count": 30 }
    ],
    "top_categories": [
      { "category": "search", "count": 45 },
      { "category": "video", "count": 30 }
    ],
    "visits_by_hour": [
      { "hour": 0, "count": 5 },
      { "hour": 1, "count": 2 }
    ],
    "period": "24h"
  }
}
```

### Cleanup Old Logs

```http
DELETE /api/activity-logs
Content-Type: application/json

{
  "days_to_keep": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 5 old log files",
  "deleted_count": 5
}
```

---

## 5. Konfigurasi Lanjutan

### Menambah Kategori Domain

Edit file `server/utils/database.ts`, cari fungsi `categorizeDomain`:

```typescript
const categories: Record<string, string[]> = {
  'social': ['facebook.com', 'twitter.com', ...],
  'blocked': ['porn-site.com', 'gambling.com'],  // Tambah kategori baru
  ...
}
```

### Retention Policy

Secara default, logs disimpan per hari di folder `wg-db/activity_logs/`. Untuk cleanup otomatis via cron:

```bash
# Jalankan setiap minggu
0 0 * * 0 curl -X DELETE http://localhost:3000/api/activity-logs -d '{"days_to_keep":30}'
```

### Data Storage

Data disimpan dalam format JSON:
- **Location:** `wg-db/activity_logs/YYYY-MM-DD.json`
- **Max per file:** 10,000 entries
- **Rotasi:** Per hari

---

## 6. Privacy & Compliance

### ⚠️ Pertimbangan Hukum

Sebelum mengaktifkan fitur ini, pastikan:

1. **Consent** - Pengguna/karyawan sudah diberitahu bahwa aktivitas dimonitor
2. **Policy** - Ada kebijakan tertulis tentang monitoring
3. **Legal Review** - Konsultasikan dengan tim legal untuk compliance GDPR/UU PDP
4. **Data Protection** - Lindungi data logs dari akses tidak sah

### Best Practices

- ✅ Informasikan pengguna sebelum monitoring aktif
- ✅ Batasi akses ke data hanya untuk yang berkepentingan
- ✅ Set retention policy yang wajar (7-30 hari)
- ✅ Enkripsi data sensitive
- ❌ Jangan monitor tanpa consent
- ❌ Jangan simpan data lebih lama dari yang diperlukan
- ❌ Jangan bagikan data ke pihak ketiga tanpa izin

### Disclaimer

Fitur ini disediakan untuk keperluan monitoring yang sah. Penggunaan yang melanggar hukum atau tanpa consent adalah tanggung jawab pengguna sepenuhnya.

---

## Troubleshooting

### Agent Tidak Mengirim Data

1. Periksa apakah `SERVER_URL` sudah benar
2. Buka console browser (F12) untuk melihat error
3. Pastikan server dapat diakses dari perangkat

### Dashboard Kosong

1. Pastikan agent sudah terinstall dan aktif
2. Coba akses beberapa website
3. Refresh halaman dashboard

### CORS Error

Jika mendapat error CORS, pastikan dashboard dan agent menggunakan URL yang sama, atau tambahkan header CORS di server.

---

## Lihat Juga

- [User Guide](./USER_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Code Overview](./CODE_OVERVIEW.md)
