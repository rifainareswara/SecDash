#!/bin/bash
# SecDash VPN - Host Server Setup Script
# Run this script on the HOST server (not inside Docker) after deployment
# This configures iptables rules for proper VPN traffic forwarding

set -e

echo "🔧 SecDash VPN Host Setup"
echo "========================="

# Enable IP forwarding
echo "1. Enabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=1
if ! grep -q "net.ipv4.ip_forward = 1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
fi
echo "   ✅ IP forwarding enabled"

# Get Docker network bridge name
DOCKER_BRIDGE=$(docker network inspect $(docker inspect wireguard --format='{{range $net, $v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null) --format='{{.Options.com.docker.network.bridge.name}}' 2>/dev/null || echo "br-unknown")

if [ "$DOCKER_BRIDGE" = "br-unknown" ]; then
    # Fallback: find the bridge by listing docker networks
    DOCKER_BRIDGE=$(docker network ls --filter driver=bridge --format '{{.ID}}' | head -1 | xargs -I {} docker network inspect {} --format '{{.Options.com.docker.network.bridge.name}}' 2>/dev/null || echo "")
fi

echo "2. Detected Docker bridge: ${DOCKER_BRIDGE:-'default'}"

# Add iptables rules for Docker forwarding
echo "3. Adding iptables forwarding rules..."

# Accept forwarded traffic to/from Docker bridge
if [ -n "$DOCKER_BRIDGE" ] && [ "$DOCKER_BRIDGE" != "br-unknown" ]; then
    iptables -C FORWARD -i "$DOCKER_BRIDGE" -j ACCEPT 2>/dev/null || iptables -I FORWARD -i "$DOCKER_BRIDGE" -j ACCEPT
    iptables -C FORWARD -o "$DOCKER_BRIDGE" -j ACCEPT 2>/dev/null || iptables -I FORWARD -o "$DOCKER_BRIDGE" -j ACCEPT
    echo "   ✅ Added rules for bridge: $DOCKER_BRIDGE"
fi

# Accept traffic from Docker network (172.18.0.0/16 is common for custom networks)
iptables -C DOCKER-USER -s 172.18.0.0/16 -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER -s 172.18.0.0/16 -j ACCEPT
iptables -C DOCKER-USER -d 172.18.0.0/16 -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER -d 172.18.0.0/16 -j ACCEPT
echo "   ✅ Added DOCKER-USER rules"

# Verify
echo ""
echo "4. Current iptables FORWARD rules:"
iptables -L FORWARD -v -n | head -10

echo ""
echo "5. Current NAT POSTROUTING rules:"
iptables -t nat -L POSTROUTING -v -n | head -10

# Try to persist rules
echo ""
echo "6. Persisting iptables rules..."
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
    echo "   ✅ Rules saved with netfilter-persistent"
elif command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables.rules 2>/dev/null || true
    echo "   ℹ️ Rules saved to /etc/iptables.rules (may need manual restore on boot)"
else
    echo "   ⚠️ Could not persist rules. Install iptables-persistent:"
    echo "      apt-get install -y iptables-persistent"
fi

echo ""
echo "✅ Host setup complete!"
echo ""
echo "Next steps:"
echo "1. Set your public IP in .env: WG_HOST=YOUR_PUBLIC_IP"
echo "2. Restart containers: docker-compose down && docker-compose up -d"
echo "3. Create VPN clients in the dashboard"
