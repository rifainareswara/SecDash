import { addAccessLog } from '../utils/accessLog'

export default defineEventHandler((event) => {
    // Skip logging for certain paths
    const skipPaths = ['/api/access-logs', '/_nuxt/', '/favicon.ico', '/__nuxt', '/api/status', '/api/system-metrics']
    const path = event.path || ''

    if (skipPaths.some(skip => path.startsWith(skip))) {
        return
    }

    // Get request info
    const ip = getRequestIP(event, { xForwardedFor: true }) ||
        getHeader(event, 'x-real-ip') ||
        getHeader(event, 'cf-connecting-ip') ||
        'Unknown'

    const method = getMethod(event)
    const userAgent = getHeader(event, 'user-agent') || 'Unknown'
    
    // Get extended headers for device context
    const acceptLanguage = getHeader(event, 'accept-language')
    const referer = getHeader(event, 'referer')
    
    // Try to get session info if available
    // Note: This depends on how auth is implemented in your app
    const sessionId = getHeader(event, 'x-session-id') || getCookie(event, 'session_id')
    const username = getHeader(event, 'x-username') || getCookie(event, 'username')

    // Log the access with extended info
    addAccessLog(ip, method, path, userAgent, {
        acceptLanguage,
        referer,
        sessionId,
        username
    })
})
