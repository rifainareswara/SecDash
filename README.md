# SecDash VPN - WireGuard Dashboard

A modern, beautiful WireGuard VPN management dashboard built with Nuxt 3.

![SecDash VPN Dashboard](./docs/preview.png)

## Features

- 🔐 **Secure Authentication** - Username/password login with session management
- 👥 **Client Management** - Create, edit, delete VPN clients
- 📱 **QR Code Generation** - Scan with WireGuard mobile app
- 📧 **Email Configs** - Send VPN configurations via email
- 📊 **Real-time Stats** - Monitor connections and data transfer
- 🌐 **Traffic Monitoring** - Track access to internal servers
- 🖥️ **Wake-on-LAN** - Wake devices on your network
- 📱 **Responsive Design** - Works on desktop and mobile

## Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose
- A server with public IP address
- Port 51820/UDP (WireGuard) and 3000/TCP (Dashboard) accessible

### 1. Clone and Configure

```bash
git clone <repository-url>
cd vpn

# Copy and edit environment file
cp .env.example .env
nano .env
```

**Important:** Set `WG_HOST` to your server's public IP address:

```env
WG_HOST=YOUR_PUBLIC_IP_HERE
WG_PORT=51820
WEBUI_PORT=3000
```

### 2. Deploy

```bash
# Build and start containers
docker-compose up -d --build

# Run host setup script (required for VPN to work!)
chmod +x scripts/setup-host.sh
sudo ./scripts/setup-host.sh
```

### 3. Access Dashboard

Open `http://YOUR_SERVER_IP:3000` in your browser.

Default credentials:
- **Username:** admin
- **Password:** password

⚠️ **Change the password after first login!**

### 4. Create VPN Client

1. Go to **Dashboard** or **VPN Clients** page
2. Click **Add Client**
3. Scan the QR code with WireGuard mobile app
4. Connect and enjoy!

## Host Server Requirements

Before the VPN can work, your host server needs:

1. **IP Forwarding enabled:**
   ```bash
   sudo sysctl -w net.ipv4.ip_forward=1
   echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
   ```

2. **Proper iptables rules:**
   Run the setup script:
   ```bash
   sudo ./scripts/setup-host.sh
   ```

3. **Firewall allows UDP 51820:**
   ```bash
   # UFW
   sudo ufw allow 51820/udp
   sudo ufw allow 3000/tcp
   
   # Or iptables
   sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT
   sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WG_HOST` | Public IP or domain for VPN endpoint | `auto` |
| `WG_PORT` | WireGuard UDP port | `51820` |
| `WEBUI_PORT` | Dashboard web port | `3000` |
| `WG_SUBNET` | Internal VPN subnet | `10.252.1.0` |
| `TZ` | Timezone | `Asia/Jakarta` |
| `COOKIE_SECURE` | Use secure cookies (HTTPS only) | `false` |

### Changing Server IP

If you move to a new server:

1. Update `WG_HOST` in `.env` to the new public IP
2. Restart containers: `docker-compose down && docker-compose up -d`
3. Run host setup: `sudo ./scripts/setup-host.sh`
4. The dashboard will auto-sync the new IP
5. Re-generate client configs (old QR codes won't work)

## Troubleshooting

### VPN Connected but No Internet

1. **Check host IP forwarding:**
   ```bash
   sysctl net.ipv4.ip_forward
   # Should show: net.ipv4.ip_forward = 1
   ```

2. **Run host setup script:**
   ```bash
   sudo ./scripts/setup-host.sh
   ```

3. **Check container logs:**
   ```bash
   docker logs vpn-dashboard
   docker logs wireguard
   ```

4. **Verify peer sync:**
   ```bash
   docker exec wireguard wg show
   # Should show peers with recent handshake
   ```

### Handshake Not Working

1. Verify firewall allows UDP 51820
2. Check endpoint address in client config matches server public IP
3. Regenerate client config after changing server IP

### Dashboard Not Accessible

1. Check port 3000 is open in firewall
2. Verify containers are running: `docker-compose ps`
3. Check logs: `docker logs vpn-dashboard`

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Host Server                       │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  wireguard   │◄──►│    vpn-dashboard         │  │
│  │  container   │    │    container             │  │
│  │              │    │                          │  │
│  │  - wg0 iface │    │  - Nuxt 3 app            │  │
│  │  - Port 51820│    │  - REST API              │  │
│  │              │    │  - wg-db (JSON files)    │  │
│  └──────────────┘    └──────────────────────────┘  │
│         ▲                       │                   │
│         │ network_mode:         │ Port 3000         │
│         │ service:wireguard     ▼                   │
│         └───────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

## License

MIT
