<script setup lang="ts">
const { server, updateServerConfig } = useWireGuard()

// Edit mode state (starts in display mode after first load)
const editMode = ref(true) // Start in edit mode on first load if no data
const suggestedEndpoint = ref('')
const dnsServers = ref<string[]>(['1.1.1.1'])
const newDnsServer = ref('')
const addressesList = ref<string[]>(['10.252.1.0/24'])
const newAddress = ref('')
const showPrivateKey = ref(false)

// Local state for form
const form = reactive({
    addresses: '',
    listenPort: 51820,
    privateKey: '',
    publicKey: '',
    postUp: '',
    preDown: '',
    postDown: '',
    mtu: '',
    persistentKeepalive: '',
    endpoint: '',
    firewallMark: '',
    table: '',
    configFilePath: ''
})

// SMTP settings form
const smtpForm = reactive({
    host: '',
    port: 587,
    secure: false,
    auth_user: '',
    auth_pass: '',
    from_email: '',
    from_name: 'WireGuard VPN'
})

const loading = ref(false)
const smtpLoading = ref(false)
const checkingStatus = ref(false)
const successMsg = ref('')
const smtpSuccessMsg = ref('')
const statusResult = ref<{ success: boolean; message: string; latency?: number } | null>(null)

// Fetch settings on mount
onMounted(async () => {
    // Fetch server config
    try {
        const configResponse = await $fetch<{ success: boolean; server: any; global: any; suggestedEndpoint?: string }>('/api/server/config')
        if (configResponse.success) {
            const srv = configResponse.server
            const glb = configResponse.global
            
            // Server settings
            addressesList.value = Array.isArray(srv.addresses) ? srv.addresses.filter((a: string) => a.trim()) : ['10.252.1.0/24']
            form.addresses = addressesList.value.join(', ')
            form.listenPort = srv.listenPort || 51820
            form.privateKey = srv.privateKey || ''
            form.publicKey = srv.publicKey || ''
            form.publicKey = srv.publicKey || ''
            form.postUp = srv.post_up || ''
            form.preDown = srv.pre_down || ''
            form.postDown = srv.post_down || ''
            
            // Global settings
            form.endpoint = glb.endpoint_address || ''
            dnsServers.value = Array.isArray(glb.dns_servers) ? glb.dns_servers : ['1.1.1.1']
            form.mtu = glb.mtu || '1450'
            form.persistentKeepalive = glb.persistent_keepalive || '15'
            form.firewallMark = glb.firewall_mark || '0xca6c'
            form.table = glb.table || 'auto'
            form.configFilePath = glb.config_file_path || '/etc/wireguard/wg0.conf'
            
            // Suggested endpoint from API
            suggestedEndpoint.value = (configResponse as any).suggestedEndpoint || ''
            
            // If data exists, switch to display mode
            if (srv.addresses?.length > 0) {
                editMode.value = false
            }
        }
    } catch (err) {
        console.error('Failed to load server config:', err)
    }
    
    // Fetch SMTP settings
    try {
        const response = await $fetch<{ success: boolean; settings: any }>('/api/smtp')
        if (response.success && response.settings) {
            Object.assign(smtpForm, response.settings)
        }
    } catch (err) {
        console.error('Failed to load SMTP settings:', err)
    }
})

const handleSaveSMTP = async () => {
    smtpLoading.value = true
    smtpSuccessMsg.value = ''
    try {
        const response = await $fetch<{ success: boolean }>('/api/smtp', {
            method: 'POST',
            body: smtpForm
        })
        if (response.success) {
            smtpSuccessMsg.value = 'SMTP settings saved!'
            setTimeout(() => smtpSuccessMsg.value = '', 3000)
        }
    } catch (err: any) {
        console.error('Failed to save SMTP:', err)
    } finally {
        smtpLoading.value = false
    }
}

// DNS management functions
const addDnsServer = () => {
    const dns = newDnsServer.value.trim()
    if (dns && !dnsServers.value.includes(dns)) {
        dnsServers.value.push(dns)
        newDnsServer.value = ''
    }
}

const removeDnsServer = (index: number) => {
    if (dnsServers.value.length > 1) {
        dnsServers.value.splice(index, 1)
    }
}

// Address management functions
const addAddress = () => {
    const addr = newAddress.value.trim()
    if (addr && !addressesList.value.includes(addr)) {
        addressesList.value.push(addr)
        newAddress.value = ''
        form.addresses = addressesList.value.join(', ')
    }
}

const removeAddress = (index: number) => {
    if (addressesList.value.length > 1) {
        addressesList.value.splice(index, 1)
        form.addresses = addressesList.value.join(', ')
    }
}

// Use suggested endpoint if empty
const useSuggestedEndpoint = () => {
    if (suggestedEndpoint.value) {
        form.endpoint = suggestedEndpoint.value
    }
}

const handleSave = async () => {
    loading.value = true
    successMsg.value = ''
    
    const serverConfig = {
        addresses: addressesList.value.filter(a => a.trim()),
        listen_port: String(form.listenPort),
        private_key: form.privateKey,
        public_key: form.publicKey,
        post_up: form.postUp,
        pre_down: form.preDown,
        post_down: form.postDown
    }
    
    const globalSettings = {
        endpoint_address: form.endpoint,
        dns_servers: dnsServers.value,
        mtu: form.mtu,
        persistent_keepalive: form.persistentKeepalive,
        firewall_mark: form.firewallMark,
        table: form.table,
        config_file_path: form.configFilePath
    }
    
    const success = await updateServerConfig(serverConfig, globalSettings)
    loading.value = false
    
    if (success) {
        successMsg.value = 'Configuration saved successfully!'
        editMode.value = false // Switch to display mode after save
        setTimeout(() => successMsg.value = '', 3000)
    }
}

const checkConnectivity = async () => {
    checkingStatus.value = true
    statusResult.value = null
    try {
        const response = await $fetch<{ success: boolean; message: string; latency?: number }>('/api/check-connectivity', {
            query: { target: `http://${form.endpoint || '101.47.128.101'}:5000` }
        })
        statusResult.value = response
    } catch (err: any) {
        statusResult.value = {
            success: false,
            message: err.message || 'Connection failed'
        }
    } finally {
        checkingStatus.value = false
    }
}
</script>

<template>
  <div class="space-y-6 md:space-y-8 pb-10">
    <div class="space-y-1">
      <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">Server Settings</h2>
      <p class="text-text-secondary text-sm md:text-base">Configure your WireGuard server.</p>
    </div>

    <div class="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Interface Settings -->
        <div class="lg:col-span-2 space-y-6">
            <form @submit.prevent="handleSave" class="glass-panel p-6 md:p-8 rounded-xl space-y-6">
                <!-- Interface Header -->
                <div class="bg-blue-600/20 border border-blue-500/30 p-3 rounded text-blue-400 font-bold">
                    Interface
                </div>

                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-sm text-text-secondary font-bold">Server Interface Addresses</label>
                        <div class="space-y-2">
                            <div v-for="(addr, index) in addressesList" :key="index" class="flex gap-2">
                                <input :value="addr" @input="addressesList[index] = ($event.target as HTMLInputElement).value" type="text" class="flex-1 bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. 10.252.1.0/24">
                                <button v-if="addressesList.length > 1" type="button" @click="removeAddress(index)" class="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                                    <span class="material-symbols-outlined text-[18px]">remove</span>
                                </button>
                            </div>
                            <div class="flex gap-2">
                                <input v-model="newAddress" type="text" class="flex-1 bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Add new address (e.g. 10.253.1.0/24)" @keyup.enter="addAddress">
                                <button type="button" @click="addAddress" class="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm">
                                    <span class="material-symbols-outlined text-[18px]">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Listen Port</label>
                        <input v-model="form.listenPort" type="number" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="51820">
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Post Up Script</label>
                        <textarea v-model="form.postUp" rows="2" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"></textarea>
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Pre Down Script</label>
                        <textarea v-model="form.preDown" rows="1" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"></textarea>
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Post Down Script</label>
                        <textarea v-model="form.postDown" rows="2" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"></textarea>
                    </div>
                </div>

                <!-- Global Settings Header -->
                <div class="bg-blue-600/20 border border-blue-500/30 p-3 rounded text-blue-400 font-bold mt-8">
                    Wireguard Global Settings
                </div>

                <div class="space-y-4">
                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Endpoint Address</label>
                        <div class="flex gap-2">
                            <input v-model="form.endpoint" type="text" class="flex-1 bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                            <button type="button" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold flex items-center gap-1">
                                <span class="material-symbols-outlined text-[16px]">auto_awesome</span> Suggest
                            </button>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm text-text-secondary font-bold">DNS Servers</label>
                        <div class="space-y-2">
                            <div v-for="(dns, index) in dnsServers" :key="index" class="flex gap-2">
                                <input :value="dns" @input="dnsServers[index] = ($event.target as HTMLInputElement).value" type="text" class="flex-1 bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="e.g. 1.1.1.1">
                                <button v-if="dnsServers.length > 1" type="button" @click="removeDnsServer(index)" class="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                                    <span class="material-symbols-outlined text-[18px]">remove</span>
                                </button>
                            </div>
                            <div class="flex gap-2">
                                <input v-model="newDnsServer" type="text" class="flex-1 bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Add new DNS server" @keyup.enter="addDnsServer">
                                <button type="button" @click="addDnsServer" class="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm">
                                    <span class="material-symbols-outlined text-[18px]">add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">MTU</label>
                         <input v-model="form.mtu" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Persistent Keepalive</label>
                         <input v-model="form.persistentKeepalive" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Firewall Mark</label>
                         <input v-model="form.firewallMark" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Table</label>
                         <input v-model="form.table" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                    </div>

                    <div class="space-y-1">
                        <label class="text-sm text-text-secondary font-bold">Wireguard Config File Path</label>
                         <input v-model="form.configFilePath" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
                    </div>
                </div>

                <div class="pt-4 flex items-center justify-between">
                     <p v-if="successMsg" class="text-blue-400 font-medium flex items-center gap-2">
                        <span class="material-symbols-outlined">check_circle</span>
                        {{ successMsg }}
                    </p>
                    <button type="submit" :disabled="loading" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                        <span v-if="loading" class="material-symbols-outlined animate-spin text-[18px]">sync</span>
                        Save
                    </button>
                </div>
            </form>
        </div>

        <!-- Right Column: Key Pair & Status -->
        <div class="space-y-6">
             <div class="glass-panel p-6 rounded-xl space-y-4 overflow-hidden">
                <div class="bg-red-600/20 border border-red-500/30 p-3 rounded text-red-400 font-bold">
                    Key Pair
                </div>
                
                <div class="space-y-2">
                    <label class="text-sm text-text-secondary font-bold">Private Key</label>
                    <div class="flex flex-col gap-2">
                        <input v-model="form.privateKey" :type="showPrivateKey ? 'text' : 'password'" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-[10px] font-mono truncate" readonly>
                        <button type="button" @click="showPrivateKey = !showPrivateKey" :class="showPrivateKey ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'" class="w-full px-3 py-2 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                            <span class="material-symbols-outlined text-[16px]">{{ showPrivateKey ? 'visibility_off' : 'visibility' }}</span>
                            {{ showPrivateKey ? 'Hide' : 'Show' }}
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-sm text-text-secondary font-bold">Public Key</label>
                    <input v-model="form.publicKey" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-[10px] font-mono truncate" readonly>
                </div>
            </div>

            <div class="glass-panel p-6 rounded-xl space-y-4">
                 <div class="bg-purple-600/20 border border-purple-500/30 p-3 rounded text-purple-400 font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined">network_check</span> Connectivity Status
                </div>
                <p class="text-sm text-text-secondary">Check if the VPN service IP is reachable.</p>
                
                <button 
                    @click="checkConnectivity" 
                    :disabled="checkingStatus"
                    class="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <span v-if="checkingStatus" class="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Check {{ form.endpoint || '101.47.128.101' }}:5000
                </button>

                <div v-if="statusResult" class="p-3 rounded-lg border text-sm" :class="statusResult.success ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
                    <div class="flex items-center gap-2 font-bold mb-1">
                        <span class="material-symbols-outlined text-[18px]">{{ statusResult.success ? 'check_circle' : 'error' }}</span>
                        {{ statusResult.success ? 'Reachable' : 'Unreachable' }}
                    </div>
                    <p>{{ statusResult.message }}</p>
                    <p v-if="statusResult.latency" class="mt-1 text-xs opacity-80">Latency: {{ statusResult.latency }}ms</p>
                </div>
            </div>

            <!-- SMTP Settings Panel -->
            <div class="glass-panel p-6 rounded-xl space-y-4">
                <div class="bg-orange-600/20 border border-orange-500/30 p-3 rounded text-orange-400 font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined">mail</span> SMTP Settings
                </div>
                <p class="text-sm text-text-secondary">Configure email for sending configs to clients.</p>
                
                <div class="space-y-3">
                    <div class="space-y-1">
                        <label class="text-xs text-text-secondary font-bold">SMTP Host</label>
                        <input v-model="smtpForm.host" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="smtp.gmail.com">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-1">
                            <label class="text-xs text-text-secondary font-bold">Port</label>
                            <input v-model="smtpForm.port" type="number" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs text-text-secondary font-bold">SSL/TLS</label>
                            <div class="flex items-center h-10">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input v-model="smtpForm.secure" type="checkbox" class="w-4 h-4 accent-primary">
                                    <span class="text-sm text-white">{{ smtpForm.secure ? 'Enabled' : 'Disabled' }}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-xs text-text-secondary font-bold">Username</label>
                        <input v-model="smtpForm.auth_user" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="user@example.com">
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-xs text-text-secondary font-bold">Password</label>
                        <input v-model="smtpForm.auth_pass" type="password" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-xs text-text-secondary font-bold">From Email</label>
                        <input v-model="smtpForm.from_email" type="email" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="noreply@yourdomain.com">
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-xs text-text-secondary font-bold">From Name</label>
                        <input v-model="smtpForm.from_name" type="text" class="w-full bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary" placeholder="WireGuard VPN">
                    </div>
                </div>
                
                <div class="pt-2 flex items-center justify-between">
                    <p v-if="smtpSuccessMsg" class="text-blue-400 text-sm flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">check_circle</span>
                        {{ smtpSuccessMsg }}
                    </p>
                    <button 
                        @click="handleSaveSMTP"
                        :disabled="smtpLoading"
                        class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        <span v-if="smtpLoading" class="material-symbols-outlined animate-spin text-[16px]">sync</span>
                        Save SMTP
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
