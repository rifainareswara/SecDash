import os from 'os'

export default defineEventHandler(async () => {
    try {
        // Get CPU load (1, 5, 15 minute averages)
        const loadAvg = os.loadavg()
        const cpuCount = os.cpus().length

        // Calculate CPU usage percentage (normalized by CPU count)
        const cpuUsage = {
            load1m: loadAvg[0],
            load5m: loadAvg[1],
            load15m: loadAvg[2],
            percentage: Math.min(100, (loadAvg[0] / cpuCount) * 100)
        }

        // Get memory info
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem
        const memoryUsage = {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            percentage: (usedMem / totalMem) * 100
        }

        // Get system uptime
        const uptimeSeconds = os.uptime()
        const days = Math.floor(uptimeSeconds / 86400)
        const hours = Math.floor((uptimeSeconds % 86400) / 3600)
        const minutes = Math.floor((uptimeSeconds % 3600) / 60)
        const seconds = Math.floor(uptimeSeconds % 60)

        let uptimeString = ''
        if (days > 0) uptimeString += `${days}d `
        if (hours > 0 || days > 0) uptimeString += `${hours}h `
        uptimeString += `${minutes}m ${seconds}s`

        // Get platform info
        const platform = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            cpuCount
        }

        return {
            success: true,
            timestamp: Date.now(),
            uptime: {
                seconds: uptimeSeconds,
                formatted: uptimeString.trim()
            },
            cpu: cpuUsage,
            memory: memoryUsage,
            platform
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        }
    }
})
