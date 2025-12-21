import { getClients, getServerConfig, getGlobalSettings, checkDatabaseExists, initDatabase, type WGClient } from '../utils/database'

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

        // Since we don't have wg command access from Nuxt, show database-only info
        const now = Math.floor(Date.now() / 1000)

        // Map clients with status (offline by default since no live status)
        const clientsWithStatus = clients.map((client: WGClient) => ({
            id: client.id,
            name: client.name,
            publicKey: client.public_key?.substring(0, 4) || '',
            virtualIp: Array.isArray(client.allocated_ips) ? client.allocated_ips.join(', ') : client.allocated_ips,
            enabled: client.enabled,
            status: client.enabled ? 'recent' : 'offline',
            endpoint: null,
            lastHandshake: null,
            transferRx: 0,
            transferTx: 0
        }))

        return {
            success: true,
            server: {
                address: serverConfig?.addresses?.[0] || globalSettings?.endpoint_address || 'Not configured',
                addresses: serverConfig?.addresses || [],
                listenPort: serverConfig?.listen_port ? parseInt(serverConfig.listen_port) : 51820,
                private_key: serverConfig?.private_key,
                public_key: serverConfig?.public_key,
                post_up: serverConfig?.post_up,
                pre_down: serverConfig?.pre_down,
                post_down: serverConfig?.post_down,
                uptime: 'Running',
                global: globalSettings
            },
            stats: {
                totalClients: clients.length,
                enabledClients: clients.filter((c: WGClient) => c.enabled).length,
                activeTunnels: clients.filter((c: WGClient) => c.enabled).length,
                totalTransferRx: 0,
                totalTransferTx: 0
            },
            clients: clientsWithStatus
        }
    } catch (error: any) {
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
