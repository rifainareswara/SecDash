import { verifyAgentPin, getAgentPinConfig } from '../../utils/database'

// POST /api/agent-pin/verify - Verify PIN to disable agent
export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    
    if (!body.pin || typeof body.pin !== 'string') {
        throw createError({
            statusCode: 400,
            message: 'PIN is required'
        })
    }

    const config = getAgentPinConfig()
    
    // If no PIN is set, indicate that
    if (!config || !config.enabled) {
        return {
            success: true,
            verified: true,
            message: 'No PIN protection configured'
        }
    }

    const isValid = verifyAgentPin(body.pin)

    return {
        success: true,
        verified: isValid,
        message: isValid ? 'PIN verified successfully' : 'Invalid PIN'
    }
})
