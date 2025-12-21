<script setup lang="ts">
import ConfirmationModal from '~/components/ConfirmationModal.vue'

interface MonitoredServer {
  id: string
  name: string
  ip: string
}

interface TrafficLog {
  id: string
  timestamp: string
  clientIp: string
  targetIp: string
  targetPort: string
  protocol: string
  count: number
}

const servers = ref<MonitoredServer[]>([])
const logs = ref<TrafficLog[]>([])
const loading = ref(true)
const loadingLogs = ref(false)
const showAddModal = ref(false)

const newServer = reactive({
  name: '',
  ip: ''
})

// Auto refresh logs
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Delete state
const deleteModalOpen = ref(false)
const serverToDelete = ref<MonitoredServer | null>(null)

async function fetchData() {
  loading.value = true
  try {
    const serverRes = await $fetch<{ success: boolean; servers: MonitoredServer[] }>('/api/monitored-servers')
    if (serverRes.success) {
      servers.value = serverRes.servers
    }
    
    await fetchLogs()
  } catch (err) {
    console.error('Failed to fetch data:', err)
  } finally {
    loading.value = false
  }
}

async function fetchLogs() {
  try {
    const logsRes = await $fetch<{ success: boolean; logs: TrafficLog[] }>('/api/traffic-logs')
    if (logsRes.success) {
      logs.value = logsRes.logs
    }
  } catch (err) {
    console.error('Failed to fetch logs', err)
  }
}

async function addServer() {
  if (!newServer.name || !newServer.ip) return
  
  try {
    const res = await $fetch<{ success: boolean; server: MonitoredServer }>('/api/monitored-servers', {
      method: 'POST',
      body: { name: newServer.name, ip: newServer.ip }
    })
    
    if (res.success) {
      servers.value.push(res.server)
      showAddModal.value = false
      newServer.name = ''
      newServer.ip = ''
    }
  } catch (err) {
    alert('Failed to add server')
  }
}

function confirmDeleteServer(server: MonitoredServer) {
  serverToDelete.value = server
  deleteModalOpen.value = true
}

async function deleteServer() {
  if (!serverToDelete.value) return
  
  try {
    await $fetch('/api/monitored-servers', {
      method: 'DELETE',
      body: { id: serverToDelete.value.id }
    })
    
    servers.value = servers.value.filter(s => s.id !== serverToDelete.value.id)
    serverToDelete.value = null
    deleteModalOpen.value = false
  } catch (err) {
    alert('Failed to delete server')
  }
}

onMounted(() => {
  fetchData()
  refreshInterval.value = setInterval(fetchLogs, 5000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})

// Formatting
const formatTime = (iso: string) => {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-black text-white">Access Control</h2>
        <p class="text-text-secondary">Monitor traffic to your protected servers.</p>
      </div>
      <button 
        @click="showAddModal = true"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-gray-400 text-black rounded-lg text-sm font-bold transition-colors shadow-lg"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        Monitor Server
      </button>
    </div>

    <!-- Monitored Servers List -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="server in servers" :key="server.id" class="glass-panel p-4 rounded-xl flex justify-between items-center group">
        <div>
          <h3 class="font-bold text-white">{{ server.name }}</h3>
          <div class="flex items-center gap-2 text-sm text-text-secondary mt-1">
            <span class="material-symbols-outlined text-[16px]">dns</span>
            <span class="font-mono text-primary/80">{{ server.ip }}</span>
          </div>
        </div>
        <button 
          @click="confirmDeleteServer(server)"
          class="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
        >
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      
      <div v-if="servers.length === 0" class="col-span-full py-8 text-center text-text-secondary border-2 border-dashed border-surface-highlight rounded-xl">
        No monitored servers. Add one to start tracking traffic.
      </div>
    </div>

    <!-- Traffic Logs -->
    <div class="glass-panel rounded-xl overflow-hidden mt-8">
      <div class="p-4 border-b border-surface-highlight flex justify-between items-center">
        <h3 class="font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-gray-400">monitor_heart</span>
          Real-time Traffic Logs
        </h3>
        <span class="text-xs text-text-secondary">Auto-refreshing...</span>
      </div>
      
      <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-highlight/20 sticky top-0 backdrop-blur-md">
            <tr>
              <th class="px-4 py-3 text-text-secondary font-semibold">Time</th>
              <th class="px-4 py-3 text-text-secondary font-semibold">Client IP</th>
              <th class="px-4 py-3 text-text-secondary font-semibold">Target Server</th>
              <th class="px-4 py-3 text-text-secondary font-semibold">Port</th>
              <th class="px-4 py-3 text-text-secondary font-semibold">Protocol</th>
              <th class="px-4 py-3 text-right text-text-secondary font-semibold">Hits</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-highlight">
             <tr v-for="log in logs" :key="log.id" class="hover:bg-surface-highlight/20">
               <td class="px-4 py-3 font-mono text-xs text-text-secondary">{{ formatTime(log.timestamp) }}</td>
               <td class="px-4 py-3 font-mono text-white">{{ log.clientIp }}</td>
               <td class="px-4 py-3 font-mono text-primary">{{ log.targetIp }}</td>
               <td class="px-4 py-3 font-mono text-yellow-400">{{ log.targetPort }}</td>
               <td class="px-4 py-3 text-xs uppercase">{{ log.protocol }}</td>
               <td class="px-4 py-3 text-right font-mono text-text-secondary">{{ log.count }}</td>
             </tr>
             <tr v-if="logs.length === 0">
               <td colspan="6" class="px-4 py-8 text-center text-text-secondary">
                 No traffic detected yet.
               </td>
             </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="bg-surface-dark border border-surface-highlight p-6 rounded-xl w-full max-w-sm">
            <h3 class="text-xl font-bold text-white mb-4">Monitor Server</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-text-secondary mb-1">Server Name</label>
                    <input v-model="newServer.name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. Database Server">
                </div>
                <div>
                    <label class="block text-sm text-text-secondary mb-1">IP Address</label>
                    <input v-model="newServer.ip" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. 192.168.1.50">
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button @click="showAddModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
                <button @click="addServer" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-gray-400">Start Monitoring</button>
            </div>
        </div>
    </div>

    <ConfirmationModal
      :is-open="deleteModalOpen"
      title="Stop Monitoring?"
      :message="`Are you sure you want to stop monitoring ${serverToDelete?.name}? Traffic logs will no longer be collected for this IP.`"
      confirm-text="Stop Monitoring"
      type="warning"
      @close="deleteModalOpen = false"
      @confirm="deleteServer"
    />
  </div>
</template>
