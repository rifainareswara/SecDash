# SecDash VPN - User Guide

Welcome to SecDash VPN! This guide will help you get started with managing your WireGuard VPN.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing VPN Clients](#3-managing-vpn-clients)
4. [Two-Factor Authentication (2FA)](#4-two-factor-authentication-2fa)
5. [Connecting from Mobile](#5-connecting-from-mobile)
6. [Server Configuration](#6-server-configuration)
7. [Unified Monitoring](#7-unified-monitoring)
8. [AI Security Insights](#8-ai-security-insights)
9. [Other Features](#9-other-features)
10. [Troubleshooting](#10-troubleshooting)

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

| Status  | Color     | Meaning                          |
| ------- | --------- | -------------------------------- |
| Active  | 🟢 Green  | Connected, handshake < 3 minutes |
| Recent  | 🟡 Yellow | Handshake 3-5 minutes ago        |
| Stale   | 🟠 Orange | Handshake > 5 minutes ago        |
| Offline | ⚫ Gray   | No recent handshake              |

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

## 4. Two-Factor Authentication (2FA)

Protect VPN access with OTP verification. If a device is lost or stolen, VPN cannot be used without OTP code.

### Admin 2FA Setup

1. Go to **Admin Users** page (`/admin`)
2. Find **Two-Factor Authentication** section
3. Click **Setup 2FA**
4. Scan QR code with **Google Authenticator**
5. Enter 6-digit code to verify and enable

### Creating 2FA-Protected Clients

1. Go to **VPN Clients** page
2. Click **Add Client**
3. Check ✅ **Require 2FA to activate**
4. Click **Create**

### Session Status Badges

| Badge             | Meaning                          |
| ----------------- | -------------------------------- |
| 🔐 Setup Required | Need to configure authenticator  |
| 🔐 Inactive       | 2FA configured, needs activation |
| 🔐 Active (4h)    | VPN session active for X hours   |
| No 2FA            | Regular client, always active    |

### Self-Service 2FA (Per-Client)

Each client can have their own authenticator:

1. Client card shows **⚙️ Setup 2FA** button (yellow)
2. Click it → QR code modal appears
3. Scan QR with **device owner's** authenticator app
4. Enter 6-digit code to verify
5. Client can now activate their own sessions!

### Activating VPN Session

1. Client card shows **🔓 Activate** button
2. Enter OTP from authenticator app
3. Select duration (4h / 8h / 12h / 24h)
4. Click **Activate**
5. Now connect VPN on device!

### Deactivating Session

- Click **🔒 Deactivate** to immediately revoke VPN access
- Sessions also auto-expire after duration ends

**📚 For detailed documentation, see [2FA Guide](./2FA_GUIDE.md)**

---

## 5. Connecting from Mobile

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

## 6. Server Configuration

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

## 7. Unified Monitoring

The Monitoring page consolidates three types of monitoring into one unified interface with tabs.

### Accessing Monitoring

1. Go to **Monitoring** in the sidebar
2. Choose a tab: **Browser Activity**, **Network Traffic**, or **Access Logs**

### Tab 1: Browser Activity

Track browsing activity from devices with the agent installed:

- **Real-time Feed** - See URLs visited in real-time
- **Top Domains** - Most visited domains
- **Categories** - Breakdown by category (social, video, news, etc.)
- **Filters** - Filter by domain, category, or client
- **Install Agent** - Button to set up tracking on devices

### Tab 2: Network Traffic

Monitor access to specific internal servers:

1. Click **Add Server to Monitor**
2. Enter server Name and IP address
3. View traffic logs showing:
   - Client IP
   - Target server
   - Destination port
   - Packet count

### Tab 3: Access Logs

Server request logs with device fingerprinting:

- **Device Info** - Browser, OS, device type
- **Fingerprint** - Unique device identifier
- **Request Path** - URLs accessed on the dashboard
- **Statistics** - Top devices and request patterns

**For detailed documentation, see [Activity Monitoring](./ACTIVITY_MONITORING.md)**

---

## 8. AI Security Insights

AI-powered security analysis and recommendations.

### Accessing AI Insights

1. Go to **AI Insights** in the sidebar
2. Dashboard shows security analysis with auto-refresh

### Security Score

Overall security score (0-100) based on:

- **Device Trust** - Known vs unknown devices
- **Content Safety** - Access to blocked domains
- **Activity Pattern** - Normal usage patterns
- **Access Control** - IP address diversity

### Anomaly Detection

Automatic detection of:

- High activity volume (>100 requests/hour)
- Multiple IP addresses accessing system
- Blocked domain access attempts
- Late night activity (00:00-06:00)

### Usage Patterns

Breakdown of browsing by category:

- 📱 Social, 🎬 Video, 📰 News
- 🛒 Shopping, 💼 Work, 📧 Email
- 🔍 Search, 🎮 Gaming, 📂 Other

### Active Devices

List of devices with:

- Device name and fingerprint
- Request count and last seen
- Risk score (Low/Medium/High)

### AI Recommendations

Automated security suggestions for:

- Activity monitoring improvements
- Security hardening (2FA, etc.)
- Auto-response configuration

**For detailed documentation, see [AI Insights](./AI_INSIGHTS.md)**

---

## 9. Other Features

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

### Activity Monitoring Agent

For browser activity tracking, install the agent:

1. Go to **Monitoring** → **Browser Activity** tab
2. Click **Install Agent**
3. Choose method:
   - **Chrome Extension** (recommended, supports PIN protection)
   - **Console Script** (temporary)
   - **Bookmarklet** (mobile)

**For agent setup, see [PIN-Protected Agent](./PIN_PROTECTED_AGENT.md)**

---

## 10. Troubleshooting

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
