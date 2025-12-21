import { getClients, getServerConfig, updateServerConfig, getGlobalSettings, updateGlobalSettings } from '../utils/database'
import { execSync } from 'child_process'

export default defineNitroPlugin(async (nitroApp) => {
    nitroApp.hooks.hook('request', () => {
        // No-op for requests
    })

    // Run sync on startup
    console.log('🔄 WireGuard Sync: Starting...')

    // First, sync server keys with actual WireGuard container
    await syncServerKeysWithWireGuard()

    // Then sync peers
    await syncWireGuardPeers()
})

/**
 * Sync database server keys with actual WireGuard container keys
 * This ensures the dashboard always uses the correct public key
 */
async function syncServerKeysWithWireGuard() {
    try {
        // Try to get the actual public key from the WireGuard interface
        let actualPublicKey = ''
        let actualPrivateKey = ''

        try {
            // Get public key from running wg interface
            actualPublicKey = execSync('wg show wg0 public-key', { encoding: 'utf-8' }).trim()
            console.log(`🔑 Detected WireGuard public key: ${actualPublicKey.substring(0, 10)}...`)
        } catch {
            // wg0 not up yet, try reading from config file
            try {
                const configContent = execSync('cat /config/wg_confs/wg0.conf 2>/dev/null || cat /config/wg0.conf 2>/dev/null', { encoding: 'utf-8', shell: '/bin/sh' })
                const privateKeyMatch = configContent.match(/PrivateKey\s*=\s*(.+)/)
                if (privateKeyMatch) {
                    actualPrivateKey = privateKeyMatch[1].trim()
                    // Derive public key from private key
                    actualPublicKey = execSync(`echo "${actualPrivateKey}" | wg pubkey`, { encoding: 'utf-8', shell: '/bin/sh' }).trim()
                    console.log(`🔑 Derived public key from config: ${actualPublicKey.substring(0, 10)}...`)
                }
            } catch (e) {
                console.log('⚠️ Could not read WireGuard config file')
            }
        }

        if (actualPublicKey) {
            const currentConfig = getServerConfig()
            if (currentConfig && currentConfig.public_key !== actualPublicKey) {
                console.log('🔄 Updating database with correct WireGuard public key...')
                updateServerConfig({
                    public_key: actualPublicKey,
                    private_key: actualPrivateKey || currentConfig.private_key
                })
                console.log('✅ Server public key synchronized!')
            }
        }

        // Also sync endpoint address with actual public IP
        await syncEndpointAddress()

    } catch (err) {
        console.error('❌ Error syncing server keys:', err)
    }
}

/**
 * Auto-detect and sync the public IP address for endpoint
 */
async function syncEndpointAddress() {
    try {
        const globalSettings = getGlobalSettings()
        if (!globalSettings) return

        // Check if endpoint looks like a private IP or placeholder
        const currentEndpoint = globalSettings.endpoint_address || ''
        const isPrivateOrInvalid = !currentEndpoint ||
            currentEndpoint === 'auto' ||
            currentEndpoint === '127.0.0.1' ||
            currentEndpoint.startsWith('192.168.') ||
            currentEndpoint.startsWith('10.') ||
            currentEndpoint.startsWith('172.16.') ||
            currentEndpoint.startsWith('172.17.') ||
            currentEndpoint.startsWith('172.18.')

        if (isPrivateOrInvalid) {
            console.log('🌐 Current endpoint appears invalid, detecting public IP...')

            // Try to detect public IP using environment variable first
            let publicIP = process.env.PUBLIC_HOST || process.env.WG_HOST || process.env.SERVERURL || ''

            if (!publicIP || publicIP === 'auto') {
                // Try to get from external service
                try {
                    publicIP = execSync('wget -qO- ifconfig.me 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo ""', {
                        encoding: 'utf-8',
                        shell: '/bin/sh',
                        timeout: 5000
                    }).trim()
                } catch {
                    // Fallback: try to read from WireGuard container's detected IP
                    try {
                        publicIP = execSync('cat /config/server/external_ip 2>/dev/null || echo ""', { encoding: 'utf-8', shell: '/bin/sh' }).trim()
                    } catch {
                        // ignore
                    }
                }
            }

            if (publicIP && publicIP !== currentEndpoint && !publicIP.startsWith('192.168.') && !publicIP.startsWith('10.')) {
                console.log(`🌐 Detected public IP: ${publicIP}`)
                updateGlobalSettings({
                    endpoint_address: publicIP
                })
                console.log('✅ Endpoint address updated!')
            } else if (!publicIP) {
                console.warn('⚠️ Could not detect public IP. Please set WG_HOST environment variable or configure manually in dashboard.')
            }
        }
    } catch (err) {
        console.error('❌ Error syncing endpoint address:', err)
    }
}

async function syncWireGuardPeers() {
    try {
        const clients = getClients()
        const serverConfig = getServerConfig()

        if (!serverConfig) {
            console.warn('⚠️ WireGuard Sync: Server config not found, skipping.')
            return
        }

        console.log(`🔄 WireGuard Sync: Found ${clients.length} clients in database.`)

        // 1. Check if WireGuard interface is available (for runtime sync)
        let interfaceAvailable = false
        try {
            execSync('wg show wg0', { stdio: 'ignore' })
            interfaceAvailable = true
            console.log('✅ WireGuard interface wg0 is available.')
        } catch {
            console.log('⚠️ WireGuard interface wg0 not found. Will write config file for container restart.')
        }

        // 2. Build peer config and optionally sync to runtime interface
        const peersConfig: string[] = []
        let synced = 0

        for (const client of clients) {
            if (client.enabled && client.public_key) {
                // Build config entry regardless of interface availability
                const presharedKeyLine = client.preshared_key ? `PresharedKey = ${client.preshared_key}\n` : ''
                peersConfig.push(`
[Peer]
# Client: ${client.name} (${client.id})
PublicKey = ${client.public_key}
${presharedKeyLine}AllowedIPs = ${client.allocated_ips.join(',')}
`)

                // Runtime sync only if interface is available
                if (interfaceAvailable) {
                    try {
                        // Command to add peer. If peer exists, it updates it.
                        execSync(`wg set wg0 peer "${client.public_key}" allowed-ips "${client.allocated_ips.join(',')}"`, { stdio: 'ignore' })
                        synced++
                    } catch (e) {
                        console.error(`❌ Failed to sync peer ${client.name} (${client.id}):`, e)
                    }
                }
            }
        }

        if (interfaceAvailable) {
            console.log(`✅ WireGuard Sync: Synced ${synced}/${clients.length} peers to wg0 interface.`)
        }

        // 3. Write wg0.conf to disk (For container persistence and PostUp rules)
        try {
            const fs = await import('fs')
            const path = await import('path')

            // Default PostUp/Down with route setup
            const defaultPostUp = 'iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE; ip route add 10.252.1.0/24 dev wg0 2>/dev/null || true'
            const defaultPostDown = 'iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth+ -j MASQUERADE'

            const postUp = serverConfig.post_up || defaultPostUp
            const postDown = serverConfig.post_down || defaultPostDown

            // Get proper server address
            const serverAddress = getServerAddress(serverConfig.addresses)

            const wgConfigContent = `# Auto-generated by SecDash
[Interface]
Address = ${serverAddress}
ListenPort = ${serverConfig.listen_port || '51820'}
PrivateKey = ${serverConfig.private_key}
PostUp = ${postUp}
PostDown = ${postDown}

${peersConfig.join('\n')}
`
            // Write to the correct path for linuxserver/wireguard container
            const configPath = '/config/wg0.conf'
            await fs.promises.mkdir(path.dirname(configPath), { recursive: true })
            await fs.promises.writeFile(configPath, wgConfigContent)
            console.log(`✅ Config Saved: Wrote full configuration to ${configPath}`)

        } catch (e) {
            console.error('❌ Failed to write wg0.conf:', e)
        }

        // 4. Ensure NAT/Masquerade Rules and Routes (Runtime safety)
        if (interfaceAvailable) {
            try {
                // Add route for VPN subnet
                execSync('ip route add 10.252.1.0/24 dev wg0 2>/dev/null || true', { stdio: 'ignore', shell: '/bin/sh' })

                // Allow Forwarding from wg0
                execSync('iptables -C FORWARD -i wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -j ACCEPT', { stdio: 'ignore', shell: '/bin/sh' })
                execSync('iptables -C FORWARD -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wg0 -j ACCEPT', { stdio: 'ignore', shell: '/bin/sh' })

                // Masquerade (NAT) on eth interface
                execSync('iptables -t nat -C POSTROUTING -o eth+ -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE', { stdio: 'ignore', shell: '/bin/sh' })
                execSync('iptables -t nat -C POSTROUTING -s 10.252.1.0/24 -o eth0 -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s 10.252.1.0/24 -o eth0 -j MASQUERADE', { stdio: 'ignore', shell: '/bin/sh' })

                console.log('✅ Network routes and NAT rules configured.')
            } catch (e) {
                // ignore
            }
        }

    } catch (err) {
        console.error('❌ WireGuard Sync Fatal Error:', err)
    }
}

/**
 * Convert address format to proper server address
 * e.g., "10.252.1.0/24" -> "10.252.1.1"
 *       "10.252.1.0"    -> "10.252.1.1"
 */
function getServerAddress(addresses: string[]): string {
    if (!addresses || addresses.length === 0) {
        return '10.252.1.1'
    }

    const addr = addresses[0]

    // Remove CIDR notation if present
    const ipOnly = addr.replace(/\/\d+$/, '')

    // Split into octets
    const parts = ipOnly.split('.')

    if (parts.length !== 4) {
        return '10.252.1.1'
    }

    // If last octet is 0 (network address), change to 1 (server address)
    if (parts[3] === '0') {
        parts[3] = '1'
    }

    return parts.join('.')
}

