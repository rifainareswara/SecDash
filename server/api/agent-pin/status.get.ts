import { getAgentPinConfig } from '../../utils/database'

// GET /api/agent-pin/status - Check if PIN protection is enabled
export default defineEventHandler(async (event) => {
    const config = getAgentPinConfig()
    
    return {
        success: true,
        enabled: config?.enabled || false,
        hasPin: config !== null && config.enabled
    }
})
