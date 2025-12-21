import { addAccessLog } from '../utils/accessLog'

export default defineEventHandler((event) => {
    // Skip logging for certain paths
    const skipPaths = ['/api/access-logs', '/_nuxt/', '/favicon.ico', '/__nuxt']
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

    // Log the access
    addAccessLog(ip, method, path, userAgent)
})
