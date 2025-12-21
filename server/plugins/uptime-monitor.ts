import { getMonitors, addUptimeLog, type UptimeMonitor } from '../utils/database'

// Store last check times
const lastChecks = new Map<string, number>()

export default defineNitroPlugin((nitroApp) => {
    console.log('🔍 Uptime Monitor: Starting...')

    // Run checks every 10 seconds (individual monitors have their own intervals)
    const checkInterval = setInterval(runChecks, 10000)

    // Initial check after 5 seconds
    setTimeout(runChecks, 5000)

    // Cleanup on shutdown
    nitroApp.hooks.hook('close', () => {
        clearInterval(checkInterval)
    })
})

async function runChecks() {
    try {
        const monitors = getMonitors().filter(m => m.enabled)
        const now = Date.now()

        for (const monitor of monitors) {
            const lastCheck = lastChecks.get(monitor.id) || 0
            const intervalMs = (monitor.interval || 60) * 1000

            // Check if it's time for this monitor
            if (now - lastCheck >= intervalMs) {
                lastChecks.set(monitor.id, now)

                // Run check in background (don't await to not block other checks)
                performCheck(monitor).catch(err => {
                    console.error(`❌ Check failed for ${monitor.name}:`, err)
                })
            }
        }
    } catch (error) {
        console.error('❌ Uptime Monitor Error:', error)
    }
}

async function performCheck(monitor: UptimeMonitor): Promise<void> {
    const startTime = Date.now()

    try {
        let status: 'up' | 'down' = 'down'
        let statusCode: number | undefined
        let error: string | undefined

        switch (monitor.type) {
            case 'http':
                const result = await checkHttp(monitor)
                status = result.status
                statusCode = result.statusCode
                error = result.error
                break

            case 'ping':
                const pingResult = await checkPing(monitor)
                status = pingResult.status
                error = pingResult.error
                break

            case 'port':
                const portResult = await checkPort(monitor)
                status = portResult.status
                error = portResult.error
                break
        }

        const responseTime = Date.now() - startTime

        addUptimeLog(monitor.id, {
            status,
            response_time: responseTime,
            status_code: statusCode,
            error
        })

        // Log status changes
        const statusIcon = status === 'up' ? '✅' : '❌'
        console.log(`${statusIcon} [${monitor.name}] ${status.toUpperCase()} - ${responseTime}ms`)

    } catch (err: any) {
        const responseTime = Date.now() - startTime

        addUptimeLog(monitor.id, {
            status: 'down',
            response_time: responseTime,
            error: err.message || 'Unknown error'
        })

        console.log(`❌ [${monitor.name}] DOWN - ${err.message}`)
    }
}

async function checkHttp(monitor: UptimeMonitor): Promise<{ status: 'up' | 'down'; statusCode?: number; error?: string }> {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), (monitor.timeout || 10) * 1000)

        const response = await fetch(monitor.url, {
            method: monitor.method || 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'SecDash-UptimeMonitor/1.0'
            }
        })

        clearTimeout(timeout)

        // Consider 2xx and 3xx as success
        const isUp = response.status >= 200 && response.status < 400

        return {
            status: isUp ? 'up' : 'down',
            statusCode: response.status,
            error: isUp ? undefined : `HTTP ${response.status}`
        }
    } catch (err: any) {
        if (err.name === 'AbortError') {
            return { status: 'down', error: 'Timeout' }
        }
        return { status: 'down', error: err.message }
    }
}

async function checkPing(monitor: UptimeMonitor): Promise<{ status: 'up' | 'down'; error?: string }> {
    const { execSync } = await import('child_process')

    try {
        // Extract hostname from URL
        let host = monitor.url
        try {
            const url = new URL(monitor.url)
            host = url.hostname
        } catch {
            // Use as-is if not a valid URL
        }

        // Run ping command
        execSync(`ping -c 1 -W ${monitor.timeout || 5} ${host}`, {
            encoding: 'utf-8',
            timeout: (monitor.timeout || 10) * 1000
        })

        return { status: 'up' }
    } catch (err: any) {
        return { status: 'down', error: 'Ping failed' }
    }
}

async function checkPort(monitor: UptimeMonitor): Promise<{ status: 'up' | 'down'; error?: string }> {
    const net = await import('net')

    return new Promise((resolve) => {
        // Extract host and port
        let host = monitor.url
        let port = monitor.port || 80

        try {
            const url = new URL(monitor.url)
            host = url.hostname
            port = monitor.port || parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80)
        } catch {
            // Use as-is
        }

        const socket = new net.Socket()
        const timeout = (monitor.timeout || 10) * 1000

        socket.setTimeout(timeout)

        socket.on('connect', () => {
            socket.destroy()
            resolve({ status: 'up' })
        })

        socket.on('timeout', () => {
            socket.destroy()
            resolve({ status: 'down', error: 'Connection timeout' })
        })

        socket.on('error', (err: any) => {
            socket.destroy()
            resolve({ status: 'down', error: err.message })
        })

        socket.connect(port, host)
    })
}
