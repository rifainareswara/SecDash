import { getWoLHosts, createWoLHost, deleteWoLHost } from '../utils/database'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method === 'GET') {
        const hosts = getWoLHosts()
        return {
            success: true,
            hosts
        }
    }

    if (method === 'POST') {
        const body = await readBody(event)

        if (!body.name || !body.mac_address) {
            throw createError({
                statusCode: 400,
                message: 'Name and MAC address are required'
            })
        }

        // Validate MAC address format
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
        if (!macRegex.test(body.mac_address)) {
            throw createError({
                statusCode: 400,
                message: 'Invalid MAC address format (use XX:XX:XX:XX:XX:XX)'
            })
        }

        const host = createWoLHost(body.name, body.mac_address, body.ip_address)

        return {
            success: true,
            host
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
