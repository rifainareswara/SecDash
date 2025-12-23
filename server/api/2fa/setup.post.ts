// POST /api/2fa/setup - Generate TOTP secret and QR code for admin user
import { setupTOTP } from '../../utils/totp'
import { getAdminUser, updateAdminUser } from '../../utils/database'
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

    // Check if 2FA is already enabled
    if (user.totp_enabled) {
        throw createError({
            statusCode: 400,
            statusMessage: '2FA is already enabled. Disable it first to regenerate.'
        })
    }

    try {
        // Generate new TOTP setup
        const totpSetup = await setupTOTP(username)

        console.log('[2FA Setup] Username:', username)
        console.log('[2FA Setup] Generated secret:', totpSetup.secret.substring(0, 8) + '...')

        // Store secret temporarily (user must verify before it's activated)
        const updateResult = updateAdminUser(username, {
            totp_secret: totpSetup.secret,
            totp_enabled: false // Not enabled until verified
        })

        console.log('[2FA Setup] Update result:', updateResult ? 'Success' : 'Failed')
        if (updateResult) {
            console.log('[2FA Setup] Saved totp_secret:', updateResult.totp_secret?.substring(0, 8) + '...')
        }

        return {
            success: true,
            qrCode: totpSetup.qrCode,
            secret: totpSetup.secret, // Show for manual entry
            message: 'Scan QR code with authenticator app, then verify with a code'
        }
    } catch (error: any) {
        console.error('2FA setup error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to setup 2FA: ' + error.message
        })
    }
})
