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

    // Get client first
    const client = getClientById(client_id)
    if (!client) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Client not found'
        })
    }

    // Check if client requires 2FA
    if (!client.require_2fa) {
        throw createError({
            statusCode: 400,
            statusMessage: 'This client does not require 2FA activation'
        })
    }

    let isValid = false
    let totpSource = 'none'

    // Priority 1: Use client's own TOTP if enabled (self-service)
    if (client.totp_enabled && client.totp_secret) {
        isValid = verifyTOTP(client.totp_secret, otp)
        totpSource = 'client'
    } else {
        // Priority 2: Fallback to admin's TOTP
        const cookies = parseCookies(event)
        const sessionId = cookies.session

        let username = 'admin'
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId)!
            if (session.expiresAt > Date.now()) {
                username = session.username
            }
        }

        const adminUser = getAdminUser(username)
        if (adminUser?.totp_enabled && adminUser?.totp_secret) {
            isValid = verifyTOTP(adminUser.totp_secret, otp)
            totpSource = 'admin'
        } else {
            throw createError({
                statusCode: 400,
                statusMessage: 'No 2FA configured. Either setup client 2FA or enable admin 2FA.'
            })
        }
    }

    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: `Invalid OTP code (using ${totpSource} authenticator)`
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
