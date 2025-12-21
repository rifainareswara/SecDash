#!/bin/bash
# SecDash VPN - Complete Deployment Script
# Run this script to deploy on a new server
# Usage: ./deploy.sh [PUBLIC_IP]

set -e

echo "================================================"
echo "   SecDash VPN - Deployment Script"
echo "================================================"
echo ""

# Get public IP
if [ -n "$1" ]; then
    PUBLIC_IP="$1"
    echo "📍 Using provided IP: $PUBLIC_IP"
else
    echo "🌐 Detecting public IP..."
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || wget -qO- ifconfig.me 2>/dev/null || echo "")
    if [ -z "$PUBLIC_IP" ]; then
        echo "❌ Could not detect public IP. Please provide it as argument:"
        echo "   ./deploy.sh YOUR_PUBLIC_IP"
        exit 1
    fi
    echo "📍 Detected IP: $PUBLIC_IP"
fi

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

# Update WG_HOST in .env
echo "📝 Updating .env with public IP..."
if grep -q "^WG_HOST=" .env; then
    sed -i "s/^WG_HOST=.*/WG_HOST=$PUBLIC_IP/" .env
else
    echo "WG_HOST=$PUBLIC_IP" >> .env
fi

echo ""
echo "🔧 Step 1: Setting up host system..."

# Enable IP forwarding
echo "   Enabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=1 >/dev/null
if ! grep -q "net.ipv4.ip_forward = 1" /etc/sysctl.conf 2>/dev/null; then
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
fi

echo ""
echo "🐳 Step 2: Building and starting containers..."

# Stop existing containers
docker-compose down 2>/dev/null || true

# Build and start
docker-compose up -d --build

echo ""
echo "⏳ Step 3: Waiting for services to be ready..."
sleep 15

# Get Docker network bridge name
echo ""
echo "🔧 Step 4: Setting up host firewall rules..."

BRIDGE_NAME=$(docker network ls --filter driver=bridge --format '{{.ID}}' | while read id; do
    name=$(docker network inspect "$id" --format '{{.Options}}' 2>/dev/null | grep -o 'br-[a-f0-9]*' || echo "")
    if [ -n "$name" ]; then
        echo "$name"
        break
    fi
done)

# Fallback to find the bridge
if [ -z "$BRIDGE_NAME" ]; then
    BRIDGE_NAME=$(ip link show | grep -o 'br-[a-f0-9]*' | head -1)
fi

echo "   Docker bridge: ${BRIDGE_NAME:-'not found'}"

# Add iptables rules
if [ -n "$BRIDGE_NAME" ]; then
    iptables -C FORWARD -i "$BRIDGE_NAME" -j ACCEPT 2>/dev/null || iptables -I FORWARD -i "$BRIDGE_NAME" -j ACCEPT
    iptables -C FORWARD -o "$BRIDGE_NAME" -j ACCEPT 2>/dev/null || iptables -I FORWARD -o "$BRIDGE_NAME" -j ACCEPT
fi

# Docker user rules
iptables -C DOCKER-USER -s 172.18.0.0/16 -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER -s 172.18.0.0/16 -j ACCEPT
iptables -C DOCKER-USER -d 172.18.0.0/16 -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER -d 172.18.0.0/16 -j ACCEPT

echo "   ✅ Firewall rules configured"

# Try to persist rules
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save 2>/dev/null || true
    echo "   ✅ Rules persisted"
fi

echo ""
echo "✅ Step 5: Verifying deployment..."

# Check containers
echo "   Checking containers..."
docker-compose ps

# Check WireGuard
echo ""
echo "   Checking WireGuard..."
docker exec wireguard wg show 2>/dev/null || echo "   ⚠️ WireGuard not ready yet"

echo ""
echo "================================================"
echo "   ✅ Deployment Complete!"
echo "================================================"
echo ""
echo "🌐 Dashboard URL: http://${PUBLIC_IP}:3000"
echo "🔑 Default login: admin / password"
echo ""
echo "📱 To add a VPN client:"
echo "   1. Open the dashboard"
echo "   2. Go to Dashboard > Add Client"
echo "   3. Scan QR code with WireGuard mobile app"
echo ""
echo "⚠️  Remember to change the default password!"
echo ""
