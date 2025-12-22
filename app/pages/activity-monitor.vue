<script setup lang="ts">
import ConfirmationModal from '~/components/ConfirmationModal.vue'

// Tab state
type TabType = 'browser' | 'network'
const activeTab = ref<TabType>('browser')

// ===== BROWSER ACTIVITY (from Activity Monitor) =====
interface BrowsingActivity {
  id: string
  client_id: string
  device_name?: string
  url: string
  domain: string
  title?: string
  category?: string
  source: 'agent' | 'dns'
  blocked?: boolean
  timestamp: string
  duration?: number
}

interface ActivityStats {
  total_visits: number
  unique_domains: number
  top_domains: { domain: string; count: number }[]
  top_categories: { category: string; count: number }[]
  visits_by_hour: { hour: number; count: number }[]
  period: '24h' | '7d' | '30d'
}

const activities = ref<BrowsingActivity[]>([])
const stats = ref<ActivityStats | null>(null)
const loadingActivities = ref(true)
const selectedPeriod = ref<'24h' | '7d' | '30d'>('24h')
const searchQuery = ref('')
const selectedCategory = ref('')
const customDeviceName = ref('')
const showAgentModal = ref(false)

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'social', label: '📱 Social Media' },
  { value: 'video', label: '🎬 Video & Streaming' },
  { value: 'news', label: '📰 News' },
  { value: 'shopping', label: '🛒 Shopping' },
  { value: 'work', label: '💼 Work' },
  { value: 'email', label: '📧 Email' },
  { value: 'search', label: '🔍 Search' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'other', label: '📂 Other' }
]

const categoryIcons: Record<string, string> = {
  social: 'group', video: 'play_circle', news: 'newspaper', shopping: 'shopping_cart',
  work: 'work', email: 'email', search: 'search', gaming: 'sports_esports', other: 'folder'
}

// ===== NETWORK TRAFFIC (from Access Control) =====
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
const trafficLogs = ref<TrafficLog[]>([])
const loadingNetwork = ref(true)
const showAddServerModal = ref(false)
const deleteModalOpen = ref(false)
const serverToDelete = ref<MonitoredServer | null>(null)

const newServer = reactive({ name: '', ip: '' })

// ===== FETCH FUNCTIONS =====
async function fetchBrowserActivity() {
  try {
    const params = new URLSearchParams()
    if (selectedCategory.value) params.append('category', selectedCategory.value)
    if (searchQuery.value) params.append('domain', searchQuery.value)
    params.append('limit', '100')

    const res = await $fetch<{ success: boolean; logs: BrowsingActivity[] }>(`/api/activity-logs?${params}`)
    if (res.success) activities.value = res.logs
  } catch (err) {
    console.error('Failed to fetch activities:', err)
  } finally {
    loadingActivities.value = false
  }
}

async function fetchStats() {
  try {
    const res = await $fetch<{ success: boolean; stats: ActivityStats }>(`/api/activity-logs?stats=true&period=${selectedPeriod.value}`)
    if (res.success) stats.value = res.stats
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  }
}

async function fetchNetworkData() {
  loadingNetwork.value = true
  try {
    const serverRes = await $fetch<{ success: boolean; servers: MonitoredServer[] }>('/api/monitored-servers')
    if (serverRes.success) servers.value = serverRes.servers
    
    const logsRes = await $fetch<{ success: boolean; logs: TrafficLog[] }>('/api/traffic-logs')
    if (logsRes.success) trafficLogs.value = logsRes.logs
  } catch (err) {
    console.error('Failed to fetch network data:', err)
  } finally {
    loadingNetwork.value = false
  }
}

async function addServer() {
  if (!newServer.name || !newServer.ip) return
  try {
    const res = await $fetch<{ success: boolean; server: MonitoredServer }>('/api/monitored-servers', {
      method: 'POST', body: { name: newServer.name, ip: newServer.ip }
    })
    if (res.success) {
      servers.value.push(res.server)
      showAddServerModal.value = false
      newServer.name = ''
      newServer.ip = ''
    }
  } catch (err) { alert('Failed to add server') }
}

function confirmDeleteServer(server: MonitoredServer) {
  serverToDelete.value = server
  deleteModalOpen.value = true
}

async function deleteServer() {
  if (!serverToDelete.value) return
  try {
    await $fetch('/api/monitored-servers', { method: 'DELETE', body: { id: serverToDelete.value.id } })
    servers.value = servers.value.filter(s => s.id !== serverToDelete.value!.id)
    serverToDelete.value = null
    deleteModalOpen.value = false
  } catch (err) { alert('Failed to delete server') }
}

// ===== HELPERS =====
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    social: 'text-pink-400 bg-pink-500/10', video: 'text-red-400 bg-red-500/10',
    news: 'text-blue-400 bg-blue-500/10', shopping: 'text-orange-400 bg-orange-500/10',
    work: 'text-green-400 bg-green-500/10', email: 'text-cyan-400 bg-cyan-500/10',
    search: 'text-purple-400 bg-purple-500/10', gaming: 'text-yellow-400 bg-yellow-500/10',
    other: 'text-slate-400 bg-slate-500/10'
  }
  return colors[category] || 'text-slate-400 bg-slate-500/10'
}

function copyToClipboard(text: string) {
  if (typeof window !== 'undefined' && window.navigator?.clipboard) {
    window.navigator.clipboard.writeText(text)
  }
}

// Server URL for agent
const serverUrl = computed(() => typeof window !== 'undefined' ? window.location.origin : '')

// Persistent agent script - uses custom device name if provided
const persistentAgentScript = computed(() => {
  const deviceName = customDeviceName.value || "navigator.platform + ' - ' + navigator.userAgent.split(' ').slice(-1)[0]"
  const deviceNameCode = customDeviceName.value ? `'${customDeviceName.value}'` : deviceName
  
  return `// SecDash Activity Tracker - Persistent Agent
// Save as bookmark or paste in console on each page

(function() {
  const CONFIG = {
    SERVER: '${serverUrl.value}',
    CLIENT_ID: localStorage.getItem('secdash_client_id') || 'device-' + Math.random().toString(36).substr(2, 9),
    DEVICE: ${deviceNameCode}
  };
  
  localStorage.setItem('secdash_client_id', CONFIG.CLIENT_ID);
  
  function report() {
    fetch(CONFIG.SERVER + '/api/activity-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: location.href,
        title: document.title,
        client_id: CONFIG.CLIENT_ID,
        device_name: CONFIG.DEVICE
      })
    }).catch(() => {});
  }
  
  report();
  
  // Track SPA navigation  
  const originalPush = history.pushState;
  history.pushState = function() {
    originalPush.apply(history, arguments);
    report();
  };
  window.addEventListener('popstate', report);
  
  console.log('✅ SecDash Activity Tracker Active');
  console.log('   Device:', CONFIG.DEVICE);
})();`
})

// Mobile bookmarklet script
const mobileBookmarklet = computed(() => {
  const srv = serverUrl.value
  const dev = customDeviceName.value || 'iPhone'
  return `javascript:(function(){var s='${srv}',d='${dev}',c=localStorage.getItem('secdash_id')||'iphone-'+Math.random().toString(36).substr(2,6);localStorage.setItem('secdash_id',c);fetch(s+'/api/activity-agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:location.href,title:document.title,client_id:c,device_name:d})}).then(function(){alert('✅ Logged: '+location.hostname)}).catch(function(){alert('❌ Error')})})();`
})


// Auto refresh
const refreshInterval = ref<NodeJS.Timeout | null>(null)

watch([selectedCategory, searchQuery], () => fetchBrowserActivity())
watch(selectedPeriod, () => fetchStats())

onMounted(() => {
  fetchBrowserActivity()
  fetchStats()
  fetchNetworkData()
  refreshInterval.value = setInterval(() => {
    if (activeTab.value === 'browser') {
      fetchBrowserActivity()
      fetchStats()
    } else {
      fetchNetworkData()
    }
  }, 10000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})

// For local testing display
const testInstructions = computed(() => `
1. Buka tab baru di browser
2. Buka Developer Console (F12 → Console)
3. Paste script agent lalu tekan Enter
4. Browse ke website manapun
5. Kembali ke dashboard ini dan lihat aktivitas tercatat
`)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-black text-white">Activity Monitor</h2>
        <p class="text-text-secondary">Track browsing and network activity across connected devices.</p>
      </div>
      <div class="flex gap-2">
        <button 
          v-if="activeTab === 'network'"
          @click="showAddServerModal = true"
          class="flex items-center gap-2 px-4 py-2 bg-surface-highlight hover:bg-surface text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          Monitor Server
        </button>
        <button 
          @click="showAgentModal = true"
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-400 text-black rounded-lg text-sm font-bold transition-colors shadow-lg"
        >
          <span class="material-symbols-outlined text-[18px]">extension</span>
          Install Agent
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-surface rounded-xl w-fit">
      <button 
        @click="activeTab = 'browser'"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'browser' 
            ? 'bg-primary text-black shadow-lg' 
            : 'text-text-secondary hover:text-white'
        ]"
      >
        <span class="material-symbols-outlined text-[18px]">travel_explore</span>
        Browser Activity
      </button>
      <button 
        @click="activeTab = 'network'"
        :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'network' 
            ? 'bg-primary text-black shadow-lg' 
            : 'text-text-secondary hover:text-white'
        ]"
      >
        <span class="material-symbols-outlined text-[18px]">lan</span>
        Network Traffic
      </button>
    </div>

    <!-- ========== BROWSER ACTIVITY TAB ========== -->
    <div v-if="activeTab === 'browser'" class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-panel p-4 rounded-xl">
          <div class="text-2xl font-bold text-white">{{ stats?.total_visits || 0 }}</div>
          <div class="text-sm text-text-secondary">Total Visits</div>
        </div>
        <div class="glass-panel p-4 rounded-xl">
          <div class="text-2xl font-bold text-blue-400">{{ stats?.unique_domains || 0 }}</div>
          <div class="text-sm text-text-secondary">Unique Domains</div>
        </div>
        <div class="glass-panel p-4 rounded-xl">
          <div class="text-2xl font-bold text-green-400 capitalize">{{ stats?.top_categories?.[0]?.category || '-' }}</div>
          <div class="text-sm text-text-secondary">Top Category</div>
        </div>
        <div class="glass-panel p-4 rounded-xl">
          <div class="flex gap-2">
            <button 
              v-for="period in ['24h', '7d', '30d']" 
              :key="period"
              @click="selectedPeriod = period as '24h' | '7d' | '30d'"
              :class="['px-3 py-1 rounded-lg text-sm font-medium transition-colors', selectedPeriod === period ? 'bg-primary text-black' : 'bg-surface-highlight text-text-secondary hover:text-white']"
            >{{ period }}</button>
          </div>
          <div class="text-sm text-text-secondary mt-2">Time Period</div>
        </div>
      </div>

      <!-- Top Domains & Categories -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-panel rounded-xl p-5">
          <h3 class="text-lg font-bold text-white mb-4">Top Domains</h3>
          <div v-if="!stats?.top_domains?.length" class="text-center py-8 text-text-secondary">No data yet</div>
          <div v-else class="space-y-3">
            <div v-for="(item, idx) in stats.top_domains" :key="item.domain" class="flex items-center gap-3">
              <span class="text-text-secondary text-sm w-6">{{ idx + 1 }}</span>
              <div class="flex-1 truncate"><div class="text-white font-medium truncate">{{ item.domain }}</div></div>
              <div class="text-primary font-bold">{{ item.count }}</div>
            </div>
          </div>
        </div>
        <div class="glass-panel rounded-xl p-5">
          <h3 class="text-lg font-bold text-white mb-4">Categories</h3>
          <div v-if="!stats?.top_categories?.length" class="text-center py-8 text-text-secondary">No data yet</div>
          <div v-else class="space-y-3">
            <div v-for="item in stats.top_categories" :key="item.category" class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]" :class="getCategoryColor(item.category)">{{ categoryIcons[item.category] || 'folder' }}</span>
              <div class="flex-1"><div class="text-white font-medium capitalize">{{ item.category }}</div></div>
              <div class="text-primary font-bold">{{ item.count }}</div>
              <div class="w-24 bg-surface-highlight rounded-full h-2">
                <div class="bg-primary h-2 rounded-full transition-all" :style="{ width: `${(item.count / (stats?.total_visits || 1)) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
          <input v-model="searchQuery" type="text" placeholder="Search domains..." class="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-primary">
        </div>
        <select v-model="selectedCategory" class="bg-surface border border-surface-highlight rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary">
          <option v-for="cat in categories" :key="cat.value" :value="cat.value" class="bg-surface-dark text-white">{{ cat.label }}</option>
        </select>
      </div>

      <!-- Activity Feed -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="p-4 border-b border-surface-highlight flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">Recent Browser Activity</h3>
          <span class="text-xs text-text-secondary">Auto-refreshing every 10s</span>
        </div>
        <div v-if="loadingActivities" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <div v-else-if="!activities.length" class="p-12 text-center">
          <span class="material-symbols-outlined text-6xl text-text-secondary mb-4">travel_explore</span>
          <h3 class="text-xl font-bold text-white mb-2">No Activity Recorded</h3>
          <p class="text-text-secondary mb-4">Install the agent on devices to start tracking.</p>
          <button @click="showAgentModal = true" class="px-4 py-2 bg-primary text-black font-bold rounded-lg">Install Agent</button>
        </div>
        <div v-else class="divide-y divide-surface-highlight max-h-[400px] overflow-y-auto">
          <div v-for="activity in activities" :key="activity.id" class="p-4 hover:bg-surface-highlight/30 transition-colors">
            <div class="flex items-start gap-4">
              <div :class="['p-2 rounded-lg', getCategoryColor(activity.category || 'other')]">
                <span class="material-symbols-outlined text-[20px]">{{ categoryIcons[activity.category || 'other'] || 'folder' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-white font-medium truncate">{{ activity.domain }}</span>
                  <span class="px-2 py-0.5 text-xs rounded bg-surface-highlight text-text-secondary">{{ activity.source }}</span>
                </div>
                <p v-if="activity.title" class="text-sm text-text-secondary truncate mb-1">{{ activity.title }}</p>
                <p class="text-xs text-text-secondary truncate font-mono">{{ activity.url }}</p>
              </div>
              <div class="text-right shrink-0">
                <div class="text-sm text-text-secondary">{{ formatTime(activity.timestamp) }}</div>
                <div v-if="activity.device_name" class="flex items-center gap-1 text-xs text-blue-400 mt-1 justify-end">
                  <span class="material-symbols-outlined text-[14px]">devices</span>
                  {{ activity.device_name }}
                </div>
                <div v-else-if="activity.client_id" class="text-xs text-text-secondary mt-1">{{ activity.client_id.substring(0, 12) }}...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== NETWORK TRAFFIC TAB ========== -->
    <div v-if="activeTab === 'network'" class="space-y-6">
      <!-- Monitored Servers -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="server in servers" :key="server.id" class="glass-panel p-4 rounded-xl flex justify-between items-center group">
          <div>
            <h3 class="font-bold text-white">{{ server.name }}</h3>
            <div class="flex items-center gap-2 text-sm text-text-secondary mt-1">
              <span class="material-symbols-outlined text-[16px]">dns</span>
              <span class="font-mono text-primary/80">{{ server.ip }}</span>
            </div>
          </div>
          <button @click="confirmDeleteServer(server)" class="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded-lg transition-all">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div v-if="servers.length === 0" class="col-span-full py-8 text-center text-text-secondary border-2 border-dashed border-surface-highlight rounded-xl">
          No monitored servers. Add one to start tracking network traffic.
        </div>
      </div>

      <!-- Traffic Logs -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="p-4 border-b border-surface-highlight flex justify-between items-center">
          <h3 class="font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-400">monitor_heart</span>
            Real-time Network Traffic
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
              <tr v-for="log in trafficLogs" :key="log.id" class="hover:bg-surface-highlight/20">
                <td class="px-4 py-3 font-mono text-xs text-text-secondary">{{ formatTimeShort(log.timestamp) }}</td>
                <td class="px-4 py-3 font-mono text-white">{{ log.clientIp }}</td>
                <td class="px-4 py-3 font-mono text-primary">{{ log.targetIp }}</td>
                <td class="px-4 py-3 font-mono text-yellow-400">{{ log.targetPort }}</td>
                <td class="px-4 py-3 text-xs uppercase">{{ log.protocol }}</td>
                <td class="px-4 py-3 text-right font-mono text-text-secondary">{{ log.count }}</td>
              </tr>
              <tr v-if="trafficLogs.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-text-secondary">No traffic detected yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========== AGENT INSTALL MODAL ========== -->
    <div v-if="showAgentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-surface-dark border border-surface-highlight p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">Install Activity Tracker</h3>
          <button @click="showAgentModal = false" class="text-text-secondary hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-6">
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-amber-400">info</span>
              <div>
                <h4 class="font-medium text-amber-400">Privacy Notice</h4>
                <p class="text-sm text-text-secondary mt-1">This agent tracks visited URLs. Ensure proper authorization before installing.</p>
              </div>
            </div>
          </div>

          <!-- Test Instructions -->
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 class="font-medium text-blue-400 mb-2">🧪 Cara Test di Local</h4>
            <ol class="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>Buka tab baru di browser</li>
              <li>Buka Developer Console (F12 → Console)</li>
              <li>Copy dan paste script di bawah, tekan Enter</li>
              <li>Browse ke website manapun (contoh: google.com)</li>
              <li>Kembali ke dashboard ini, aktivitas akan muncul</li>
            </ol>
          </div>

          <!-- Device Name Input -->
          <div class="space-y-2">
            <h4 class="font-medium text-white">📱 Nama Device (Opsional)</h4>
            <p class="text-sm text-text-secondary">Beri nama agar mudah dikenali di dashboard.</p>
            <input 
              v-model="customDeviceName" 
              type="text" 
              placeholder="Contoh: iPhone Ayah, Laptop Kantor, iPad Anak" 
              class="w-full bg-surface border border-surface-highlight rounded-lg px-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-primary"
            >
          </div>

          <!-- Persistent Script -->
          <div class="space-y-2">
            <h4 class="font-medium text-white flex items-center gap-2">
              <span class="text-green-400">✓</span> Persistent Agent Script
            </h4>
            <p class="text-sm text-text-secondary">Client ID disimpan di localStorage, tetap sama walau refresh.</p>
            <div class="bg-surface rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-48">
              <pre class="whitespace-pre-wrap">{{ persistentAgentScript }}</pre>
            </div>
            <button @click="copyToClipboard(persistentAgentScript)" class="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-blue-400 text-black rounded-lg text-sm font-bold">
              <span class="material-symbols-outlined text-[16px]">content_copy</span>
              Copy Script
            </button>
          </div>

          <!-- Mobile (iPhone) Instructions -->
          <div class="space-y-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 class="font-medium text-purple-400">📱 Test di iPhone / Mobile</h4>
            <ol class="text-sm text-text-secondary space-y-2 list-decimal list-inside">
              <li>Di iPhone, buka <strong>Safari</strong></li>
              <li>Pergi ke website manapun (misal google.com)</li>
              <li>Ketuk <strong>Share</strong> (kotak dengan panah)</li>
              <li>Scroll ke bawah, pilih <strong>"Add to Favorites"</strong> atau <strong>"Add Bookmark"</strong></li>
              <li>Ganti nama menjadi <code class="bg-surface px-1 rounded">📊 Track</code></li>
              <li>Ganti URL dengan script bookmarklet di bawah</li>
              <li>Simpan bookmark tersebut</li>
              <li>Untuk mengaktifkan, buka bookmark tersebut dari Safari</li>
            </ol>
            <div class="mt-3">
              <p class="text-xs text-text-secondary mb-2">Bookmarklet (copy semua dan paste sebagai URL bookmark):</p>
              <code class="block bg-surface rounded-lg p-2 text-[10px] text-amber-400 break-all">{{ mobileBookmarklet }}</code>
            </div>
            <button @click="copyToClipboard(mobileBookmarklet)" class="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-bold">
              <span class="material-symbols-outlined text-[16px]">content_copy</span>
              Copy Bookmarklet
            </button>
          </div>

          <!-- Chrome Extension -->
          <div class="space-y-2">
            <h4 class="font-medium text-white">🧩 Chrome Extension (Permanent)</h4>
            <p class="text-sm text-text-secondary">Untuk tracking permanen, install extension:</p>
            <ol class="text-sm text-text-secondary list-decimal list-inside space-y-1">
              <li>Buka <code class="bg-surface px-1 rounded">chrome://extensions</code></li>
              <li>Aktifkan "Developer mode"</li>
              <li>Klik "Load unpacked" → pilih folder <code class="bg-surface px-1 rounded">public/agent/extension</code></li>
              <li>Klik icon extension → isi Server URL: <code class="bg-surface px-1 rounded text-primary">{{ serverUrl }}</code></li>
            </ol>
          </div>

          <!-- API Info -->
          <div class="space-y-2">
            <h4 class="font-medium text-white">API Endpoint</h4>
            <code class="block bg-surface rounded-lg p-3 text-primary font-mono text-sm">POST {{ serverUrl }}/api/activity-agent</code>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAgentModal = false" class="px-4 py-2 bg-surface-highlight text-white font-medium rounded-lg hover:bg-surface">Close</button>
        </div>
      </div>
    </div>

    <!-- Add Server Modal -->
    <div v-if="showAddServerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
          <button @click="showAddServerModal = false" class="px-4 py-2 text-text-secondary hover:text-white">Cancel</button>
          <button @click="addServer" class="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-blue-400">Start Monitoring</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmationModal
      :is-open="deleteModalOpen"
      title="Stop Monitoring?"
      :message="`Are you sure you want to stop monitoring ${serverToDelete?.name}?`"
      confirm-text="Stop Monitoring"
      type="warning"
      @close="deleteModalOpen = false"
      @confirm="deleteServer"
    />
  </div>
</template>
