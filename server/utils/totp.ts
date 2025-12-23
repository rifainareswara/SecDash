// TOTP (Time-based One-Time Password) utilities for 2FA
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

const ISSUER = 'SecDash VPN'

export interface TOTPSetup {
    secret: string
    uri: string
    qrCode: string // base64 data URL
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 })
    return secret.base32
}

/**
 * Generate TOTP URI for authenticator apps
 */
export function generateTOTPUri(username: string, secret: string): string {
    const totp = new OTPAuth.TOTP({
        issuer: ISSUER,
        label: username,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
    })
    return totp.toString()
}

/**
 * Generate QR code as base64 data URL
 */
export async function generateTOTPQRCode(uri: string): Promise<string> {
    return await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    })
}

/**
 * Complete setup: generate secret, URI, and QR code
 */
export async function setupTOTP(username: string): Promise<TOTPSetup> {
    const secret = generateTOTPSecret()
    const uri = generateTOTPUri(username, secret)
    const qrCode = await generateTOTPQRCode(uri)

    return {
        secret,
        uri,
        qrCode
    }
}

/**
 * Verify a TOTP code against a secret
 * Allows 1 step window (30 seconds before/after) for clock drift
 */
export function verifyTOTP(secret: string, token: string): boolean {
    try {
        const totp = new OTPAuth.TOTP({
            issuer: ISSUER,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secret)
        })

        // delta allows for clock drift: -1, 0, +1 periods
        const delta = totp.validate({ token, window: 1 })

        // delta is null if invalid, otherwise it's the number of periods difference
        return delta !== null
    } catch (error) {
        console.error('TOTP verification error:', error)
        return false
    }
}
