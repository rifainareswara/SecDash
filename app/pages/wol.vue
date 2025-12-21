<script setup lang="ts">
interface WoLHost {
  id: string
  name: string
  mac_address: string
  ip_address?: string
  created_at?: string
}

const hosts = ref<WoLHost[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const wakeStatus = ref<{ id: string; success: boolean; message: string } | null>(null)

const showAddModal = ref(false)
const newHost = reactive({
  name: '',
  mac_address: '',
  ip_address: ''
})

onMounted(async () => {
  await fetchHosts()
})

async function fetchHosts() {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch<{ success: boolean; hosts: WoLHost[] }>('/api/wol-hosts')
    if (response.success) {
      hosts.value = response.hosts
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load hosts'
  } finally {
    loading.value = false
  }
}

async function handleAddHost() {
  if (!newHost.name || !newHost.mac_address) {
    alert('Name and MAC address are required')
    return
  }

  try {
    const response = await $fetch<{ success: boolean; host: WoLHost }>('/api/wol-hosts', {
      method: 'POST',
      body: newHost
    })
    if (response.success) {
      hosts.value.push(response.host)
      showAddModal.value = false
      newHost.name = ''
      newHost.mac_address = ''
      newHost.ip_address = ''
    }
  } catch (err: any) {
    alert(err.data?.message || 'Failed to add host')
  }
}

async function handleWake(host: WoLHost) {
  wakeStatus.value = null
  
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/wol-hosts/${host.id}`, {
      method: 'POST'
    })
    wakeStatus.value = { id: host.id, success: response.success, message: response.message }
    setTimeout(() => wakeStatus.value = null, 5000)
  } catch (err: any) {
    wakeStatus.value = { 
      id: host.id, 
      success: false, 
      message: err.data?.message || 'Failed to wake host'
    }
    setTimeout(() => wakeStatus.value = null, 5000)
  }
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this host?')) return

  try {
    await $fetch(`/api/wol-hosts/${id}`, { method: 'DELETE' })
    hosts.value = hosts.value.filter(h => h.id !== id)
  } catch (err: any) {
    alert(err.data?.message || 'Failed to delete host')
  }
}
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">
          Wake-on-LAN Hosts
        </h2>
        <p class="text-text-secondary text-sm md:text-base">
          Manage and wake devices on your network.
        </p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-green-400 text-black rounded-lg text-sm font-bold transition-colors"
        @click="showAddModal = true"
      >
        <span class="material-symbols-outlined text-[18px]">add</span>
        Add Host
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-text-secondary animate-spin">sync</span>
      <p class="text-text-secondary mt-2">Loading hosts...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="glass-panel p-8 rounded-xl text-center">
      <span class="material-symbols-outlined text-4xl text-red-400">error</span>
      <p class="text-red-400 mt-2">{{ error }}</p>
      <button @click="fetchHosts" class="mt-4 px-4 py-2 bg-primary text-black rounded-lg">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="hosts.length === 0" class="glass-panel p-12 rounded-xl text-center">
      <span class="material-symbols-outlined text-6xl text-text-secondary mb-4">power_settings_new</span>
      <h3 class="text-xl font-bold text-white mb-2">No WoL Hosts</h3>
      <p class="text-text-secondary mb-6">Add hosts to wake devices remotely.</p>
      <button
        class="px-4 py-2 bg-primary hover:bg-green-400 text-black rounded-lg font-bold"
        @click="showAddModal = true"
      >
        Add Your First Host
      </button>
    </div>

    <!-- Hosts Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="host in hosts" 
        :key="host.id" 
        class="glass-panel p-5 rounded-xl"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="size-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <span class="material-symbols-outlined text-cyan-400 text-[28px]">computer</span>
            </div>
            <div>
              <h3 class="font-bold text-white">{{ host.name }}</h3>
              <p class="text-xs text-text-secondary font-mono">{{ host.mac_address }}</p>
            </div>
          </div>
          <button
            @click="handleDelete(host.id)"
            class="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>

        <div v-if="host.ip_address" class="text-sm text-text-secondary mb-4">
          <span class="material-symbols-outlined text-[14px] align-middle">lan</span>
          {{ host.ip_address }}
        </div>

        <!-- Wake Button -->
        <button
          @click="handleWake(host)"
          class="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined">power_settings_new</span>
          Wake Up
        </button>

        <!-- Wake Status -->
        <div 
          v-if="wakeStatus && wakeStatus.id === host.id"
          class="mt-3 p-3 rounded-lg text-sm"
          :class="wakeStatus.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
        >
          {{ wakeStatus.message }}
        </div>
      </div>
    </div>

    <!-- Add Host Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="glass-panel p-6 rounded-xl w-full max-w-md m-4">
        <h3 class="text-xl font-bold text-white mb-4">Add WoL Host</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-secondary mb-1">Host Name</label>
            <input v-model="newHost.name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. Gaming PC">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">MAC Address</label>
            <input v-model="newHost.mac_address" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary font-mono" placeholder="AA:BB:CC:DD:EE:FF">
          </div>
          <div>
            <label class="block text-sm text-text-secondary mb-1">IP Address <span class="text-xs text-gray-500">(Optional)</span></label>
            <input v-model="newHost.ip_address" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary font-mono" placeholder="192.168.1.100">
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="handleAddHost" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-green-400">Add Host</button>
        </div>
      </div>
    </div>
  </div>
</template>
