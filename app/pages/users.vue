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
  email: '',
  require_2fa: false
})
const currentQR = ref<{ config: string, qrCode: string } | null>(null)

// 2FA Activation state
const showActivateModal = ref(false)
const activatingClient = ref<{ id: string; name: string } | null>(null)
const activateOtp = ref('')
const activateDuration = ref(8)
const activating = ref(false)

const handleAddClient = async () => {
    if (!newClient.name) return
    try {
        // Include require_2fa when creating client
        const response = await $fetch<{ success: boolean }>('/api/clients', {
            method: 'POST',
            body: { 
                name: newClient.name, 
                email: newClient.email,
                require_2fa: newClient.require_2fa
            }
        })
        if (response.success) {
            showAddModal.value = false
            newClient.name = ''
            newClient.email = ''
            newClient.require_2fa = false
            await fetchClients()
        }
    } catch (err: any) {
        alert(err.data?.message || 'Failed to create client')
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

// 2FA Activation functions
const openActivateModal = (client: any) => {
    activatingClient.value = { id: client.id, name: client.name }
    activateOtp.value = ''
    activateDuration.value = 8
    showActivateModal.value = true
}

const handleActivate = async () => {
    if (!activatingClient.value || activateOtp.value.length !== 6) return
    activating.value = true
    try {
        await $fetch('/api/clients/activate', {
            method: 'POST',
            body: {
                client_id: activatingClient.value.id,
                otp: activateOtp.value,
                duration_hours: activateDuration.value
            }
        })
        showActivateModal.value = false
        activatingClient.value = null
        await fetchClients()
    } catch (err: any) {
        alert(err.data?.message || 'Activation failed. Check OTP code.')
    } finally {
        activating.value = false
    }
}

const handleDeactivate = async (clientId: string) => {
    if (!confirm('Deactivate this client\'s VPN session?')) return
    try {
        await $fetch('/api/clients/deactivate', {
            method: 'POST',
            body: { client_id: clientId }
        })
        await fetchClients()
    } catch (err: any) {
        alert(err.data?.message || 'Failed to deactivate')
    }
}

const getSessionStatus = (client: any) => {
    if (!client.require_2fa) return { text: 'No 2FA', color: 'text-gray-400 bg-gray-500/20' }
    if (client.session_expires_at) {
        const expires = new Date(client.session_expires_at)
        if (expires > new Date()) {
            const hoursLeft = Math.ceil((expires.getTime() - Date.now()) / 3600000)
            return { text: `Active (${hoursLeft}h)`, color: 'text-green-400 bg-green-500/20' }
        }
    }
    return { text: 'Inactive', color: 'text-red-400 bg-red-500/20' }
}
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <div class="flex items-center justify-between">
            <div class="space-y-1">
                <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">WireGuard Clients</h2>
                <p class="text-text-secondary text-sm md:text-base">Manage your connected devices and generate configs.</p>
            </div>
            <button @click="showAddModal = true" class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-400 text-black rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
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
                    <div class="flex flex-col items-end gap-1">
                        <div class="px-2 py-1 rounded text-xs font-bold" :class="client.enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'">
                            {{ client.enabled ? 'Active' : 'Disabled' }}
                        </div>
                        <div v-if="client.require_2fa" class="px-2 py-0.5 rounded text-xs font-medium" :class="getSessionStatus(client).color">
                            🔐 {{ getSessionStatus(client).text }}
                        </div>
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
            
            <div class="flex justify-between gap-2 mt-4 pt-4 border-t border-surface-highlight">
                <div v-if="client.require_2fa">
                    <button 
                        v-if="getSessionStatus(client).text === 'Inactive'"
                        @click="openActivateModal(client)" 
                        class="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
                    >
                        🔓 Activate
                    </button>
                    <button 
                        v-else
                        @click="handleDeactivate(client.id)" 
                        class="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors"
                    >
                        🔒 Deactivate
                    </button>
                </div>
                <div class="flex gap-2 ml-auto">
                    <button @click="handleShowConfig(client.id)" class="p-2 hover:bg-surface-highlight rounded-lg text-text-secondary hover:text-white transition-colors" title="QR Code">
                        <span class="material-symbols-outlined">qr_code</span>
                    </button>
                    <button @click="handleDeleteClient(client.id, client.name)" class="p-2 hover:bg-red-500/20 rounded-lg text-text-secondary hover:text-red-400 transition-colors" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
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
                <div class="flex items-center gap-3 p-3 bg-surface rounded-lg border border-surface-highlight">
                    <input v-model="newClient.require_2fa" type="checkbox" id="require2fa" class="w-4 h-4 accent-primary">
                    <label for="require2fa" class="text-sm text-white">
                        🔐 Require 2FA to activate
                        <span class="block text-xs text-text-secondary mt-0.5">Client must verify OTP before VPN access</span>
                    </label>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button @click="showAddModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
                <button @click="handleAddClient" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-400">Create Client</button>
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

    <!-- 2FA Activation Modal -->
    <div v-if="showActivateModal && activatingClient" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="glass-panel p-6 rounded-xl w-full max-w-sm m-4">
            <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-green-400">lock_open</span>
                Activate VPN Session
            </h3>
            <p class="text-text-secondary text-sm mb-4">Enter your 2FA code to activate <strong class="text-white">{{ activatingClient.name }}</strong></p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-text-secondary mb-1">6-digit OTP Code</label>
                    <input 
                        v-model="activateOtp" 
                        type="text" 
                        maxlength="6" 
                        placeholder="000000"
                        class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-primary"
                    >
                </div>
                <div>
                    <label class="block text-sm text-text-secondary mb-1">Session Duration</label>
                    <select v-model="activateDuration" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                        <option :value="4">4 hours</option>
                        <option :value="8">8 hours (default)</option>
                        <option :value="12">12 hours</option>
                        <option :value="24">24 hours</option>
                    </select>
                </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
                <button @click="showActivateModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
                <button 
                    @click="handleActivate" 
                    :disabled="activating || activateOtp.length !== 6"
                    class="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-400 disabled:opacity-50"
                >
                    {{ activating ? 'Activating...' : 'Activate' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
