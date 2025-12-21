import { getAdminUser } from '../../utils/database'
import { createHash } from 'crypto'

// Simple in-memory session store (use Redis in production)
const sessions = new Map<string, { username: string; isAdmin: boolean; expiresAt: number }>()

function generateSessionId(): string {
    return createHash('sha256')
        .update(Math.random().toString() + Date.now().toString())
        .digest('hex')
}

function hashPassword(password: string): string {
    return Buffer.from(
        createHash('sha256').update(password).digest()
    ).toString('base64')
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body.username || !body.password) {
        throw createError({
            statusCode: 400,
            message: 'Username and password are required'
        })
    }

    const user = getAdminUser(body.username)
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Invalid username or password'
        })
    }

    // Check password
    const passwordHash = hashPassword(body.password)
    if (user.password_hash !== passwordHash) {
        throw createError({
            statusCode: 401,
            message: 'Invalid username or password'
        })
    }

    // Create session
    const sessionId = generateSessionId()
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours

    sessions.set(sessionId, {
        username: user.username,
        isAdmin: user.admin,
        expiresAt
    })

    // Set cookie
    setCookie(event, 'session', sessionId, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true', // Defaults to false if not set
        maxAge: 24 * 60 * 60,
        path: '/'
    })

    return {
        success: true,
        user: {
            username: user.username,
            isAdmin: user.admin
        }
    }
})

// Export session store for other handlers
export { sessions }
