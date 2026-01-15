// POST /api/clients/deactivate - Manually deactivate client VPN session
import { execSync } from 'child_process'
import { getClientById, updateClient } from '../../utils/database'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { client_id } = body

    if (!client_id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'client_id is required'
        })
    }

    // Get client
    const client = getClientById(client_id)
    if (!client) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Client not found'
        })
    }

    // Update client - clear session and disable if require_2fa
    const updatedClient = updateClient(client_id, {
        enabled: client.require_2fa ? false : client.enabled,
        session_expires_at: undefined
    })

    if (!updatedClient) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update client'
        })
    }

    // Remove peer from WireGuard if 2FA required
    if (client.require_2fa) {
        try {
            execSync(`wg set wg0 peer "${client.public_key}" remove`, {
                stdio: 'pipe'
            })
            console.log(`[2FA] Deactivated client ${client_id}`)
        } catch (error) {
            console.error('[2FA] Failed to remove peer from WireGuard:', error)
        }
    }

    return {
        success: true,
        message: 'VPN session deactivated',
        client_id
    }
})
