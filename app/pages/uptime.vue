<script setup lang="ts">
import ConfirmationModal from '~/components/ConfirmationModal.vue'

interface UptimeStats {
  uptime_24h: number
  uptime_7d: number
  uptime_30d: number
  avg_response_time: number
  last_check: string | null
  current_status: 'up' | 'down' | 'unknown'
}

interface UptimeLog {
  status: 'up' | 'down'
  timestamp: string
  response_time: number
}

interface Monitor {
  id: string
  name: string
  url: string
  type: 'http' | 'ping' | 'port'
  method?: string
  port?: number
  interval: number
  timeout: number
  enabled: boolean
  stats: UptimeStats
  recentLogs: UptimeLog[]
}

const monitors = ref<Monitor[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const showEditModal = ref(false)
const deleteModalOpen = ref(false)
const monitorToDelete = ref<Monitor | null>(null)
const editingMonitor = ref<Monitor | null>(null)

const newMonitor = reactive({
  name: '',
  url: '',
  type: 'http' as 'http' | 'ping' | 'port',
  method: 'GET',
  interval: 60,
  timeout: 10
})

// Auto refresh
const refreshInterval = ref<NodeJS.Timeout | null>(null)

async function fetchMonitors() {
  try {
    const res = await $fetch<{ success: boolean; monitors: Monitor[] }>('/api/monitors')
    if (res.success) {
      monitors.value = res.monitors
    }
  } catch (err) {
    console.error('Failed to fetch monitors:', err)
  } finally {
    loading.value = false
  }
}

async function createMonitor() {
  if (!newMonitor.name || !newMonitor.url) return
  
  try {
    const res = await $fetch<{ success: boolean; monitor: Monitor }>('/api/monitors', {
      method: 'POST',
      body: newMonitor
    })
    
    if (res.success) {
      await fetchMonitors()
      showAddModal.value = false
      resetForm()
    }
  } catch (err) {
    alert('Failed to create monitor')
  }
}

async function updateMonitor() {
  if (!editingMonitor.value) return
  
  try {
    const res = await $fetch<{ success: boolean }>('/api/monitors', {
      method: 'PUT',
      body: editingMonitor.value
    })
    
    if (res.success) {
      await fetchMonitors()
      showEditModal.value = false
      editingMonitor.value = null
    }
  } catch (err) {
    alert('Failed to update monitor')
  }
}

function confirmDelete(monitor: Monitor) {
  monitorToDelete.value = monitor
  deleteModalOpen.value = true
}

async function deleteMonitor() {
  if (!monitorToDelete.value) return
  
  try {
    await $fetch('/api/monitors', {
      method: 'DELETE',
      body: { id: monitorToDelete.value.id }
    })
    
    await fetchMonitors()
    deleteModalOpen.value = false
    monitorToDelete.value = null
  } catch (err) {
    alert('Failed to delete monitor')
  }
}

function editMonitor(monitor: Monitor) {
  editingMonitor.value = { ...monitor }
  showEditModal.value = true
}

function resetForm() {
  newMonitor.name = ''
  newMonitor.url = ''
  newMonitor.type = 'http'
  newMonitor.method = 'GET'
  newMonitor.interval = 60
  newMonitor.timeout = 10
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'up': return 'bg-green-500'
    case 'down': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function getUptimeColor(uptime: number): string {
  if (uptime >= 99) return 'text-green-400'
  if (uptime >= 95) return 'text-yellow-400'
  return 'text-red-400'
}

function formatLastCheck(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  const diff = Date.now() - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// Stats summary
const summaryStats = computed(() => {
  const total = monitors.value.length
  const up = monitors.value.filter(m => m.stats?.current_status === 'up').length
  const down = monitors.value.filter(m => m.stats?.current_status === 'down').length
  const avgResponse = monitors.value.length > 0
    ? Math.round(monitors.value.reduce((sum, m) => sum + (m.stats?.avg_response_time || 0), 0) / monitors.value.length)
    : 0
  
  return { total, up, down, avgResponse }
})

onMounted(() => {
  fetchMonitors()
  refreshInterval.value = setInterval(fetchMonitors, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-black text-white">Uptime Monitor</h2>
        <p class="text-text-secondary">Monitor your servers and services status.</p>
      </div>
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-green-400 text-black rounded-lg text-sm font-bold transition-colors shadow-lg"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        Add Monitor
      </button>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-panel p-4 rounded-xl">
        <div class="text-2xl font-bold text-white">{{ summaryStats.total }}</div>
        <div class="text-sm text-text-secondary">Total Monitors</div>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <div class="text-2xl font-bold text-green-400">{{ summaryStats.up }}</div>
        <div class="text-sm text-text-secondary">Up</div>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <div class="text-2xl font-bold text-red-400">{{ summaryStats.down }}</div>
        <div class="text-sm text-text-secondary">Down</div>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <div class="text-2xl font-bold text-blue-400">{{ summaryStats.avgResponse }}ms</div>
        <div class="text-sm text-text-secondary">Avg Response</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Monitors Grid -->
    <div v-else class="space-y-4">
      <!-- Empty State -->
      <div v-if="monitors.length === 0" class="glass-panel rounded-xl p-12 text-center">
        <span class="material-symbols-outlined text-6xl text-text-secondary mb-4">monitoring</span>
        <h3 class="text-xl font-bold text-white mb-2">No Monitors Yet</h3>
        <p class="text-text-secondary mb-4">Add your first monitor to start tracking uptime.</p>
        <button 
          @click="showAddModal = true"
          class="px-4 py-2 bg-primary text-black font-bold rounded-lg"
        >
          Add Monitor
        </button>
      </div>

      <!-- Monitor Cards -->
      <div v-for="monitor in monitors" :key="monitor.id" class="glass-panel rounded-xl overflow-hidden">
        <div class="p-4">
          <div class="flex items-start justify-between gap-4">
            <!-- Left: Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <!-- Status Indicator -->
                <div 
                  :class="[
                    'w-3 h-3 rounded-full animate-pulse',
                    getStatusColor(monitor.stats?.current_status || 'unknown')
                  ]"
                ></div>
                <h3 class="text-lg font-bold text-white truncate">{{ monitor.name }}</h3>
                <span class="px-2 py-0.5 text-xs font-medium rounded bg-surface-highlight text-text-secondary uppercase">
                  {{ monitor.type }}
                </span>
              </div>
              <p class="text-sm text-text-secondary truncate font-mono">{{ monitor.url }}</p>
            </div>

            <!-- Right: Stats -->
            <div class="flex items-center gap-6 text-right">
              <div>
                <div :class="['text-xl font-bold', getUptimeColor(monitor.stats?.uptime_24h || 0)]">
                  {{ monitor.stats?.uptime_24h || 0 }}%
                </div>
                <div class="text-xs text-text-secondary">24h Uptime</div>
              </div>
              <div>
                <div class="text-xl font-bold text-blue-400">
                  {{ monitor.stats?.avg_response_time || 0 }}ms
                </div>
                <div class="text-xs text-text-secondary">Avg Response</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-text-secondary">
                  {{ formatLastCheck(monitor.stats?.last_check) }}
                </div>
                <div class="text-xs text-text-secondary">Last Check</div>
              </div>
              
              <!-- Actions -->
              <div class="flex gap-1">
                <button 
                  @click="editMonitor(monitor)"
                  class="p-2 hover:bg-surface-highlight text-text-secondary hover:text-white rounded-lg transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button 
                  @click="confirmDelete(monitor)"
                  class="p-2 hover:bg-red-500/20 text-text-secondary hover:text-red-400 rounded-lg transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="mt-4 flex gap-0.5">
            <div 
              v-for="(log, idx) in (monitor.recentLogs || []).slice(0, 90)" 
              :key="idx"
              :class="[
                'h-8 flex-1 rounded-sm transition-colors',
                log.status === 'up' ? 'bg-green-500/60 hover:bg-green-500' : 'bg-red-500/60 hover:bg-red-500'
              ]"
              :title="`${new Date(log.timestamp).toLocaleTimeString()} - ${log.status.toUpperCase()} (${log.response_time}ms)`"
            ></div>
            <!-- Fill empty slots -->
            <div 
              v-for="i in Math.max(0, 90 - (monitor.recentLogs?.length || 0))"
              :key="'empty-' + i"
              class="h-8 flex-1 rounded-sm bg-surface-highlight/30"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-surface-dark border border-surface-highlight p-6 rounded-xl w-full max-w-md">
        <h3 class="text-xl font-bold text-white mb-4">Add Monitor</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-secondary mb-1">Name</label>
            <input v-model="newMonitor.name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. Production API">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">URL / Host</label>
            <input v-model="newMonitor.url" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. https://api.example.com/health">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-text-secondary mb-1">Type</label>
              <select v-model="newMonitor.type" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                <option value="http">HTTP(s)</option>
                <option value="ping">Ping (ICMP)</option>
                <option value="port">TCP Port</option>
              </select>
            </div>
            <div v-if="newMonitor.type === 'http'">
              <label class="block text-sm text-text-secondary mb-1">Method</label>
              <select v-model="newMonitor.method" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-text-secondary mb-1">Interval (seconds)</label>
              <input v-model.number="newMonitor.interval" type="number" min="30" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-sm text-text-secondary mb-1">Timeout (seconds)</label>
              <input v-model.number="newMonitor.timeout" type="number" min="1" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddModal = false; resetForm()" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="createMonitor" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-green-400">Add Monitor</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal && editingMonitor" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-surface-dark border border-surface-highlight p-6 rounded-xl w-full max-w-md">
        <h3 class="text-xl font-bold text-white mb-4">Edit Monitor</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-secondary mb-1">Name</label>
            <input v-model="editingMonitor.name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">URL / Host</label>
            <input v-model="editingMonitor.url" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-text-secondary mb-1">Interval (seconds)</label>
              <input v-model.number="editingMonitor.interval" type="number" min="30" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-sm text-text-secondary mb-1">Timeout (seconds)</label>
              <input v-model.number="editingMonitor.timeout" type="number" min="1" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              v-model="editingMonitor.enabled"
              id="enabled"
              class="w-4 h-4 rounded border-surface-highlight"
            >
            <label for="enabled" class="text-sm text-text-secondary">Enabled</label>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showEditModal = false; editingMonitor = null" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="updateMonitor" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-green-400">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmationModal
      :is-open="deleteModalOpen"
      title="Delete Monitor?"
      :message="`Are you sure you want to delete '${monitorToDelete?.name}'? All uptime history will be lost.`"
      confirm-text="Delete"
      type="danger"
      @close="deleteModalOpen = false"
      @confirm="deleteMonitor"
    />
  </div>
</template>
