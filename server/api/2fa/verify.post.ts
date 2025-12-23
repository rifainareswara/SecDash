// POST /api/2fa/verify - Verify OTP code and enable 2FA
import { verifyTOTP } from '../../utils/totp'
import { getAdminUser, updateAdminUser } from '../../utils/database'
import { sessions } from '../auth/login.post'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { otp } = body

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid OTP code. Must be 6 digits.'
        })
    }

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
    console.log('[2FA Verify] Username:', username)
    console.log('[2FA Verify] User found:', !!user)
    console.log('[2FA Verify] Has totp_secret:', !!user?.totp_secret)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'User not found'
        })
    }

    if (!user.totp_secret) {
        throw createError({
            statusCode: 400,
            statusMessage: '2FA not set up. Call /api/2fa/setup first.'
        })
    }

    // Verify the OTP
    const isValid = verifyTOTP(user.totp_secret, otp)

    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid OTP code. Please try again.'
        })
    }

    // Enable 2FA
    updateAdminUser(username, {
        totp_enabled: true
    })

    return {
        success: true,
        message: '2FA has been enabled successfully!'
    }
})
