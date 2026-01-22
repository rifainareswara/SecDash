# SecDash VPN - Code Overview

Technical documentation for developers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nuxt 3 Application                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐     ┌─────────────────────────┐   │
│  │    Frontend     │     │        Backend          │   │
│  │    (Vue 3)      │◄───►│       (Nitro)           │   │
│  ├─────────────────┤     ├─────────────────────────┤   │
│  │ • Pages         │     │ • REST API              │   │
│  │ • Components    │     │ • Server Plugins        │   │
│  │ • Composables   │     │ • Database Utils        │   │
│  │ • Layouts       │     │ • WireGuard Integration │   │
│  └─────────────────┘     └─────────────────────────┘   │
│                                 │                       │
│                                 ▼                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              JSON File Database                  │   │
│  │  wg-db/                                          │   │
│  │  ├── clients/*.json    (VPN clients)            │   │
│  │  ├── server/           (Server config)          │   │
│  │  └── users/            (Admin users)            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
SecDash/
├── app/                          # Frontend (Nuxt)
│   ├── components/               # Vue components
│   │   ├── DataTable.vue         # Client list table
│   │   ├── StatsWidget.vue       # Dashboard stats
│   │   ├── Sidebar.vue           # Navigation
│   │   ├── ConfirmationModal.vue # Confirmation dialogs
│   │   └── ...
│   ├── composables/
│   │   ├── useWireGuard.ts       # WireGuard API composable
│   │   └── useAuth.ts            # Authentication composable
│   ├── pages/
│   │   ├── index.vue             # Dashboard
│   │   ├── users.vue             # VPN Clients
│   │   ├── config.vue            # Server config
│   │   ├── activity-monitor.vue  # Unified Monitoring (3 tabs)
│   │   ├── ai-insights.vue       # AI Security Insights
│   │   ├── uptime.vue            # Uptime Monitor
│   │   ├── vpn-monitor.vue       # VPN Connections
│   │   ├── admin.vue             # Admin Users & 2FA
│   │   ├── status.vue            # System Status
│   │   ├── wol.vue               # Wake-on-LAN
│   │   └── login.vue             # Login page
│   └── layouts/
│       └── default.vue           # Main layout
│
├── server/                       # Backend (Nitro)
│   ├── api/                      # REST endpoints
│   │   ├── auth/                 # Authentication
│   │   ├── clients/              # Client CRUD & 2FA
│   │   ├── 2fa/                  # Admin 2FA
│   │   ├── agent-pin/            # PIN protection
│   │   ├── access-logs/          # Server access logs
│   │   ├── server/               # Server config
│   │   ├── wol-hosts/            # Wake-on-LAN
│   │   ├── activity-agent.ts     # Activity agent endpoint
│   │   ├── activity-logs.ts      # Activity logs
│   │   ├── status.get.ts         # Dashboard stats
│   │   ├── monitors.ts           # Uptime monitors
│   │   └── vpn-connections.ts    # Live data
│   ├── plugins/
│   │   ├── wireguard-sync.ts     # WG key/config sync
│   │   └── vpn-monitor.ts        # Connection polling
│   └── utils/
│       ├── database.ts           # JSON file operations
│       ├── accessLog.ts          # Access logging
│       ├── vpnConnectionLog.ts   # Parse wg show
│       └── trafficMonitor.ts     # tcpdump integration
│
├── public/
│   └── agent/                    # Activity tracking agent
│       ├── activity-tracker.js
│       └── extension/            # Chrome extension (PIN-protected)
│
├── scripts/
│   ├── deploy.sh                 # One-click deployment
│   ├── setup-host.sh             # Host firewall setup
│   └── docker-entrypoint.sh      # Container startup
│
├── config/                       # WireGuard (Docker volume)
├── wg-db/                        # Database (Docker volume)
│   ├── clients/                  # VPN clients
│   ├── server/                   # Server config
│   ├── users/                    # Admin users
│   ├── activity_logs/            # Browser activity logs
│   └── access_logs/              # Server access logs
├── docker-compose.yml
├── Dockerfile
└── nuxt.config.ts
```

---

## Key Components

### Frontend

#### `useWireGuard.ts` Composable

Main API interface for WireGuard operations:

```typescript
const {
  clients, // Reactive client list
  stats, // Server statistics
  loading, // Loading state
  fetchClients, // Get all clients
  createClient, // Create new client
  deleteClient, // Remove client
  getClientConfig, // Get QR/config
  updateServerConfig, // Update server settings
} = useWireGuard();
```

### Backend

#### Server Plugins

**`wireguard-sync.ts`**

- Runs on startup
- Syncs database keys with actual WireGuard
- Auto-detects public IP
- Writes config to `/config/wg0.conf`
- Sets up routes and iptables

**`vpn-monitor.ts`**

- Polls `wg show` every 5 seconds
- Updates connection logs
- Tracks handshakes and data transfer

#### Database (`database.ts`)

JSON file-based storage:

```typescript
// Client operations
getClients(): WGClient[]
getClientById(id): WGClient
createClient(name, email): WGClient
deleteClient(id): boolean

// Server config
getServerConfig(): WGServerConfig
updateServerConfig(config): WGServerConfig

// Global settings
getGlobalSettings(): WGGlobalSettings
updateGlobalSettings(settings): WGGlobalSettings
```

#### WireGuard Integration

**Parse `wg show` output:**

```typescript
// vpnConnectionLog.ts
function parseWgShow(): Array<{
  publicKey: string;
  endpoint: string;
  lastHandshake: Date | null;
  transferRx: number;
  transferTx: number;
}>;
```

**Runtime peer sync:**

```bash
wg set wg0 peer "PUBLIC_KEY" allowed-ips "10.252.1.X/32"
```

---

## API Endpoints

### Authentication

| Method | Endpoint           | Description  |
| ------ | ------------------ | ------------ |
| POST   | `/api/auth/login`  | Login        |
| POST   | `/api/auth/logout` | Logout       |
| GET    | `/api/auth/me`     | Current user |

### Clients

| Method | Endpoint                      | Description        |
| ------ | ----------------------------- | ------------------ |
| GET    | `/api/clients`                | List all clients   |
| POST   | `/api/clients`                | Create client      |
| GET    | `/api/clients/:id`            | Get client         |
| DELETE | `/api/clients/:id`            | Delete client      |
| GET    | `/api/clients/:id/config`     | Get config + QR    |
| POST   | `/api/clients/:id/2fa/setup`  | Setup client 2FA   |
| POST   | `/api/clients/:id/2fa/verify` | Verify client 2FA  |
| POST   | `/api/clients/activate`       | Activate session   |
| POST   | `/api/clients/deactivate`     | Deactivate session |

### Two-Factor Authentication

| Method | Endpoint           | Description       |
| ------ | ------------------ | ----------------- |
| GET    | `/api/2fa/status`  | Check 2FA status  |
| POST   | `/api/2fa/setup`   | Setup admin 2FA   |
| POST   | `/api/2fa/verify`  | Verify admin 2FA  |
| POST   | `/api/2fa/disable` | Disable admin 2FA |

### Server

| Method | Endpoint               | Description                 |
| ------ | ---------------------- | --------------------------- |
| GET    | `/api/status`          | Dashboard stats + live data |
| GET    | `/api/server/config`   | Server configuration        |
| POST   | `/api/server/config`   | Update configuration        |
| GET    | `/api/vpn-connections` | Active connections          |

### Activity Monitoring

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| POST   | `/api/activity-agent`    | Log activity from agent |
| GET    | `/api/activity-logs`     | Get activity logs       |
| GET    | `/api/access-logs`       | Get server access logs  |
| GET    | `/api/access-logs/stats` | Get access statistics   |

### Agent PIN

| Method | Endpoint                | Description      |
| ------ | ----------------------- | ---------------- |
| POST   | `/api/agent-pin`        | Set admin PIN    |
| GET    | `/api/agent-pin/status` | Check PIN status |
| POST   | `/api/agent-pin/verify` | Verify PIN       |

---

## Docker Architecture

### Containers

1. **wireguard** (linuxserver/wireguard)
   - Manages wg0 interface
   - Handles encryption/decryption
   - Exposes UDP 51820

2. **vpn-dashboard** (custom)
   - Nuxt application
   - Uses `network_mode: service:wireguard`
   - Shares network namespace with wireguard
   - Can execute `wg` commands directly

### Startup Flow

```
1. wireguard container starts
2. wg0 interface created
3. Healthcheck passes (wg show wg0)
4. vpn-dashboard starts (depends_on: healthy)
5. docker-entrypoint.sh runs:
   - Waits for wg0 (redundant but safe)
   - Detects public IP
   - Sets up routes/iptables
   - Starts Nuxt app
6. wireguard-sync.ts plugin:
   - Syncs keys from wg0 to database
   - Syncs endpoint address
   - Writes config file
   - Adds peers to interface
```

---

## Development

### Local Setup

```bash
npm install
npm run dev
```

### Testing API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Get clients
curl http://localhost:3000/api/clients \
  -H "Cookie: session=..."
```

### Building

```bash
npm run build
# Output in .output/
```

---

## Adding Features

### New API Endpoint

1. Create file in `server/api/`
2. Export `defineEventHandler`
3. Access via `/api/filename`

### New Page

1. Create file in `app/pages/`
2. Add to sidebar in `Sidebar.vue`
3. Route auto-generated by Nuxt

### New Database Entity

1. Add type to `database.ts`
2. Create CRUD functions
3. Add API endpoints
4. Create frontend composable/page
