<script setup lang="ts">
const { stats, server, clients, loading, error, fetchStatus, formatBytes } = useWireGuard()

// Auto-refresh every 30 seconds
const refreshInterval = ref<NodeJS.Timeout | null>(null)
const lastRefresh = ref<Date>(new Date())

onMounted(() => {
  fetchStatus()
  refreshInterval.value = setInterval(() => {
    fetchStatus()
    lastRefresh.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

const handleRefresh = () => {
  fetchStatus()
  lastRefresh.value = new Date()
}

// Aggregate stats
const aggregateStats = computed(() => {
  const activeClients = clients.value.filter(c => c.status === 'active' || c.status === 'recent')
  const totalRx = clients.value.reduce((sum, c) => sum + (c.transferRx || 0), 0)
  const totalTx = clients.value.reduce((sum, c) => sum + (c.transferTx || 0), 0)
  
  return {
    activeCount: activeClients.length,
    totalRx,
    totalTx,
    totalTransfer: totalRx + totalTx
  }
})

// Format time ago
const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">
          Connection Status
        </h2>
        <p class="text-text-secondary text-sm md:text-base">
          Real-time monitoring of WireGuard tunnels and traffic.
        </p>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs text-text-secondary">
          Last updated: {{ formatTimeAgo(lastRefresh) }}
        </span>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-green-400 text-black rounded-lg text-sm font-bold transition-colors"
          @click="handleRefresh"
          :disabled="loading"
        >
          <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">refresh</span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !server" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading status...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-red-400">error</span>
      <p class="text-red-400 mt-2">{{ error }}</p>
      <button @click="handleRefresh" class="mt-4 px-4 py-2 bg-primary text-black rounded-lg">Retry</button>
    </div>

    <template v-else>
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Server Status -->
        <div class="glass-panel p-5 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="size-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-green-400">dns</span>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Server Status</p>
              <p class="text-white font-bold">{{ server?.uptime || 'Running' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="size-2 rounded-full bg-green-400 animate-pulse"></div>
            <span class="text-xs text-green-400">Online</span>
          </div>
        </div>

        <!-- Active Tunnels -->
        <div class="glass-panel p-5 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-blue-400">hub</span>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Active Tunnels</p>
              <p class="text-white font-bold text-2xl">{{ aggregateStats.activeCount }}</p>
            </div>
          </div>
          <p class="text-xs text-text-secondary">of {{ stats.totalClients }} total clients</p>
        </div>

        <!-- Download -->
        <div class="glass-panel p-5 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-purple-400">download</span>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Total Download</p>
              <p class="text-white font-bold text-2xl">{{ formatBytes(aggregateStats.totalRx) }}</p>
            </div>
          </div>
          <p class="text-xs text-text-secondary">Received data</p>
        </div>

        <!-- Upload -->
        <div class="glass-panel p-5 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="size-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-orange-400">upload</span>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Total Upload</p>
              <p class="text-white font-bold text-2xl">{{ formatBytes(aggregateStats.totalTx) }}</p>
            </div>
          </div>
          <p class="text-xs text-text-secondary">Transmitted data</p>
        </div>
      </div>

      <!-- Server Info -->
      <div class="glass-panel p-6 rounded-xl">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">settings_ethernet</span>
          Server Configuration
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-surface/50 p-4 rounded-lg">
            <p class="text-xs text-text-secondary mb-1">Listen Port</p>
            <p class="text-white font-mono">:{{ server?.listenPort || 51820 }}</p>
          </div>
          <div class="bg-surface/50 p-4 rounded-lg">
            <p class="text-xs text-text-secondary mb-1">Interface Address</p>
            <p class="text-white font-mono text-sm">{{ server?.address || '-' }}</p>
          </div>
          <div class="bg-surface/50 p-4 rounded-lg">
            <p class="text-xs text-text-secondary mb-1">Public Key</p>
            <p class="text-white font-mono text-sm truncate">{{ server?.publicKey || '-' }}</p>
          </div>
          <div class="bg-surface/50 p-4 rounded-lg">
            <p class="text-xs text-text-secondary mb-1">Total Clients</p>
            <p class="text-white font-mono">{{ stats.totalClients }}</p>
          </div>
        </div>
      </div>

      <!-- Active Connections Table -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="p-5 border-b border-surface-highlight">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">lan</span>
            Client Connections
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-[#1a351a]">
              <tr>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Client</th>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Virtual IP</th>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Endpoint</th>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase">Status</th>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase text-right">Download</th>
                <th class="px-6 py-3 text-xs font-semibold text-text-secondary uppercase text-right">Upload</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-highlight">
              <tr 
                v-for="client in clients" 
                :key="client.id"
                class="hover:bg-surface-highlight/40 transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div 
                      class="size-8 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="client.enabled 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                        : 'bg-gray-600 text-gray-300'"
                    >
                      {{ client.avatarInitials }}
                    </div>
                    <span class="text-white font-medium">{{ client.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                    {{ client.virtualIp }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-secondary text-sm font-mono">
                  {{ client.endpoint || '-' }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div 
                      class="size-2 rounded-full"
                      :class="{
                        'bg-green-400 animate-pulse': client.status === 'active',
                        'bg-green-400': client.status === 'recent',
                        'bg-yellow-500': client.status === 'stale',
                        'bg-gray-500': client.status === 'offline'
                      }"
                    ></div>
                    <span 
                      class="text-xs capitalize"
                      :class="{
                        'text-green-400': client.status === 'active' || client.status === 'recent',
                        'text-yellow-500': client.status === 'stale',
                        'text-gray-500': client.status === 'offline'
                      }"
                    >
                      {{ client.status || 'offline' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-white text-sm">{{ formatBytes(client.transferRx || 0) }}</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-white text-sm">{{ formatBytes(client.transferTx || 0) }}</span>
                </td>
              </tr>
              
              <tr v-if="clients.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-text-secondary">
                  No clients configured
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
