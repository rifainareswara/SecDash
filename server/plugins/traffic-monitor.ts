import { startTrafficMonitor } from '../utils/trafficMonitor'

export default defineNitroPlugin((nitroApp) => {
    console.log('[Nitro] Starting Traffic Monitor...')

    // Delay start slightly to ensure network is ready and DB is initialized
    setTimeout(() => {
        try {
            startTrafficMonitor()
        } catch (err) {
            console.error('[Nitro] Failed to start Traffic Monitor:', err)
        }
    }, 2000)
})
