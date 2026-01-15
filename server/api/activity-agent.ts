import { logBrowsingActivity, getClients, type WGClient } from '../utils/database'
import { createHash } from 'crypto'

// Parse user agent for device info
function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
    let browser = 'Unknown'
    let os = 'Unknown'
    let deviceType = 'Desktop'

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
        deviceType = 'Mobile'
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
        os = 'iOS'
        deviceType = ua.includes('iPad') ? 'Tablet' : 'Mobile'
    }

    // Parse device type
    if (ua.includes('Mobile') || ua.includes('Android')) {
        deviceType = 'Mobile'
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
        deviceType = 'Tablet'
    }

    return { browser, os, deviceType }
}

// Generate device fingerprint
function generateDeviceFingerprint(ip: string, userAgent: string, acceptLanguage?: string): string {
    const data = `${ip}-${userAgent}-${acceptLanguage || ''}`
    return createHash('sha256').update(data).digest('hex').substring(0, 12)
}

// Find VPN client by IP address
function findClientByIP(ip: string): WGClient | null {
    try {
        const clients = getClients()
        
        // Clean up IP for comparison (remove IPv6 prefix etc)
        const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1')
        
        for (const client of clients) {
            // Check if client's allocated IPs match
            if (client.allocated_ips?.some(allocatedIP => {
                // Remove CIDR notation if present
                const baseIP = allocatedIP.split('/')[0]
                return cleanIP === baseIP || cleanIP.includes(baseIP) || ip.includes(baseIP)
            })) {
                return client
            }
        }
        
        return null
    } catch (error) {
        console.error('Error finding client by IP:', error)
        return null
    }
}

// Agent endpoint - accepts activity reports from browser extension/agent
export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method !== 'POST') {
        throw createError({
            statusCode: 405,
            message: 'Method not allowed. Use POST to report activity.'
        })
    }

    // Get headers for device context
    const deviceToken = getHeader(event, 'x-device-token') || getHeader(event, 'X-Device-Token')
    const clientId = getHeader(event, 'x-client-id') || getHeader(event, 'X-Client-Id')
    const userAgent = getHeader(event, 'user-agent') || 'Unknown'
    const acceptLanguage = getHeader(event, 'accept-language')
    
    // Get IP address
    const ip = getRequestIP(event, { xForwardedFor: true }) ||
        getHeader(event, 'x-real-ip') ||
        getHeader(event, 'cf-connecting-ip') ||
        'Unknown'
    
    // Parse device info
    const { browser, os, deviceType } = parseUserAgent(userAgent)
    const deviceFingerprint = generateDeviceFingerprint(ip, userAgent, acceptLanguage)

    // Get body
    const body = await readBody(event)

    // Support batch logging
    const activities = Array.isArray(body) ? body : [body]
    const logged: any[] = []

    // Try to auto-detect device name from VPN client
    let autoDetectedDeviceName: string | undefined
    let autoDetectedClientId: string | undefined
    
    const vpnClient = findClientByIP(ip)
    if (vpnClient) {
        autoDetectedDeviceName = vpnClient.name
        autoDetectedClientId = vpnClient.id
    }

    for (const item of activities) {
        if (!item.url) continue

        try {
            // Priority for device_name:
            // 1. Explicitly provided in request body
            // 2. Auto-detected from VPN client by IP
            // 3. Fallback: generate from browser/os
            const deviceName = item.device_name || 
                               autoDetectedDeviceName || 
                               `${browser} on ${os}`

            const activity = logBrowsingActivity({
                client_id: clientId || deviceToken || item.client_id || autoDetectedClientId || 'unknown',
                device_name: deviceName,
                url: item.url,
                title: item.title,
                source: 'agent',
                duration: item.duration,
                // Device context from server-side detection
                ip,
                browser: item.browser || browser,
                os: item.os || os,
                deviceType: item.deviceType || deviceType,
                deviceFingerprint: item.deviceFingerprint || deviceFingerprint
            })
            logged.push(activity)
        } catch (error) {
            console.error('Error logging activity:', error)
        }
    }

    // Return success response with device info for debugging
    return {
        success: true,
        logged_count: logged.length,
        timestamp: new Date().toISOString(),
        device: {
            fingerprint: deviceFingerprint,
            browser,
            os,
            type: deviceType,
            // Show detected VPN client info
            vpn_client: vpnClient ? {
                id: vpnClient.id,
                name: vpnClient.name
            } : null
        }
    }
})
