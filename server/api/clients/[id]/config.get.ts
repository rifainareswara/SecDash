import { getClientConfig, checkDatabaseExists } from '../../../utils/database'
import QRCode from 'qrcode'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Client ID is required'
        })
    }

    if (!checkDatabaseExists()) {
        throw createError({
            statusCode: 404,
            message: 'Database not found'
        })
    }

    try {
        // Generate WireGuard client config using centralized logic
        const configContent = getClientConfig(id)

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(configContent, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })

        return {
            success: true,
            config: configContent,
            qrCode: qrCodeDataUrl
        }
    } catch (error: any) {
        if (error.statusCode) throw error

        throw createError({
            statusCode: 500,
            message: error.message
        })
    }
})
