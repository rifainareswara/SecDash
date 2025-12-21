import { getClients, getServerConfig, getGlobalSettings, checkDatabaseExists, initDatabase, type WGClient } from '../utils/database'
import { getVpnActiveClients } from '../utils/vpnConnectionLog'

interface PeerStatus {
    publicKey: string
    endpoint: string
    allowedIps: string
    latestHandshake: number
    transferRx: number
    transferTx: number
}

export default defineEventHandler(async () => {
    try {
        // Initialize database if needed
        if (!checkDatabaseExists()) {
            initDatabase()
        }

        const clients = getClients()
        const serverConfig = getServerConfig()
        const globalSettings = getGlobalSettings()

        // Get real-time status from WireGuard interface
        const activeClients = getVpnActiveClients()

        // Create a map of public key -> active status
        const activeMap = new Map<string, typeof activeClients[0]>()
        for (const active of activeClients) {
            activeMap.set(active.publicKey, active)
        }

        // Map clients with live status from WireGuard
        const clientsWithStatus = clients.map((client: WGClient) => {
            const liveData = activeMap.get(client.public_key || '')

            // Determine status based on live data
            let status: 'active' | 'recent' | 'stale' | 'offline' = 'offline'
            let lastHandshakeFormatted = 'Never'

            if (liveData && liveData.lastActivity && liveData.lastActivity !== 'Never') {
                const handshakeTime = new Date(liveData.lastActivity)
                const now = new Date()
                const diffSeconds = Math.floor((now.getTime() - handshakeTime.getTime()) / 1000)

                if (diffSeconds < 180) { // Less than 3 minutes
                    status = 'active'
                    lastHandshakeFormatted = `${diffSeconds}s ago`
                } else if (diffSeconds < 300) { // Less than 5 minutes
                    status = 'recent'
                    lastHandshakeFormatted = `${Math.floor(diffSeconds / 60)}m ago`
                } else if (diffSeconds < 3600) { // Less than 1 hour
                    status = 'stale'
                    lastHandshakeFormatted = `${Math.floor(diffSeconds / 60)}m ago`
                } else {
                    status = 'offline'
                    lastHandshakeFormatted = `${Math.floor(diffSeconds / 3600)}h ago`
                }
            } else if (!client.enabled) {
                status = 'offline'
            }

            // Parse endpoint for source IP display
            let sourceIp = 'N/A'
            let sourcePort = 'N/A'
            if (liveData?.endpoint) {
                const parts = liveData.endpoint.split(':')
                if (parts.length >= 2) {
                    sourceIp = parts.slice(0, -1).join(':') // Handle IPv6
                    sourcePort = parts[parts.length - 1]
                }
            }

            return {
                id: client.id,
                name: client.name,
                email: client.email,
                publicKey: client.public_key?.substring(0, 4) || '',
                fullPublicKey: client.public_key,
                virtualIp: Array.isArray(client.allocated_ips) ? client.allocated_ips.join(', ') : client.allocated_ips,
                enabled: client.enabled,
                status,
                handshakeStatus: status,
                lastHandshake: lastHandshakeFormatted,
                endpoint: liveData?.endpoint || null,
                sourceIp,
                sourcePort,
                sourceIcon: 'wifi',
                transferRx: liveData?.transferRx || 0,
                transferTx: liveData?.transferTx || 0,
                downloadData: formatBytes(liveData?.transferRx || 0),
                uploadData: formatBytes(liveData?.transferTx || 0),
                avatarInitials: (client.name || 'U').substring(0, 2).toUpperCase(),
                avatarGradient: getGradientForClient(client.id)
            }
        })

        // Calculate totals from live data
        const totalRx = clientsWithStatus.reduce((sum, c) => sum + (c.transferRx || 0), 0)
        const totalTx = clientsWithStatus.reduce((sum, c) => sum + (c.transferTx || 0), 0)
        const activeTunnels = clientsWithStatus.filter(c => c.status === 'active' || c.status === 'recent').length

        return {
            success: true,
            server: {
                address: serverConfig?.addresses?.[0] || globalSettings?.endpoint_address || 'Not configured',
                addresses: serverConfig?.addresses || [],
                listenPort: serverConfig?.listen_port ? parseInt(serverConfig.listen_port) : 51820,
                publicKey: serverConfig?.public_key,
                private_key: serverConfig?.private_key,
                post_up: serverConfig?.post_up,
                pre_down: serverConfig?.pre_down,
                post_down: serverConfig?.post_down,
                uptime: 'Running',
                global: globalSettings
            },
            stats: {
                totalClients: clients.length,
                enabledClients: clients.filter((c: WGClient) => c.enabled).length,
                activeTunnels,
                totalTransferRx: totalRx,
                totalTransferTx: totalTx
            },
            clients: clientsWithStatus
        }
    } catch (error: any) {
        console.error('Status API Error:', error)
        return {
            success: false,
            error: error.message,
            server: null,
            stats: {
                totalClients: 0,
                enabledClients: 0,
                activeTunnels: 0,
                totalTransferRx: 0,
                totalTransferTx: 0
            },
            clients: []
        }
    }
})

// Helper to format bytes
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper to generate consistent gradient for client
function getGradientForClient(id: string): string {
    const gradients = [
        'from-blue-500 to-purple-500',
        'from-green-500 to-teal-500',
        'from-orange-500 to-red-500',
        'from-pink-500 to-rose-500',
        'from-indigo-500 to-blue-500',
        'from-yellow-500 to-orange-500',
        'from-cyan-500 to-blue-500',
        'from-violet-500 to-purple-500'
    ]

    // Use hash of id to pick consistent gradient
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i)
        hash = hash & hash
    }

    return gradients[Math.abs(hash) % gradients.length]
}
