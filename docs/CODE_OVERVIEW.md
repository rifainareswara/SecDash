# SecDash Code Overview

This document provides a technical overview of the **SecDash** codebase. It is built with **Nuxt 3** (Vue 3 + Nitro) and uses a file-based architecture.

## Architecture
The application is a monolithic Nuxt app. The frontend and backend API live in the same project and are served by the Nitro server engine.

### Tech Stack
-   **Framework:** Nuxt 3
-   **Frontend:** Vue 3 (Composition API), TailwindCSS
-   **Backend:** Nitro (Node.js)
-   **Database:** Local JSON files (NoSQL-lite approach) stored in `/wg-db`.
-   **VPN Core:** `wireguard-tools` (wg, wg-quick), `tcpdump` (for traffic monitoring).

## Directory Structure

```
/
├── app/                  # Frontend Application
│   ├── components/       # Reusable Vue components (UI)
│   ├── composables/      # Shared state & logic (useWireGuard, useAuth)
│   ├── layouts/          # Page layouts (Sidebar structure)
│   └── pages/            # Application routes (views)
│
├── server/               # Backend Logic
│   ├── api/              # API Endpoints (auto-mapped to /api/*)
│   ├── middleware/       # Auth checks, logging
│   ├── plugins/          # Startup scripts (Traffic Monitor init)
│   └── utils/            # Core business logic
│       ├── database.ts   # CRUD operations for JSON DB
│       ├── wireguard.ts  # Wrappers for OS `wg` commands
│       └── trafficMonitor.ts # tcpdump process manager
│
├── .output/              # Build artifacts (created by npm run build)
├── docs/                 # Documentation
└── Dockerfile            # Container definition
```

## Key Components

### 1. Database (`server/utils/database.ts`)
We do not use a SQL database to keep the container lightweight. Data is stored in:
-   `wg-db/server/config.json`: Server interface settings.
-   `wg-db/clients/*.json`: Individual client configurations.
-   `wg-db/users/users.json`: Dashboard admin accounts.

### 2. WireGuard Integration (`server/utils/wireguard.ts`)
The backend spawns child processes to interact with the OS:
-   `wg genkey` / `wg pubkey`: Key generation.
-   `wg-quick`: Interface lifecycle management.
-   `wg show`: Retrieving live stats.
-   `wg set`: Dynamic peer addition/removal without downtime.

### 3. Traffic Monitor (`server/utils/trafficMonitor.ts`)
A background service (initialized by `server/plugins/traffic-monitor.ts`) that:
1.  Spawns a `tcpdump` process listening on `wg0`.
2.  Applies a BPF filter based on "Monitored Servers".
3.  Parses `stdout` line-by-line to detect SYN packets.
4.  Aggregates hits and writes them to `traffic_logs.json`.

## Development Workflows

-   **Development:** `npm run dev` (starts Nuxt dev server).
-   **Build:** `npm run build` (produces `.output`).
-   **Production:** `node .output/server/index.mjs` (or via Docker).

## Docker
The `Dockerfile` is a multi-stage build.
1.  **Builder:** Compiles the Nuxt app.
2.  **Production:** Copies artifacts, installs runtime deps (`wireguard-tools`, `tcpdump`, `iptables`), and runs the server.
