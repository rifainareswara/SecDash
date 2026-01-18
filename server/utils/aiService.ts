/**
 * AI Security Service API Integration
 * 
 * This module provides the backend integration between the Nuxt dashboard
 * and the Python AI microservice.
 */

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

// Types
export interface AnomalyEvent {
    id: string
    client_id: string
    event_type: 'traffic_spike' | 'unusual_time' | 'new_domain_burst' | 'port_scan' | 'behavior_deviation'
    severity: 'low' | 'medium' | 'high' | 'critical'
    risk_score: number
    details: Record<string, any>
    detected_at: string
    acknowledged: boolean
    acknowledged_by?: string
}

export interface UserBehaviorProfile {
    client_id: string
    created_at: string
    data_points: number
    window_days: number
    time_patterns: {
        typical_hours: number[]
        hour_distribution: number[]
        typical_days: number[]
        day_distribution: number[]
    }
    domain_patterns: {
        top_domains: { name: string; count: number }[]
        unique_domains: number
        avg_domains_per_day: number
    }
    category_patterns: {
        distribution: Record<string, number>
        top_categories: { name: string; count: number }[]
    }
    device_patterns: {
        browsers: Record<string, number>
        primary_browser: string
    }
    session_patterns: {
        mean: number
        std: number
        min: number
        max: number
        typical_duration: number
    }
    traffic_patterns: {
        bytes_sent: { mean: number; std: number; min: number; max: number }
        bytes_received: { mean: number; std: number; min: number; max: number }
    }
    risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface AnalysisResult {
    activity_id?: string
    client_id: string
    timestamp?: string
    anomaly: {
        score: number
        is_anomaly: boolean
    }
    deviation?: {
        risk_score: number
        risk_level: string
        deviations: {
            type: string
            detail: string
            severity: string
        }[]
    }
    overall_risk_score: number
    overall_risk_level: string
}

export interface AIServiceStatus {
    status: string
    service: string
    models: {
        anomaly_detector: boolean
        behavior_profiler: boolean
    }
}

export interface TrainingResult {
    success: boolean
    trained_at: string
    n_samples: number
    n_features: number
    contamination: number
    n_anomalies_detected: number
    message?: string
}

export interface AnomalyStats {
    total: number
    unacknowledged: number
    by_severity: Record<string, number>
    by_type: Record<string, number>
}

// Helper function for API calls
async function aiServiceFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${AI_SERVICE_URL}${endpoint}`
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        })
        
        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`AI Service Error: ${response.status} - ${errorText}`)
        }
        
        return response.json()
    } catch (error: any) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            throw new Error('AI Service not available. Make sure the ai-service container is running.')
        }
        throw error
    }
}

// =====================
// Health & Status
// =====================

export async function getAIServiceHealth(): Promise<AIServiceStatus> {
    return aiServiceFetch('/health')
}

export async function getModelStatus(): Promise<{
    anomaly_detector: { is_trained: boolean; metadata?: any }
    behavior_profiler: { has_profiles: boolean; profile_count: number }
}> {
    return aiServiceFetch('/api/status')
}

// =====================
// Analysis Functions
// =====================

export async function analyzeActivity(activity: {
    client_id: string
    domain?: string
    category?: string
    url?: string
    duration?: number
    bytes_sent?: number
    bytes_received?: number
    browser?: string
    os?: string
}): Promise<AnalysisResult> {
    return aiServiceFetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify(activity)
    })
}

export async function analyzeBatch(activities: any[]): Promise<{
    success: boolean
    results: any[]
    total: number
}> {
    return aiServiceFetch('/api/analyze/batch', {
        method: 'POST',
        body: JSON.stringify({ activities })
    })
}

// =====================
// Training Functions
// =====================

export async function trainModels(options: {
    force?: boolean
    data_days?: number
} = {}): Promise<TrainingResult> {
    return aiServiceFetch('/api/train', {
        method: 'POST',
        body: JSON.stringify({
            force: options.force || false,
            data_days: options.data_days || 30
        })
    })
}

export async function buildUserProfile(client_id: string, data_days: number = 30): Promise<{
    success: boolean
    profile: UserBehaviorProfile
}> {
    return aiServiceFetch('/api/profile/build', {
        method: 'POST',
        body: JSON.stringify({ client_id, data_days })
    })
}

export async function buildAllProfiles(data_days: number = 30): Promise<{
    success: boolean
    built: number
    skipped: number
    clients_built: string[]
    clients_skipped: { client_id: string; count: number }[]
}> {
    return aiServiceFetch(`/api/profile/build-all?data_days=${data_days}`, {
        method: 'POST'
    })
}

// =====================
// Profile Functions
// =====================

export async function getUserProfile(client_id: string): Promise<{
    success: boolean
    profile: UserBehaviorProfile
}> {
    return aiServiceFetch(`/api/profile/${client_id}`)
}

export async function listProfiles(): Promise<{
    profiles: {
        client_id: string
        data_points: number
        created_at?: string
        risk_level: string
        unique_domains: number
    }[]
    total: number
}> {
    return aiServiceFetch('/api/profiles')
}

// =====================
// Anomaly Functions
// =====================

export async function listAnomalies(options: {
    client_id?: string
    severity?: string
    acknowledged?: boolean
    page?: number
    per_page?: number
} = {}): Promise<{
    anomalies: AnomalyEvent[]
    total: number
    page: number
    per_page: number
}> {
    const params = new URLSearchParams()
    if (options.client_id) params.set('client_id', options.client_id)
    if (options.severity) params.set('severity', options.severity)
    if (options.acknowledged !== undefined) params.set('acknowledged', String(options.acknowledged))
    if (options.page) params.set('page', String(options.page))
    if (options.per_page) params.set('per_page', String(options.per_page))
    
    const query = params.toString()
    return aiServiceFetch(`/api/anomalies${query ? '?' + query : ''}`)
}

export async function acknowledgeAnomaly(event_id: string, acknowledged_by: string = 'admin'): Promise<{
    success: boolean
    event: AnomalyEvent
}> {
    return aiServiceFetch(`/api/anomalies/${event_id}/acknowledge?acknowledged_by=${acknowledged_by}`, {
        method: 'POST'
    })
}

export async function getAnomalyStats(): Promise<AnomalyStats> {
    return aiServiceFetch('/api/anomalies/stats')
}

// =====================
// Feature Importance
// =====================

export async function getFeatureImportance(): Promise<{
    success: boolean
    features: Record<string, number>
    sorted: [string, number][]
}> {
    return aiServiceFetch('/api/feature-importance')
}
