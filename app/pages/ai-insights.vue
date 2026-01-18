<script setup lang="ts">
/**
 * AI Insights Page
 * 
 * Central dashboard for AI-powered security features:
 * - Anomaly Detection
 * - User Behavior Analytics
 * - Risk Scoring
 */

definePageMeta({
  middleware: 'auth'
})

// Reactive state
const loading = ref(true)
const error = ref<string | null>(null)
const aiStatus = ref<any>(null)
const anomalies = ref<any[]>([])
const profiles = ref<any[]>([])
const anomalyStats = ref<any>(null)

// Training state
const isTraining = ref(false)
const trainingResult = ref<any>(null)
const isBuildingProfiles = ref(false)

// Filters
const selectedSeverity = ref<string>('')
const showAcknowledged = ref(false)

// Fetch AI data
const fetchData = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Fetch AI status
    const statusRes = await $fetch('/api/ai')
    aiStatus.value = statusRes
    
    // Fetch anomalies
    const anomaliesRes = await $fetch('/api/ai-anomalies', {
      params: {
        severity: selectedSeverity.value || undefined,
        acknowledged: showAcknowledged.value ? 'true' : 'false',
        per_page: 20
      }
    })
    anomalies.value = anomaliesRes.anomalies || []
    
    // Fetch anomaly stats
    const statsRes = await $fetch('/api/ai-anomalies', {
      params: { stats: 'true' }
    })
    anomalyStats.value = statsRes.stats
    
    // Fetch profiles
    const profilesRes = await $fetch('/api/ai-profiles')
    profiles.value = profilesRes.profiles || []
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Train models
const trainModels = async (force: boolean = false) => {
  isTraining.value = true
  trainingResult.value = null
  
  try {
    const result = await $fetch('/api/ai', {
      method: 'POST',
      body: { action: 'train', force, data_days: 30 }
    })
    trainingResult.value = result.result
    await fetchData()
  } catch (err: any) {
    trainingResult.value = { success: false, message: err.message }
  } finally {
    isTraining.value = false
  }
}

// Build all profiles
const buildAllProfiles = async () => {
  isBuildingProfiles.value = true
  
  try {
    await $fetch('/api/ai', {
      method: 'POST',
      body: { action: 'build_profiles', data_days: 30 }
    })
    await fetchData()
  } catch (err: any) {
    error.value = err.message
  } finally {
    isBuildingProfiles.value = false
  }
}

// Acknowledge anomaly
const acknowledgeAnomaly = async (eventId: string) => {
  try {
    await $fetch('/api/ai-anomalies', {
      method: 'POST',
      body: { event_id: eventId }
    })
    await fetchData()
  } catch (err: any) {
    error.value = err.message
  }
}

// Risk level colors
const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30'
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30'
    case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
    case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30'
    default: return 'text-slate-500 bg-slate-500/10 border-slate-500/30'
  }
}

const getSeverityIcon = (level: string) => {
  switch (level) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    case 'medium': return 'info'
    case 'low': return 'check_circle'
    default: return 'help'
  }
}

const getEventTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'traffic_spike': 'Traffic Spike',
    'unusual_time': 'Unusual Time',
    'new_domain_burst': 'New Domain Burst',
    'port_scan': 'Port Scan',
    'behavior_deviation': 'Behavior Deviation'
  }
  return labels[type] || type
}

// Format date
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// Check if AI service is available
const isAIAvailable = computed(() => {
  return aiStatus.value?.service?.status === 'healthy'
})

const isModelTrained = computed(() => {
  return aiStatus.value?.models?.anomaly_detector?.is_trained
})

// Initialize
onMounted(() => {
  fetchData()
})

// Watch filters
watch([selectedSeverity, showAcknowledged], () => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-3">
          <span class="material-symbols-outlined text-purple-400">psychology</span>
          AI Security Insights
          <span class="text-xs font-normal px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">BETA</span>
        </h1>
        <p class="text-slate-400 mt-1">AI-powered anomaly detection and user behavior analytics</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
          @click="fetchData"
          :disabled="loading"
        >
          <span class="material-symbols-outlined text-lg" :class="{ 'animate-spin': loading }">refresh</span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Service Status Banner -->
    <div 
      v-if="!isAIAvailable && !loading"
      class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3"
    >
      <span class="material-symbols-outlined text-yellow-500">warning</span>
      <div>
        <p class="text-yellow-400 font-medium">AI Service Not Available</p>
        <p class="text-slate-400 text-sm">Make sure the AI service container is running. Run: <code class="bg-slate-800 px-2 py-0.5 rounded">docker-compose up -d ai-service</code></p>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- AI Status -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-slate-400 text-sm">AI Service</p>
            <div class="flex items-center gap-2 mt-1">
              <div 
                class="w-2 h-2 rounded-full"
                :class="isAIAvailable ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <p class="text-white font-semibold">
                {{ isAIAvailable ? 'Online' : 'Offline' }}
              </p>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <span class="material-symbols-outlined">memory</span>
          </div>
        </div>
      </div>

      <!-- Model Status -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-slate-400 text-sm">Detection Model</p>
            <p class="text-white font-semibold mt-1">
              {{ isModelTrained ? 'Trained' : 'Not Trained' }}
            </p>
          </div>
          <div class="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <span class="material-symbols-outlined">model_training</span>
          </div>
        </div>
      </div>

      <!-- Anomalies Count -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-slate-400 text-sm">Unacknowledged Alerts</p>
            <p class="text-white font-semibold mt-1 text-2xl">
              {{ anomalyStats?.unacknowledged || 0 }}
            </p>
          </div>
          <div class="p-3 rounded-xl bg-red-500/10 text-red-400">
            <span class="material-symbols-outlined">notifications_active</span>
          </div>
        </div>
      </div>

      <!-- User Profiles -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-slate-400 text-sm">User Profiles</p>
            <p class="text-white font-semibold mt-1 text-2xl">
              {{ profiles.length }}
            </p>
          </div>
          <div class="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <span class="material-symbols-outlined">person_search</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Train Model Card -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-6">
        <div class="flex items-start gap-4">
          <div class="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <span class="material-symbols-outlined text-purple-400 text-2xl">model_training</span>
          </div>
          <div class="flex-1">
            <h3 class="text-white font-semibold">Anomaly Detection Model</h3>
            <p class="text-slate-400 text-sm mt-1">
              Train the Isolation Forest model on your activity data to detect anomalies.
            </p>
            
            <div v-if="trainingResult" class="mt-3 p-3 rounded-lg bg-slate-800/50 text-sm">
              <p v-if="trainingResult.success" class="text-green-400">
                ✓ Trained on {{ trainingResult.n_samples }} samples. 
                Found {{ trainingResult.n_anomalies_detected }} baseline anomalies.
              </p>
              <p v-else class="text-red-400">
                ✗ {{ trainingResult.message }}
              </p>
            </div>

            <div class="flex gap-2 mt-4">
              <button
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                @click="trainModels(false)"
                :disabled="isTraining || !isAIAvailable"
              >
                <span v-if="isTraining" class="material-symbols-outlined text-lg animate-spin">autorenew</span>
                <span v-else class="material-symbols-outlined text-lg">play_arrow</span>
                {{ isTraining ? 'Training...' : (isModelTrained ? 'Retrain' : 'Train Model') }}
              </button>
              <button
                v-if="isModelTrained"
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                @click="trainModels(true)"
                :disabled="isTraining"
              >
                Force Retrain
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Build Profiles Card -->
      <div class="bg-surface-card border border-slate-800/50 rounded-xl p-6">
        <div class="flex items-start gap-4">
          <div class="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <span class="material-symbols-outlined text-cyan-400 text-2xl">person_search</span>
          </div>
          <div class="flex-1">
            <h3 class="text-white font-semibold">User Behavior Profiles</h3>
            <p class="text-slate-400 text-sm mt-1">
              Build behavior profiles for all VPN users to detect deviations from normal patterns.
            </p>
            
            <div class="mt-3">
              <p class="text-slate-500 text-sm">
                {{ profiles.length }} profiles created
              </p>
            </div>

            <button
              class="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="buildAllProfiles"
              :disabled="isBuildingProfiles || !isAIAvailable"
            >
              <span v-if="isBuildingProfiles" class="material-symbols-outlined text-lg animate-spin">autorenew</span>
              <span v-else class="material-symbols-outlined text-lg">build</span>
              {{ isBuildingProfiles ? 'Building...' : 'Build All Profiles' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Anomalies Section -->
    <div class="bg-surface-card border border-slate-800/50 rounded-xl overflow-hidden">
      <div class="p-6 border-b border-slate-800/50">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-red-400">gpp_maybe</span>
              Detected Anomalies
            </h2>
            <p class="text-slate-400 text-sm mt-1">
              Real-time security alerts from AI analysis
            </p>
          </div>
          
          <!-- Filters -->
          <div class="flex items-center gap-3">
            <select
              v-model="selectedSeverity"
              class="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <label class="flex items-center gap-2 text-slate-400 text-sm">
              <input
                type="checkbox"
                v-model="showAcknowledged"
                class="rounded bg-slate-800 border-slate-600"
              >
              Show Acknowledged
            </label>
          </div>
        </div>
      </div>

      <!-- Anomalies List -->
      <div class="divide-y divide-slate-800/50">
        <template v-if="anomalies.length > 0">
          <div
            v-for="anomaly in anomalies"
            :key="anomaly.id"
            class="p-4 hover:bg-slate-800/30 transition-colors"
          >
            <div class="flex items-start gap-4">
              <!-- Severity Icon -->
              <div 
                class="p-2 rounded-lg border"
                :class="getRiskColor(anomaly.severity)"
              >
                <span class="material-symbols-outlined">{{ getSeverityIcon(anomaly.severity) }}</span>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span 
                    class="px-2 py-0.5 rounded text-xs font-medium border"
                    :class="getRiskColor(anomaly.severity)"
                  >
                    {{ anomaly.severity.toUpperCase() }}
                  </span>
                  <span class="text-slate-400 text-sm">
                    {{ getEventTypeLabel(anomaly.event_type) }}
                  </span>
                  <span class="text-slate-600">•</span>
                  <span class="text-slate-500 text-sm">
                    {{ formatDate(anomaly.detected_at) }}
                  </span>
                </div>
                
                <p class="text-white mt-1">
                  Client: <span class="font-mono text-blue-400">{{ anomaly.client_id }}</span>
                </p>
                
                <div v-if="anomaly.details" class="mt-2 text-sm text-slate-400">
                  <span v-if="anomaly.details.domain">
                    Domain: <span class="text-slate-300">{{ anomaly.details.domain }}</span>
                  </span>
                  <span v-if="anomaly.details.anomaly_score" class="ml-3">
                    Score: <span class="text-orange-400">{{ anomaly.details.anomaly_score.toFixed(1) }}</span>
                  </span>
                </div>

                <!-- Deviations -->
                <div v-if="anomaly.details?.deviations?.length > 0" class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="(dev, idx) in anomaly.details.deviations.slice(0, 3)"
                    :key="idx"
                    class="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400"
                  >
                    {{ dev.type }}: {{ dev.detail }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <span 
                  v-if="anomaly.acknowledged"
                  class="text-green-500 text-sm flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  Acknowledged
                </span>
                <button
                  v-else
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                  @click="acknowledgeAnomaly(anomaly.id)"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="p-12 text-center">
          <span class="material-symbols-outlined text-6xl text-slate-700">verified_user</span>
          <p class="text-slate-400 mt-4">No anomalies detected</p>
          <p class="text-slate-500 text-sm mt-1">
            {{ isModelTrained ? 'Your VPN activity patterns look normal' : 'Train the model first to start detecting anomalies' }}
          </p>
        </div>
      </div>
    </div>

    <!-- User Profiles Section -->
    <div v-if="profiles.length > 0" class="bg-surface-card border border-slate-800/50 rounded-xl overflow-hidden">
      <div class="p-6 border-b border-slate-800/50">
        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-cyan-400">group</span>
          User Behavior Profiles
        </h2>
        <p class="text-slate-400 text-sm mt-1">
          Behavioral baselines for deviation detection
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        <div
          v-for="profile in profiles"
          :key="profile.client_id"
          class="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {{ profile.client_id.substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <p class="text-white font-medium font-mono text-sm">{{ profile.client_id }}</p>
                <p class="text-slate-500 text-xs">{{ profile.data_points }} data points</p>
              </div>
            </div>
            <span 
              class="px-2 py-0.5 rounded text-xs font-medium border"
              :class="getRiskColor(profile.risk_level)"
            >
              {{ profile.risk_level }}
            </span>
          </div>
          
          <div class="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-slate-500">Domains:</span>
              <span class="text-slate-300 ml-1">{{ profile.unique_domains }}</span>
            </div>
            <div v-if="profile.created_at">
              <span class="text-slate-500">Created:</span>
              <span class="text-slate-300 ml-1">{{ formatDate(profile.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <span class="material-symbols-outlined text-4xl text-purple-400 animate-spin">autorenew</span>
    </div>

    <!-- Error State -->
    <div v-if="error && !loading" class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-red-500">error</span>
        <div>
          <p class="text-red-400 font-medium">Error</p>
          <p class="text-slate-400 text-sm">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
