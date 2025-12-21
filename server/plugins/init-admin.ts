import { getAdminUser, createAdminUser } from '../utils/database'
import { createHash } from 'crypto'

export default defineNitroPlugin(() => {
    try {
        const username = 'admin'
        // Check if admin exists
        const admin = getAdminUser(username)

        if (!admin) {
            console.log('[Auth] Default admin user not found. Creating...')

            // Hash password: SHA256 -> Base64 (Same as login handler)
            const password = process.env.ADMIN_PASSWORD || 'password'
            const passwordHash = Buffer.from(
                createHash('sha256').update(password).digest()
            ).toString('base64')

            createAdminUser(username, passwordHash)
            console.log(`[Auth] Created default user: ${username} / ${password}`)
        }
    } catch (e) {
        console.error('[Auth] Failed to init default admin:', e)
    }
})
