import { getMonitors, getMonitorById, createMonitor, updateMonitor, deleteMonitor, getUptimeLogs, getUptimeStats, type UptimeMonitor } from '../utils/database'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/monitors - List all monitors with stats
    if (method === 'GET' && !query.id) {
        try {
            const monitors = getMonitors()

            // Enrich with stats
            const monitorsWithStats = monitors.map(monitor => {
                const stats = getUptimeStats(monitor.id)
                const recentLogs = getUptimeLogs(monitor.id, 90) // For timeline

                return {
                    ...monitor,
                    stats,
                    recentLogs: recentLogs.map(l => ({
                        status: l.status,
                        timestamp: l.timestamp,
                        response_time: l.response_time
                    }))
                }
            })

            return {
                success: true,
                monitors: monitorsWithStats,
                total: monitorsWithStats.length
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                monitors: [],
                total: 0
            }
        }
    }

    // GET /api/monitors?id=xxx - Get single monitor with full logs
    if (method === 'GET' && query.id) {
        const monitor = getMonitorById(query.id as string)
        if (!monitor) {
            throw createError({
                statusCode: 404,
                message: 'Monitor not found'
            })
        }

        const stats = getUptimeStats(monitor.id)
        const logs = getUptimeLogs(monitor.id, 500)

        return {
            success: true,
            monitor,
            stats,
            logs
        }
    }

    // POST /api/monitors - Create new monitor
    if (method === 'POST') {
        const body = await readBody(event)

        if (!body.name || !body.url) {
            throw createError({
                statusCode: 400,
                message: 'Name and URL are required'
            })
        }

        try {
            const monitor = createMonitor({
                name: body.name,
                url: body.url,
                type: body.type || 'http',
                method: body.method || 'GET',
                port: body.port,
                interval: body.interval || 60,
                timeout: body.timeout || 10,
                retries: body.retries || 3,
                enabled: body.enabled !== false
            })

            return {
                success: true,
                monitor
            }
        } catch (error: any) {
            throw createError({
                statusCode: 500,
                message: error.message
            })
        }
    }

    // PUT /api/monitors - Update monitor
    if (method === 'PUT') {
        const body = await readBody(event)

        if (!body.id) {
            throw createError({
                statusCode: 400,
                message: 'Monitor ID is required'
            })
        }

        const updated = updateMonitor(body.id, body)

        if (!updated) {
            throw createError({
                statusCode: 404,
                message: 'Monitor not found'
            })
        }

        return {
            success: true,
            monitor: updated
        }
    }

    // DELETE /api/monitors - Delete monitor
    if (method === 'DELETE') {
        const body = await readBody(event)

        if (!body.id) {
            throw createError({
                statusCode: 400,
                message: 'Monitor ID is required'
            })
        }

        const deleted = deleteMonitor(body.id)

        return {
            success: deleted,
            message: deleted ? 'Monitor deleted' : 'Failed to delete monitor'
        }
    }

    return {
        success: false,
        error: 'Method not allowed'
    }
})
