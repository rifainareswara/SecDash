# SecDash API Reference

The backend API is served under `/api`. All endpoints generally require `x-auth-token` cookie or header for authentication (managed by Nuxt Auth).

## Authentication

### `POST /api/auth/login`
Logs in a dashboard user.
-   **Body:** `{ username, password }`
-   **Returns:** User object and sets session cookie.

### `POST /api/auth/logout`
Clears the session.

## WireGuard Clients

### `GET /api/clients`
List all configured WireGuard clients.

### `POST /api/clients`
Create a new client.
-   **Body:** `{ name }`
-   **Auto-generated:** Private/Public keys, next available IP.

### `DELETE /api/clients/:id`
Delete a client and remove them from the interface.

## Server Configuration

### `GET /api/server/config`
Get current server settings (Interface IP, Port, Keys).

### `POST /api/server/config`
Update server settings. Triggers interface restart (`wg-quick down` -> `up`).

## Access Control & Monitoring

### `GET /api/monitored-servers`
Get list of monitored targets.

### `POST /api/monitored-servers`
Add a target to monitor.
-   **Body:** `{ name, ip }`
-   **Effect:** Restarts the background `tcpdump` process to include new IP filter.

### `GET /api/traffic-logs`
Get aggregated traffic logs.
-   **Query:** `?limit=100`

## System & Status

### `GET /api/status`
Returns server system metrics (CPU, RAM, Uptime).

### `GET /api/vpn-connections`
Returns active WireGuard handshake data parsed from `wg show`.
