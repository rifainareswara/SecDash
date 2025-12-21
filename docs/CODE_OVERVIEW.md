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
│   │   └── ...
│   ├── composables/
│   │   └── useWireGuard.ts       # WireGuard API composable
│   ├── pages/
│   │   ├── index.vue             # Dashboard
│   │   ├── users.vue             # VPN Clients
│   │   ├── config.vue            # Server config
│   │   ├── vpn-connections.vue   # Active connections
│   │   └── ...
│   └── layouts/
│       └── default.vue           # Main layout
│
├── server/                       # Backend (Nitro)
│   ├── api/                      # REST endpoints
│   │   ├── auth/                 # Authentication
│   │   ├── clients/              # Client CRUD
│   │   ├── server/               # Server config
│   │   ├── status.get.ts         # Dashboard stats
│   │   └── vpn-connections.ts    # Live data
│   ├── plugins/
│   │   ├── wireguard-sync.ts     # WG key/config sync
│   │   └── vpn-monitor.ts        # Connection polling
│   └── utils/
│       ├── database.ts           # JSON file operations
│       ├── vpnConnectionLog.ts   # Parse wg show
│       └── trafficMonitor.ts     # tcpdump integration
│
├── scripts/
│   ├── deploy.sh                 # One-click deployment
│   ├── setup-host.sh             # Host firewall setup
│   └── docker-entrypoint.sh      # Container startup
│
├── config/                       # WireGuard (Docker volume)
├── wg-db/                        # Database (Docker volume)
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
  clients,           // Reactive client list
  stats,             // Server statistics
  loading,           // Loading state
  fetchClients,      // Get all clients
  createClient,      // Create new client
  deleteClient,      // Remove client
  getClientConfig,   // Get QR/config
  updateServerConfig // Update server settings
} = useWireGuard()
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
  publicKey: string
  endpoint: string
  lastHandshake: Date | null
  transferRx: number
  transferTx: number
}>
```

**Runtime peer sync:**
```bash
wg set wg0 peer "PUBLIC_KEY" allowed-ips "10.252.1.X/32"
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id` | Get client |
| DELETE | `/api/clients/:id` | Delete client |
| GET | `/api/clients/:id/config` | Get config + QR |

### Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Dashboard stats + live data |
| GET | `/api/server/config` | Server configuration |
| POST | `/api/server/config` | Update configuration |
| GET | `/api/vpn-connections` | Active connections |

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
