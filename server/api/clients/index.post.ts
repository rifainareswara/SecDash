import { createClient, checkDatabaseExists, initDatabase } from '../../utils/database'

export default defineEventHandler(async (event) => {
    try {
        // Initialize database if needed
        if (!checkDatabaseExists()) {
            initDatabase()
        }

        const body = await readBody(event)

        if (!body.name) {
            throw createError({
                statusCode: 400,
                message: 'Client name is required'
            })
        }

        const client = createClient(body.name, body.email)

        return {
            success: true,
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                publicKey: client.public_key.substring(0, 4),
                fullPublicKey: client.public_key,
                avatarInitials: client.name.substring(0, 2).toUpperCase(),
                avatarGradient: 'from-blue-500 to-purple-500', // Default or random
                virtualIp: client.allocated_ips.join(', '),
                allowedIps: client.allowed_ips.join(', '),
                enabled: client.enabled,
                createdAt: client.created_at
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error

        throw createError({
            statusCode: 500,
            message: error.message
        })
    }
})
