import { getMonitoredServers, saveMonitoredServers } from '../utils/trafficMonitor'

export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    if (method === 'GET') {
        return {
            success: true,
            servers: getMonitoredServers()
        }
    }

    if (method === 'POST') {
        const body = await readBody(event)
        const { name, ip } = body

        if (!name || !ip) {
            throw createError({ statusCode: 400, message: 'Name and IP required' })
        }

        const servers = getMonitoredServers()
        const newServer = {
            id: Date.now().toString(),
            name,
            ip
        }
        servers.push(newServer)
        saveMonitoredServers(servers)

        return { success: true, server: newServer }
    }

    if (method === 'DELETE') {
        const body = await readBody(event)
        const { id } = body

        const servers = getMonitoredServers()
        const filtered = servers.filter(s => s.id !== id)

        saveMonitoredServers(filtered)
        return { success: true }
    }
})
