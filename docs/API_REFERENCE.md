# SecDash VPN - API Reference

Complete REST API documentation.

---

## Base URL

```
http://YOUR_SERVER:3000/api
```

## Authentication

All endpoints (except login) require a session cookie.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "isAdmin": true
  }
}
```

Sets `session` cookie for subsequent requests.

### Logout

```http
POST /api/auth/logout
```

### Current User

```http
GET /api/auth/me
```

---

## Clients

### List All Clients

```http
GET /api/clients
```

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "id": "abc123",
      "name": "John's iPhone",
      "email": "john@example.com",
      "publicKey": "xmkG...",
      "virtualIp": "10.252.1.2/32",
      "enabled": true,
      "createdAt": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Create Client

```http
POST /api/clients
Content-Type: application/json

{
  "name": "John's iPhone",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "abc123",
    "name": "John's iPhone",
    "publicKey": "xmkG...",
    "virtualIp": "10.252.1.2/32",
    "enabled": true
  }
}
```

### Get Client

```http
GET /api/clients/:id
```

### Delete Client

```http
DELETE /api/clients/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Client deleted"
}
```

### Get Client Config & QR

```http
GET /api/clients/:id/config
```

**Response:**
```json
{
  "success": true,
  "config": "[Interface]\nPrivateKey = ...\n...",
  "qrCode": "data:image/png;base64,..."
}
```

### Email Client Config

```http
POST /api/clients/:id/email
```

Requires SMTP to be configured.

---

## Two-Factor Authentication

### Get 2FA Status

```http
GET /api/2fa/status
```

**Response:**
```json
{
  "success": true,
  "enabled": true
}
```

### Setup 2FA (Admin)

```http
POST /api/2fa/setup
```

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "message": "Scan QR code with authenticator app"
}
```

### Verify 2FA OTP

```http
POST /api/2fa/verify
Content-Type: application/json

{
  "otp": "123456"
}
```

### Disable 2FA

```http
POST /api/2fa/disable
Content-Type: application/json

{
  "otp": "123456"
}
```

### Setup Client 2FA (Self-Service)

```http
POST /api/clients/:id/2fa/setup
```

**Response:**
```json
{
  "success": true,
  "clientId": "abc123",
  "clientName": "John's iPhone",
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

### Verify Client 2FA

```http
POST /api/clients/:id/2fa/verify
Content-Type: application/json

{
  "otp": "123456"
}
```

### Activate Client Session

```http
POST /api/clients/activate
Content-Type: application/json

{
  "client_id": "abc123",
  "otp": "123456",
  "duration_hours": 8
}
```

**Response:**
```json
{
  "success": true,
  "message": "VPN session activated for 8 hours",
  "client_id": "abc123",
  "expires_at": "2025-12-23T23:00:00.000Z",
  "duration_hours": 8
}
```

### Deactivate Client Session

```http
POST /api/clients/deactivate
Content-Type: application/json

{
  "client_id": "abc123"
}
```

---

## Server Configuration

### Get Status (Dashboard Data)

```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "server": {
    "address": "10.252.1.0/24",
    "listenPort": 51820,
    "publicKey": "RxNn...",
    "uptime": "Running"
  },
  "stats": {
    "totalClients": 5,
    "enabledClients": 5,
    "activeTunnels": 2,
    "totalTransferRx": 1048576,
    "totalTransferTx": 524288
  },
  "clients": [
    {
      "id": "abc123",
      "name": "John's iPhone",
      "status": "active",
      "lastHandshake": "30s ago",
      "sourceIp": "203.83.45.2",
      "sourcePort": "51234",
      "downloadData": "1.5 MB",
      "uploadData": "256 KB"
    }
  ]
}
```

### Get Server Config

```http
GET /api/server/config
```

**Response:**
```json
{
  "success": true,
  "server": {
    "addresses": ["10.252.1.0/24"],
    "listenPort": 51820,
    "privateKey": "...",
    "publicKey": "...",
    "post_up": "iptables ...",
    "post_down": "iptables ..."
  },
  "global": {
    "endpoint_address": "101.47.128.101",
    "dns_servers": ["1.1.1.1"],
    "mtu": "1450",
    "persistent_keepalive": "15"
  }
}
```

### Update Server Config

```http
POST /api/server/config
Content-Type: application/json

{
  "server": {
    "addresses": ["10.252.1.0/24"],
    "listen_port": "51820",
    "post_up": "..."
  },
  "global": {
    "endpoint_address": "101.47.128.101",
    "dns_servers": ["1.1.1.1", "8.8.8.8"]
  }
}
```

---

## VPN Connections

### Get Active Connections

```http
GET /api/vpn-connections?type=active
```

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "publicKey": "xmkG...",
      "endpoint": "203.83.45.2:51234",
      "transferRx": 1048576,
      "transferTx": 524288,
      "lastActivity": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Connection Logs

```http
GET /api/vpn-connections?limit=100
```

### Clear Logs

```http
DELETE /api/vpn-connections
```

---

## Traffic Monitoring

### Get Monitored Servers

```http
GET /api/monitored-servers
```

### Add Server to Monitor

```http
POST /api/monitored-servers
Content-Type: application/json

{
  "name": "Production DB",
  "ip": "10.0.0.50"
}
```

### Get Traffic Logs

```http
GET /api/traffic-logs?limit=100
```

---

## Wake-on-LAN

### List WoL Hosts

```http
GET /api/wol-hosts
```

### Add WoL Host

```http
POST /api/wol-hosts
Content-Type: application/json

{
  "name": "Office PC",
  "mac": "AA:BB:CC:DD:EE:FF",
  "ip": "10.0.0.100"
}
```

### Wake Host

```http
POST /api/wol-hosts/:id/wake
```

---

## Activity Monitoring

### Log Activity (Agent Endpoint)

```http
POST /api/activity-agent
Content-Type: application/json
X-Client-Id: device-abc123

{
  "url": "https://example.com/page",
  "title": "Page Title",
  "device_name": "John's Laptop"
}
```

**Response:**
```json
{
  "success": true,
  "logged_count": 1,
  "timestamp": "2025-12-22T11:00:00.000Z"
}
```

### Get Activity Logs

```http
GET /api/activity-logs?limit=100&category=social
```

**Query Parameters:**
- `limit` - Max records (default: 100)
- `client_id` - Filter by client
- `category` - Filter by category (social, video, news, etc)
- `domain` - Filter by domain (partial match)
- `start_date` / `end_date` - ISO date range

### Get Activity Statistics

```http
GET /api/activity-logs?stats=true&period=24h
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_visits": 150,
    "unique_domains": 25,
    "top_domains": [...],
    "top_categories": [...],
    "visits_by_hour": [...],
    "period": "24h"
  }
}
```

### Cleanup Old Logs

```http
DELETE /api/activity-logs
Content-Type: application/json

{
  "days_to_keep": 30
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP status codes:
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error
