<script setup lang="ts">
const { clients, loading, error, fetchClients, createClient, deleteClient, getClientConfig } = useWireGuard()

// Fetch data on mount
onMounted(() => {
  fetchClients()
})

const showAddModal = ref(false)
const showQRModal = ref(false)
const newClient = reactive({
  name: '',
  email: ''
})
const currentQR = ref<{ config: string, qrCode: string } | null>(null)

const handleAddClient = async () => {
    if (!newClient.name) return
    const success = await createClient(newClient.name, newClient.email)
    if (success) {
        showAddModal.value = false
        newClient.name = ''
        newClient.email = ''
    }
}

// Delete confirmation state
const deleteModalOpen = ref(false)
const clientToDelete = ref<{ id: string; name: string } | null>(null)
const isDeleting = ref(false)

const handleDeleteClient = (id: string, name: string) => {
    clientToDelete.value = { id, name }
    deleteModalOpen.value = true
}

const confirmDelete = async () => {
    if (!clientToDelete.value) return

    isDeleting.value = true
    try {
        const success = await deleteClient(clientToDelete.value.id)
        if (success) {
            deleteModalOpen.value = false
            clientToDelete.value = null
            // Reload not strictly necessary if clients list is reactive, but safe to keep if preferred
            // Assuming clients list updates via fetchClients called internally or we call it again
            await fetchClients() 
        } else {
            alert(error.value || 'Failed to delete client')
        }
    } catch (err) {
        console.error('Delete failed:', err)
        alert('An unexpected error occurred')
    } finally {
        isDeleting.value = false
    }
}

const handleShowConfig = async (id: string) => {
    const config = await getClientConfig(id)
    if (config) {
        currentQR.value = config
        showQRModal.value = true
    }
}

const downloadConfig = () => {
    if (!currentQR.value) return
    const blob = new Blob([currentQR.value.config], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wg-client.conf'
    a.click()
    URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <div class="flex items-center justify-between">
            <div class="space-y-1">
                <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">WireGuard Clients</h2>
                <p class="text-text-secondary text-sm md:text-base">Manage your connected devices and generate configs.</p>
            </div>
            <button @click="showAddModal = true" class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-gray-400 text-black rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(160,160,160,0.3)]">
          <span class="material-symbols-outlined text-[18px]">add</span>
          New Client
        </button>
    </div>

    <!-- Client List -->
    <div v-if="loading && clients.length === 0" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading clients...</p>
    </div>

    <div v-else-if="error" class="glass-panel p-8 rounded-xl text-center">
      <p class="text-red-400 mb-4">{{ error }}</p>
      <button @click="fetchClients" class="px-4 py-2 bg-surface text-white rounded-lg">Retry</button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="client in clients" :key="client.id" class="glass-panel p-4 rounded-xl flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold">
                            {{ client.name.substring(0,2).toUpperCase() }}
                        </div>
                        <div>
                            <h3 class="font-bold text-white">{{ client.name }}</h3>
                            <p v-if="client.email" class="text-xs text-text-secondary flex items-center gap-1">
                                <span class="material-symbols-outlined text-[10px]">mail</span> {{ client.email }}
                            </p>
                            <p class="text-xs text-text-secondary/80 mt-0.5">{{ client.virtualIp || 'No IP' }}</p>
                        </div>
                    </div>
                    <div class="px-2 py-1 rounded text-xs font-bold" :class="client.enabled ? 'bg-gray-500/20 text-gray-400' : 'bg-red-500/20 text-red-400'">
                        {{ client.enabled ? 'Active' : 'Disabled' }}
                    </div>
                </div>
                <div class="text-sm text-text-secondary mt-3 space-y-1">
                    <p class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[14px]">network_node</span> 
                        Allowed IPs: {{ client.allowedIps || '0.0.0.0/0' }}
                    </p>
                    <div class="grid grid-cols-2 gap-2 text-xs opacity-70 border-t border-surface-highlight pt-2 mt-2">
                         <p>Created: {{ new Date(client.createdAt || '').toLocaleDateString() }}</p>
                         <p>Updated: {{ client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '-' }}</p>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-surface-highlight">
                <button @click="handleShowConfig(client.id)" class="p-2 hover:bg-surface-highlight rounded-lg text-text-secondary hover:text-white transition-colors" title="QR Code">
                    <span class="material-symbols-outlined">qr_code</span>
                </button>
                <button @click="handleDeleteClient(client.id, client.name)" class="p-2 hover:bg-red-500/20 rounded-lg text-text-secondary hover:text-red-400 transition-colors" title="Delete">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Add Client Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4">
            <h3 class="text-xl font-bold text-white mb-4">Add New Client</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-text-secondary mb-1">Client Name</label>
                    <input v-model="newClient.name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. My Phone">
                </div>
                <div>
                    <label class="block text-sm text-text-secondary mb-1">Email <span class="text-xs text-gray-500">(Optional)</span></label>
                    <input v-model="newClient.email" type="email" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="user@example.com">
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button @click="showAddModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
                <button @click="handleAddClient" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-gray-400">Create Client</button>
            </div>
        </div>
    </div>

    <!-- QR Code Modal -->
    <div v-if="showQRModal && currentQR" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4 flex flex-col items-center">
            <h3 class="text-xl font-bold text-white mb-6">Client Configuration</h3>
            
            <div class="bg-white p-4 rounded-xl mb-6">
                <img :src="currentQR.qrCode" alt="Client QR Code" class="w-48 h-48">
            </div>

            <div class="flex gap-4 w-full">
                <button @click="downloadConfig" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface hover:bg-surface-highlight text-white rounded-lg transition-colors border border-surface-highlight">
                    <span class="material-symbols-outlined">download</span>
                    Download Config
                </button>
                <button @click="showQRModal = false" class="px-4 py-2 text-text-secondary hover:text-white">
                    Close
                </button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
        :is-open="deleteModalOpen"
        title="Delete Client"
        :message="`Are you sure you want to delete ${clientToDelete?.name}? This action cannot be undone.`"
        confirm-text="Delete Client"
        type="danger"
        :loading="isDeleting"
        @close="deleteModalOpen = false"
        @confirm="confirmDelete"
    />
  </div>
</template>
