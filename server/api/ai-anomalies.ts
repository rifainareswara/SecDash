/**
 * AI Anomalies API Endpoint
 */
import { listAnomalies, acknowledgeAnomaly, getAnomalyStats } from '../utils/aiService'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/ai-anomalies - List anomalies
    if (method === 'GET') {
        // Check if requesting stats
        if (query.stats === 'true') {
            try {
                const stats = await getAnomalyStats()
                return {
                    success: true,
                    stats
                }
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message,
                    stats: null
                }
            }
        }

        // List anomalies with filters
        try {
            const result = await listAnomalies({
                client_id: query.client_id as string,
                severity: query.severity as string,
                acknowledged: query.acknowledged === 'true' ? true : 
                              query.acknowledged === 'false' ? false : undefined,
                page: query.page ? parseInt(query.page as string) : 1,
                per_page: query.per_page ? parseInt(query.per_page as string) : 50
            })

            return {
                success: true,
                anomalies: result.anomalies,
                total: result.total,
                page: result.page,
                per_page: result.per_page
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                anomalies: [],
                total: 0
            }
        }
    }

    // POST /api/ai-anomalies - Acknowledge anomaly
    if (method === 'POST') {
        const body = await readBody(event)
        
        if (!body.event_id) {
            throw createError({
                statusCode: 400,
                message: 'event_id is required'
            })
        }

        try {
            const result = await acknowledgeAnomaly(
                body.event_id,
                body.acknowledged_by || 'admin'
            )
            return {
                success: true,
                event: result.event
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
