import { join } from 'path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { randomBytes, createHash } from 'crypto'
import { execSync } from 'child_process'

const DB_PATH = process.env.WIREGUARD_DB_PATH || join(process.cwd(), 'wg-db')
const CONFIG_PATH = process.env.WIREGUARD_CONFIG_PATH || join(process.cwd(), 'wg-config')

export interface WGClient {
    id: string
    name: string
    email: string
    public_key: string
    preshared_key: string
    private_key?: string
    allocated_ips: string[]
    allowed_ips: string[]
    enabled: boolean
    created_at: string
    updated_at: string
    // 2FA session fields
    require_2fa?: boolean
    session_expires_at?: string  // ISO timestamp when session expires
    // Per-client 2FA (self-service)
    totp_secret?: string
    totp_enabled?: boolean
}

export interface WGServerConfig {
    addresses: string[]
    listen_port: string
    private_key: string
    public_key: string
    post_up: string
    pre_down: string
    post_down: string
    updated_at: string
}

export interface WGGlobalSettings {
    endpoint_address: string
    dns_servers: string[]
    mtu: string
    persistent_keepalive: string
    firewall_mark: string
    table: string
    config_file_path: string
}

export interface SMTPSettings {
    host: string
    port: number
    secure: boolean
    auth_user: string
    auth_pass: string
    from_email: string
    from_name: string
}

export interface AdminUser {
    username: string
    password_hash: string
    admin: boolean
    created_at?: string
    // 2FA fields
    totp_secret?: string
    totp_enabled?: boolean
}

export interface WoLHost {
    id: string
    name: string
    mac_address: string
    ip_address?: string
    created_at?: string
}

function readJsonFile<T>(filePath: string): T | null {
    try {
        if (!existsSync(filePath)) {
            return null
        }
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content) as T
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error)
        return null
    }
}

function writeJsonFile<T>(filePath: string, data: T): boolean {
    try {
        const dir = filePath.substring(0, filePath.lastIndexOf('/'))
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
        }
        writeFileSync(filePath, JSON.stringify(data, null, 2))
        return true
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error)
        return false
    }
}

export function checkDatabaseExists(): boolean {
    return existsSync(DB_PATH)
}

export function initDatabase(): void {
    // Create directories if they don't exist
    const dirs = ['clients', 'server', 'users']
    for (const dir of dirs) {
        const dirPath = join(DB_PATH, dir)
        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true })
        }
    }

    // Initialize server config if not exists
    const interfacesPath = join(DB_PATH, 'server', 'interfaces.json')
    if (!existsSync(interfacesPath)) {
        writeJsonFile(interfacesPath, {
            addresses: ['10.252.1.0/24'],
            listen_port: '51820',
            updated_at: new Date().toISOString(),
            post_up: '',
            pre_down: '',
            post_down: ''
        })
    }

    // Initialize global settings if not exists
    const settingsPath = join(DB_PATH, 'server', 'global_settings.json')
    if (!existsSync(settingsPath)) {
        writeJsonFile(settingsPath, {
            endpoint_address: '',
            dns_servers: ['1.1.1.1'],
            mtu: '1450',
            persistent_keepalive: '15'
        })
    }
}

export function getClients(): WGClient[] {
    const clientsDir = join(DB_PATH, 'clients')

    if (!existsSync(clientsDir)) {
        return []
    }

    try {
        const files = readdirSync(clientsDir).filter(f => f.endsWith('.json'))
        const clients: WGClient[] = []

        for (const file of files) {
            const filePath = join(clientsDir, file)
            const client = readJsonFile<any>(filePath)
            if (client) {
                clients.push({
                    id: file.replace('.json', ''),
                    name: client.name || '',
                    email: client.email || '',
                    public_key: client.public_key || '',
                    preshared_key: client.preshared_key || '',
                    allocated_ips: client.allocated_ips || [],
                    allowed_ips: client.allowed_ips || [],
                    enabled: client.enabled !== false,
                    created_at: client.created_at || '',
                    updated_at: client.updated_at || ''
                })
            }
        }

        return clients.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    } catch (error) {
        console.error('Error reading clients:', error)
        return []
    }
}

export function getClientById(id: string): WGClient | null {
    const filePath = join(DB_PATH, 'clients', `${id}.json`)
    const client = readJsonFile<any>(filePath)

    if (!client) return null

    return {
        id,
        name: client.name || '',
        email: client.email || '',
        public_key: client.public_key || '',
        private_key: client.private_key || '', // Include private key
        preshared_key: client.preshared_key || '',
        allocated_ips: client.allocated_ips || [],
        allowed_ips: client.allowed_ips || [],
        enabled: client.enabled !== false,
        created_at: client.created_at || '',
        updated_at: client.updated_at || '',
        // 2FA fields
        require_2fa: client.require_2fa === true,
        session_expires_at: client.session_expires_at,
        totp_secret: client.totp_secret,
        totp_enabled: client.totp_enabled === true
    }
}

export function getServerConfig(): WGServerConfig | null {
    return readJsonFile<WGServerConfig>(join(DB_PATH, 'server', 'interfaces.json'))
}

export function getGlobalSettings(): WGGlobalSettings | null {
    return readJsonFile<WGGlobalSettings>(join(DB_PATH, 'server', 'global_settings.json'))
}

// Update server configuration
export function updateServerConfig(config: Partial<WGServerConfig>): WGServerConfig {
    const currentConfig = getServerConfig() || {
        addresses: ['10.252.1.0/24'],
        listen_port: '51820',
        private_key: '',
        public_key: '',
        post_up: 'iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE',
        pre_down: '',
        post_down: 'iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE',
        updated_at: new Date().toISOString()
    }

    const newConfig: WGServerConfig = {
        ...currentConfig,
        ...config,
        updated_at: new Date().toISOString()
    }

    writeJsonFile(join(DB_PATH, 'server', 'interfaces.json'), newConfig)
    return newConfig
}

export function updateGlobalSettings(settings: Partial<WGGlobalSettings>): WGGlobalSettings {
    const currentSettings = getGlobalSettings() || {
        endpoint_address: '',
        dns_servers: ['1.1.1.1'],
        mtu: '1450',
        persistent_keepalive: '15',
        firewall_mark: '0xca6c',
        table: 'auto',
        config_file_path: '/etc/wireguard/wg0.conf'
    }

    const newSettings: WGGlobalSettings = {
        ...currentSettings,
        ...settings
    }

    writeJsonFile(join(DB_PATH, 'server', 'global_settings.json'), newSettings)
    return newSettings
}

export function getSMTPSettings(): SMTPSettings | null {
    return readJsonFile<SMTPSettings>(join(DB_PATH, 'server', 'smtp_settings.json'))
}

export function updateSMTPSettings(settings: Partial<SMTPSettings>): SMTPSettings {
    const currentSettings = getSMTPSettings() || {
        host: '',
        port: 587,
        secure: false,
        auth_user: '',
        auth_pass: '',
        from_email: '',
        from_name: 'WireGuard VPN'
    }

    const newSettings: SMTPSettings = {
        ...currentSettings,
        ...settings
    }

    writeJsonFile(join(DB_PATH, 'server', 'smtp_settings.json'), newSettings)
    return newSettings
}

// Admin User Management
export function getAdminUsers(): AdminUser[] {
    const usersDir = join(DB_PATH, 'users')

    if (!existsSync(usersDir)) {
        return []
    }

    try {
        const files = readdirSync(usersDir).filter(f => f.endsWith('.json'))
        const users: AdminUser[] = []

        for (const file of files) {
            const filePath = join(usersDir, file)
            const user = readJsonFile<any>(filePath)
            if (user) {
                users.push({
                    username: user.username || file.replace('.json', ''),
                    password_hash: user.password_hash || '',
                    admin: user.admin !== false,
                    created_at: user.created_at || ''
                })
            }
        }

        return users
    } catch (error) {
        console.error('Error reading admin users:', error)
        return []
    }
}

export function getAdminUser(username: string): AdminUser | null {
    const filePath = join(DB_PATH, 'users', `${username}.json`)
    const user = readJsonFile<any>(filePath)

    if (!user) return null

    return {
        username: user.username || username,
        password_hash: user.password_hash || '',
        admin: user.admin !== false,
        created_at: user.created_at || '',
        totp_secret: user.totp_secret,
        totp_enabled: user.totp_enabled === true
    }
}

export function createAdminUser(username: string, passwordHash: string): AdminUser {
    const usersDir = join(DB_PATH, 'users')
    if (!existsSync(usersDir)) {
        mkdirSync(usersDir, { recursive: true })
    }

    const user: AdminUser = {
        username,
        password_hash: passwordHash,
        admin: true,
        created_at: new Date().toISOString()
    }

    const filePath = join(usersDir, `${username}.json`)
    writeJsonFile(filePath, user)
    return user
}

export function updateAdminUser(username: string, updates: Partial<AdminUser>): AdminUser | null {
    const filePath = join(DB_PATH, 'users', `${username}.json`)
    const user = readJsonFile<AdminUser>(filePath)

    if (!user) return null

    const updatedUser: AdminUser = {
        ...user,
        ...updates
    }

    if (writeJsonFile(filePath, updatedUser)) {
        return updatedUser
    }
    return null
}

export function deleteAdminUser(username: string): boolean {
    const filePath = join(DB_PATH, 'users', `${username}.json`)
    try {
        if (existsSync(filePath)) {
            const fs = require('fs')
            fs.unlinkSync(filePath)
            return true
        }
        return false
    } catch (error) {
        console.error('Error deleting admin user:', error)
        return false
    }
}

// Wake-on-LAN Host Management
export function getWoLHosts(): WoLHost[] {
    const hostsDir = join(DB_PATH, 'wake_on_lan_hosts')

    if (!existsSync(hostsDir)) {
        mkdirSync(hostsDir, { recursive: true })
        return []
    }

    try {
        const files = readdirSync(hostsDir).filter(f => f.endsWith('.json'))
        const hosts: WoLHost[] = []

        for (const file of files) {
            const filePath = join(hostsDir, file)
            const host = readJsonFile<any>(filePath)
            if (host) {
                hosts.push({
                    id: host.id || file.replace('.json', ''),
                    name: host.name || '',
                    mac_address: host.mac_address || '',
                    ip_address: host.ip_address || '',
                    created_at: host.created_at || ''
                })
            }
        }

        return hosts
    } catch (error) {
        console.error('Error reading WoL hosts:', error)
        return []
    }
}

export function createWoLHost(name: string, macAddress: string, ipAddress?: string): WoLHost {
    const hostsDir = join(DB_PATH, 'wake_on_lan_hosts')
    if (!existsSync(hostsDir)) {
        mkdirSync(hostsDir, { recursive: true })
    }

    const id = createHash('md5').update(randomBytes(8)).digest('hex').substring(0, 8)
    const host: WoLHost = {
        id,
        name,
        mac_address: macAddress,
        ip_address: ipAddress || '',
        created_at: new Date().toISOString()
    }

    const filePath = join(hostsDir, `${id}.json`)
    writeJsonFile(filePath, host)
    return host
}

export function deleteWoLHost(id: string): boolean {
    const filePath = join(DB_PATH, 'wake_on_lan_hosts', `${id}.json`)
    try {
        if (existsSync(filePath)) {
            const fs = require('fs')
            fs.unlinkSync(filePath)
            return true
        }
        return false
    } catch (error) {
        console.error('Error deleting WoL host:', error)
        return false
    }
}

export function getClientConfig(clientId: string): string {
    const client = getClientById(clientId)
    const serverConfig = getServerConfig()
    const globalSettings = getGlobalSettings()

    if (!client || !serverConfig || !globalSettings) {
        throw new Error('Missing configuration data')
    }

    // This is a simplified config generation. In a real scenario, you'd need the private key.
    // Since we don't store private keys in this demo DB structure for security (usually),
    // we'll assume the client has their private key, OR we'd need to change the DB to store it.
    // For this demo/UI, we will generate a placeholder config or assume keys are managed elsewhere.

    // However, to make the "QR Code" feature useful, we really need the private key.
    // Let's assume for this "Manager" app, we DO store private keys if we generated them.
    // If not, we can't generate a valid config for the client.

    // Check if client has a private key in the DB (schema update might be needed if not present)
    const privateKey = (client as any).private_key || '<CLIENT_PRIVATE_KEY>'

    // Ensure endpoint has a value, check env vars first, then global settings, then fallback
    const envHost = process.env.PUBLIC_HOST || process.env.SERVERURL || process.env.WG_HOST
    const endpointHost = (envHost && envHost !== 'auto') ? envHost : (globalSettings.endpoint_address || '127.0.0.1')

    // Build the config string
    const presharedKeyLine = client.preshared_key ? `PresharedKey = ${client.preshared_key}\n` : ''

    const config = `[Interface]
PrivateKey = ${privateKey}
Address = ${client.allocated_ips.join(',')}
DNS = ${globalSettings.dns_servers.join(',')}
MTU = ${globalSettings.mtu}

[Peer]
PublicKey = ${serverConfig.public_key || '<SERVER_PUBLIC_KEY>'}
${presharedKeyLine}Endpoint = ${endpointHost}:${serverConfig.listen_port}
AllowedIPs = ${client.allowed_ips.join(',')}
PersistentKeepalive = ${globalSettings.persistent_keepalive}
`
    return config
}


// Generate a simple client ID
function generateClientId(): string {
    return createHash('md5').update(randomBytes(16)).digest('hex').substring(0, 8)
}

// Get next available IP address
function getNextAvailableIp(clients: WGClient[], serverConfig: WGServerConfig): string {
    const baseIp = serverConfig.addresses[0]?.split('/')[0] || '10.252.1.0'
    const parts = baseIp.split('.')
    const basePrefix = parts.slice(0, 3).join('.')

    const usedIps = new Set<number>()
    usedIps.add(1) // Reserve .1 for server

    for (const client of clients) {
        for (const ip of client.allocated_ips) {
            const lastOctet = parseInt(ip.split('.')[3]?.split('/')[0] || '0')
            usedIps.add(lastOctet)
        }
    }

    for (let i = 2; i < 255; i++) {
        if (!usedIps.has(i)) {
            return `${basePrefix}.${i}/32`
        }
    }

    throw new Error('No available IP addresses')
}

// Generate WireGuard key pair
function generateKeyPair(): { privateKey: string; publicKey: string } {
    try {
        // Try to use wg command if available
        const privateKey = execSync('wg genkey', { encoding: 'utf-8' }).trim()
        const publicKey = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf-8', shell: '/bin/sh' }).trim()
        return { privateKey, publicKey }
    } catch {
        // Fallback to random node crypto keys (placeholder - works for testing but not real connection)
        const privateKey = randomBytes(32).toString('base64')
        const publicKey = createHash('sha256').update(privateKey).digest('base64')
        return { privateKey, publicKey }
    }
}

export function createClient(name: string, email?: string): WGClient {
    initDatabase()

    const clients = getClients()
    const serverConfig = getServerConfig()

    if (!serverConfig) {
        throw new Error('Server not configured')
    }

    const id = generateClientId()
    const allocatedIp = getNextAvailableIp(clients, serverConfig)
    const keys = generateKeyPair()

    const client: WGClient = {
        id,
        name,
        email: email || '',
        private_key: keys.privateKey,
        public_key: keys.publicKey,
        preshared_key: '',
        allocated_ips: [allocatedIp],
        allowed_ips: ['0.0.0.0/0'],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    const filePath = join(DB_PATH, 'clients', `${id}.json`)
    writeJsonFile(filePath, client)

    // Sync with WireGuard interface
    try {
        execSync(`wg set wg0 peer "${client.public_key}" allowed-ips "${client.allocated_ips.join(',')}"`, { stdio: 'ignore' })
    } catch (err) {
        console.error('Failed to add peer to WireGuard interface:', err)
    }

    return client
}

export function deleteClient(id: string): boolean {
    const filePath = join(DB_PATH, 'clients', `${id}.json`)
    console.log(`[DEBUG] Attempting to delete client ${id} at path: ${filePath}`)

    try {
        // Try to read client to get public key (graceful if fails)
        const client = readJsonFile<WGClient>(filePath)

        // Delete file directly
        try {
            if (existsSync(filePath)) {
                unlinkSync(filePath)
                console.log(`[DEBUG] Successfully deleted file: ${filePath}`)
            } else {
                console.log(`[DEBUG] File already missing, considering deleted: ${filePath}`)
            }
        } catch (err: any) {
            console.error(`[DEBUG] Error deleting file ${filePath}:`, err)
            // If we can't delete the config file, we can't fully remove the client
            return false
        }

        // Remove peer from WireGuard interface
        // We do this AFTER file deletion attempt. If file is gone, we still try to remove peer just in case.
        if (client && client.public_key) {
            try {
                execSync(`wg set wg0 peer "${client.public_key}" remove`, { stdio: 'ignore' })
                console.log(`[DEBUG] Removed peer from wg0: ${client.public_key}`)
            } catch (err) {
                // Ignore peer removal error (might already be gone)
                console.warn('Warning: Failed to remove peer from WireGuard interface (might be already removed):', err)
            }
        }

        return true
    } catch (error) {
        console.error('Error deleting client (General):', error)
        return false
    }
}

export function updateClient(id: string, updates: Partial<WGClient>): WGClient | null {
    const filePath = join(DB_PATH, 'clients', `${id}.json`)
    const client = readJsonFile<WGClient>(filePath)

    if (!client) return null

    const updatedClient: WGClient = {
        ...client,
        ...updates,
        updated_at: new Date().toISOString()
    }

    if (writeJsonFile(filePath, updatedClient)) {
        return updatedClient
    }
    return null
}


// ==========================================
// Uptime Monitor Management
// ==========================================

export interface UptimeMonitor {
    id: string
    name: string
    url: string
    type: 'http' | 'ping' | 'port'
    method?: string          // GET, POST, etc for http
    port?: number            // for port check
    interval: number         // seconds
    timeout: number          // seconds
    retries: number
    enabled: boolean
    created_at: string
    updated_at: string
}

export interface UptimeLog {
    id: string
    monitor_id: string
    timestamp: string
    status: 'up' | 'down'
    response_time: number    // ms
    status_code?: number     // for HTTP
    error?: string
}

export interface UptimeStats {
    monitor_id: string
    uptime_24h: number       // percentage
    uptime_7d: number        // percentage
    uptime_30d: number       // percentage
    avg_response_time: number
    last_check: string | null
    current_status: 'up' | 'down' | 'unknown'
}

const MONITORS_DIR = join(DB_PATH, 'monitors')
const UPTIME_LOGS_DIR = join(DB_PATH, 'uptime_logs')
const MAX_LOGS_PER_MONITOR = 1440 // 24 hours at 1 min interval

function ensureMonitorDirs() {
    if (!existsSync(MONITORS_DIR)) {
        mkdirSync(MONITORS_DIR, { recursive: true })
    }
    if (!existsSync(UPTIME_LOGS_DIR)) {
        mkdirSync(UPTIME_LOGS_DIR, { recursive: true })
    }
}

export function getMonitors(): UptimeMonitor[] {
    ensureMonitorDirs()

    try {
        const files = readdirSync(MONITORS_DIR).filter(f => f.endsWith('.json'))
        const monitors: UptimeMonitor[] = []

        for (const file of files) {
            const filePath = join(MONITORS_DIR, file)
            const monitor = readJsonFile<UptimeMonitor>(filePath)
            if (monitor) {
                monitors.push({
                    ...monitor,
                    id: monitor.id || file.replace('.json', '')
                })
            }
        }

        return monitors.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    } catch (error) {
        console.error('Error reading monitors:', error)
        return []
    }
}

export function getMonitorById(id: string): UptimeMonitor | null {
    ensureMonitorDirs()
    const filePath = join(MONITORS_DIR, `${id}.json`)
    return readJsonFile<UptimeMonitor>(filePath)
}

export function createMonitor(data: Omit<UptimeMonitor, 'id' | 'created_at' | 'updated_at'>): UptimeMonitor {
    ensureMonitorDirs()

    const id = createHash('md5').update(randomBytes(16)).digest('hex').substring(0, 8)
    const now = new Date().toISOString()

    const monitor: UptimeMonitor = {
        id,
        name: data.name,
        url: data.url,
        type: data.type || 'http',
        method: data.method || 'GET',
        port: data.port,
        interval: data.interval || 60,
        timeout: data.timeout || 10,
        retries: data.retries || 3,
        enabled: data.enabled !== false,
        created_at: now,
        updated_at: now
    }

    const filePath = join(MONITORS_DIR, `${id}.json`)
    writeJsonFile(filePath, monitor)
    return monitor
}

export function updateMonitor(id: string, updates: Partial<UptimeMonitor>): UptimeMonitor | null {
    const filePath = join(MONITORS_DIR, `${id}.json`)
    const monitor = readJsonFile<UptimeMonitor>(filePath)

    if (!monitor) return null

    const updatedMonitor: UptimeMonitor = {
        ...monitor,
        ...updates,
        id, // Ensure ID doesn't change
        updated_at: new Date().toISOString()
    }

    if (writeJsonFile(filePath, updatedMonitor)) {
        return updatedMonitor
    }
    return null
}

export function deleteMonitor(id: string): boolean {
    const filePath = join(MONITORS_DIR, `${id}.json`)
    const logsFile = join(UPTIME_LOGS_DIR, `${id}.json`)

    try {
        if (existsSync(filePath)) {
            unlinkSync(filePath)
        }
        // Also delete logs
        if (existsSync(logsFile)) {
            unlinkSync(logsFile)
        }
        return true
    } catch (error) {
        console.error('Error deleting monitor:', error)
        return false
    }
}

export function addUptimeLog(monitorId: string, result: Omit<UptimeLog, 'id' | 'monitor_id' | 'timestamp'>): void {
    ensureMonitorDirs()

    const logsFile = join(UPTIME_LOGS_DIR, `${monitorId}.json`)
    let logs: UptimeLog[] = readJsonFile<UptimeLog[]>(logsFile) || []

    const log: UptimeLog = {
        id: Date.now().toString(36),
        monitor_id: monitorId,
        timestamp: new Date().toISOString(),
        status: result.status,
        response_time: result.response_time,
        status_code: result.status_code,
        error: result.error
    }

    logs.unshift(log)

    // Keep only last MAX_LOGS_PER_MONITOR
    if (logs.length > MAX_LOGS_PER_MONITOR) {
        logs = logs.slice(0, MAX_LOGS_PER_MONITOR)
    }

    writeJsonFile(logsFile, logs)
}

export function getUptimeLogs(monitorId: string, limit: number = 100): UptimeLog[] {
    const logsFile = join(UPTIME_LOGS_DIR, `${monitorId}.json`)
    const logs = readJsonFile<UptimeLog[]>(logsFile) || []
    return logs.slice(0, limit)
}

export function getUptimeStats(monitorId: string): UptimeStats {
    const logs = getUptimeLogs(monitorId, MAX_LOGS_PER_MONITOR)
    const now = Date.now()

    const stats: UptimeStats = {
        monitor_id: monitorId,
        uptime_24h: 100,
        uptime_7d: 100,
        uptime_30d: 100,
        avg_response_time: 0,
        last_check: logs[0]?.timestamp || null,
        current_status: logs[0]?.status || 'unknown'
    }

    if (logs.length === 0) return stats

    // Calculate uptimes
    const MS_24H = 24 * 60 * 60 * 1000
    const MS_7D = 7 * MS_24H
    const MS_30D = 30 * MS_24H

    const logs24h = logs.filter(l => now - new Date(l.timestamp).getTime() < MS_24H)
    const logs7d = logs.filter(l => now - new Date(l.timestamp).getTime() < MS_7D)
    const logs30d = logs.filter(l => now - new Date(l.timestamp).getTime() < MS_30D)

    if (logs24h.length > 0) {
        stats.uptime_24h = Math.round((logs24h.filter(l => l.status === 'up').length / logs24h.length) * 100)
    }
    if (logs7d.length > 0) {
        stats.uptime_7d = Math.round((logs7d.filter(l => l.status === 'up').length / logs7d.length) * 100)
    }
    if (logs30d.length > 0) {
        stats.uptime_30d = Math.round((logs30d.filter(l => l.status === 'up').length / logs30d.length) * 100)
    }

    // Calculate average response time (only from successful checks)
    const successfulLogs = logs24h.filter(l => l.status === 'up' && l.response_time > 0)
    if (successfulLogs.length > 0) {
        stats.avg_response_time = Math.round(
            successfulLogs.reduce((sum, l) => sum + l.response_time, 0) / successfulLogs.length
        )
    }

    return stats
}

// ==========================================
// Browsing Activity Tracking
// ==========================================

export interface BrowsingActivity {
    id: string
    client_id: string           // VPN client ID or device identifier
    device_name?: string        // Optional device name
    url: string                 // Full URL
    domain: string              // Extracted domain
    title?: string              // Page title if available
    category?: string           // Category (social, news, work, etc)
    source: 'agent' | 'dns'     // Data source
    blocked?: boolean           // Was this access blocked
    timestamp: string
    duration?: number           // Time spent in seconds
}

export interface ActivityStats {
    total_visits: number
    unique_domains: number
    top_domains: { domain: string; count: number }[]
    top_categories: { category: string; count: number }[]
    visits_by_hour: { hour: number; count: number }[]
    period: '24h' | '7d' | '30d'
}

const ACTIVITY_LOGS_DIR = join(DB_PATH, 'activity_logs')
const MAX_ACTIVITY_LOGS = 10000 // Keep last 10k logs

function ensureActivityDirs() {
    if (!existsSync(ACTIVITY_LOGS_DIR)) {
        mkdirSync(ACTIVITY_LOGS_DIR, { recursive: true })
    }
}

// Extract domain from URL
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url)
        return urlObj.hostname.replace(/^www\./, '')
    } catch {
        // If URL parsing fails, try to extract domain manually
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/:\?]+)/i)
        return match ? match[1] : url
    }
}

// Categorize domain (basic categorization)
function categorizeDomain(domain: string): string {
    const categories: Record<string, string[]> = {
        'social': ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'x.com', 'threads.net'],
        'video': ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'disney.com'],
        'news': ['cnn.com', 'bbc.com', 'detik.com', 'kompas.com', 'liputan6.com', 'tribunnews.com'],
        'shopping': ['tokopedia.com', 'shopee.co.id', 'lazada.co.id', 'bukalapak.com', 'amazon.com', 'ebay.com'],
        'work': ['slack.com', 'notion.so', 'trello.com', 'asana.com', 'github.com', 'gitlab.com', 'jira.atlassian.com'],
        'email': ['gmail.com', 'mail.google.com', 'outlook.com', 'mail.yahoo.com'],
        'search': ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'],
        'gaming': ['steam.com', 'epicgames.com', 'roblox.com', 'minecraft.net'],
        'adult': [] // Add domains to block/flag
    }

    for (const [category, domains] of Object.entries(categories)) {
        if (domains.some(d => domain.includes(d) || d.includes(domain))) {
            return category
        }
    }
    return 'other'
}

// Log browsing activity
export function logBrowsingActivity(data: {
    client_id: string
    device_name?: string
    url: string
    title?: string
    source: 'agent' | 'dns'
    duration?: number
}): BrowsingActivity {
    ensureActivityDirs()

    const domain = extractDomain(data.url)
    const category = categorizeDomain(domain)

    const activity: BrowsingActivity = {
        id: `${Date.now()}-${randomBytes(4).toString('hex')}`,
        client_id: data.client_id,
        device_name: data.device_name,
        url: data.url,
        domain,
        title: data.title,
        category,
        source: data.source,
        blocked: false,
        timestamp: new Date().toISOString(),
        duration: data.duration
    }

    // Store in daily log files for easier management
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const logFile = join(ACTIVITY_LOGS_DIR, `${dateKey}.json`)

    let logs: BrowsingActivity[] = readJsonFile<BrowsingActivity[]>(logFile) || []
    logs.unshift(activity)

    // Limit logs per day
    if (logs.length > MAX_ACTIVITY_LOGS) {
        logs = logs.slice(0, MAX_ACTIVITY_LOGS)
    }

    writeJsonFile(logFile, logs)
    return activity
}

// Get browsing activity logs with filtering
export function getBrowsingActivity(options: {
    client_id?: string
    domain?: string
    category?: string
    source?: 'agent' | 'dns'
    start_date?: string
    end_date?: string
    limit?: number
}): BrowsingActivity[] {
    ensureActivityDirs()

    const limit = options.limit || 500
    const endDate = options.end_date ? new Date(options.end_date) : new Date()
    const startDate = options.start_date ? new Date(options.start_date) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days

    let allLogs: BrowsingActivity[] = []

    try {
        const files = readdirSync(ACTIVITY_LOGS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)) // Most recent first

        for (const file of files) {
            const dateStr = file.replace('.json', '')
            const fileDate = new Date(dateStr)

            // Skip files outside date range
            if (fileDate < startDate || fileDate > endDate) continue

            const logs = readJsonFile<BrowsingActivity[]>(join(ACTIVITY_LOGS_DIR, file)) || []
            allLogs = allLogs.concat(logs)

            // Early exit if we have enough
            if (allLogs.length >= limit * 2) break
        }
    } catch (error) {
        console.error('Error reading activity logs:', error)
    }

    // Apply filters
    let filtered = allLogs

    if (options.client_id) {
        filtered = filtered.filter(l => l.client_id === options.client_id)
    }
    if (options.domain) {
        filtered = filtered.filter(l => l.domain.includes(options.domain!))
    }
    if (options.category) {
        filtered = filtered.filter(l => l.category === options.category)
    }
    if (options.source) {
        filtered = filtered.filter(l => l.source === options.source)
    }

    // Sort by timestamp descending and limit
    return filtered
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
}

// Get activity statistics
export function getActivityStats(client_id?: string, period: '24h' | '7d' | '30d' = '24h'): ActivityStats {
    const now = Date.now()
    const periodMs = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
    }

    const startDate = new Date(now - periodMs[period]).toISOString()
    const logs = getBrowsingActivity({
        client_id,
        start_date: startDate,
        limit: 10000
    })

    // Calculate stats
    const domainCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    const hourCounts: Record<number, number> = {}

    for (const log of logs) {
        // Domain counts
        domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1

        // Category counts
        if (log.category) {
            categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1
        }

        // Hour counts
        const hour = new Date(log.timestamp).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    // Sort and get top items
    const topDomains = Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    const topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

    const visitsByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourCounts[hour] || 0
    }))

    return {
        total_visits: logs.length,
        unique_domains: Object.keys(domainCounts).length,
        top_domains: topDomains,
        top_categories: topCategories,
        visits_by_hour: visitsByHour,
        period
    }
}

// Delete old activity logs
export function cleanupActivityLogs(daysToKeep: number = 30): number {
    ensureActivityDirs()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    let deletedCount = 0

    try {
        const files = readdirSync(ACTIVITY_LOGS_DIR).filter(f => f.endsWith('.json'))

        for (const file of files) {
            const dateStr = file.replace('.json', '')
            const fileDate = new Date(dateStr)

            if (fileDate < cutoffDate) {
                unlinkSync(join(ACTIVITY_LOGS_DIR, file))
                deletedCount++
            }
        }
    } catch (error) {
        console.error('Error cleaning up activity logs:', error)
    }

    return deletedCount
}
