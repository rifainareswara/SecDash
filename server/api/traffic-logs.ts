import { getTrafficLogs } from '../utils/trafficMonitor'

export default defineEventHandler((event) => {
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 100

    return {
        success: true,
        logs: getTrafficLogs(limit)
    }
})
