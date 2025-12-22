<script setup lang="ts">
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
const loading = ref(true)
const statsLoading = ref(true)
const selectedPeriod = ref<'24h' | '7d' | '30d'>('24h')
const searchQuery = ref('')
const selectedCategory = ref('')
const showAgentModal = ref(false)

// Auto refresh interval
const refreshInterval = ref<NodeJS.Timeout | null>(null)

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
  social: 'group',
  video: 'play_circle',
  news: 'newspaper',
  shopping: 'shopping_cart',
  work: 'work',
  email: 'email',
  search: 'search',
  gaming: 'sports_esports',
  other: 'folder'
}

async function fetchActivities() {
  try {
    const params = new URLSearchParams()
    if (selectedCategory.value) params.append('category', selectedCategory.value)
    if (searchQuery.value) params.append('domain', searchQuery.value)
    params.append('limit', '100')

    const res = await $fetch<{ success: boolean; logs: BrowsingActivity[] }>(`/api/activity-logs?${params}`)
    if (res.success) {
      activities.value = res.logs
    }
  } catch (err) {
    console.error('Failed to fetch activities:', err)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; stats: ActivityStats }>(`/api/activity-logs?stats=true&period=${selectedPeriod.value}`)
    if (res.success) {
      stats.value = res.stats
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  } finally {
    statsLoading.value = false
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    social: 'text-pink-400 bg-pink-500/10',
    video: 'text-red-400 bg-red-500/10',
    news: 'text-blue-400 bg-blue-500/10',
    shopping: 'text-orange-400 bg-orange-500/10',
    work: 'text-green-400 bg-green-500/10',
    email: 'text-cyan-400 bg-cyan-500/10',
    search: 'text-purple-400 bg-purple-500/10',
    gaming: 'text-yellow-400 bg-yellow-500/10',
    other: 'text-slate-400 bg-slate-500/10'
  }
  return colors[category] || colors.other
}

// Server URL for agent
const serverUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

// Agent script
const agentScript = computed(() => `
// Activity Tracker Agent - Add to Browser Console or Bookmarklet
(function() {
  const SERVER_URL = '${serverUrl.value}';
  const CLIENT_ID = 'device-' + Math.random().toString(36).substr(2, 9);
  
  function reportActivity() {
    const data = {
      url: window.location.href,
      title: document.title,
      client_id: CLIENT_ID
    };
    
    fetch(SERVER_URL + '/api/activity-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  }
  
  // Report on page load
  reportActivity();
  
  // Report on navigation
  window.addEventListener('popstate', reportActivity);
  
  console.log('✅ Activity Tracker Active - ID:', CLIENT_ID);
})();
`)

const filteredActivities = computed(() => {
  return activities.value
})

watch([selectedCategory, searchQuery], () => {
  fetchActivities()
})

watch(selectedPeriod, () => {
  fetchStats()
})

onMounted(() => {
  fetchActivities()
  fetchStats()
  refreshInterval.value = setInterval(() => {
    fetchActivities()
    fetchStats()
  }, 30000) // Refresh every 30s
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-black text-white">Activity Monitor</h2>
        <p class="text-text-secondary">Track browsing activity across connected devices.</p>
      </div>
      <button 
        @click="showAgentModal = true"
        class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-400 text-black rounded-lg text-sm font-bold transition-colors shadow-lg"
      >
        <span class="material-symbols-outlined text-[18px]">extension</span>
        Install Agent
      </button>
    </div>

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
        <div class="text-2xl font-bold text-green-400">{{ stats?.top_categories?.[0]?.category || '-' }}</div>
        <div class="text-sm text-text-secondary">Top Category</div>
      </div>
      <div class="glass-panel p-4 rounded-xl">
        <div class="flex gap-2">
          <button 
            v-for="period in ['24h', '7d', '30d']" 
            :key="period"
            @click="selectedPeriod = period as '24h' | '7d' | '30d'"
            :class="[
              'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
              selectedPeriod === period 
                ? 'bg-primary text-black' 
                : 'bg-surface-highlight text-text-secondary hover:text-white'
            ]"
          >
            {{ period }}
          </button>
        </div>
        <div class="text-sm text-text-secondary mt-2">Time Period</div>
      </div>
    </div>

    <!-- Top Domains & Categories -->
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Top Domains -->
      <div class="glass-panel rounded-xl p-5">
        <h3 class="text-lg font-bold text-white mb-4">Top Domains</h3>
        <div v-if="!stats?.top_domains?.length" class="text-center py-8 text-text-secondary">
          No data yet
        </div>
        <div v-else class="space-y-3">
          <div v-for="(item, idx) in stats.top_domains" :key="item.domain" class="flex items-center gap-3">
            <span class="text-text-secondary text-sm w-6">{{ idx + 1 }}</span>
            <div class="flex-1 truncate">
              <div class="text-white font-medium truncate">{{ item.domain }}</div>
            </div>
            <div class="text-primary font-bold">{{ item.count }}</div>
          </div>
        </div>
      </div>

      <!-- Categories Breakdown -->
      <div class="glass-panel rounded-xl p-5">
        <h3 class="text-lg font-bold text-white mb-4">Categories</h3>
        <div v-if="!stats?.top_categories?.length" class="text-center py-8 text-text-secondary">
          No data yet
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in stats.top_categories" :key="item.category" class="flex items-center gap-3">
            <span 
              class="material-symbols-outlined text-[20px]" 
              :class="getCategoryColor(item.category)"
            >
              {{ categoryIcons[item.category] || 'folder' }}
            </span>
            <div class="flex-1">
              <div class="text-white font-medium capitalize">{{ item.category }}</div>
            </div>
            <div class="text-primary font-bold">{{ item.count }}</div>
            <div class="w-24 bg-surface-highlight rounded-full h-2">
              <div 
                class="bg-primary h-2 rounded-full transition-all"
                :style="{ width: `${(item.count / (stats?.total_visits || 1)) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search domains..."
            class="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-text-secondary focus:outline-none focus:border-primary"
          >
        </div>
      </div>
      <select 
        v-model="selectedCategory"
        class="bg-surface border border-surface-highlight rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
      >
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>
    </div>

    <!-- Activity Feed -->
    <div class="glass-panel rounded-xl overflow-hidden">
      <div class="p-4 border-b border-surface-highlight">
        <h3 class="text-lg font-bold text-white">Recent Activity</h3>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredActivities.length" class="p-12 text-center">
        <span class="material-symbols-outlined text-6xl text-text-secondary mb-4">travel_explore</span>
        <h3 class="text-xl font-bold text-white mb-2">No Activity Recorded</h3>
        <p class="text-text-secondary mb-4">Install the agent on devices to start tracking browsing activity.</p>
        <button 
          @click="showAgentModal = true"
          class="px-4 py-2 bg-primary text-black font-bold rounded-lg"
        >
          Install Agent
        </button>
      </div>

      <!-- Activity List -->
      <div v-else class="divide-y divide-surface-highlight max-h-[500px] overflow-y-auto">
        <div 
          v-for="activity in filteredActivities" 
          :key="activity.id"
          class="p-4 hover:bg-surface-highlight/30 transition-colors"
        >
          <div class="flex items-start gap-4">
            <!-- Category Icon -->
            <div :class="['p-2 rounded-lg', getCategoryColor(activity.category || 'other')]">
              <span class="material-symbols-outlined text-[20px]">
                {{ categoryIcons[activity.category || 'other'] || 'folder' }}
              </span>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-white font-medium truncate">{{ activity.domain }}</span>
                <span class="px-2 py-0.5 text-xs rounded bg-surface-highlight text-text-secondary">
                  {{ activity.source }}
                </span>
              </div>
              <p v-if="activity.title" class="text-sm text-text-secondary truncate mb-1">
                {{ activity.title }}
              </p>
              <p class="text-xs text-text-secondary truncate font-mono">
                {{ activity.url }}
              </p>
            </div>

            <!-- Time -->
            <div class="text-right">
              <div class="text-sm text-text-secondary">{{ formatTime(activity.timestamp) }}</div>
              <div v-if="activity.client_id" class="text-xs text-text-secondary mt-1">
                {{ activity.client_id.substring(0, 12) }}...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Install Modal -->
    <div v-if="showAgentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-surface-dark border border-surface-highlight p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-white">Install Activity Tracker Agent</h3>
          <button @click="showAgentModal = false" class="text-text-secondary hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-6">
          <!-- Tabs for different methods -->
          <div class="space-y-4">
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-amber-400">info</span>
                <div>
                  <h4 class="font-medium text-amber-400">Privacy Notice</h4>
                  <p class="text-sm text-text-secondary mt-1">
                    This agent will track all visited URLs. Ensure you have proper authorization before installing on any device.
                  </p>
                </div>
              </div>
            </div>

            <!-- Method 1: Console Script -->
            <div class="space-y-2">
              <h4 class="font-medium text-white">Option 1: Browser Console (Temporary)</h4>
              <p class="text-sm text-text-secondary">
                Paste this script in browser console (F12 → Console). Works until page refresh.
              </p>
              <div class="bg-surface rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
                <pre class="whitespace-pre-wrap">{{ agentScript }}</pre>
              </div>
              <button 
                @click="navigator.clipboard.writeText(agentScript)"
                class="flex items-center gap-2 px-3 py-1.5 bg-surface-highlight hover:bg-surface text-white rounded-lg text-sm"
              >
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
                Copy Script
              </button>
            </div>

            <!-- Method 2: Bookmarklet -->
            <div class="space-y-2">
              <h4 class="font-medium text-white">Option 2: Bookmarklet</h4>
              <p class="text-sm text-text-secondary">
                Drag this button to your bookmarks bar. Click to activate tracking on any page.
              </p>
              <a 
                :href="`javascript:${encodeURIComponent(agentScript.replace(/\n/g, ''))}`"
                class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg"
                @click.prevent
              >
                <span class="material-symbols-outlined text-[18px]">bookmark</span>
                📊 Track Activity
              </a>
            </div>

            <!-- Server Endpoint Info -->
            <div class="space-y-2">
              <h4 class="font-medium text-white">API Endpoint</h4>
              <p class="text-sm text-text-secondary">
                For custom integrations, send POST requests to:
              </p>
              <code class="block bg-surface rounded-lg p-3 text-primary font-mono text-sm">
                POST {{ serverUrl }}/api/activity-agent
              </code>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button 
            @click="showAgentModal = false" 
            class="px-4 py-2 bg-surface-highlight text-white font-medium rounded-lg hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
