// GET /api/2fa/status - Get current 2FA status for admin user
import { getAdminUser } from '../../utils/database'
import { sessions } from '../auth/login.post'

export default defineEventHandler(async (event) => {
    // Get current user from session
    const cookies = parseCookies(event)
    const sessionId = cookies.session

    let username = 'admin' // fallback
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!
        if (session.expiresAt > Date.now()) {
            username = session.username
        }
    }

    const user = getAdminUser(username)
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'User not found'
        })
    }

    return {
        success: true,
        enabled: user.totp_enabled === true,
        hasSecret: !!user.totp_secret
    }
})
