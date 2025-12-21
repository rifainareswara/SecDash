import { getServerConfig, getGlobalSettings, updateServerConfig, updateGlobalSettings } from '../../utils/database'
import { networkInterfaces } from 'os'
import { execSync } from 'child_process'
import { createHash, randomBytes } from 'crypto'

// Detect external IP from network interfaces
function getExternalIP(): string {
    const nets = networkInterfaces()
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address
            }
        }
    }
    return ''
}

// Check if array has valid values (non-empty strings)
function hasValidArrayValues(arr: string[] | undefined | null): boolean {
    if (!arr || arr.length === 0) return false
    return arr.some(item => item && item.trim() !== '')
}

// Check if string has valid value
function hasValue(str: string | undefined | null): boolean {
    return !!str && str.trim() !== ''
}

// Generate WireGuard key pair (simplified - in production use wg genkey/pubkey)
function generateKeyPair(): { privateKey: string; publicKey: string } {
    try {
        // Try to use wg command if available
        const privateKey = execSync('wg genkey', { encoding: 'utf-8' }).trim()
        const publicKey = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf-8', shell: '/bin/sh' }).trim()
        return { privateKey, publicKey }
    } catch {
        // Fallback to random keys (not real WireGuard keys but placeholder)
        const privateKey = randomBytes(32).toString('base64')
        const publicKey = createHash('sha256').update(privateKey).digest('base64')
        return { privateKey, publicKey }
    }
}

export default defineEventHandler(async () => {
    try {
        let serverConfig = getServerConfig()
        let globalSettings = getGlobalSettings()
        const detectedIP = getExternalIP()

        // Default values
        const defaults = {
            addresses: ['10.252.1.0/24'],
            listenPort: 51820,
            post_up: 'iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE',
            pre_down: '',
            post_down: 'iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE',
            dns_servers: ['1.1.1.1'],
            mtu: '1450',
            persistent_keepalive: '15',
            firewall_mark: '0xca6c',
            table: 'auto',
            config_file_path: '/etc/wireguard/wg0.conf'
        }

        // Prepare server values with proper defaults
        const addresses = hasValidArrayValues(serverConfig?.addresses) ? serverConfig!.addresses : defaults.addresses
        let privateKey = hasValue(serverConfig?.private_key) ? serverConfig!.private_key : ''
        let publicKey = hasValue(serverConfig?.public_key) ? serverConfig!.public_key : ''

        // Generate keys if both are empty
        if (!privateKey && !publicKey) {
            const keys = generateKeyPair()
            privateKey = keys.privateKey
            publicKey = keys.publicKey
            // Save generated keys to database
            updateServerConfig({ private_key: privateKey, public_key: publicKey, addresses: defaults.addresses })
        }

        // Prepare global values with proper defaults
        const envHost = process.env.PUBLIC_HOST || process.env.SERVERURL || process.env.WG_HOST
        const effectiveEndpoint = (envHost && envHost !== 'auto') ? envHost : detectedIP
        const endpointAddress = hasValue(globalSettings?.endpoint_address) ? globalSettings!.endpoint_address : effectiveEndpoint
        const dnsServers = hasValidArrayValues(globalSettings?.dns_servers) ? globalSettings!.dns_servers : defaults.dns_servers

        // Auto-save defaults if first time
        if (!globalSettings || !hasValue(globalSettings?.endpoint_address)) {
            updateGlobalSettings({
                endpoint_address: effectiveEndpoint,
                dns_servers: defaults.dns_servers,
                mtu: defaults.mtu,
                persistent_keepalive: defaults.persistent_keepalive,
                firewall_mark: defaults.firewall_mark,
                table: defaults.table,
                config_file_path: defaults.config_file_path
            })
        }

        return {
            success: true,
            suggestedEndpoint: detectedIP,
            server: {
                addresses,
                listenPort: parseInt(serverConfig?.listen_port || String(defaults.listenPort)),
                publicKey,
                privateKey,
                post_up: hasValue(serverConfig?.post_up) ? serverConfig!.post_up : defaults.post_up,
                pre_down: serverConfig?.pre_down || defaults.pre_down,
                post_down: hasValue(serverConfig?.post_down) ? serverConfig!.post_down : defaults.post_down
            },
            global: {
                endpoint_address: endpointAddress,
                dns_servers: dnsServers,
                mtu: globalSettings?.mtu || defaults.mtu,
                persistent_keepalive: globalSettings?.persistent_keepalive || defaults.persistent_keepalive,
                firewall_mark: globalSettings?.firewall_mark || defaults.firewall_mark,
                table: globalSettings?.table || defaults.table,
                config_file_path: globalSettings?.config_file_path || defaults.config_file_path
            }
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        }
    }
})
