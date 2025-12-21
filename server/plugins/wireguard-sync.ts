import { getClients, getServerConfig } from '../utils/database'
import { execSync } from 'child_process'

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('request', () => {
        // No-op for requests
    })

    // Run sync on startup
    console.log('🔄 WireGuard Sync: Starting...')
    syncWireGuardPeers()
})

function syncWireGuardPeers() {
    try {
        const clients = getClients()
        const serverConfig = getServerConfig()

        if (!serverConfig) {
            console.warn('⚠️ WireGuard Sync: Server config not found, skipping.')
            return
        }

        console.log(`🔄 WireGuard Sync: Found ${clients.length} clients in database.`)

        // 1. Ensure Interface is up (basic check)
        try {
            execSync('wg show wg0', { stdio: 'ignore' })
        } catch {
            console.log('⚠️ WireGuard interface wg0 not found. Attempting to initialize...')
            // In a managed container, we assume wg0 is handled by supervisor, 
            // but we can try basic setup if needed or just log warning.
            // For now, if wg0 is down, we probably can't do much without full wg-quick context
            return
        }

        // 2. Add each peer to interface
        let synced = 0
        for (const client of clients) {
            if (client.enabled && client.public_key) {
                try {
                    // Command to add peer. If peer exists, it updates it.
                    // wg set wg0 peer <KEY> allowed-ips <IPS>
                    execSync(`wg set wg0 peer "${client.public_key}" allowed-ips "${client.allocated_ips.join(',')}"`, { stdio: 'ignore' })
                    synced++
                } catch (e) {
                    console.error(`❌ Failed to sync peer ${client.name} (${client.id}):`, e)
                }
            }
        }

        console.log(`✅ WireGuard Sync: Synced ${synced}/${clients.length} peers to wg0 interface.`)

    } catch (err) {
        console.error('❌ WireGuard Sync Fatal Error:', err)
    }
}
