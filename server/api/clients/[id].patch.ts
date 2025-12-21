import { getClientById, updateClient, checkDatabaseExists } from '../../utils/database'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Client ID is required'
        })
    }

    if (!checkDatabaseExists()) {
        throw createError({
            statusCode: 404,
            message: 'Database not found'
        })
    }

    try {
        const body = await readBody(event)
        const existingClient = getClientById(id)

        if (!existingClient) {
            throw createError({
                statusCode: 404,
                message: 'Client not found'
            })
        }

        const updatedClient = updateClient(id, {
            name: body.name ?? existingClient.name,
            email: body.email ?? existingClient.email,
            enabled: body.enabled ?? existingClient.enabled,
            allowed_ips: body.allowedIps ?? existingClient.allowed_ips
        })

        return {
            success: true,
            client: updatedClient
        }
    } catch (error: any) {
        if (error.statusCode) throw error

        throw createError({
            statusCode: 500,
            message: error.message
        })
    }
})
