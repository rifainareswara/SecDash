import { getClients, checkDatabaseExists, initDatabase, type WGClient } from '../../utils/database'

export default defineEventHandler(() => {
    try {
        // Initialize database if needed
        if (!checkDatabaseExists()) {
            initDatabase()
        }

        const clients = getClients()

        // Transform to frontend format
        const formattedClients = clients.map((client: WGClient, index: number) => ({
            id: client.id,
            name: client.name || `Client ${index + 1}`,
            email: client.email || '',
            publicKey: client.public_key?.substring(0, 4) || '',
            fullPublicKey: client.public_key,
            avatarInitials: getInitials(client.name || `Client ${index + 1}`),
            avatarGradient: getGradient(index),
            virtualIp: Array.isArray(client.allocated_ips) ? client.allocated_ips.join(', ') : client.allocated_ips,
            allowedIps: Array.isArray(client.allowed_ips) ? client.allowed_ips.join(', ') : client.allowed_ips,
            enabled: client.enabled,
            createdAt: client.created_at,
            updatedAt: client.updated_at
        }))

        return {
            success: true,
            clients: formattedClients,
            total: formattedClients.length
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            clients: [],
            total: 0
        }
    }
})

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
}

function getGradient(index: number): string {
    const gradients = [
        'from-blue-500 to-purple-500',
        'from-orange-500 to-red-500',
        'from-green-600 to-teal-600',
        'from-indigo-500 to-purple-600',
        'from-pink-500 to-rose-500',
        'from-cyan-500 to-blue-500',
        'from-amber-500 to-orange-500',
        'from-emerald-500 to-green-600'
    ]
    return gradients[index % gradients.length]
}
