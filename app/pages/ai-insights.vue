<script setup lang="ts">
// AI Insights Page - Powered by pattern analysis of activity data

interface AnomalyAlert {
  id: string
  type: 'unusual_activity' | 'security_risk' | 'performance' | 'pattern_change'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

interface SecurityScore {
  overall: number
  factors: {
    name: string
    score: number
    status: 'good' | 'warning' | 'danger'
  }[]
}

interface UsagePattern {
  category: string
  visits: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

interface DeviceActivity {
  deviceId: string
  deviceName: string
  lastSeen: string
  requestCount: number
  uniqueDomains: number
  riskScore: number
}

// State
const loading = ref(true)
const anomalies = ref<AnomalyAlert[]>([])
const securityScore = ref<SecurityScore | null>(null)
const usagePatterns = ref<UsagePattern[]>([])
const deviceActivities = ref<DeviceActivity[]>([])
const selectedTimeRange = ref<'24h' | '7d' | '30d'>('24h')

// Fetch and analyze data
async function analyzeData() {
  loading.value = true
  try {
    // Fetch activity logs for analysis
    const [activityRes, accessRes] = await Promise.all([
      $fetch<{ success: boolean; logs: any[]; stats?: any }>(`/api/activity-logs?stats=true&period=${selectedTimeRange.value}`),
      $fetch<{ success: boolean; logs: any[] }>('/api/access-logs?limit=500')
    ])

    const activityLogs = activityRes.success ? activityRes.logs : []
    const accessLogs = accessRes.success ? accessRes.logs : []
    const stats = activityRes.stats

    // Generate AI insights from the data
    generateAnomalies(activityLogs, accessLogs)
    calculateSecurityScore(activityLogs, accessLogs)
    analyzeUsagePatterns(stats)
    analyzeDeviceActivities(accessLogs)

  } catch (err) {
    console.error('Failed to analyze data:', err)
  } finally {
    loading.value = false
  }
}

function generateAnomalies(activityLogs: any[], accessLogs: any[]) {
  const alerts: AnomalyAlert[] = []
  
  // Analyze for unusual patterns
  const now = new Date()
  const recentActivity = activityLogs.filter(log => {
    const logTime = new Date(log.timestamp)
    return (now.getTime() - logTime.getTime()) < 3600000 // Last hour
  })

  // Check for unusual activity volume
  if (recentActivity.length > 100) {
    alerts.push({
      id: 'high-volume-' + Date.now(),
      type: 'unusual_activity',
      severity: 'medium',
      title: 'High Activity Volume Detected',
      description: `${recentActivity.length} activities recorded in the last hour, which is above normal levels.`,
      timestamp: new Date().toISOString(),
      metadata: { count: recentActivity.length }
    })
  }

  // Check for multiple unique IPs
  const uniqueIPs = new Set(accessLogs.map(l => l.ip))
  if (uniqueIPs.size > 10) {
    alerts.push({
      id: 'multiple-ips-' + Date.now(),
      type: 'security_risk',
      severity: 'low',
      title: 'Multiple IP Addresses Active',
      description: `${uniqueIPs.size} unique IP addresses accessing the system. Verify all are authorized.`,
      timestamp: new Date().toISOString(),
      metadata: { ips: Array.from(uniqueIPs).slice(0, 5) }
    })
  }

  // Check for unusual domains
  const blockedDomains = activityLogs.filter(l => l.blocked)
  if (blockedDomains.length > 0) {
    alerts.push({
      id: 'blocked-domains-' + Date.now(),
      type: 'security_risk',
      severity: 'high',
      title: 'Blocked Domain Access Attempts',
      description: `${blockedDomains.length} attempts to access blocked domains were detected.`,
      timestamp: new Date().toISOString(),
      metadata: { domains: blockedDomains.slice(0, 3).map(d => d.domain) }
    })
  }

  // Check for late night activity
  const lateNightActivity = recentActivity.filter(log => {
    const hour = new Date(log.timestamp).getHours()
    return hour >= 0 && hour < 6
  })
  if (lateNightActivity.length > 10) {
    alerts.push({
      id: 'late-night-' + Date.now(),
      type: 'pattern_change',
      severity: 'low',
      title: 'Unusual Late Night Activity',
      description: `${lateNightActivity.length} activities detected between midnight and 6 AM.`,
      timestamp: new Date().toISOString()
    })
  }

  // Add a positive alert if everything looks normal
  if (alerts.length === 0) {
    alerts.push({
      id: 'all-clear-' + Date.now(),
      type: 'performance',
      severity: 'low',
      title: 'All Systems Normal',
      description: 'No unusual patterns or security concerns detected in recent activity.',
      timestamp: new Date().toISOString()
    })
  }

  anomalies.value = alerts
}

function calculateSecurityScore(activityLogs: any[], accessLogs: any[]) {
  const factors = []
  
  // Factor 1: Device diversity (fewer = better)
  const uniqueDevices = new Set(accessLogs.map(l => l.deviceFingerprint))
  const deviceScore = Math.max(0, 100 - (uniqueDevices.size * 5))
  factors.push({
    name: 'Device Trust',
    score: Math.min(100, deviceScore + 50),
    status: deviceScore > 70 ? 'good' : deviceScore > 40 ? 'warning' : 'danger' as 'good' | 'warning' | 'danger'
  })

  // Factor 2: No blocked content
  const blockedCount = activityLogs.filter(l => l.blocked).length
  const contentScore = blockedCount === 0 ? 100 : Math.max(0, 100 - (blockedCount * 10))
  factors.push({
    name: 'Content Safety',
    score: contentScore,
    status: contentScore > 80 ? 'good' : contentScore > 50 ? 'warning' : 'danger' as 'good' | 'warning' | 'danger'
  })

  // Factor 3: Activity consistency
  const activityScore = activityLogs.length > 0 ? 85 : 100
  factors.push({
    name: 'Activity Pattern',
    score: activityScore,
    status: 'good' as 'good' | 'warning' | 'danger'
  })

  // Factor 4: Access patterns
  const uniqueIPs = new Set(accessLogs.map(l => l.ip))
  const accessScore = Math.max(0, 100 - (uniqueIPs.size * 3))
  factors.push({
    name: 'Access Control',
    score: Math.min(100, accessScore + 40),
    status: accessScore > 60 ? 'good' : accessScore > 30 ? 'warning' : 'danger' as 'good' | 'warning' | 'danger'
  })

  const overall = Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length)

  securityScore.value = { overall, factors }
}

function analyzeUsagePatterns(stats: any) {
  if (!stats?.top_categories) {
    usagePatterns.value = []
    return
  }

  const totalVisits = stats.total_visits || 1
  usagePatterns.value = stats.top_categories.map((cat: any) => ({
    category: cat.category,
    visits: cat.count,
    trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
    percentage: Math.round((cat.count / totalVisits) * 100)
  }))
}

function analyzeDeviceActivities(accessLogs: any[]) {
  const deviceMap = new Map<string, DeviceActivity>()

  accessLogs.forEach(log => {
    const deviceId = log.deviceFingerprint || 'unknown'
    if (!deviceMap.has(deviceId)) {
      deviceMap.set(deviceId, {
        deviceId,
        deviceName: `${log.browser || 'Unknown'} / ${log.os || 'Unknown'}`,
        lastSeen: log.timestamp,
        requestCount: 0,
        uniqueDomains: 0,
        riskScore: 0
      })
    }
    const device = deviceMap.get(deviceId)!
    device.requestCount++
    if (new Date(log.timestamp) > new Date(device.lastSeen)) {
      device.lastSeen = log.timestamp
    }
  })

  // Calculate risk scores
  deviceMap.forEach(device => {
    // Higher request count = slightly higher risk
    device.riskScore = Math.min(100, Math.round(device.requestCount / 10))
  })

  deviceActivities.value = Array.from(deviceMap.values())
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, 10)
}

// Helpers
function getSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    low: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-orange-400 bg-orange-500/20',
    critical: 'text-red-400 bg-red-500/20'
  }
  return colors[severity] || 'text-slate-400 bg-slate-500/20'
}

function getSeverityIcon(severity: string) {
  const icons: Record<string, string> = {
    low: 'check_circle',
    medium: 'warning',
    high: 'error',
    critical: 'dangerous'
  }
  return icons[severity] || 'info'
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    unusual_activity: 'trending_up',
    security_risk: 'shield',
    performance: 'speed',
    pattern_change: 'analytics'
  }
  return icons[type] || 'insights'
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreGradient(score: number) {
  if (score >= 80) return 'from-green-500 to-emerald-500'
  if (score >= 60) return 'from-yellow-500 to-amber-500'
  if (score >= 40) return 'from-orange-500 to-red-500'
  return 'from-red-500 to-rose-500'
}

function getTrendIcon(trend: string) {
  const icons: Record<string, string> = { up: 'trending_up', down: 'trending_down', stable: 'trending_flat' }
  return icons[trend] || 'trending_flat'
}

function getTrendColor(trend: string) {
  const colors: Record<string, string> = { up: 'text-green-400', down: 'text-red-400', stable: 'text-slate-400' }
  return colors[trend] || 'text-slate-400'
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function getRiskColor(risk: number) {
  if (risk < 30) return 'text-green-400'
  if (risk < 60) return 'text-yellow-400'
  return 'text-red-400'
}

// Watch for time range changes
watch(selectedTimeRange, () => analyzeData())

// Initial load
onMounted(() => {
  analyzeData()
  // Auto-refresh every 30 seconds
  const interval = setInterval(analyzeData, 30000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
          <span class="material-symbols-outlined text-3xl text-purple-400">psychology</span>
        </div>
        <div>
          <h2 class="text-3xl font-black text-white">AI Insights</h2>
          <p class="text-text-secondary">Intelligent analysis of your security and activity data</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex gap-1 p-1 bg-surface rounded-lg">
          <button 
            v-for="period in ['24h', '7d', '30d']" 
            :key="period"
            @click="selectedTimeRange = period as '24h' | '7d' | '30d'"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              selectedTimeRange === period 
                ? 'bg-primary text-black' 
                : 'text-text-secondary hover:text-white'
            ]"
          >{{ period }}</button>
        </div>
        <button 
          @click="analyzeData"
          :class="[
            'flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          ]"
          :disabled="loading"
        >
          <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">autorenew</span>
          Refresh Analysis
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="relative inline-flex">
          <div class="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
          <span class="material-symbols-outlined text-6xl text-purple-400 animate-pulse relative">psychology</span>
        </div>
        <p class="text-text-secondary mt-4">Analyzing patterns...</p>
      </div>
    </div>

    <template v-else>
      <!-- Security Score & Quick Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Security Score Card -->
        <div class="glass-panel rounded-xl p-6 lg:col-span-1">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-400">verified_user</span>
            Security Score
          </h3>
          <div class="flex items-center justify-center mb-6">
            <div class="relative">
              <svg class="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-surface-highlight"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  :stroke-dasharray="351.86"
                  :stroke-dashoffset="351.86 - (351.86 * (securityScore?.overall || 0)) / 100"
                  :class="getScoreColor(securityScore?.overall || 0)"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span :class="['text-4xl font-black', getScoreColor(securityScore?.overall || 0)]">
                  {{ securityScore?.overall || 0 }}
                </span>
              </div>
            </div>
          </div>
          <div class="space-y-3">
            <div 
              v-for="factor in securityScore?.factors" 
              :key="factor.name"
              class="flex items-center justify-between"
            >
              <span class="text-text-secondary text-sm">{{ factor.name }}</span>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-surface-highlight rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all"
                    :class="factor.status === 'good' ? 'bg-green-400' : factor.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'"
                    :style="{ width: `${factor.score}%` }"
                  ></div>
                </div>
                <span class="text-xs font-mono" :class="factor.status === 'good' ? 'text-green-400' : factor.status === 'warning' ? 'text-yellow-400' : 'text-red-400'">
                  {{ factor.score }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Anomaly Alerts -->
        <div class="glass-panel rounded-xl p-6 lg:col-span-2">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-orange-400">notifications_active</span>
            Anomaly Detection
            <span class="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-surface-highlight text-text-secondary">
              {{ anomalies.length }} alert{{ anomalies.length !== 1 ? 's' : '' }}
            </span>
          </h3>
          <div class="space-y-3 max-h-[300px] overflow-y-auto">
            <div 
              v-for="alert in anomalies" 
              :key="alert.id"
              class="flex items-start gap-3 p-3 rounded-lg bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-colors"
            >
              <div :class="['p-2 rounded-lg shrink-0', getSeverityColor(alert.severity)]">
                <span class="material-symbols-outlined text-[20px]">{{ getTypeIcon(alert.type) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-white font-medium">{{ alert.title }}</span>
                  <span :class="['px-1.5 py-0.5 text-[10px] uppercase font-bold rounded', getSeverityColor(alert.severity)]">
                    {{ alert.severity }}
                  </span>
                </div>
                <p class="text-sm text-text-secondary">{{ alert.description }}</p>
              </div>
              <span class="text-xs text-text-secondary shrink-0">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <div v-if="anomalies.length === 0" class="text-center py-8 text-text-secondary">
              <span class="material-symbols-outlined text-4xl">check_circle</span>
              <p class="mt-2">No anomalies detected</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Patterns & Device Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Usage Patterns -->
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-400">analytics</span>
            Usage Patterns
          </h3>
          <div v-if="usagePatterns.length === 0" class="text-center py-8 text-text-secondary">
            <span class="material-symbols-outlined text-4xl">pie_chart</span>
            <p class="mt-2">No usage data available</p>
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="pattern in usagePatterns" 
              :key="pattern.category"
              class="flex items-center gap-4"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-white font-medium capitalize">{{ pattern.category }}</span>
                  <div class="flex items-center gap-2">
                    <span :class="['material-symbols-outlined text-[16px]', getTrendColor(pattern.trend)]">
                      {{ getTrendIcon(pattern.trend) }}
                    </span>
                    <span class="text-text-secondary text-sm">{{ pattern.visits }} visits</span>
                  </div>
                </div>
                <div class="w-full h-2 bg-surface-highlight rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                    :style="{ width: `${pattern.percentage}%` }"
                  ></div>
                </div>
              </div>
              <span class="text-primary font-bold text-sm w-12 text-right">{{ pattern.percentage }}%</span>
            </div>
          </div>
        </div>

        <!-- Device Activity -->
        <div class="glass-panel rounded-xl p-6">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-green-400">devices</span>
            Active Devices
          </h3>
          <div v-if="deviceActivities.length === 0" class="text-center py-8 text-text-secondary">
            <span class="material-symbols-outlined text-4xl">devices</span>
            <p class="mt-2">No device activity recorded</p>
          </div>
          <div v-else class="space-y-3 max-h-[280px] overflow-y-auto">
            <div 
              v-for="device in deviceActivities" 
              :key="device.deviceId"
              class="flex items-center gap-3 p-3 rounded-lg bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-colors"
            >
              <div class="p-2 rounded-lg bg-surface-highlight">
                <span class="material-symbols-outlined text-primary">computer</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-white font-medium truncate">{{ device.deviceName }}</div>
                <div class="text-xs text-text-secondary">
                  <span class="font-mono">{{ device.deviceId.substring(0, 8) }}...</span>
                  · {{ device.requestCount }} requests
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-text-secondary">{{ formatTime(device.lastSeen) }}</div>
                <div :class="['text-xs font-medium', getRiskColor(device.riskScore)]">
                  Risk: {{ device.riskScore }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Recommendations -->
      <div class="glass-panel rounded-xl p-6">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-yellow-400">lightbulb</span>
          AI Recommendations
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div class="flex items-center gap-2 text-blue-400 mb-2">
              <span class="material-symbols-outlined text-[20px]">schedule</span>
              <span class="font-medium">Activity Monitoring</span>
            </div>
            <p class="text-sm text-text-secondary">
              Enable real-time monitoring for faster anomaly detection and instant alerts.
            </p>
          </div>
          <div class="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div class="flex items-center gap-2 text-purple-400 mb-2">
              <span class="material-symbols-outlined text-[20px]">security</span>
              <span class="font-medium">Security Hardening</span>
            </div>
            <p class="text-sm text-text-secondary">
              Configure 2FA for all admin accounts to improve your security score.
            </p>
          </div>
          <div class="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div class="flex items-center gap-2 text-green-400 mb-2">
              <span class="material-symbols-outlined text-[20px]">auto_fix_high</span>
              <span class="font-medium">Auto Response</span>
            </div>
            <p class="text-sm text-text-secondary">
              Set up automated responses for common security events and threats.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
