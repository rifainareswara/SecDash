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
        updated_at: client.updated_at || ''
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
        created_at: user.created_at || ''
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

    // Ensure endpoint has a value, fallback to localhost if missing (though should be detected)
    const endpointHost = globalSettings.endpoint_address || '127.0.0.1'

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


