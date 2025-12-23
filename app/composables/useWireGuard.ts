export interface VpnClient {
    id: string
    name: string
    email?: string
    publicKey: string
    fullPublicKey?: string
    avatarInitials: string
    avatarGradient: string
    virtualIp: string
    allowedIps?: string
    enabled: boolean
    status?: 'active' | 'recent' | 'stale' | 'offline'
    endpoint?: string | null
    lastHandshake?: string | null
    transferRx?: number
    transferTx?: number
    createdAt?: string
    updatedAt?: string
    // 2FA fields
    require_2fa?: boolean
    session_expires_at?: string
}

export interface ServerStats {
    totalClients: number
    enabledClients: number
    activeTunnels: number
    totalTransferRx: number
    totalTransferTx: number
}

export interface ServerInfo {
    address: string
    listenPort: number
    publicKey: string
    uptime: string
}

export function useWireGuard() {
    const clients = ref<VpnClient[]>([])
    const stats = ref<ServerStats>({
        totalClients: 0,
        enabledClients: 0,
        activeTunnels: 0,
        totalTransferRx: 0,
        totalTransferTx: 0
    })
    const server = ref<ServerInfo | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchClients() {
        loading.value = true
        error.value = null

        try {
            const response = await $fetch<{
                success: boolean
                clients: VpnClient[]
                total: number
                error?: string
            }>('/api/clients')

            if (response.success) {
                clients.value = response.clients
            } else {
                error.value = response.error || 'Failed to fetch clients'
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
        } finally {
            loading.value = false
        }
    }

    async function fetchStatus() {
        loading.value = true
        error.value = null

        try {
            const response = await $fetch<{
                success: boolean
                server: ServerInfo | null
                stats: ServerStats
                clients: VpnClient[]
                error?: string
            }>('/api/status')

            if (response.success) {
                server.value = response.server
                stats.value = response.stats
                clients.value = response.clients
            } else {
                error.value = response.error || 'Failed to fetch status'
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
        } finally {
            loading.value = false
        }
    }

    async function fetchClient(id: string) {
        loading.value = true
        error.value = null

        try {
            const response = await $fetch<{
                success: boolean
                client: VpnClient
                error?: string
            }>(`/api/clients/${id}`)

            if (response.success) {
                return response.client
            } else {
                error.value = response.error || 'Failed to fetch client'
                return null
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
            return null
        } finally {
            loading.value = false
        }
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    function formatHandshake(timestamp: string | null): string {
        if (!timestamp) return 'Never'

        const date = new Date(timestamp)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
        return `${Math.floor(diff / 86400)} days ago`
    }

    async function createClient(name: string, email?: string) {
        loading.value = true
        error.value = null
        try {
            const response = await $fetch<{ success: boolean; client: VpnClient; error?: string }>('/api/clients', {
                method: 'POST',
                body: { name, email }
            })
            if (response.success) {
                clients.value.push(response.client)
                return true
            } else {
                error.value = response.error || 'Failed to create client'
                return false
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
            return false
        } finally {
            loading.value = false
        }
    }

    async function deleteClient(id: string) {
        // Confirmation is handled by the UI component now

        loading.value = true
        error.value = null
        try {
            const response = await $fetch<{ success: boolean; error?: string }>(`/api/clients/${id}`, {
                method: 'DELETE'
            })
            if (response.success) {
                // Use splice for guaranteed reactivity
                const index = clients.value.findIndex(c => c.id === id)
                if (index !== -1) {
                    clients.value.splice(index, 1)
                }
                // Fetch latest state to be safe (e.g. if others added clients)
                await fetchClients()
                return true
            } else {
                error.value = response.error || 'Failed to delete client'
                return false
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
            return false
        } finally {
            loading.value = false
        }
    }

    async function getClientConfig(id: string) {
        loading.value = true
        error.value = null
        try {
            const response = await $fetch<{ success: boolean; config: string; qrCode: string; error?: string }>(`/api/clients/${id}/config`)
            if (response.success) {
                return { config: response.config, qrCode: response.qrCode }
            } else {
                error.value = response.error || 'Failed to get client config'
                return null
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
            return null
        } finally {
            loading.value = false
        }
    }

    async function updateServerConfig(serverConfig: any, globalSettings: any) {
        loading.value = true
        error.value = null
        try {
            const response = await $fetch<{ success: boolean; error?: string }>('/api/server/config', {
                method: 'POST',
                body: { server: serverConfig, global: globalSettings }
            })
            if (response.success) {
                return true
            } else {
                error.value = response.error || 'Failed to update configuration'
                return false
            }
        } catch (err: any) {
            error.value = err.message || 'Network error'
            return false
        } finally {
            loading.value = false
        }
    }

    return {
        clients,
        stats,
        server,
        loading,
        error,
        fetchClients,
        fetchStatus,
        fetchClient,
        formatBytes,
        formatHandshake,
        createClient,
        deleteClient,
        getClientConfig,
        updateServerConfig
    }
}
