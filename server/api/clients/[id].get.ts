import { getClientById } from '../../utils/database'

export default defineEventHandler((event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Client ID is required'
        })
    }

    try {
        const client = getClientById(id)

        if (!client) {
            throw createError({
                statusCode: 404,
                message: 'Client not found'
            })
        }

        return {
            success: true,
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                publicKey: client.public_key,
                presharedKey: client.preshared_key,
                allocatedIps: client.allocated_ips,
                allowedIps: client.allowed_ips,
                enabled: client.enabled,
                createdAt: client.created_at,
                updatedAt: client.updated_at
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
