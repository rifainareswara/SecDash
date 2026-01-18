# SecDash VPN - WireGuard Dashboard

A modern, beautiful WireGuard VPN management dashboard built with Nuxt 3.

## Features

- 🔐 **Secure Authentication** - Username/password login with session management
- 👥 **Client Management** - Create, edit, delete VPN clients with one click
- 📱 **QR Code Generation** - Scan with WireGuard mobile app instantly
- 📧 **Email Configs** - Send VPN configurations via email (SMTP)
- 📊 **Real-time Stats** - Live monitoring of connections, handshakes, and data transfer
- 🌐 **Traffic Monitoring** - Track access to internal servers
- 🔍 **Activity Monitoring** - Track browsing activity with IP filtering
- 🧠 **AI Security Insights** - Anomaly detection & behavior analytics _(NEW)_
- 🖥️ **Wake-on-LAN** - Wake devices on your network remotely
- ⚡ **Uptime Monitoring** - Monitor servers/services status like Uptime Kuma
- 🚀 **Multi-Environment** - Run dev/uat/prod simultaneously without port conflicts
- 📱 **Responsive Design** - Works beautifully on desktop and mobile

---

## Quick Start (One Command!)

### Prerequisites

- Ubuntu/Debian server with Docker & Docker Compose installed
- Public IP address
- Ports open: 51820/UDP (WireGuard), 3000/TCP (Dashboard)

### Deploy

```bash
# Clone repository
git clone <repository-url> SecDash
cd SecDash

# Run deployment script
chmod +x deploy.sh
sudo ./deploy.sh

# Or with specific IP:
sudo ./deploy.sh YOUR_PUBLIC_IP
```

**That's it!** The script automatically:

- ✅ Detects your public IP
- ✅ Configures environment
- ✅ Builds and starts containers
- ✅ Sets up host firewall rules
- ✅ Waits for services to be ready

### Access

- **Dashboard:** `http://YOUR_SERVER_IP:3000`
- **Default Login:** `admin` / `password`

⚠️ **Change the password after first login!**

---

## Creating VPN Clients

1. Open the dashboard
2. Click **Add Client** on Dashboard or VPN Clients page
3. Enter client name and optional email
4. **Scan the QR code** with WireGuard mobile app
5. Activate the tunnel and enjoy!

---

## Manual Installation

If you prefer manual setup:

### 1. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
WG_HOST=YOUR_PUBLIC_IP    # Required!
WG_PORT=51820
WEBUI_PORT=3000
```

### 2. Deploy Containers

```bash
docker-compose up -d --build
```

### 3. Configure Host Firewall

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# Run host setup script
chmod +x scripts/setup-host.sh
sudo ./scripts/setup-host.sh
```

---

## Configuration

### Environment Variables

| Variable        | Description                       | Default        |
| --------------- | --------------------------------- | -------------- |
| `WG_HOST`       | **Required!** Public IP or domain | `auto`         |
| `WG_PORT`       | WireGuard UDP port                | `51820`        |
| `WEBUI_PORT`    | Dashboard web port                | `3000`         |
| `WG_SUBNET`     | Internal VPN subnet               | `10.252.1.0`   |
| `TZ`            | Timezone                          | `Asia/Jakarta` |
| `COOKIE_SECURE` | Use secure cookies (HTTPS)        | `false`        |

### Moving to a New Server

```bash
# On new server:
git clone <repo-url> SecDash
cd SecDash
sudo ./deploy.sh NEW_SERVER_IP
```

After deployment:

1. Old client configs will NOT work (different server keys)
2. Create new clients and distribute new QR codes

---

## Troubleshooting

### VPN Connected but No Internet

```bash
# 1. Check IP forwarding on host
sysctl net.ipv4.ip_forward  # Should be 1

# 2. Run host setup
sudo ./scripts/setup-host.sh

# 3. Check container status
docker-compose ps
docker logs vpn-dashboard
docker logs wireguard
```

### Handshake Not Working

1. Verify UDP 51820 is open in firewall
2. Check client has correct server public key
3. Regenerate client config if server was reinstalled

### Dashboard Shows "Never" for Handshake

The dashboard fetches real-time data from WireGuard. If showing "Never":

1. Client hasn't connected yet
2. Dashboard container can't access wg0 interface
3. Try: `docker restart vpn-dashboard`

### Container Errors

```bash
# View logs
docker logs vpn-dashboard --tail 100
docker logs wireguard --tail 100

# Rebuild
docker-compose down
docker-compose up -d --build
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Host Server                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Docker Network                      │   │
│  │                                                  │   │
│  │  ┌──────────────┐     ┌──────────────────────┐  │   │
│  │  │  wireguard   │◄───►│    vpn-dashboard     │  │   │
│  │  │  container   │     │      container       │  │   │
│  │  │              │     │                      │  │   │
│  │  │  - wg0 iface │     │  - Nuxt 3 app        │  │   │
│  │  │  - UDP 51820 │     │  - REST API          │  │   │
│  │  │  - CoreDNS   │     │  - JSON database     │  │   │
│  │  └──────────────┘     └──────────────────────┘  │   │
│  │         ▲                        │              │   │
│  │         │ network_mode:          │ Port 3000   │   │
│  │         │ service:wireguard      ▼              │   │
│  └─────────┴───────────────────────────────────────┘   │
│                                                         │
│  Ports: 51820/UDP (VPN), 3000/TCP (Dashboard)          │
└─────────────────────────────────────────────────────────┘
```

---

## Multi-Environment Setup (NEW)

Run multiple environments (dev/uat/prod) simultaneously without port conflicts:

| Environment | Dashboard | WireGuard | Subnet     |
| ----------- | --------- | --------- | ---------- |
| DEV         | :3000     | :51820    | 10.252.1.x |
| UAT         | :3001     | :51821    | 10.252.2.x |
| PROD        | :3002     | :51822    | 10.252.3.x |

```bash
# Start specific environment
./run-env.sh dev      # Development
./run-env.sh uat      # UAT
./run-env.sh prod     # Production

# Other commands
./run-env.sh dev logs     # View logs
./run-env.sh all status   # Status all envs
./run-env.sh all stop     # Stop all
```

> **Note:** Production deployment via `./deploy.sh` still uses the original ports (3000/51820).

See [environments/README.md](./environments/README.md) for details.

---

## Activity Monitoring (NEW)

Track browsing activity from VPN-connected devices:

1. Open **Activity Monitor** from sidebar
2. Click **Install Agent**
3. Choose installation method (Browser Extension / Console Script)
4. View real-time activity and statistics

Features:

- Real-time browsing feed
- Top domains & categories analytics
- Filtering by domain, category, device
- Auto-categorization (social, video, news, etc)

See [docs/ACTIVITY_MONITORING.md](./docs/ACTIVITY_MONITORING.md) for full guide.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## File Structure

```
SecDash/
├── app/                    # Nuxt frontend
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables
│   ├── pages/              # Page routes
│   └── layouts/            # Layout templates
├── server/                 # Nitro backend
│   ├── api/                # REST API endpoints
│   ├── plugins/            # Server plugins
│   └── utils/              # Utilities
├── public/
│   └── agent/              # Activity tracking agent
│       ├── activity-tracker.js
│       └── extension/      # Chrome extension
├── environments/           # Multi-env configs (NEW)
│   ├── dev.env
│   ├── uat.env
│   └── prod.env
├── docs/                   # Documentation
│   ├── USER_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── CODE_OVERVIEW.md
│   └── ACTIVITY_MONITORING.md
├── scripts/                # Deployment scripts
├── config/                 # WireGuard config (volume)
├── wg-db/                  # Dashboard database (volume)
├── docker-compose.yml              # Standard compose
├── docker-compose.multi-env.yml    # Multi-env compose
├── run-env.sh              # Multi-env runner
├── deploy.sh               # Production deploy
├── Dockerfile
└── .env.example
```

---

## Documentation

- [User Guide](./docs/USER_GUIDE.md) - End-user guide
- [API Reference](./docs/API_REFERENCE.md) - REST API documentation
- [Code Overview](./docs/CODE_OVERVIEW.md) - Developer guide
- [Activity Monitoring](./docs/ACTIVITY_MONITORING.md) - Browsing tracker guide
- [Multi-Environment](./environments/README.md) - Dev/UAT/Prod setup

---

## License

MIT
