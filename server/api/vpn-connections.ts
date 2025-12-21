import { getVpnConnectionLogs, clearVpnConnectionLogs, getVpnActiveClients } from '../utils/vpnConnectionLog'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    if (method === 'GET') {
        const type = query.type as string

        if (type === 'active') {
            // Get currently active VPN clients
            const activeClients = getVpnActiveClients()
            return {
                success: true,
                clients: activeClients,
                total: activeClients.length
            }
        }

        // Get connection logs
        const limit = parseInt(query.limit as string) || 100
        const logs = getVpnConnectionLogs(limit)

        return {
            success: true,
            logs,
            total: logs.length
        }
    }

    if (method === 'DELETE') {
        clearVpnConnectionLogs()
        return {
            success: true,
            message: 'VPN connection logs cleared'
        }
    }

    return {
        success: false,
        error: 'Method not allowed'
    }
})
