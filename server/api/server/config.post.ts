import { updateServerConfig, updateGlobalSettings } from '../../utils/database'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        if (!body) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Request body is required'
            })
        }

        const { server, global } = body
        let serverConfig
        let globalSettings

        if (server) {
            serverConfig = updateServerConfig(server)
        }

        if (global) {
            globalSettings = updateGlobalSettings(global)
        }

        return {
            success: true,
            server: serverConfig,
            global: globalSettings
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        }
    }
})
