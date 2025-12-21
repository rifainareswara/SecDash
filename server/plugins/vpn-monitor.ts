import { pollVpnActivity, getVpnActiveClients, clearVpnConnectionLogs } from '../utils/vpnConnectionLog'
import { getServerConfig } from '../utils/database'

export default defineNitroPlugin((nitroApp) => {
    let pollingInterval: NodeJS.Timeout

    // Start polling VPN activity on server start
    const startPolling = () => {
        // Run immediately
        pollAndLog()

        // Poll every 5 seconds
        pollingInterval = setInterval(pollAndLog, 5000)
    }

    const pollAndLog = async () => {
        try {
            // Get client names storage to map public keys to names
            const serverConfig = getServerConfig()
            const clientsMap = new Map<string, string>()

            // Note: In a real implementation we would fetch clients from database
            // but for now we'll just log raw public keys or 'Unknown' if not found
            // This can be improved by importing getClients function if available

            // Poll activity
            pollVpnActivity(clientsMap)
        } catch (err) {
            console.error('VPN Polling Error:', err)
        }
    }

    // Start on boot
    startPolling()
    console.log('🔌 VPN Connection Monitor started')

    // Cleanup on close
    nitroApp.hooks.hook('close', async () => {
        if (pollingInterval) clearInterval(pollingInterval)
        console.log('🔌 VPN Connection Monitor stopped')
    })
})
