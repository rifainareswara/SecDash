import { getClientById, getClientConfig, getSMTPSettings } from '../../../utils/database'
import QRCode from 'qrcode'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            message: 'Client ID is required'
        })
    }

    const client = getClientById(id)
    if (!client) {
        throw createError({
            statusCode: 404,
            message: 'Client not found'
        })
    }

    if (!client.email) {
        throw createError({
            statusCode: 400,
            message: 'Client does not have an email address'
        })
    }

    const smtpSettings = getSMTPSettings()
    if (!smtpSettings || !smtpSettings.host) {
        throw createError({
            statusCode: 400,
            message: 'SMTP settings not configured. Please configure SMTP in Server Settings.'
        })
    }

    try {
        // Generate config and QR code
        const configContent = getClientConfig(id)
        const qrCodeBuffer = await QRCode.toBuffer(configContent, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            auth: {
                user: smtpSettings.auth_user,
                pass: smtpSettings.auth_pass
            }
        })

        // Send email
        await transporter.sendMail({
            from: `"${smtpSettings.from_name}" <${smtpSettings.from_email}>`,
            to: client.email,
            subject: `Your WireGuard VPN Configuration - ${client.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #06f906;">🔒 WireGuard VPN Configuration</h2>
                    <p>Hello <strong>${client.name}</strong>,</p>
                    <p>Your WireGuard VPN configuration is attached to this email.</p>
                    
                    <h3>Quick Setup:</h3>
                    <ol>
                        <li>Download the WireGuard app on your device</li>
                        <li>Scan the QR code below or import the attached .conf file</li>
                        <li>Activate the tunnel to connect</li>
                    </ol>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <p><strong>Scan QR Code with WireGuard mobile app:</strong></p>
                        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        This email was sent automatically. Please do not reply.
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: `${client.name.replace(/\s+/g, '_')}.conf`,
                    content: configContent,
                    contentType: 'text/plain'
                },
                {
                    filename: 'qrcode.png',
                    content: qrCodeBuffer,
                    contentType: 'image/png',
                    cid: 'qrcode'
                }
            ]
        })

        return {
            success: true,
            message: `Configuration sent to ${client.email}`
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            message: `Failed to send email: ${error.message}`
        })
    }
})
