// POST /api/clients/[id]/2fa/setup - Generate TOTP for a specific client (self-service)
import { setupTOTP } from '../../../../utils/totp'
import { getClientById, updateClient } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
    const clientId = getRouterParam(event, 'id')

    if (!clientId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Client ID is required'
        })
    }

    const client = getClientById(clientId)
    if (!client) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Client not found'
        })
    }

    if (!client.require_2fa) {
        throw createError({
            statusCode: 400,
            statusMessage: 'This client does not require 2FA'
        })
    }

    if (client.totp_enabled) {
        throw createError({
            statusCode: 400,
            statusMessage: '2FA is already enabled for this client. Disable it first to regenerate.'
        })
    }

    try {
        // Generate TOTP with client name as identifier
        const totpSetup = await setupTOTP(client.name)

        // Store secret (not enabled until verified)
        updateClient(clientId, {
            totp_secret: totpSetup.secret,
            totp_enabled: false
        })

        return {
            success: true,
            clientId,
            clientName: client.name,
            qrCode: totpSetup.qrCode,
            secret: totpSetup.secret,
            message: 'Scan QR code with authenticator app, then verify with a code'
        }
    } catch (error: any) {
        console.error('Client 2FA setup error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to setup 2FA: ' + error.message
        })
    }
})
