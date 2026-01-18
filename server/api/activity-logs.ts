import { logBrowsingActivity, getBrowsingActivity, getActivityStats, cleanupActivityLogs, type BrowsingActivity, type ActivityStats } from '../utils/database'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/activity-logs - Get activity logs with filtering
    if (method === 'GET' && !query.stats) {
        try {
            const logs = getBrowsingActivity({
                client_id: query.client_id as string,
                domain: query.domain as string,
                category: query.category as string,
                source: query.source as 'agent' | 'dns',
                ip: query.ip as string,
                start_date: query.start_date as string,
                end_date: query.end_date as string,
                limit: query.limit ? parseInt(query.limit as string) : 100
            })

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

    // GET /api/activity-logs?stats=true - Get activity statistics
    if (method === 'GET' && query.stats === 'true') {
        try {
            const period = (query.period as '24h' | '7d' | '30d') || '24h'
            const stats = getActivityStats(query.client_id as string, period)

            return {
                success: true,
                stats
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            }
        }
    }

    // POST /api/activity-logs - Log new activity (from agent or direct)
    if (method === 'POST') {
        const body = await readBody(event)

        if (!body.url) {
            throw createError({
                statusCode: 400,
                message: 'URL is required'
            })
        }

        try {
            const activity = logBrowsingActivity({
                client_id: body.client_id || 'unknown',
                device_name: body.device_name,
                url: body.url,
                title: body.title,
                source: body.source || 'agent',
                duration: body.duration
            })

            return {
                success: true,
                activity
            }
        } catch (error: any) {
            throw createError({
                statusCode: 500,
                message: error.message
            })
        }
    }

    // DELETE /api/activity-logs - Cleanup old logs
    if (method === 'DELETE') {
        const body = await readBody(event)
        const daysToKeep = body.days_to_keep || 30

        try {
            const deleted = cleanupActivityLogs(daysToKeep)

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

    return {
        success: false,
        error: 'Method not allowed'
    }
})
