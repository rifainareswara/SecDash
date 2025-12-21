interface AccessLog {
    id: string
    timestamp: string
    ip: string
    method: string
    path: string
    userAgent: string
    browser: string
    os: string
    device: string
    country?: string
    statusCode?: number
}

// In-memory storage for access logs (limited to last 500)
const accessLogs: AccessLog[] = []
const MAX_LOGS = 500

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

export function addAccessLog(
    ip: string,
    method: string,
    path: string,
    userAgent: string,
    statusCode?: number
) {
    const { browser, os, device } = parseUserAgent(userAgent)

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
        statusCode
    }

    // Add to beginning (most recent first)
    accessLogs.unshift(log)

    // Keep only last MAX_LOGS
    if (accessLogs.length > MAX_LOGS) {
        accessLogs.pop()
    }

    return log
}

export function getAccessLogs(limit: number = 100): AccessLog[] {
    return accessLogs.slice(0, limit)
}

export function clearAccessLogs() {
    accessLogs.length = 0
}
