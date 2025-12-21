import { getAccessLogs, clearAccessLogs } from '../utils/accessLog'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    if (method === 'GET') {
        const limit = parseInt(query.limit as string) || 100
        const logs = getAccessLogs(limit)

        return {
            success: true,
            logs,
            total: logs.length
        }
    }

    if (method === 'DELETE') {
        clearAccessLogs()
        return {
            success: true,
            message: 'Logs cleared'
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
