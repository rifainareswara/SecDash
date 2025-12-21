import { getAdminUsers, createAdminUser, getAdminUser } from '../utils/database'
import { createHash } from 'crypto'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method === 'GET') {
        const users = getAdminUsers()
        // Don't send password hashes to frontend
        const safeUsers = users.map(u => ({
            username: u.username,
            admin: u.admin,
            created_at: u.created_at
        }))

        return {
            success: true,
            users: safeUsers
        }
    }

    if (method === 'POST') {
        const body = await readBody(event)

        if (!body.username || !body.password) {
            throw createError({
                statusCode: 400,
                message: 'Username and password are required'
            })
        }

        // Check if user already exists
        const existing = getAdminUser(body.username)
        if (existing) {
            throw createError({
                statusCode: 409,
                message: 'User already exists'
            })
        }

        // Hash password (base64 encoded sha256 for simplicity - use bcrypt in production)
        const passwordHash = Buffer.from(
            createHash('sha256').update(body.password).digest()
        ).toString('base64')

        const user = createAdminUser(body.username, passwordHash)

        return {
            success: true,
            user: {
                username: user.username,
                admin: user.admin,
                created_at: user.created_at
            }
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
