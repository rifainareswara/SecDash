/**
 * AI Security API Endpoints
 * 
 * Proxies requests to the AI microservice and provides
 * additional functionality for the dashboard.
 */
import { getAIServiceHealth, getModelStatus, listAnomalies, getAnomalyStats, trainModels, buildAllProfiles, listProfiles } from '../utils/aiService'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/ai - Get AI service status and overview
    if (method === 'GET') {
        try {
            // Get health status
            let health = null
            let modelStatus = null
            let anomalyStats = null
            let profiles = null

            try {
                health = await getAIServiceHealth()
            } catch (e: any) {
                health = { status: 'unavailable', error: e.message }
            }

            try {
                modelStatus = await getModelStatus()
            } catch (e) {
                modelStatus = null
            }

            try {
                anomalyStats = await getAnomalyStats()
            } catch (e) {
                anomalyStats = null
            }

            try {
                const profilesResult = await listProfiles()
                profiles = profilesResult.profiles
            } catch (e) {
                profiles = []
            }

            return {
                success: true,
                service: health,
                models: modelStatus,
                anomaly_stats: anomalyStats,
                profiles_count: profiles?.length || 0,
                timestamp: new Date().toISOString()
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                service: { status: 'error' }
            }
        }
    }

    // POST /api/ai - Run specific AI action
    if (method === 'POST') {
        const body = await readBody(event)
        const action = body.action

        try {
            switch (action) {
                case 'train':
                    const trainResult = await trainModels({
                        force: body.force || false,
                        data_days: body.data_days || 30
                    })
                    return {
                        success: true,
                        action: 'train',
                        result: trainResult
                    }

                case 'build_profiles':
                    const profilesResult = await buildAllProfiles(body.data_days || 30)
                    return {
                        success: true,
                        action: 'build_profiles',
                        result: profilesResult
                    }

                default:
                    throw createError({
                        statusCode: 400,
                        message: `Unknown action: ${action}. Use 'train' or 'build_profiles'.`
                    })
            }
        } catch (error: any) {
            if (error.statusCode) throw error
            return {
                success: false,
                error: error.message
            }
        }
    }

    return {
        success: false,
        error: 'Method not allowed'
    }
})
