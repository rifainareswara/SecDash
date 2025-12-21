import { deleteWoLHost } from '../../utils/database'
import dgram from 'dgram'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const method = getMethod(event)

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Host ID is required'
        })
    }

    if (method === 'DELETE') {
        const success = deleteWoLHost(id)
        if (!success) {
            throw createError({
                statusCode: 404,
                message: 'Host not found'
            })
        }

        return {
            success: true,
            message: 'Host deleted'
        }
    }

    if (method === 'POST') {
        // Wake the host
        const { getWoLHosts } = await import('../../utils/database')
        const hosts = getWoLHosts()
        const host = hosts.find(h => h.id === id)

        if (!host) {
            throw createError({
                statusCode: 404,
                message: 'Host not found'
            })
        }

        try {
            // Create magic packet
            const mac = host.mac_address.replace(/[:-]/g, '')
            const macBuffer = Buffer.from(mac, 'hex')
            const magicPacket = Buffer.alloc(102)

            // 6 bytes of 0xFF
            for (let i = 0; i < 6; i++) {
                magicPacket[i] = 0xff
            }

            // 16 repetitions of MAC address
            for (let i = 0; i < 16; i++) {
                macBuffer.copy(magicPacket, 6 + i * 6)
            }

            // Send UDP broadcast
            const socket = dgram.createSocket('udp4')

            await new Promise<void>((resolve, reject) => {
                socket.bind(() => {
                    socket.setBroadcast(true)
                    socket.send(magicPacket, 0, magicPacket.length, 9, '255.255.255.255', (err) => {
                        socket.close()
                        if (err) reject(err)
                        else resolve()
                    })
                })
            })

            return {
                success: true,
                message: `Wake packet sent to ${host.name} (${host.mac_address})`
            }
        } catch (error: any) {
            throw createError({
                statusCode: 500,
                message: `Failed to send wake packet: ${error.message}`
            })
        }
    }

    throw createError({
        statusCode: 405,
        message: 'Method not allowed'
    })
})
