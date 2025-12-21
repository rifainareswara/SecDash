export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const target = query.target as string || 'http://101.47.128.101:5000'

    try {
        const start = Date.now()
        // Set a short timeout to avoid hanging
        await $fetch(target, {
            method: 'HEAD',
            timeout: 2000,
            onResponseError: () => {
                // Ignore errors, we just want to know if it's reachable or explicitly refused
                // actually if it errors it might still be "reachable" as a server but returning 404 etc.
            }
        })
        const latency = Date.now() - start

        return {
            success: true,
            latency,
            message: 'Service is reachable'
        }
    } catch (error: any) {
        // Distinguish between connectivity errors and HTTP errors
        // If we get an HTTP error (e.g., 404, 403), the service IS reachable.
        // If we get a network error (ECONNREFUSED, ETIMEDOUT), it is NOT.
        if (error.response) {
            return {
                success: true,
                latency: 0,
                message: 'Service is reachable (returned HTTP error)'
            }
        }

        return {
            success: false,
            error: error.message,
            message: 'Service is unreachable'
        }
    }
})
