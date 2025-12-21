# SecDash VPN - User Guide

Welcome to SecDash VPN! This guide will help you get started with managing your WireGuard VPN.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing VPN Clients](#3-managing-vpn-clients)
4. [Connecting from Mobile](#4-connecting-from-mobile)
5. [Server Configuration](#5-server-configuration)
6. [Access Control (Traffic Monitor)](#6-access-control-traffic-monitor)
7. [Other Features](#7-other-features)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Getting Started

### First Login

1. Open your browser and go to `http://YOUR_SERVER_IP:3000`
2. Login with default credentials:
   - **Username:** `admin`
   - **Password:** `password`
3. **Important:** Change your password immediately after first login!

### Dashboard Layout

- **Sidebar:** Navigation menu (Dashboard, VPN Clients, Config, etc.)
- **Header:** User menu and logout
- **Main Area:** Content for selected page

---

## 2. Dashboard Overview

The main dashboard shows:

- **Total Clients:** Number of VPN clients configured
- **Active Tunnels:** Currently connected clients
- **Data Transfer:** Total bandwidth used (download/upload)
- **Client List:** Quick view of all clients with status

### Client Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| Active | 🟢 Green | Connected, handshake < 3 minutes |
| Recent | 🟡 Yellow | Handshake 3-5 minutes ago |
| Stale | 🟠 Orange | Handshake > 5 minutes ago |
| Offline | ⚫ Gray | No recent handshake |

---

## 3. Managing VPN Clients

### Creating a New Client

1. Go to **Dashboard** or **VPN Clients** page
2. Click **Add Client** button
3. Enter:
   - **Name:** A friendly name (e.g., "John's iPhone")
   - **Email:** Optional, for sending config via email
4. Click **Create**
5. A QR code will appear - scan it with WireGuard app!

### Client Actions

For each client, you can:

- **QR Code:** View/scan QR code for mobile setup
- **Download:** Download `.conf` file for desktop apps
- **Email:** Send configuration via email (requires SMTP setup)
- **Delete:** Remove client from VPN

### Deleting a Client

1. Click the menu (⋮) on the client row
2. Select **Delete**
3. Confirm deletion
4. Client is immediately removed from VPN

---

## 4. Connecting from Mobile

### iOS / Android

1. Install **WireGuard** app from App Store / Play Store
2. In SecDash dashboard, create a client or view existing client's QR
3. In WireGuard app, tap **+** → **Create from QR code**
4. Scan the QR code
5. Name the tunnel and save
6. Toggle the switch to connect!

### What to Expect

- Your internet traffic goes through the VPN server
- You'll appear to be at the server's location
- Some geo-restricted content may change (this is normal for VPN)

---

## 5. Server Configuration

Navigate to **WireGuard Server** (Config page) to configure:

### Interface Settings

- **Listen Port:** Default 51820
- **Server Address:** Internal VPN subnet
- **Private/Public Keys:** Server's WireGuard keys

### Global Settings

- **Endpoint Address:** Your server's public IP
- **DNS Servers:** DNS for VPN clients (default: 1.1.1.1)
- **MTU:** Network MTU (default: 1450)
- **Persistent Keepalive:** Keep connection alive interval

### Post Up/Down Scripts

Advanced: Custom iptables rules for NAT/firewall.

Default PostUp:
```
iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE
```

---

## 6. Access Control (Traffic Monitor)

Monitor traffic to specific internal servers.

### Adding a Server to Monitor

1. Go to **Access Control** page
2. Click **Monitor Server**
3. Enter:
   - **Name:** e.g., "Production DB"
   - **IP Address:** e.g., `10.0.0.50`
4. Click **Start Monitoring**

### Viewing Traffic Logs

The log shows:
- **Client IP:** Which VPN client
- **Target:** Server being accessed
- **Port:** Destination port (80, 443, 5432, etc.)
- **Hits:** Packet count

---

## 7. Other Features

### VPN Connections Page

Real-time view of connected clients:
- Public key
- Endpoint (client's real IP:port)
- Data transfer (RX/TX)
- Last handshake time

### System Status Page

- Server uptime
- CPU and memory usage
- Server configuration summary
- Active connections count

### Wake-on-LAN

Wake up devices on your network:
1. Go to **WoL Hosts** page
2. Add a host with MAC address
3. Click **Wake** to send magic packet

---

## 8. Troubleshooting

### Can't Connect to VPN

1. **Check endpoint:** Make sure client has correct server IP
2. **Check port:** UDP 51820 must be open on server
3. **Regenerate config:** If server was reinstalled, create new client

### Connected but No Internet

1. VPN is connected (handshake OK)
2. But can't browse or ping external IPs
3. **Fix:** Run on server:
   ```bash
   sudo ./scripts/setup-host.sh
   ```

### Dashboard Shows "Never" for Handshake

Client hasn't connected yet, or:
```bash
# Restart dashboard
docker restart vpn-dashboard
```

### YouTube/Streaming Issues

This is **normal VPN behavior**:
- Traffic exits from server location
- Some content may be region-restricted
- Solution: Disable VPN for streaming, or use split tunneling

---

## Getting Help

If you encounter issues:
1. Check container logs:
   ```bash
   docker logs vpn-dashboard
   docker logs wireguard
   ```
2. Restart services:
   ```bash
   docker-compose restart
   ```
3. Full redeploy:
   ```bash
   sudo ./deploy.sh YOUR_IP
   ```
