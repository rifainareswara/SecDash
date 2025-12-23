// POST /api/2fa/disable - Disable 2FA for admin user (requires OTP confirmation)
import { verifyTOTP } from '../../utils/totp'
import { getAdminUser, updateAdminUser } from '../../utils/database'
import { sessions } from '../auth/login.post'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { otp } = body

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

    if (!user.totp_enabled) {
        throw createError({
            statusCode: 400,
            statusMessage: '2FA is not enabled.'
        })
    }

    // Require OTP to disable 2FA
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
        throw createError({
            statusCode: 400,
            statusMessage: 'OTP code required to disable 2FA.'
        })
    }

    // Verify the OTP
    const isValid = verifyTOTP(user.totp_secret!, otp)

    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid OTP code.'
        })
    }

    // Disable 2FA and remove secret
    updateAdminUser(username, {
        totp_secret: undefined,
        totp_enabled: false
    })

    return {
        success: true,
        message: '2FA has been disabled.'
    }
})
