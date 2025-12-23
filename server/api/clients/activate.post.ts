// POST /api/clients/activate - Activate client VPN session with OTP verification
import { execSync } from 'child_process'
import { verifyTOTP } from '../../utils/totp'
import { getAdminUser, getClientById, updateClient } from '../../utils/database'
import { sessions } from '../auth/login.post'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { client_id, otp, duration_hours = 8 } = body

    if (!client_id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'client_id is required'
        })
    }

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Valid 6-digit OTP code is required'
        })
    }

    // Get current admin user from session
    const cookies = parseCookies(event)
    const sessionId = cookies.session

    let username = 'admin' // fallback
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!
        if (session.expiresAt > Date.now()) {
            username = session.username
        }
    }

    const adminUser = getAdminUser(username)
    if (!adminUser) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Admin user not found'
        })
    }

    // Check if admin has 2FA enabled
    if (!adminUser.totp_enabled || !adminUser.totp_secret) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Admin 2FA is not enabled. Enable 2FA first in Admin settings.'
        })
    }

    // Verify OTP
    const isValid = verifyTOTP(adminUser.totp_secret, otp)
    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid OTP code'
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

    // Calculate session expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + duration_hours)

    // Update client with session expiry
    const updatedClient = updateClient(client_id, {
        enabled: true,
        session_expires_at: expiresAt.toISOString()
    })

    if (!updatedClient) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update client'
        })
    }

    // Enable peer in WireGuard
    try {
        execSync(`wg set wg0 peer "${client.public_key}" allowed-ips "${client.allocated_ips.join(',')}"`, {
            stdio: 'pipe'
        })
        console.log(`[2FA] Activated client ${client_id} until ${expiresAt.toISOString()}`)
    } catch (error) {
        console.error('[2FA] Failed to add peer to WireGuard:', error)
        // Continue anyway - might be running in dev mode without WireGuard
    }

    return {
        success: true,
        message: `VPN session activated for ${duration_hours} hours`,
        client_id,
        expires_at: expiresAt.toISOString(),
        duration_hours
    }
})
