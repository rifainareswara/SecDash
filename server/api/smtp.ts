import { getSMTPSettings, updateSMTPSettings } from '../utils/database'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method === 'GET') {
        const settings = getSMTPSettings()
        return {
            success: true,
            settings: settings || {
                host: '',
                port: 587,
                secure: false,
                auth_user: '',
                auth_pass: '',
                from_email: '',
                from_name: 'WireGuard VPN'
            }
        }
    }

    if (method === 'POST') {
        const body = await readBody(event)
        const settings = updateSMTPSettings(body)
        return {
            success: true,
            settings
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
