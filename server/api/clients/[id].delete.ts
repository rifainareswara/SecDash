import { deleteClient, checkDatabaseExists } from '../../utils/database'

export default defineEventHandler((event) => {
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
        const deleted = deleteClient(id)

        if (!deleted) {
            console.error(`[DELETE ERROR] Delete operation returned false for client ${id}. Check server logs for file system errors.`)
            throw createError({
                statusCode: 500,
                message: 'Failed to delete client (Backend Error)'
            })
        }

        return {
            success: true,
            message: 'Client deleted successfully'
        }
    } catch (error: any) {
        if (error.statusCode) throw error

        throw createError({
            statusCode: 500,
            message: error.message
        })
    }
})
