import { getAccessLogStats } from '../../utils/accessLog'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    try {
        const days = query.days ? parseInt(query.days as string) : 7

        const stats = getAccessLogStats(days)

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
})
