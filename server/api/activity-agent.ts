import { logBrowsingActivity, getClients } from '../utils/database'

// Agent endpoint - accepts activity reports from browser extension/agent
export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method !== 'POST') {
        throw createError({
            statusCode: 405,
            message: 'Method not allowed. Use POST to report activity.'
        })
    }

    // Get device token from header
    const deviceToken = getHeader(event, 'x-device-token') || getHeader(event, 'X-Device-Token')
    const clientId = getHeader(event, 'x-client-id') || getHeader(event, 'X-Client-Id')

    // Get body
    const body = await readBody(event)

    // Support batch logging
    const activities = Array.isArray(body) ? body : [body]
    const logged: any[] = []

    for (const item of activities) {
        if (!item.url) continue

        try {
            const activity = logBrowsingActivity({
                client_id: clientId || deviceToken || item.client_id || 'unknown',
                device_name: item.device_name,
                url: item.url,
                title: item.title,
                source: 'agent',
                duration: item.duration
            })
            logged.push(activity)
        } catch (error) {
            console.error('Error logging activity:', error)
        }
    }

    // Return success response
    return {
        success: true,
        logged_count: logged.length,
        timestamp: new Date().toISOString()
    }
})
