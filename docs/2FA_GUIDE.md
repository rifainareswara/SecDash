# Two-Factor Authentication (2FA) for WireGuard VPN

This document describes the 2FA pre-authentication feature that adds an extra layer of security for WireGuard VPN clients.

## Overview

When enabled, VPN clients must verify a TOTP code from an authenticator app before their VPN session is activated. This protects against unauthorized access if a device with VPN config is lost or stolen.

## Features

- **TOTP-based authentication** using standard 6-digit codes (Google Authenticator compatible)
- **Per-client 2FA requirement** - choose which clients need 2FA
- **Session-based activation** with configurable duration (4/8/12/24 hours)
- **Auto-expiry** - sessions automatically deactivate after duration ends
- **Manual deactivation** - immediately revoke VPN access when needed

## Admin Setup

### Enable 2FA for Your Account

1. Go to **Admin Users** page (`/admin`)
2. Find the **Two-Factor Authentication** section
3. Click **Setup 2FA**
4. Scan the QR code with Google Authenticator or any TOTP app
5. Enter the 6-digit code to verify and enable 2FA

### Disable 2FA

1. Enter your current OTP code in the disable field
2. Click **Disable 2FA**

## Client Configuration

### Create a 2FA-Protected Client

1. Go to **WireGuard Clients** page (`/users`)
2. Click **New Client**
3. Enter client name and email (optional)
4. Check **🔐 Require 2FA to activate**
5. Click **Create Client**

### Session Status Indicators

| Badge | Meaning |
|-------|---------|
| 🔐 Inactive | Client requires OTP activation |
| 🔐 Active (Xh) | Session active, X hours remaining |
| No 2FA | Client doesn't require 2FA |

## Activating a VPN Session

When you want to connect a 2FA-protected device:

1. Open the dashboard → `/users`
2. Find the client card with **🔐 Inactive** status
3. Click **🔓 Activate**
4. Enter your 6-digit OTP from authenticator app
5. Select session duration (4/8/12/24 hours)
6. Click **Activate**
7. Connect your VPN client within the session window

## Deactivating a Session

To immediately revoke access:

1. Find the active client card
2. Click **🔒 Deactivate**
3. VPN peer is removed from server

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/2fa/setup` | POST | Generate TOTP secret and QR code |
| `/api/2fa/verify` | POST | Verify OTP and enable 2FA |
| `/api/2fa/disable` | POST | Disable 2FA (requires OTP) |
| `/api/2fa/status` | GET | Get 2FA enabled status |
| `/api/clients/activate` | POST | Activate client session with OTP |
| `/api/clients/deactivate` | POST | Deactivate client session |

## Security Model

```
Device Lost/Stolen → No OTP → Cannot Connect
        ↓
User + Authenticator → OTP Verified → VPN Active (limited time)
        ↓
Session Expires → Auto Deactivate → Requires New OTP
```

## Technical Details

- TOTP uses 6-digit codes with 30-second period
- 1-step window allowed for clock drift tolerance
- Session expiry checked every 5 minutes by cron job
- Secrets stored in admin user JSON file
- Session state stored in client JSON files
