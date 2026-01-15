# Panduan Testing - Access Logging System

## Quick Start

```bash
# 1. Start dev server
cd /Users/rifai/Github/Magnus/vpn
npm run dev

# Server berjalan di http://localhost:3000
```

---

## Test 1: Verifikasi Logging Berfungsi

### A. Akses Beberapa Halaman

Buka browser dan kunjungi:

1. http://localhost:3000/
2. http://localhost:3000/logs
3. http://localhost:3000/users
4. http://localhost:3000/config

### B. Cek Log via API

```bash
curl -s http://localhost:3000/api/access-logs?limit=10 | jq
```

**Expected Result:**

```json
{
  "success": true,
  "logs": [
    {
      "path": "/config",
      "deviceFingerprint": "abc123def456",
      "browser": "Chrome",
      "os": "macOS"
    }
  ]
}
```

---

## Test 2: Verifikasi File Tersimpan

```bash
# Cek folder access_logs ada
ls -la wg-db/access_logs/

# Cek isi file hari ini
cat wg-db/access_logs/$(date +%Y-%m-%d).json | jq '.[0]'
```

**Expected:**

- File `YYYY-MM-DD.json` harus ada
- Isi file berformat JSON array dengan log entries

---

## Test 3: Verifikasi Device Fingerprinting

### A. Test dengan Browser Berbeda

1. Buka di **Chrome**: http://localhost:3000/
2. Buka di **Safari/Firefox**: http://localhost:3000/
3. Cek logs - harus ada 2 device fingerprint berbeda

```bash
curl -s "http://localhost:3000/api/access-logs/stats?days=1" | jq '.stats.topDevices'
```

### B. Test dengan Mobile Mode

1. Buka Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Pilih iPhone atau Android
4. Refresh halaman
5. Cek logs - device = "Mobile"

---

## Test 4: Verifikasi Filter

### Filter by IP

```bash
curl -s "http://localhost:3000/api/access-logs?ip=127.0.0.1" | jq
```

### Filter by Device Fingerprint

```bash
# Ganti dengan fingerprint dari test sebelumnya
curl -s "http://localhost:3000/api/access-logs?device_fingerprint=abc123" | jq
```

### Filter by Path

```bash
curl -s "http://localhost:3000/api/access-logs?path=/logs" | jq
```

---

## Test 5: Verifikasi Statistics

```bash
curl -s "http://localhost:3000/api/access-logs/stats?days=7" | jq
```

**Expected Fields:**

- `totalRequests` - jumlah total request
- `uniqueIPs` - jumlah IP unik
- `uniqueDevices` - jumlah device unik
- `topDevices` - daftar device dengan count
- `requestsByHour` - distribusi per jam

---

## Test 6: Verifikasi UI

1. Buka http://localhost:3000/logs
2. Verifikasi:
   - [ ] Tabel menampilkan kolom Device ID
   - [ ] Bisa klik Device ID untuk filter
   - [ ] Filter IP, Device ID, Path berfungsi
   - [ ] Statistik unique devices muncul
   - [ ] Top devices section bisa di-expand

---

## Test 7: Cleanup Logs

```bash
# Hapus semua logs
curl -X DELETE http://localhost:3000/api/access-logs \
  -H "Content-Type: application/json" \
  -d '{"days_to_keep": 0}'

# Verifikasi folder kosong
ls -la wg-db/access_logs/
```

---

## Troubleshooting

### Logs tidak muncul

1. Cek middleware terdaftar:

```bash
ls server/middleware/
# Harus ada: accessLog.ts
```

2. Cek folder writeable:

```bash
mkdir -p wg-db/access_logs
chmod 755 wg-db/access_logs
```

### Device fingerprint selalu sama

Device fingerprint dibuat dari kombinasi IP + User-Agent + Accept-Language. Untuk mendapat fingerprint berbeda:

- Gunakan browser berbeda
- Gunakan incognito mode dengan bahasa berbeda
- Akses dari device/network berbeda

---

## Checklist Testing

- [ ] Dev server berjalan
- [ ] API `/api/access-logs` return data
- [ ] API `/api/access-logs/stats` return statistics
- [ ] File JSON tersimpan di `wg-db/access_logs/`
- [ ] Device fingerprint dihasilkan
- [ ] Browser berbeda = fingerprint berbeda
- [ ] Filter by IP berfungsi
- [ ] Filter by device fingerprint berfungsi
- [ ] UI logs page menampilkan device ID
- [ ] Top devices section berfungsi
