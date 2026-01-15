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
  deviceFingerprint: string
  username?: string
  sessionId?: string
  acceptLanguage?: string
  referer?: string
}

interface AccessLogStats {
  totalRequests: number
  uniqueIPs: number
  uniqueDevices: number
  topPaths: { path: string; count: number }[]
  topDevices: { fingerprint: string; browser: string; os: string; device: string; count: number }[]
  period: string
}

const logs = ref<AccessLog[]>([])
const stats = ref<AccessLogStats | null>(null)
const loading = ref(true)
const autoRefresh = ref(true)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Filters
const filterIP = ref('')
const filterFingerprint = ref('')
const filterPath = ref('')

async function fetchLogs() {
  try {
    const params = new URLSearchParams()
    params.append('limit', '200')
    if (filterIP.value) params.append('ip', filterIP.value)
    if (filterFingerprint.value) params.append('device_fingerprint', filterFingerprint.value)
    if (filterPath.value) params.append('path', filterPath.value)

    const response = await $fetch<{ success: boolean; logs: AccessLog[] }>(`/api/access-logs?${params.toString()}`)
    if (response.success) {
      logs.value = response.logs
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const response = await $fetch<{ success: boolean; stats: AccessLogStats }>('/api/access-logs/stats?days=7')
    if (response.success) {
      stats.value = response.stats
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  }
}

function startAutoRefresh() {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  refreshInterval.value = setInterval(fetchLogs, 3000)
}

function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

async function clearLogs() {
  if (!confirm('Hapus semua access logs lama (lebih dari 30 hari)?')) return
  try {
    await $fetch('/api/access-logs', { method: 'DELETE', body: { days_to_keep: 0 } })
    await fetchLogs()
    await fetchStats()
  } catch (err) {
    console.error('Failed to clear logs:', err)
  }
}

function filterByFingerprint(fp: string) {
  filterFingerprint.value = fp
  fetchLogs()
}

function clearFilters() {
  filterIP.value = ''
  filterFingerprint.value = ''
  filterPath.value = ''
  fetchLogs()
}

watch(autoRefresh, (val) => {
  if (val) startAutoRefresh()
  else stopAutoRefresh()
})

onMounted(() => {
  fetchLogs()
  fetchStats()
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
  const date = new Date(timestamp)
  return {
    time: date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }
}

// Method color
const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    'GET': 'text-blue-400 bg-blue-500/20',
    'POST': 'text-green-400 bg-green-500/20',
    'PUT': 'text-yellow-400 bg-yellow-500/20',
    'PATCH': 'text-orange-400 bg-orange-500/20',
    'DELETE': 'text-red-400 bg-red-500/20'
  }
  return colors[method] || 'text-blue-400 bg-blue-500/20'
}

// Short fingerprint display
const shortFingerprint = (fp: string) => fp?.substring(0, 8) || '-'
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
          Monitoring aktivitas akses dengan tracking device untuk audit dan forensik.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="autoRefresh" type="checkbox" class="w-4 h-4 accent-primary">
          <span class="text-sm text-text-secondary">Auto-refresh</span>
        </label>
        <button
          @click="fetchLogs"
          class="flex items-center gap-2 px-3 py-2 bg-surface-highlight hover:bg-[#2a2a3a] text-white rounded-lg text-sm transition-colors"
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
        <p class="text-text-secondary text-xs">Total Requests (7d)</p>
        <p class="text-white text-2xl font-bold">{{ stats?.totalRequests || logs.length }}</p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Unique IPs</p>
        <p class="text-white text-2xl font-bold">{{ stats?.uniqueIPs || new Set(logs.map(l => l.ip)).size }}</p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Unique Devices</p>
        <p class="text-white text-2xl font-bold">{{ stats?.uniqueDevices || new Set(logs.map(l => l.deviceFingerprint)).size }}</p>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <p class="text-text-secondary text-xs">Live Status</p>
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full" :class="autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-500'"></div>
          <span class="text-white text-lg font-bold">{{ autoRefresh ? 'Live' : 'Paused' }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="glass-panel p-4 rounded-xl">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-text-secondary text-sm font-medium">Filters:</span>
        <input 
          v-model="filterIP" 
          @input="fetchLogs"
          placeholder="IP Address" 
          class="px-3 py-1.5 bg-surface text-white text-sm rounded-lg border border-surface-highlight focus:border-primary outline-none w-36"
        >
        <input 
          v-model="filterFingerprint" 
          @input="fetchLogs"
          placeholder="Device ID" 
          class="px-3 py-1.5 bg-surface text-white text-sm rounded-lg border border-surface-highlight focus:border-primary outline-none w-36"
        >
        <input 
          v-model="filterPath" 
          @input="fetchLogs"
          placeholder="Path" 
          class="px-3 py-1.5 bg-surface text-white text-sm rounded-lg border border-surface-highlight focus:border-primary outline-none w-40"
        >
        <button 
          v-if="filterIP || filterFingerprint || filterPath"
          @click="clearFilters"
          class="px-3 py-1.5 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Top Devices (collapse/expand) -->
    <details class="glass-panel rounded-xl" v-if="stats?.topDevices?.length">
      <summary class="px-4 py-3 cursor-pointer text-white font-semibold flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px]">devices</span>
        Top Devices ({{ stats.topDevices.length }})
      </summary>
      <div class="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div 
          v-for="device in stats.topDevices" 
          :key="device.fingerprint"
          class="bg-surface-highlight/50 p-3 rounded-lg cursor-pointer hover:bg-surface-highlight transition-colors"
          @click="filterByFingerprint(device.fingerprint)"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">{{ getDeviceIcon(device.device) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium text-sm truncate">{{ device.browser }} / {{ device.os }}</p>
              <p class="text-text-secondary text-xs font-mono">ID: {{ shortFingerprint(device.fingerprint) }}</p>
            </div>
            <span class="text-primary font-bold">{{ device.count }}</span>
          </div>
        </div>
      </div>
    </details>

    <!-- Loading -->
    <div v-if="loading" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading logs...</p>
    </div>

    <!-- Logs Table -->
    <div v-else class="glass-panel rounded-xl overflow-hidden">
      <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-[#12121a] sticky top-0">
            <tr>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Time</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">IP Address</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Device ID</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Method</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Path</th>
              <th class="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Browser/OS</th>
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
                <div>{{ formatTime(log.timestamp).time }}</div>
                <div class="text-[10px] opacity-60">{{ formatTime(log.timestamp).date }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                  {{ log.ip }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button 
                  @click="filterByFingerprint(log.deviceFingerprint)"
                  class="font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded text-xs hover:bg-purple-500/20 transition-colors"
                  :title="log.deviceFingerprint"
                >
                  {{ shortFingerprint(log.deviceFingerprint) }}
                </button>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getMethodColor(log.method)">
                  {{ log.method }}
                </span>
              </td>
              <td class="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate" :title="log.path">
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
              <td colspan="7" class="px-4 py-8 text-center text-text-secondary">
                Belum ada access logs. Request akan muncul di sini secara real-time.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
