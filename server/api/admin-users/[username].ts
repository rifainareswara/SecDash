import { getAdminUser, updateAdminUser, deleteAdminUser } from '../../utils/database'
import { createHash } from 'crypto'

export default defineEventHandler(async (event) => {
    const username = getRouterParam(event, 'username')
    const method = getMethod(event)

    if (!username) {
        throw createError({
            statusCode: 400,
            message: 'Username is required'
        })
    }

    if (method === 'GET') {
        const user = getAdminUser(username)
        if (!user) {
            throw createError({
                statusCode: 404,
                message: 'User not found'
            })
        }

        return {
            success: true,
            user: {
                username: user.username,
                admin: user.admin,
                created_at: user.created_at
            }
        }
    }

    if (method === 'PATCH') {
        const body = await readBody(event)

        const updates: any = {}
        if (body.password) {
            updates.password_hash = Buffer.from(
                createHash('sha256').update(body.password).digest()
            ).toString('base64')
        }
        if (typeof body.admin === 'boolean') {
            updates.admin = body.admin
        }

        const user = updateAdminUser(username, updates)
        if (!user) {
            throw createError({
                statusCode: 404,
                message: 'User not found'
            })
        }

        return {
            success: true,
            user: {
                username: user.username,
                admin: user.admin,
                created_at: user.created_at
            }
        }
    }

    if (method === 'DELETE') {
        // Prevent deleting the last admin
        const { getAdminUsers } = await import('../../utils/database')
        const users = getAdminUsers()
        if (users.length <= 1) {
            throw createError({
                statusCode: 400,
                message: 'Cannot delete the last admin user'
            })
        }

        const success = deleteAdminUser(username)
        if (!success) {
            throw createError({
                statusCode: 404,
                message: 'User not found'
            })
        }

        return {
            success: true,
            message: `User ${username} deleted`
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
