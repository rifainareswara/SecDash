import { setAgentPinConfig, getAgentPinConfig } from '../../utils/database'

// POST /api/agent-pin - Set admin PIN for agent protection
export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    
    if (!body.pin || typeof body.pin !== 'string') {
        throw createError({
            statusCode: 400,
            message: 'PIN is required'
        })
    }

    // PIN must be at least 4 digits
    if (body.pin.length < 4) {
        throw createError({
            statusCode: 400,
            message: 'PIN must be at least 4 characters'
        })
    }

    const success = setAgentPinConfig(body.pin)

    if (!success) {
        throw createError({
            statusCode: 500,
            message: 'Failed to save PIN configuration'
        })
    }

    return {
        success: true,
        message: 'Agent PIN has been set successfully'
    }
})
