# PIN-Protected Activity Agent

Dokumentasi untuk Chrome Extension yang dilindungi PIN admin.

---

## Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Setup Admin PIN](#setup-admin-pin)
3. [Instalasi Extension](#instalasi-extension)
4. [Cara Kerja](#cara-kerja)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Gambaran Umum

PIN-Protected Agent adalah Chrome Extension untuk memonitor aktivitas browsing yang:

- ✅ Berjalan otomatis di background
- ✅ Memerlukan PIN admin untuk disable tracking
- ✅ Auto-detect device name dari VPN client
- ✅ Mengirim data browsing ke Activity Monitor

### Use Case

- **Employee Monitoring** - Pantau aktivitas karyawan tanpa bisa dimatikan
- **Parental Control** - Awasi browsing anak dengan PIN protection
- **Forensic Investigation** - Track user yang akses link mencurigakan

---

## Setup Admin PIN

Sebelum install extension, set PIN admin terlebih dahulu:

```bash
curl -X POST https://vpn.magnusdigital.co.id/api/agent-pin \
  -H "Content-Type: application/json" \
  -d '{"pin": ""}'
```

**Rekomendasi PIN:**

- Minimal 4 karakter
- Kombinasi angka dan huruf
- Jangan gunakan PIN mudah ditebak (123456, password, dll)

**Verifikasi PIN sudah aktif:**

```bash
curl https://vpn.magnusdigital.co.id/api/agent-pin/status
# Response: {"success": true, "enabled": true, "hasPin": true}
```

---

## Instalasi Extension

### Langkah 1: Download Extension

Extension ada di folder: `public/agent/extension/`

### Langkah 2: Load ke Chrome

1. Buka `chrome://extensions` di browser
2. Aktifkan **Developer mode** (toggle di pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `public/agent/extension`

### Langkah 3: Konfigurasi

1. Klik icon extension di toolbar
2. Isi **Server URL**: `https://vpn.magnusdigital.co.id`
3. Isi **Device Name**: (opsional, contoh: "Laptop Kantor")
4. Klik **Save Settings**
5. Klik **Test Connection** untuk verifikasi

### Langkah 4: Verifikasi PIN Protection

Setelah koneksi berhasil, akan muncul badge 🔐 **Protected** yang menandakan PIN protection aktif.

---

## Cara Kerja

### Tracking Aktivitas

1. Extension mendeteksi setiap tab yang dibuka/dikunjungi
2. Data dikirim ke server via `POST /api/activity-agent`
3. Server otomatis mendeteksi:
   - IP address
   - Browser dan OS
   - Device fingerprint
   - VPN client (jika terkoneksi)

### PIN Protection

Ketika user mencoba disable tracking:

```
User klik Toggle OFF
        ↓
┌──────────────────┐
│ Modal PIN Input  │
└────────┬─────────┘
         ↓
   API Verify PIN
         ↓
┌────────┴────────┐
│ PIN Benar?       │
└────────┬────────┘
   YES ↙    ↘ NO
Tracking    "Invalid PIN"
Disabled    (tetap ON)
```

### Data yang Dicatat

| Field             | Deskripsi                                 |
| ----------------- | ----------------------------------------- |
| url               | Full URL yang dikunjungi                  |
| title             | Judul halaman                             |
| domain            | Nama domain                               |
| category          | Kategori (social, video, news, dll)       |
| timestamp         | Waktu akses                               |
| ip                | IP address                                |
| browser           | Nama browser                              |
| os                | Sistem operasi                            |
| deviceType        | Desktop/Mobile/Tablet                     |
| deviceFingerprint | ID unik device                            |
| device_name       | Nama device (dari VPN client atau manual) |

---

## API Reference

### Set PIN

```http
POST /api/agent-pin
Content-Type: application/json

{"pin": "123456"}
```

### Check Status

```http
GET /api/agent-pin/status
```

Response:

```json
{ "success": true, "enabled": true, "hasPin": true }
```

### Verify PIN

```http
POST /api/agent-pin/verify
Content-Type: application/json

{"pin": "123456"}
```

Response (benar):

```json
{ "success": true, "verified": true }
```

Response (salah):

```json
{ "success": true, "verified": false, "message": "Invalid PIN" }
```

---

## Troubleshooting

### Extension Tidak Muncul

1. Pastikan Developer mode aktif
2. Coba reload extension dari `chrome://extensions`
3. Periksa console untuk error

### Status "Not Configured"

1. Klik icon extension
2. Isi Server URL dengan benar
3. Klik Save Settings

### Connection Failed

1. Pastikan server URL benar dan dapat diakses
2. Periksa apakah server sedang berjalan
3. Coba akses URL langsung di browser

### PIN Badge Tidak Muncul

1. Klik Test Connection
2. Server harus sudah diset PIN terlebih dahulu
3. Tunggu beberapa detik untuk refresh status

### User Bisa Uninstall Extension

Chrome tidak memungkinkan extension mencegah uninstall. Untuk kontrol penuh:

- Gunakan Chrome Enterprise dengan policy
- Gunakan Mobile Device Management (MDM)
- Setup monitoring di level network

---

## Files

| File            | Deskripsi                     |
| --------------- | ----------------------------- |
| `manifest.json` | Konfigurasi extension         |
| `background.js` | Service worker untuk tracking |
| `popup.html`    | UI popup extension            |
| `popup.js`      | Logic popup dengan PIN modal  |

---

## Lihat Juga

- [Activity Monitoring](./ACTIVITY_MONITORING.md) - Dokumentasi lengkap
- [Access Logging](./access-logging.md) - Server access logs
- [API Reference](./API_REFERENCE.md) - Full API documentation
