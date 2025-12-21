import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const DB_PATH = process.env.WIREGUARD_DB_PATH || join(process.cwd(), 'wg-db')
const MONITORED_SERVERS_PATH = join(DB_PATH, 'server', 'monitored_servers.json')
const TRAFFIC_LOGS_PATH = join(DB_PATH, 'server', 'traffic_logs.json')

export interface MonitoredServer {
    id: string
    name: string
    ip: string
}

export interface TrafficLog {
    id: string
    timestamp: string
    clientIp: string
    targetIp: string
    targetPort: string
    protocol: string
    count: number // Aggregated count for the time window
}

// In-memory logs buffer
let trafficLogs: TrafficLog[] = []
let tcpdumpProcess: ChildProcessWithoutNullStreams | null = null

// Helper to read/write JSON
function readJson<T>(path: string, defaultVal: T): T {
    try {
        if (!existsSync(path)) return defaultVal
        return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
        return defaultVal
    }
}

function writeJson(path: string, data: any) {
    try {
        writeFileSync(path, JSON.stringify(data, null, 2))
    } catch (err) {
        console.error(`Failed to write to ${path}:`, err)
    }
}

export function getMonitoredServers(): MonitoredServer[] {
    return readJson<MonitoredServer[]>(MONITORED_SERVERS_PATH, [])
}

export function saveMonitoredServers(servers: MonitoredServer[]) {
    writeJson(MONITORED_SERVERS_PATH, servers)
    // Restart monitor to apply new filters
    startTrafficMonitor()
}

export function getTrafficLogs(limit = 100): TrafficLog[] {
    // Load from disk on first access if empty
    if (trafficLogs.length === 0 && existsSync(TRAFFIC_LOGS_PATH)) {
        trafficLogs = readJson<TrafficLog[]>(TRAFFIC_LOGS_PATH, [])
    }
    return trafficLogs.slice(0, limit)
}

function saveLogs() {
    // Keep last 1000 logs persisted
    const logsToSave = trafficLogs.slice(0, 1000)
    writeJson(TRAFFIC_LOGS_PATH, logsToSave)
}

// Debounced save
let saveTimeout: NodeJS.Timeout | null = null
function persistLogs() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveLogs, 5000)
}

export function startTrafficMonitor() {
    // Stop existing process
    if (tcpdumpProcess) {
        try {
            tcpdumpProcess.kill()
        } catch { }
        tcpdumpProcess = null
    }

    const servers = getMonitoredServers()
    if (servers.length === 0) {
        console.log('[TrafficMonitor] No servers to monitor.')
        return
    }

    // Build BPF filter: "dst host X or dst host Y ..."
    const ipFilters = servers.map(s => `dst host ${s.ip}`).join(' or ')
    // We only care about new connections (SYN) to avoid spam, or just all packets?
    // Let's track SYN packets to see connection attempts.
    // "tcp[tcpflags] & (tcp-syn) != 0 and (dst host X or ...)"
    const filter = `(tcp[tcpflags] & (tcp-syn) != 0) and (${ipFilters})`

    // Command: tcpdump -i wg0 -n -l -t -q -E "filter"
    // -i wg0: Listen on WireGuard interface
    // -n: Don't resolve hostnames
    // -l: Line buffered
    // -t: Don't print timestamp (we add our own) - actually let's keep it simple

    console.log(`[TrafficMonitor] Starting tcpdump with filter: ${filter}`)

    // Using array format for spawn to avoid shell injection, but tcpdump filters are complex.
    // Safer to just pass args.
    tcpdumpProcess = spawn('tcpdump', ['-i', 'wg0', '-n', '-l', '-q', filter])

    tcpdumpProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n')
        for (const line of lines) {
            if (!line.trim()) continue
            parseTcpdumpLine(line)
        }
    })

    tcpdumpProcess.stderr.on('data', (data) => {
        // console.error('[TrafficMonitor Error]', data.toString())
    })
}

function parseTcpdumpLine(line: string) {
    // Example output (depends on options, assume standard -q):
    // IP 10.252.1.2.53234 > 10.0.0.8.80: tcp 0
    // We need to extract Source IP, Target IP, Target Port

    try {
        // Regex to match "IP <SourceID> > <TargetIP>.<TargetPort>:"
        const match = line.match(/IP\s+([\d\.]+)\.(\d+)\s+>\s+([\d\.]+)\.(\d+):/)
        if (match) {
            const clientIp = match[1]
            const targetIp = match[3]
            const targetPort = match[4]

            logTraffic(clientIp, targetIp, targetPort, 'TCP')
        }
    } catch (err) {
        // console.error('Failed to parse line:', line, err)
    }
}

// Simple rate limiting/aggregation to avoid flooding logs
// Key: clientIp:targetIp:port -> Timestamp
const lastLogged = new Map<string, number>()

function logTraffic(clientIp: string, targetIp: string, targetPort: string, protocol: string) {
    const key = `${clientIp}:${targetIp}:${targetPort}`
    const now = Date.now()
    const last = lastLogged.get(key) || 0

    // Only log once every minute per flow
    if (now - last < 60000) {
        return
    }

    lastLogged.set(key, now)

    const log: TrafficLog = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: new Date().toISOString(),
        clientIp,
        targetIp,
        targetPort,
        protocol,
        count: 1
    }

    trafficLogs.unshift(log)
    if (trafficLogs.length > 2000) trafficLogs.pop()

    persistLogs()
}
