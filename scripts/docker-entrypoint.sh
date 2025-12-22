#!/bin/sh
# Dashboard startup script
# Waits for WireGuard to be ready, then syncs keys and starts the app

set -e

echo "🚀 SecDash VPN Dashboard Starting..."

# Wait for WireGuard interface to be ready
MAX_WAIT=60
WAITED=0

echo "⏳ Waiting for WireGuard interface..."
while [ $WAITED -lt $MAX_WAIT ]; do
    if wg show wg0 >/dev/null 2>&1; then
        echo "✅ WireGuard interface is ready!"
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo "   Waiting... ($WAITED/$MAX_WAIT seconds)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "⚠️ WireGuard interface not found after ${MAX_WAIT}s, continuing anyway..."
fi

# Get the actual WireGuard public key and save to database
if wg show wg0 public-key >/dev/null 2>&1; then
    WG_PUBKEY=$(wg show wg0 public-key)
    echo "🔑 WireGuard Public Key: ${WG_PUBKEY}"
    
    # The Nuxt app will sync this on startup via wireguard-sync.ts plugin
fi

# Detect public IP if WG_HOST is 'auto'
if [ "$PUBLIC_HOST" = "auto" ] || [ -z "$PUBLIC_HOST" ]; then
    echo "🌐 Detecting public IP..."
    
    # Try api.ipify.org first (most reliable, always returns plain text IP)
    PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || wget -qO- --timeout=5 https://api.ipify.org 2>/dev/null || echo "")
    
    # Validate IP format - should be like xxx.xxx.xxx.xxx
    if ! echo "$PUBLIC_IP" | grep -qE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
        echo "⚠️ api.ipify.org returned invalid response, trying icanhazip.com..."
        PUBLIC_IP=$(curl -s --max-time 5 https://icanhazip.com 2>/dev/null || wget -qO- --timeout=5 https://icanhazip.com 2>/dev/null || echo "")
        # Clean any trailing newlines
        PUBLIC_IP=$(echo "$PUBLIC_IP" | tr -d '\n\r ')
    fi
    
    # Final validation - must look like a valid IP (not HTML)
    if echo "$PUBLIC_IP" | grep -qE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
        echo "🌐 Detected public IP: $PUBLIC_IP"
        export PUBLIC_HOST="$PUBLIC_IP"
    else
        echo "⚠️ Could not detect valid public IP. Set WG_HOST in .env file."
        # Don't export invalid data
        PUBLIC_IP=""
    fi
fi

# Ensure database directory exists with proper permissions
mkdir -p /app/wg-db/clients /app/wg-db/server /app/wg-db/users

# Add route for VPN subnet (in case it's missing)
ip route add 10.252.1.0/24 dev wg0 2>/dev/null || true

# Ensure iptables rules are set
iptables -C FORWARD -i wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -j ACCEPT
iptables -C FORWARD -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wg0 -j ACCEPT
iptables -t nat -C POSTROUTING -o eth+ -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE

echo "🚀 Starting Nuxt application..."
exec node .output/server/index.mjs
