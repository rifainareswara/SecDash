<script setup lang="ts">
const { clients, stats, loading, error, fetchStatus, formatBytes, formatHandshake } = useWireGuard()

// System metrics state
interface SystemMetrics {
  uptime: { seconds: number; formatted: string }
  cpu: { load1m: number; load5m: number; load15m: number; percentage: number }
  memory: { total: number; used: number; free: number; percentage: number }
  platform: { hostname: string; platform: string; arch: string; cpuCount: number }
}

const systemMetrics = ref<SystemMetrics | null>(null)
const metricsInterval = ref<NodeJS.Timeout | null>(null)

async function fetchSystemMetrics() {
  try {
    const response = await $fetch<{ success: boolean } & SystemMetrics>('/api/system-metrics')
    if (response.success) {
      systemMetrics.value = response
    }
  } catch (err) {
    console.error('Failed to fetch system metrics:', err)
  }
}

// Fetch data on mount with real-time polling
onMounted(() => {
  fetchStatus()
  fetchSystemMetrics()
  
  // Poll system metrics every 5 seconds
  metricsInterval.value = setInterval(fetchSystemMetrics, 5000)
})

onUnmounted(() => {
  if (metricsInterval.value) {
    clearInterval(metricsInterval.value)
  }
})

const currentPage = ref(1)
const itemsPerPage = 5
const searchQuery = ref('')
const activeFilter = ref('all')

// Computed for filtered and paginated clients
const filteredClients = computed(() => {
  let result = clients.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.virtualIp?.toLowerCase().includes(query)
    )
  }

  // Apply status filter
  if (activeFilter.value !== 'all') {
    result = result.filter(client => client.status === activeFilter.value)
  }

  return result
})

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredClients.value.slice(start, start + itemsPerPage)
})

// Transform clients for DataTable format
const tableClients = computed(() => {
  return paginatedClients.value.map(client => ({
    id: client.id,
    name: client.name,
    publicKey: client.publicKey,
    avatarInitials: client.avatarInitials,
    avatarGradient: client.avatarGradient,
    sourceIp: client.endpoint?.split(':')[0] || 'N/A',
    sourcePort: client.endpoint?.split(':')[1] || 'N/A',
    sourceIcon: client.status === 'active' ? 'public' : client.status === 'recent' ? 'wifi' : 'cloud_off',
    virtualIp: client.virtualIp,
    lastHandshake: formatHandshake(client.lastHandshake || null),
    handshakeStatus: client.status || 'offline',
    downloadData: formatBytes(client.transferRx || 0),
    uploadData: formatBytes(client.transferTx || 0),
    isStale: client.status === 'stale' || client.status === 'offline'
  }))
})

const handleSearch = (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
}

const handleFilter = (filterId: string) => {
  activeFilter.value = filterId
  currentPage.value = 1
}

// Modal state for client config/QR
const isModalOpen = ref(false)
const selectedClientId = ref('')
const selectedClientName = ref('')

const handleQrCode = (clientId: string, clientName: string) => {
  selectedClientId.value = clientId
  selectedClientName.value = clientName
  isModalOpen.value = true
}

const handleDownload = async (clientId: string, clientName: string) => {
  try {
    const response = await $fetch<{ success: boolean; config: string }>(`/api/clients/${clientId}/config`)
    if (response.success) {
      const blob = new Blob([response.config], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clientName.replace(/\s+/g, '_')}.conf`
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (err) {
    console.error('Download failed:', err)
  }
}

const handleEdit = (clientId: string) => {
  console.log('Edit client:', clientId)
  // TODO: Navigate to edit page or open edit modal
}

// Email status
const emailSending = ref(false)
const emailStatus = ref<{ success: boolean; message: string } | null>(null)

const handleEmail = async (clientId: string) => {
  emailSending.value = true
  emailStatus.value = null
  
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/clients/${clientId}/email`, {
      method: 'POST'
    })
    emailStatus.value = { success: response.success, message: response.message }
    setTimeout(() => emailStatus.value = null, 5000)
  } catch (err: any) {
    emailStatus.value = { 
      success: false, 
      message: err.data?.message || err.message || 'Failed to send email'
    }
    setTimeout(() => emailStatus.value = null, 5000)
  } finally {
    emailSending.value = false
  }
}

// Delete confirmation state
const deleteModalOpen = ref(false)
const clientToDelete = ref<{ id: string; name: string } | null>(null)
const isDeleting = ref(false)

const handleDelete = (clientId: string) => {
  const client = clients.value.find(c => c.id === clientId)
  if (client) {
    clientToDelete.value = { id: client.id, name: client.name }
    deleteModalOpen.value = true
  }
}

const confirmDelete = async () => {
  if (!clientToDelete.value) return
  
  isDeleting.value = true
  try {
    const { deleteClient } = useWireGuard()
    const success = await deleteClient(clientToDelete.value.id)
    
    if (success) {
      deleteModalOpen.value = false
      clientToDelete.value = null
      // Show success toast (reusing email status for now, or add a generic toast system)
      emailStatus.value = { success: true, message: 'Client deleted successfully' }
      setTimeout(() => emailStatus.value = null, 3000)
      fetchStatus()
    } else {
       emailStatus.value = { success: false, message: 'Failed to delete client' }
       setTimeout(() => emailStatus.value = null, 3000)
    }
  } catch (err) {
    console.error('Delete failed:', err)
  } finally {
    isDeleting.value = false
  }
}

const closeModal = () => {
  isModalOpen.value = false
  selectedClientId.value = ''
  selectedClientName.value = ''
}

const handlePrevious = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const handleNext = () => {
  if (currentPage.value * itemsPerPage < filteredClients.value.length) {
    currentPage.value++
  }
}

const handleRefresh = () => {
  fetchStatus()
}

const handleExport = () => {
  // Create CSV from clients
  const headers = ['Name', 'Public Key', 'Virtual IP', 'Status', 'Last Handshake', 'Download', 'Upload']
  const rows = clients.value.map(c => [
    c.name,
    c.publicKey,
    c.virtualIp,
    c.status,
    c.lastHandshake || 'Never',
    formatBytes(c.transferRx || 0),
    formatBytes(c.transferTx || 0)
  ])
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wireguard-clients-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Computed for server uptime display
const serverUptime = computed(() => {
  return systemMetrics.value?.uptime?.formatted || 'Loading...'
})

// Computed for CPU load display
const cpuLoad = computed(() => {
  return systemMetrics.value?.cpu?.percentage?.toFixed(1) || '0'
})

// Computed for memory usage
const memoryUsage = computed(() => {
  return systemMetrics.value?.memory?.percentage?.toFixed(1) || '0'
})
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Page Heading -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">
          Security &amp; Access Log
        </h2>
        <p class="text-text-secondary text-sm md:text-base">
          Real-time monitoring of active WireGuard tunnels and traffic.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="flex items-center gap-2 px-4 py-2 bg-surface-highlight hover:bg-[#3a3a3a] text-white rounded-lg text-sm font-medium transition-colors"
          @click="handleExport"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          Export CSV
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-gray-400 text-black rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(160,160,160,0.3)]"
          @click="handleRefresh"
        >
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats Widgets -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsWidget
        icon="dns"
        title="Server Uptime"
        :value="serverUptime"
        :status="{ text: 'Online', variant: 'success', pulse: true }"
      />
      <StatsWidget
        icon="memory"
        title="CPU Load"
        :value="cpuLoad + '%'"
        :sub-value="Number(cpuLoad) < 50 ? 'Normal' : Number(cpuLoad) < 80 ? 'Moderate' : 'High'"
        :status="{ text: (systemMetrics?.platform?.cpuCount || 0) + ' Cores', variant: 'default' }"
        :progress="Number(cpuLoad)"
        progress-variant="primary"
      />
      <StatsWidget
        icon="storage"
        title="RAM Usage"
        :value="memoryUsage + '%'"
        :sub-value="formatBytes(systemMetrics?.memory?.used || 0)"
        :status="{ text: formatBytes(systemMetrics?.memory?.total || 0) + ' Total', variant: 'default' }"
        :progress="Number(memoryUsage)"
        progress-variant="primary"
      />
      <StatsWidget
        icon="hub"
        title="Active Tunnels"
        :value="String(stats.activeTunnels)"
        :sub-value="'/ ' + stats.totalClients"
        :status="{ text: stats.enabledClients + ' enabled', variant: 'success' }"
        :progress="stats.totalClients > 0 ? Math.round((stats.activeTunnels / stats.totalClients) * 100) : 0"
        progress-variant="white"
      />
    </div>

    <!-- Filters & Search -->
    <FilterBar @search="handleSearch" @filter="handleFilter" />

    <!-- Data Table -->
    <div v-if="loading" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading...</p>
    </div>
    
    <div v-else-if="error" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-red-400">error</span>
      <p class="text-red-400 mt-2">{{ error }}</p>
      <button @click="handleRefresh" class="mt-4 px-4 py-2 bg-primary text-black rounded-lg">Retry</button>
    </div>
    
    <DataTable
      v-else
      :clients="tableClients"
      @qr-code="handleQrCode"
      @download="handleDownload"
      @email="handleEmail"
      @edit="handleEdit"
      @delete="handleDelete"
    >
      <template #pagination>
        <Pagination
          :current-page="currentPage"
          :total-items="filteredClients.length"
          :items-per-page="itemsPerPage"
          @previous="handlePrevious"
          @next="handleNext"
        />
      </template>
    </DataTable>
    
    <ClientActionsModal
      :is-open="isModalOpen"
      :client-id="selectedClientId"
      :client-name="selectedClientName"
      @close="closeModal"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      :is-open="deleteModalOpen"
      title="Delete Client"
      :message="`Are you sure you want to delete ${clientToDelete?.name}? This action cannot be undone and will revoke their access immediately.`"
      confirm-text="Delete Client"
      type="danger"
      :loading="isDeleting"
      @close="deleteModalOpen = false"
      @confirm="confirmDelete"
    />
    
    <!-- Email Status Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="emailStatus"
          class="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3"
          :class="emailStatus.success 
            ? 'bg-gray-600 text-white' 
            : 'bg-red-600 text-white'"
        >
          <span class="material-symbols-outlined text-[20px]">
            {{ emailStatus.success ? 'check_circle' : 'error' }}
          </span>
          <span class="text-sm font-medium">{{ emailStatus.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
