# Multi-Environment Setup

Panduan untuk menjalankan SecDash VPN di multiple environment (dev, uat, prod) tanpa bentrok port.

## Port Allocation

| Environment | Dashboard Port | WireGuard Port | VPN Subnet |
|-------------|----------------|----------------|------------|
| **DEV** | 3000 | 51820/UDP | 10.252.1.x |
| **UAT** | 3001 | 51821/UDP | 10.252.2.x |
| **PROD** | 3002 | 51822/UDP | 10.252.3.x |

## Quick Start

```bash
# Jalankan development
./run-env.sh dev

# Jalankan UAT
./run-env.sh uat

# Jalankan production
./run-env.sh prod

# Stop semua environment
./run-env.sh all stop
```

## File Structure

```
vpn/
├── environments/
│   ├── dev.env      # Development config
│   ├── uat.env      # UAT config
│   └── prod.env     # Production config
├── data/
│   ├── dev/         # Dev data (auto-created)
│   │   ├── config/
│   │   └── wg-db/
│   ├── uat/         # UAT data
│   └── prod/        # Prod data
├── docker-compose.multi-env.yml
└── run-env.sh
```

## Available Commands

```bash
./run-env.sh <env> [action]

# Environments: dev, uat, prod, all

# Actions:
#   up      - Start (default)
#   down    - Stop & remove
#   stop    - Stop only
#   restart - Restart
#   logs    - View logs
#   status  - Container status
#   build   - Build images
```

## Container Names

Setiap environment memiliki container name unik:
- DEV: `wireguard-dev`, `vpn-dashboard-dev`
- UAT: `wireguard-uat`, `vpn-dashboard-uat`
- PROD: `wireguard-prod`, `vpn-dashboard-prod`

## Important Notes

1. **PROD environment**: 
   - Edit `environments/prod.env` dan ganti `WG_HOST` dengan IP server
   - Ganti `ADMIN_PASSWORD` dengan password yang kuat
   
2. **Firewall**: Buka port yang sesuai:
   ```bash
   # Dev
   ufw allow 3000/tcp && ufw allow 51820/udp
   
   # UAT
   ufw allow 3001/tcp && ufw allow 51821/udp
   
   # Prod
   ufw allow 3002/tcp && ufw allow 51822/udp
   ```

3. **Data Persistence**: Data untuk setiap environment disimpan terpisah di folder `data/<env>/`
