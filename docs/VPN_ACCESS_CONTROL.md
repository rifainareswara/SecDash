# VPN Access Control Documentation

Dokumentasi untuk membatasi akses domain/service agar hanya bisa diakses melalui VPN.

---

## Arsitektur

```
┌─────────────┐    VPN Tunnel    ┌───────────────────┐
│   Client    │◄───────────────►│   VPN Server      │
│ 10.252.1.x  │                  │  101.47.128.101   │
└─────────────┘                  └─────────┬─────────┘
                                           │
                                   Internet│
                                           ▼
                    ┌──────────────────────────────────────┐
                    │           Protected Services          │
                    ├──────────────────────────────────────┤
                    │  NPM Server (69.5.12.122)            │
                    │  - docs.magnusdigital.co.id          │
                    ├──────────────────────────────────────┤
                    │  GitLab Magnus (69.5.15.154)         │
                    │  - git.magnusdigital.co.id           │
                    ├──────────────────────────────────────┤
                    │  GitLab Eyden AWS (3.1.46.90)        │
                    │  - git.eydendigital.co.id            │
                    └──────────────────────────────────────┘
```

---

## Konfigurasi

### 1. Service di NPM Server (Satu Server dengan NPM)

Contoh: `docs.magnusdigital.co.id`

#### Langkah:

1. **NPM Dashboard** → **Access Lists** → **Add Access List**
2. Isi:
   - **Name**: `VPN Only`
   - **Access tab**:
     ```
     allow 101.47.128.101
     deny all
     ```
3. **Hosts** → **Proxy Hosts** → Edit host → **Access List** → pilih `VPN Only`

#### Hasil:

| Akses | Tanpa VPN | Dengan VPN |
| ----- | --------- | ---------- |
| Web   | ❌ 403    | ✅ Works   |

---

### 2. Service di Server Terpisah (Docker + iptables)

Contoh: `git.magnusdigital.co.id` (GitLab Magnus - Non-AWS)

#### Masalah:

Docker bypass UFW karena mengelola iptables sendiri.

#### Solusi:

Gunakan chain `DOCKER-USER` untuk filter traffic.

#### Langkah:

**A. UFW Rules (Host Level)**

```bash
# SSH Admin - via VPN
sudo ufw allow from 101.47.128.101 to any port 22

# Git SSH - Open untuk push/pull
sudo ufw allow 2022

# Web - via VPN only
sudo ufw allow from 101.47.128.101 to any port 80
sudo ufw allow from 101.47.128.101 to any port 443

# Default policy
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

**B. Docker iptables Rules**

```bash
# Allow established connections
sudo iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow Git SSH (port 2022) dari semua
sudo iptables -I DOCKER-USER 2 -p tcp --dport 2022 -j ACCEPT

# Allow port 80 dari VPN
sudo iptables -I DOCKER-USER 3 -p tcp --dport 80 -s 101.47.128.101 -j ACCEPT

# Allow port 443 dari VPN
sudo iptables -I DOCKER-USER 4 -p tcp --dport 443 -s 101.47.128.101 -j ACCEPT

# Drop port 80, 443 dari IP lain
sudo iptables -I DOCKER-USER 5 -p tcp --dport 80 -j DROP
sudo iptables -I DOCKER-USER 6 -p tcp --dport 443 -j DROP
```

**C. Persist iptables Rules**

```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

#### Verifikasi:

```bash
# Cek UFW
sudo ufw status numbered

# Cek iptables DOCKER-USER
sudo iptables -L DOCKER-USER -n -v --line-numbers
```

#### Hasil:

| Akses                           | Tanpa VPN  | Dengan VPN |
| ------------------------------- | ---------- | ---------- |
| Web (`git.magnusdigital.co.id`) | ❌ Timeout | ✅ Works   |
| Git SSH (push/pull)             | ✅ Works   | ✅ Works   |
| SSH Admin                       | ❌         | ✅ Works   |

---

### 3. Service di AWS (Security Groups)

Contoh: `git.eydendigital.co.id` (GitLab Eyden - AWS)

#### Mengapa Security Groups?

AWS Security Groups bekerja di level network, block traffic sebelum sampai ke server. Lebih efektif dan AWS-native dibanding iptables.

#### Langkah:

1. **AWS Console** → **EC2** → **Instances**
2. Pilih instance `3.1.46.90`
3. Tab **Security** → klik link **Security Group**
4. **Edit Inbound Rules**
5. **Hapus** rules yang allow 80/443 dari `0.0.0.0/0`
6. **Tambah** rules baru:

| Type       | Port Range | Source               | Description    |
| ---------- | ---------- | -------------------- | -------------- |
| SSH        | 22         | `101.47.128.101/32`  | SSH via VPN    |
| SSH        | 22         | `103.188.177.146/32` | SSH backup     |
| Custom TCP | 2022       | `0.0.0.0/0`          | Git SSH (open) |
| HTTP       | 80         | `101.47.128.101/32`  | Web via VPN    |
| HTTPS      | 443        | `101.47.128.101/32`  | Web via VPN    |

7. **Save Rules**

#### Hasil:

| Akses                          | Tanpa VPN  | Dengan VPN |
| ------------------------------ | ---------- | ---------- |
| Web (`git.eydendigital.co.id`) | ❌ Timeout | ✅ Works   |
| Git SSH (push/pull)            | ✅ Works   | ✅ Works   |
| SSH Admin                      | ❌         | ✅ Works   |

---

## Rollback (Mengembalikan ke Semula)

### 1. NPM Access List

1. **NPM Dashboard** → **Hosts** → **Proxy Hosts**
2. Edit host → **Access List** → pilih `Publicly Accessible`
3. **Save**

### 2. UFW (Non-AWS Server)

```bash
# Disable UFW
sudo ufw disable

# Reset semua rules
sudo ufw reset

# Atau jika hanya ingin hapus specific rule
sudo ufw status numbered
sudo ufw delete [RULE_NUMBER]
```

### 3. Docker iptables (Non-AWS Server)

```bash
# Flush semua rules di DOCKER-USER
sudo iptables -F DOCKER-USER

# Kembalikan default RETURN rule
sudo iptables -A DOCKER-USER -j RETURN

# Persist perubahan
sudo netfilter-persistent save
```

### 4. AWS Security Groups

1. **AWS Console** → **EC2** → **Instances**
2. Pilih instance → Tab **Security** → klik **Security Group**
3. **Edit Inbound Rules**
4. **Hapus** rules yang restrict ke VPN IP
5. **Tambah** rules untuk open ke semua:

| Type       | Port Range | Source      | Description  |
| ---------- | ---------- | ----------- | ------------ |
| SSH        | 22         | `0.0.0.0/0` | SSH (open)   |
| Custom TCP | 2022       | `0.0.0.0/0` | Git SSH      |
| HTTP       | 80         | `0.0.0.0/0` | HTTP (open)  |
| HTTPS      | 443        | `0.0.0.0/0` | HTTPS (open) |

6. **Save Rules**

> ⚠️ **Warning**: Ini akan membuka akses ke semua orang. Gunakan hanya jika benar-benar perlu rollback.

---

## Troubleshooting

### Masih bisa akses tanpa VPN

1. Cek apakah service pakai Docker
2. Jika ya, perlu iptables rules di `DOCKER-USER` chain
3. UFW saja **tidak cukup** untuk Docker
4. Untuk AWS, pastikan Security Groups sudah diupdate

### Terkunci dari SSH

**Non-AWS:**

1. Akses via **Console/VNC** dari provider hosting
2. Jalankan rollback commands
3. Tambahkan IP kamu ke whitelist sebelum enable lagi

**AWS:**

1. Akses via **EC2 Instance Connect** atau **Session Manager**
2. Atau edit Security Group dari **AWS Console** (tidak perlu SSH)

### Rules hilang setelah reboot (Non-AWS)

```bash
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

### AWS Security Groups tidak bekerja

1. Pastikan instance menggunakan Security Group yang benar
2. Cek **Network ACL** (jika ada) tidak block traffic
3. Verifikasi IP VPN server benar: `101.47.128.101`

---

## IP Reference

| Server             | IP             | Fungsi                  | Method          |
| ------------------ | -------------- | ----------------------- | --------------- |
| VPN Server         | 101.47.128.101 | WireGuard VPN           | -               |
| NPM Server         | 69.5.12.122    | Reverse Proxy           | NPM Access List |
| GitLab Magnus      | 69.5.15.154    | git.magnusdigital.co.id | iptables        |
| GitLab Eyden (AWS) | 3.1.46.90      | git.eydendigital.co.id  | Security Groups |
| VPN Subnet         | 10.252.1.0/24  | Client IPs              | -               |

---

## Checklist Menambah Service Baru

- [ ] Tentukan lokasi service:
  - [ ] NPM server → gunakan Access List
  - [ ] Non-AWS server → gunakan iptables DOCKER-USER
  - [ ] AWS server → gunakan Security Groups
- [ ] Setup sesuai metode yang dipilih
- [ ] Test akses tanpa VPN (harus fail)
- [ ] Test akses dengan VPN (harus works)
- [ ] Persist rules (jika non-AWS: `netfilter-persistent save`)

---

## Quick Reference Commands

### Cek Status

```bash
# UFW status
sudo ufw status numbered

# iptables DOCKER-USER
sudo iptables -L DOCKER-USER -n -v --line-numbers

# Test koneksi dari server lain
curl -I https://git.magnusdigital.co.id
```

### Emergency Rollback

```bash
# UFW
sudo ufw disable

# iptables
sudo iptables -F DOCKER-USER && sudo iptables -A DOCKER-USER -j RETURN

# AWS: Edit Security Group dari Console
```

---

_Dokumentasi dibuat: 19 Januari 2026_
_Terakhir diupdate: 19 Januari 2026_
