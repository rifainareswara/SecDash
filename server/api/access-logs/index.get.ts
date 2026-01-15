import { getAccessLogs, cleanupAccessLogs, type AccessLogFilter } from '../../utils/accessLog'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/access-logs - Get access logs with filtering
    if (method === 'GET') {
        try {
            const filter: AccessLogFilter = {
                startDate: query.start_date as string,
                endDate: query.end_date as string,
                ip: query.ip as string,
                deviceFingerprint: query.device_fingerprint as string,
                username: query.username as string,
                path: query.path as string,
                limit: query.limit ? parseInt(query.limit as string) : 100
            }

            const logs = getAccessLogs(filter)

            return {
                success: true,
                logs,
                total: logs.length
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                logs: [],
                total: 0
            }
        }
    }

    // DELETE /api/access-logs - Cleanup old logs
    if (method === 'DELETE') {
        try {
            const body = await readBody(event)
            const daysToKeep = body?.days_to_keep || 30

            const deleted = cleanupAccessLogs(daysToKeep)

            return {
                success: true,
                message: `Deleted ${deleted} old log files`,
                deleted_count: deleted
            }
        } catch (error: any) {
            throw createError({
                statusCode: 500,
                message: error.message
            })
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
