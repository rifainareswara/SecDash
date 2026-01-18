/**
 * AI Profiles API Endpoint
 */
import { listProfiles, getUserProfile, buildUserProfile } from '../utils/aiService'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)
    const query = getQuery(event)

    // GET /api/ai-profiles - List all profiles or get specific profile
    if (method === 'GET') {
        const clientId = query.client_id as string

        // Get specific profile
        if (clientId) {
            try {
                const result = await getUserProfile(clientId)
                return {
                    success: true,
                    profile: result.profile
                }
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message,
                    profile: null
                }
            }
        }

        // List all profiles
        try {
            const result = await listProfiles()
            return {
                success: true,
                profiles: result.profiles,
                total: result.total
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                profiles: [],
                total: 0
            }
        }
    }

    // POST /api/ai-profiles - Build profile for a client
    if (method === 'POST') {
        const body = await readBody(event)

        if (!body.client_id) {
            throw createError({
                statusCode: 400,
                message: 'client_id is required'
            })
        }

        try {
            const result = await buildUserProfile(
                body.client_id,
                body.data_days || 30
            )
            return {
                success: true,
                profile: result.profile
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
