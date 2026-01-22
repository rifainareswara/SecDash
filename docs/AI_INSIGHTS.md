# AI Security Insights

## Ringkasan

**AI Security Insights** adalah fitur analisis keamanan pintar yang menganalisis data aktivitas dan akses untuk memberikan wawasan keamanan secara real-time. Fitur ini menggunakan pattern recognition untuk mendeteksi anomali, menghitung skor keamanan, dan memberikan rekomendasi proaktif.

---

## Cara Akses

1. Buka SecDash Dashboard di browser
2. Klik menu **\"AI Insights\"** di sidebar (ikon psychology/otak)
3. Halaman akan otomatis memuat dan menganalisis data

> **Note:** AI Insights tersedia di sidebar setelah menu WireGuard dan Monitoring.

---

## Komponen Utama

### 1. 🛡️ Security Score (Skor Keamanan)

Skor keseluruhan keamanan sistem dalam skala 0-100, dihitung berdasarkan 4 faktor:

| Faktor               | Deskripsi                                  | Cara Meningkatkan                        |
| -------------------- | ------------------------------------------ | ---------------------------------------- |
| **Device Trust**     | Kepercayaan terhadap device yang mengakses | Batasi jumlah device unik yang diizinkan |
| **Content Safety**   | Keamanan konten yang diakses               | Hindari akses ke domain yang diblokir    |
| **Activity Pattern** | Konsistensi pola aktivitas                 | Jaga pola penggunaan normal              |
| **Access Control**   | Kontrol akses IP                           | Batasi akses dari IP yang tidak dikenal  |

**Interpretasi Skor:**

- 🟢 **80-100**: Excellent - Sistem sangat aman
- 🟡 **60-79**: Good - Perlu sedikit perhatian
- 🟠 **40-59**: Fair - Ada beberapa risiko
- 🔴 **0-39**: Poor - Perlu tindakan segera

---

### 2. 🔔 Anomaly Detection (Deteksi Anomali)

Sistem mendeteksi 5 jenis anomali:

#### a) High Activity Volume

- **Trigger**: Lebih dari 100 aktivitas dalam 1 jam terakhir
- **Severity**: Medium 🟡
- **Tindakan**: Periksa apakah ini aktivitas normal atau potensi serangan

#### b) Multiple IP Addresses

- **Trigger**: Lebih dari 10 IP unik mengakses sistem
- **Severity**: Low 🟢
- **Tindakan**: Verifikasi semua IP adalah dari user yang sah

#### c) Blocked Domain Access

- **Trigger**: Ada percobaan akses ke domain yang diblokir
- **Severity**: High 🟠
- **Tindakan**: Investigasi device yang mencoba mengakses

#### d) Late Night Activity

- **Trigger**: Lebih dari 10 aktivitas antara jam 00:00-06:00
- **Severity**: Low 🟢
- **Tindakan**: Periksa apakah ada user yang sah bekerja malam

#### e) All Systems Normal

- **Trigger**: Tidak ada anomali terdeteksi
- **Severity**: Low 🟢
- **Tindakan**: Tidak ada - sistem aman

---

### 3. 📊 Usage Patterns (Pola Penggunaan)

Menampilkan breakdown kategori aktivitas browsing:

| Kategori | Icon | Contoh                       |
| -------- | ---- | ---------------------------- |
| Social   | 📱   | Facebook, Instagram, Twitter |
| Video    | 🎬   | YouTube, Netflix, Twitch     |
| News     | 📰   | CNN, BBC, Kompas             |
| Shopping | 🛒   | Tokopedia, Shopee, Amazon    |
| Work     | 💼   | Gmail, Slack, Office 365     |
| Email    | 📧   | Gmail, Outlook, Yahoo Mail   |
| Search   | 🔍   | Google, Bing, DuckDuckGo     |
| Gaming   | 🎮   | Steam, Epic Games            |
| Other    | 📂   | Lainnya                      |

**Indikator Trend:**

- ⬆️ **Up**: Penggunaan meningkat
- ⬇️ **Down**: Penggunaan menurun
- ➡️ **Stable**: Penggunaan stabil

---

### 4. 📱 Active Devices (Device Aktif)

Daftar device yang mengakses sistem, meliputi:

- **Device Name**: Browser / OS (contoh: Chrome / Windows)
- **Device ID**: Fingerprint unik device (8 karakter pertama)
- **Request Count**: Jumlah request dari device
- **Last Seen**: Waktu terakhir device terlihat
- **Risk Score**: Skor risiko device (0-100%)

**Risk Score Interpretation:**

- 🟢 **0-29%**: Low Risk - Device tepercaya
- 🟡 **30-59%**: Medium Risk - Perlu monitoring
- 🔴 **60-100%**: High Risk - Perlu investigasi

---

### 5. 💡 AI Recommendations

Tiga kategori rekomendasi otomatis:

1. **Activity Monitoring**: Tips untuk monitoring real-time
2. **Security Hardening**: Saran penguatan keamanan (2FA, dll)
3. **Auto Response**: Konfigurasi respons otomatis untuk ancaman

---

## Cara Penggunaan

### Monitoring Harian

1. **Buka AI Insights** setiap hari untuk check skor keamanan
2. **Review anomali** yang terdeteksi
3. **Ambil tindakan** jika ada alert dengan severity High/Critical

### Filter Waktu

Gunakan tombol filter di pojok kanan atas:

- **24h**: Data 24 jam terakhir (default)
- **7d**: Data 7 hari terakhir
- **30d**: Data 30 hari terakhir

### Refresh Manual

Klik tombol **"Refresh Analysis"** untuk memuat ulang analisis dengan data terbaru.

---

## Integrasi dengan Fitur Lain

AI Insights mengambil data dari:

1. **Activity Monitor** → `/api/activity-logs`
   - Browsing history
   - Domain yang dikunjungi
   - Kategori aktivitas

2. **Access Logs** → `/api/access-logs`
   - IP address
   - Device fingerprint
   - Browser/OS info
   - HTTP requests

---

## Auto-Refresh

Halaman ini melakukan **auto-refresh setiap 30 detik** untuk memastikan data selalu up-to-date.

---

## Best Practices

1. ✅ Check AI Insights **minimal sekali sehari**
2. ✅ Investigasi semua alert dengan severity **High** atau **Critical**
3. ✅ Monitor device baru yang muncul di daftar Active Devices
4. ✅ Perhatikan perubahan mendadak pada Usage Patterns
5. ✅ Jaga Security Score di atas **70** untuk keamanan optimal

---

## Troubleshooting

### Data Kosong

- Pastikan Activity Agent sudah terinstall di device yang dimonitor
- Periksa apakah API `/api/activity-logs` dan `/api/access-logs` berfungsi

### Skor Tidak Akurat

- Tunggu beberapa hari agar sistem mengumpulkan data cukup
- Skor akan lebih akurat seiring bertambahnya data

### Anomali False Positive

- Beberapa anomali mungkin adalah aktivitas normal
- Sesuaikan baseline dengan pola penggunaan aktual

---

## Roadmap

Fitur yang akan ditambahkan:

- [ ] Machine Learning untuk deteksi anomali lebih akurat
- [ ] Alert via Email/Telegram untuk anomali critical
- [ ] Custom threshold untuk setiap jenis anomali
- [ ] Historical trend analysis
- [ ] Device whitelisting
