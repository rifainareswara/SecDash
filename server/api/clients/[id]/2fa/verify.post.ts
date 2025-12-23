// POST /api/clients/[id]/2fa/verify - Verify TOTP and enable 2FA for client
import { verifyTOTP } from '../../../../utils/totp'
import { getClientById, updateClient } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
    const clientId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { otp } = body

    if (!clientId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Client ID is required'
        })
    }

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid OTP code. Must be 6 digits.'
        })
    }

    const client = getClientById(clientId)
    if (!client) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Client not found'
        })
    }

    if (!client.totp_secret) {
        throw createError({
            statusCode: 400,
            statusMessage: '2FA not set up for this client. Call setup first.'
        })
    }

    // Verify the OTP against client's secret
    const isValid = verifyTOTP(client.totp_secret, otp)

    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid OTP code. Please try again.'
        })
    }

    // Enable 2FA for this client
    updateClient(clientId, {
        totp_enabled: true
    })

    return {
        success: true,
        clientId,
        message: '2FA has been enabled for this client!'
    }
})
