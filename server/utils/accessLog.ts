import { join } from 'path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { createHash } from 'crypto'

const DB_PATH = process.env.WIREGUARD_DB_PATH || join(process.cwd(), 'wg-db')
const ACCESS_LOGS_DIR = join(DB_PATH, 'access_logs')
const MAX_DAYS_TO_KEEP = 30

export interface AccessLog {
    id: string
    timestamp: string
    ip: string
    method: string
    path: string
    userAgent: string
    browser: string
    os: string
    device: string
    deviceFingerprint: string
    username?: string
    sessionId?: string
    acceptLanguage?: string
    referer?: string
    statusCode?: number
}

function readJsonFile<T>(filePath: string): T | null {
    try {
        if (!existsSync(filePath)) {
            return null
        }
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content) as T
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error)
        return null
    }
}

function writeJsonFile<T>(filePath: string, data: T): boolean {
    try {
        const dir = filePath.substring(0, filePath.lastIndexOf('/'))
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
        }
        writeFileSync(filePath, JSON.stringify(data, null, 2))
        return true
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error)
        return false
    }
}

function ensureAccessLogsDir() {
    if (!existsSync(ACCESS_LOGS_DIR)) {
        mkdirSync(ACCESS_LOGS_DIR, { recursive: true })
    }
}

function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown'
    let os = 'Unknown'
    let device = 'Desktop'

    // Parse browser
    if (ua.includes('Firefox')) {
        browser = 'Firefox'
    } else if (ua.includes('Edg/')) {
        browser = 'Edge'
    } else if (ua.includes('Chrome')) {
        browser = 'Chrome'
    } else if (ua.includes('Safari')) {
        browser = 'Safari'
    } else if (ua.includes('Opera') || ua.includes('OPR')) {
        browser = 'Opera'
    }

    // Parse OS
    if (ua.includes('Windows')) {
        os = 'Windows'
    } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
        os = 'macOS'
    } else if (ua.includes('Linux')) {
        os = 'Linux'
    } else if (ua.includes('Android')) {
        os = 'Android'
        device = 'Mobile'
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
        os = 'iOS'
        device = ua.includes('iPad') ? 'Tablet' : 'Mobile'
    }

    // Parse device
    if (ua.includes('Mobile') || ua.includes('Android')) {
        device = 'Mobile'
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
        device = 'Tablet'
    }

    return { browser, os, device }
}

function generateDeviceFingerprint(ip: string, userAgent: string, acceptLanguage?: string): string {
    const data = `${ip}-${userAgent}-${acceptLanguage || ''}`
    return createHash('sha256').update(data).digest('hex').substring(0, 12)
}

export function addAccessLog(
    ip: string,
    method: string,
    path: string,
    userAgent: string,
    options?: {
        statusCode?: number
        username?: string
        sessionId?: string
        acceptLanguage?: string
        referer?: string
    }
): AccessLog {
    ensureAccessLogsDir()

    const { browser, os, device } = parseUserAgent(userAgent)
    const deviceFingerprint = generateDeviceFingerprint(ip, userAgent, options?.acceptLanguage)

    const log: AccessLog = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString(),
        ip: ip || 'Unknown',
        method,
        path,
        userAgent,
        browser,
        os,
        device,
        deviceFingerprint,
        username: options?.username,
        sessionId: options?.sessionId,
        acceptLanguage: options?.acceptLanguage,
        referer: options?.referer,
        statusCode: options?.statusCode
    }

    // Store in daily log files
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const logFile = join(ACCESS_LOGS_DIR, `${dateKey}.json`)

    let logs: AccessLog[] = readJsonFile<AccessLog[]>(logFile) || []
    logs.unshift(log)

    // Limit logs per day to prevent huge files
    const MAX_LOGS_PER_DAY = 10000
    if (logs.length > MAX_LOGS_PER_DAY) {
        logs = logs.slice(0, MAX_LOGS_PER_DAY)
    }

    writeJsonFile(logFile, logs)

    return log
}

export interface AccessLogFilter {
    startDate?: string
    endDate?: string
    ip?: string
    deviceFingerprint?: string
    username?: string
    path?: string
    limit?: number
}

export function getAccessLogs(filter?: AccessLogFilter): AccessLog[] {
    ensureAccessLogsDir()

    const limit = filter?.limit || 500
    const endDate = filter?.endDate ? new Date(filter.endDate) : new Date()
    const startDate = filter?.startDate 
        ? new Date(filter.startDate) 
        : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days

    let allLogs: AccessLog[] = []

    try {
        const files = readdirSync(ACCESS_LOGS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)) // Most recent first

        for (const file of files) {
            const dateStr = file.replace('.json', '')
            const fileDate = new Date(dateStr)

            // Skip files outside date range
            if (fileDate < startDate || fileDate > endDate) continue

            const logs = readJsonFile<AccessLog[]>(join(ACCESS_LOGS_DIR, file)) || []
            allLogs = allLogs.concat(logs)

            // Early exit if we have enough
            if (allLogs.length >= limit * 2) break
        }
    } catch (error) {
        console.error('Error reading access logs:', error)
    }

    // Apply filters
    let filtered = allLogs

    if (filter?.ip) {
        filtered = filtered.filter(l => l.ip.includes(filter.ip!))
    }
    if (filter?.deviceFingerprint) {
        filtered = filtered.filter(l => l.deviceFingerprint === filter.deviceFingerprint)
    }
    if (filter?.username) {
        filtered = filtered.filter(l => l.username === filter.username)
    }
    if (filter?.path) {
        filtered = filtered.filter(l => l.path.includes(filter.path!))
    }

    // Sort by timestamp descending and limit
    return filtered
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
}

export interface AccessLogStats {
    totalRequests: number
    uniqueIPs: number
    uniqueDevices: number
    topPaths: { path: string; count: number }[]
    topDevices: { fingerprint: string; browser: string; os: string; device: string; count: number }[]
    requestsByHour: { hour: number; count: number }[]
    period: string
}

export function getAccessLogStats(days: number = 7): AccessLogStats {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const logs = getAccessLogs({
        startDate: startDate.toISOString(),
        limit: 50000
    })

    // Calculate stats
    const ipSet = new Set<string>()
    const deviceSet = new Set<string>()
    const pathCounts: Record<string, number> = {}
    const deviceCounts: Record<string, { browser: string; os: string; device: string; count: number }> = {}
    const hourCounts: Record<number, number> = {}

    for (const log of logs) {
        ipSet.add(log.ip)
        deviceSet.add(log.deviceFingerprint)

        // Skip API paths for top paths
        if (!log.path.startsWith('/api/')) {
            pathCounts[log.path] = (pathCounts[log.path] || 0) + 1
        }

        // Device counts
        if (!deviceCounts[log.deviceFingerprint]) {
            deviceCounts[log.deviceFingerprint] = {
                browser: log.browser,
                os: log.os,
                device: log.device,
                count: 0
            }
        }
        deviceCounts[log.deviceFingerprint].count++

        // Hour counts
        const hour = new Date(log.timestamp).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    // Sort and get top items
    const topPaths = Object.entries(pathCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    const topDevices = Object.entries(deviceCounts)
        .map(([fingerprint, data]) => ({ fingerprint, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    const requestsByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourCounts[hour] || 0
    }))

    return {
        totalRequests: logs.length,
        uniqueIPs: ipSet.size,
        uniqueDevices: deviceSet.size,
        topPaths,
        topDevices,
        requestsByHour,
        period: `${days} days`
    }
}

export function cleanupAccessLogs(daysToKeep: number = MAX_DAYS_TO_KEEP): number {
    ensureAccessLogsDir()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    let deletedCount = 0

    try {
        const files = readdirSync(ACCESS_LOGS_DIR).filter(f => f.endsWith('.json'))

        for (const file of files) {
            const dateStr = file.replace('.json', '')
            const fileDate = new Date(dateStr)

            if (fileDate < cutoffDate) {
                unlinkSync(join(ACCESS_LOGS_DIR, file))
                deletedCount++
            }
        }
    } catch (error) {
        console.error('Error cleaning up access logs:', error)
    }

    return deletedCount
}

// For backwards compatibility - returns recent logs from memory-like view
export function clearAccessLogs(): void {
    // This now just triggers cleanup of old logs
    cleanupAccessLogs(0)
}
