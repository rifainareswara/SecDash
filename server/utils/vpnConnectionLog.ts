import { execSync } from 'child_process'

interface VpnConnectionLog {
    id: string
    timestamp: string
    clientName: string
    clientPublicKey: string
    clientIp: string
    event: 'handshake' | 'connect' | 'disconnect' | 'traffic'
    lastHandshake?: string
    transferRx?: number
    transferTx?: number
    endpoint?: string
}

// In-memory storage for VPN connection logs
let connectionLogs: VpnConnectionLog[] = []
const MAX_LOGS = 500

// Previous state for change detection
let previousClientStates: Map<string, { lastHandshake: string; transferRx: number; transferTx: number }> = new Map()

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

// Parse WireGuard show output
function parseWgShow(): Array<{
    publicKey: string
    endpoint: string
    lastHandshake: Date | null
    transferRx: number
    transferTx: number
}> {
    try {
        const output = execSync('wg show wg0', { encoding: 'utf-8', timeout: 5000 })
        const peers: Array<{
            publicKey: string
            endpoint: string
            lastHandshake: Date | null
            transferRx: number
            transferTx: number
        }> = []

        const lines = output.split('\n')
        let currentPeer: any = null

        for (const line of lines) {
            if (line.startsWith('peer:')) {
                if (currentPeer) peers.push(currentPeer)
                currentPeer = {
                    publicKey: line.replace('peer:', '').trim(),
                    endpoint: '',
                    lastHandshake: null,
                    transferRx: 0,
                    transferTx: 0
                }
            } else if (currentPeer) {
                if (line.includes('endpoint:')) {
                    currentPeer.endpoint = line.replace('endpoint:', '').trim()
                } else if (line.includes('latest handshake:')) {
                    const hsText = line.replace('latest handshake:', '').trim()
                    if (hsText !== '(none)') {
                        // Parse relative time like "1 minute, 30 seconds ago"
                        currentPeer.lastHandshake = new Date()
                    }
                } else if (line.includes('transfer:')) {
                    const match = line.match(/transfer:\s+([\d.]+\s*\w+)\s+received,\s+([\d.]+\s*\w+)\s+sent/)
                    if (match) {
                        currentPeer.transferRx = parseTransfer(match[1])
                        currentPeer.transferTx = parseTransfer(match[2])
                    }
                }
            }
        }
        if (currentPeer) peers.push(currentPeer)

        return peers
    } catch {
        return []
    }
}

function parseTransfer(str: string): number {
    const match = str.match(/([\d.]+)\s*(\w+)/)
    if (!match) return 0
    const value = parseFloat(match[1])
    const unit = match[2].toLowerCase()

    switch (unit) {
        case 'kib': return value * 1024
        case 'mib': return value * 1024 * 1024
        case 'gib': return value * 1024 * 1024 * 1024
        case 'b': return value
        default: return value
    }
}

// Poll for VPN activity and log changes
export function pollVpnActivity(clientsMap: Map<string, string>): void {
    try {
        const peers = parseWgShow()
        const now = new Date().toISOString()

        for (const peer of peers) {
            const prevState = previousClientStates.get(peer.publicKey)
            const clientName = clientsMap.get(peer.publicKey) || 'Unknown Client'

            // New handshake detected
            if (peer.lastHandshake && (!prevState || prevState.transferRx !== peer.transferRx || prevState.transferTx !== peer.transferTx)) {
                const log: VpnConnectionLog = {
                    id: generateId(),
                    timestamp: now,
                    clientName,
                    clientPublicKey: peer.publicKey.substring(0, 20) + '...',
                    clientIp: peer.endpoint.split(':')[0] || 'N/A',
                    event: prevState ? 'traffic' : 'connect',
                    lastHandshake: peer.lastHandshake?.toISOString(),
                    transferRx: peer.transferRx,
                    transferTx: peer.transferTx,
                    endpoint: peer.endpoint
                }

                connectionLogs.unshift(log)
                if (connectionLogs.length > MAX_LOGS) {
                    connectionLogs = connectionLogs.slice(0, MAX_LOGS)
                }
            }

            // Update previous state
            previousClientStates.set(peer.publicKey, {
                lastHandshake: peer.lastHandshake?.toISOString() || '',
                transferRx: peer.transferRx,
                transferTx: peer.transferTx
            })
        }
    } catch (err) {
        console.error('Error polling VPN activity:', err)
    }
}

export function getVpnConnectionLogs(limit: number = 100): VpnConnectionLog[] {
    return connectionLogs.slice(0, limit)
}

export function clearVpnConnectionLogs(): void {
    connectionLogs = []
    previousClientStates.clear()
}

export function getVpnActiveClients(): Array<{
    publicKey: string
    endpoint: string
    transferRx: number
    transferTx: number
    lastActivity: string
}> {
    const peers = parseWgShow()
    return peers.map(p => ({
        publicKey: p.publicKey,
        endpoint: p.endpoint,
        transferRx: p.transferRx,
        transferTx: p.transferTx,
        lastActivity: p.lastHandshake?.toISOString() || 'Never'
    }))
}
