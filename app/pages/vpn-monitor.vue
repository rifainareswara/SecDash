<script setup lang="ts">
interface VpnClient {
    publicKey: string
    endpoint: string
    transferRx: number
    transferTx: number
    lastActivity: string
}

interface ConnectionLog {
    id: string
    timestamp: string
    clientName: string
    clientPublicKey: string
    clientIp: string
    event: string
    transferRx?: number
    transferTx?: number
    endpoint?: string
}

const activeClients = ref<VpnClient[]>([])
const connectionLogs = ref<ConnectionLog[]>([])
const loading = ref(true)
const autoRefresh = ref(true)
let refreshInterval: NodeJS.Timeout | null = null

// Fetch active clients
async function fetchActiveClients() {
    try {
        const response = await $fetch<{ success: boolean; clients: VpnClient[] }>('/api/vpn-connections?type=active')
        if (response.success) {
            activeClients.value = response.clients
        }
    } catch (err) {
        console.error('Failed to fetch active clients:', err)
    }
}

// Fetch connection logs
async function fetchConnectionLogs() {
    try {
        const response = await $fetch<{ success: boolean; logs: ConnectionLog[] }>('/api/vpn-connections?limit=50')
        if (response.success) {
            connectionLogs.value = response.logs
        }
    } catch (err) {
        console.error('Failed to fetch logs:', err)
    }
}

// Fetch all data
async function fetchAll() {
    await Promise.all([fetchActiveClients(), fetchConnectionLogs()])
    loading.value = false
}

// Format bytes
function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format time
function formatTime(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour12: false })
}

// Get event color
function getEventColor(event: string): string {
    switch (event) {
        case 'connect': return 'text-gray-400'
        case 'disconnect': return 'text-red-400'
        case 'traffic': return 'text-blue-400'
        case 'handshake': return 'text-yellow-400'
        default: return 'text-text-secondary'
    }
}

// Get event icon
function getEventIcon(event: string): string {
    switch (event) {
        case 'connect': return 'login'
        case 'disconnect': return 'logout'
        case 'traffic': return 'swap_vert'
        case 'handshake': return 'handshake'
        default: return 'info'
    }
}

// Auto-refresh control
watch(autoRefresh, (val) => {
    if (val) {
        refreshInterval = setInterval(fetchAll, 5000)
    } else if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
    }
})

onMounted(() => {
    fetchAll()
    refreshInterval = setInterval(fetchAll, 5000)
})

onUnmounted(() => {
    if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
    <div class="space-y-6 md:space-y-8 pb-10">
        <div class="flex items-center justify-between">
            <div class="space-y-1">
                <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">VPN Connections</h2>
                <p class="text-text-secondary text-sm md:text-base">Monitor active VPN clients and connection history.</p>
            </div>
            <label class="flex items-center gap-2 text-sm">
                <input v-model="autoRefresh" type="checkbox" class="accent-primary">
                <span class="text-text-secondary">Auto-refresh</span>
            </label>
        </div>

        <!-- Active Clients Grid -->
        <div class="glass-panel p-6 rounded-xl space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">sensors</span>
                    Active Clients
                </h3>
                <span class="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-bold">
                    {{ activeClients.length }} online
                </span>
            </div>

            <div v-if="loading" class="text-center py-8 text-text-secondary">
                <span class="material-symbols-outlined animate-spin text-4xl">sync</span>
                <p class="mt-2">Loading...</p>
            </div>

            <div v-else-if="activeClients.length === 0" class="text-center py-8 text-text-secondary">
                <span class="material-symbols-outlined text-4xl opacity-50">wifi_off</span>
                <p class="mt-2">No active VPN clients</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="client in activeClients" :key="client.publicKey" class="bg-surface rounded-lg p-4 border border-surface-highlight">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <div class="size-3 rounded-full bg-primary animate-pulse"></div>
                            <span class="text-white font-mono text-xs truncate max-w-[150px]">{{ client.publicKey.substring(0, 20) }}...</span>
                        </div>
                    </div>
                    <div class="space-y-2 text-xs">
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Endpoint:</span>
                            <span class="text-white font-mono">{{ client.endpoint || 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Download:</span>
                            <span class="text-gray-400">↓ {{ formatBytes(client.transferRx) }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-text-secondary">Upload:</span>
                            <span class="text-blue-400">↑ {{ formatBytes(client.transferTx) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Connection History -->
        <div class="glass-panel p-6 rounded-xl space-y-4">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-yellow-400">history</span>
                Connection History
            </h3>

            <div v-if="connectionLogs.length === 0" class="text-center py-8 text-text-secondary">
                <span class="material-symbols-outlined text-4xl opacity-50">event_busy</span>
                <p class="mt-2">No connection events recorded yet</p>
                <p class="text-xs mt-1">Events will appear as clients connect/transfer data</p>
            </div>

            <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
                <div v-for="log in connectionLogs" :key="log.id" class="flex items-center gap-4 p-3 bg-surface rounded-lg border border-surface-highlight">
                    <span :class="getEventColor(log.event)" class="material-symbols-outlined">{{ getEventIcon(log.event) }}</span>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-white font-medium truncate">{{ log.clientName }}</span>
                            <span class="text-xs text-text-secondary font-mono">{{ log.clientIp }}</span>
                        </div>
                        <div class="text-xs text-text-secondary mt-1">
                            <span :class="getEventColor(log.event)" class="capitalize">{{ log.event }}</span>
                            <span v-if="log.transferRx || log.transferTx" class="ml-2">
                                ↓{{ formatBytes(log.transferRx || 0) }} / ↑{{ formatBytes(log.transferTx || 0) }}
                            </span>
                        </div>
                    </div>
                    <span class="text-xs text-text-secondary whitespace-nowrap">{{ formatTime(log.timestamp) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
