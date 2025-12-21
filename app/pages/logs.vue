<script setup lang="ts">
interface AccessLog {
  id: string
  timestamp: string
  ip: string
  method: string
  path: string
  userAgent: string
  browser: string
  os: string
  device: string
}

const logs = ref<AccessLog[]>([])
const loading = ref(true)
const autoRefresh = ref(true)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

async function fetchLogs() {
  try {
    const response = await $fetch<{ success: boolean; logs: AccessLog[] }>('/api/access-logs?limit=100')
    if (response.success) {
      logs.value = response.logs
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  refreshInterval.value = setInterval(fetchLogs, 2000) // Refresh every 2 seconds
}

function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

async function clearLogs() {
  if (!confirm('Clear all access logs?')) return
  try {
    await $fetch('/api/access-logs', { method: 'DELETE' })
    logs.value = []
  } catch (err) {
    console.error('Failed to clear logs:', err)
  }
}

watch(autoRefresh, (val) => {
  if (val) startAutoRefresh()
  else stopAutoRefresh()
})

onMounted(() => {
  fetchLogs()
  if (autoRefresh.value) startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Browser icon
const getBrowserIcon = (browser: string) => {
  const icons: Record<string, string> = {
    'Chrome': '🌐',
    'Firefox': '🦊',
    'Safari': '🧭',
    'Edge': '🔷',
    'Opera': '🔴',
    'Unknown': '❓'
  }
  return icons[browser] || '🌐'
}

// Device icon
const getDeviceIcon = (device: string) => {
  const icons: Record<string, string> = {
    'Desktop': 'computer',
    'Mobile': 'smartphone',
    'Tablet': 'tablet'
  }
  return icons[device] || 'devices'
}

// Format time
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

// Method color
const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    'GET': 'text-gray-400 bg-gray-500/20',
    'POST': 'text-blue-400 bg-blue-500/20',
    'PUT': 'text-yellow-400 bg-yellow-500/20',
    'PATCH': 'text-orange-400 bg-orange-500/20',
    'DELETE': 'text-red-400 bg-red-500/20'
  }
  return colors[method] || 'text-gray-400 bg-gray-500/20'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">
          Access Logs
        </h2>
        <p class="text-text-secondary text-sm">
          Real-time monitoring of all incoming requests.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="autoRefresh" type="checkbox" class="w-4 h-4 accent-primary">
          <span class="text-sm text-text-secondary">Auto-refresh</span>
        </label>
        <button
          @click="fetchLogs"
          class="flex items-center gap-2 px-3 py-2 bg-surface-highlight hover:bg-[#3a3a3a] text-white rounded-lg text-sm transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">refresh</span>
        </button>
        <button
          @click="clearLogs"
          class="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">delete</span>
          Clear
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Total Requests</p>
        <p class="text-white text-2xl font-bold">{{ logs.length }}</p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Unique IPs</p>
        <p class="text-white text-2xl font-bold">{{ new Set(logs.map(l => l.ip)).size }}</p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Top Browser</p>
        <p class="text-white text-lg font-bold">
          {{ logs.length ? logs.reduce((acc, l) => {
            acc[l.browser] = (acc[l.browser] || 0) + 1
            return acc
          }, {} as Record<string, number>)?.Chrome ? 'Chrome' : logs[0]?.browser || '-' : '-' }}
        </p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Live Status</p>
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full" :class="autoRefresh ? 'bg-gray-400 animate-pulse' : 'bg-gray-500'"></div>
          <span class="text-white text-lg font-bold">{{ autoRefresh ? 'Live' : 'Paused' }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading logs...</p>
    </div>

    <!-- Logs Table -->
    <div v-else class="glass-panel rounded-xl overflow-hidden">
      <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-[#1a1a1a] sticky top-0">
            <tr>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Time</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">IP Address</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Method</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Path</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Browser</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Device</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-highlight">
            <tr 
              v-for="log in logs" 
              :key="log.id"
              class="hover:bg-surface-highlight/40 transition-colors"
            >
              <td class="px-4 py-3 text-text-secondary font-mono text-xs">
                {{ formatTime(log.timestamp) }}
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                  {{ log.ip }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getMethodColor(log.method)">
                  {{ log.method }}
                </span>
              </td>
              <td class="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate">
                {{ log.path }}
              </td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-1 text-xs text-white">
                  <span>{{ getBrowserIcon(log.browser) }}</span>
                  {{ log.browser }}
                </span>
                <span class="text-xs text-text-secondary">{{ log.os }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-1 text-xs text-text-secondary">
                  <span class="material-symbols-outlined text-[16px]">{{ getDeviceIcon(log.device) }}</span>
                  {{ log.device }}
                </span>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-text-secondary">
                No access logs yet. Requests will appear here in real-time.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
