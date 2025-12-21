
import { getClientConfig, createClient, initDatabase } from './server/utils/database'

// Mock environment for testing
process.env.WIREGUARD_DB_PATH = './wg-db'

try {
    initDatabase()

    // Create a dummy client to test config generation
    const client = createClient('test-qr-client', 'test@example.com')

    console.log('Generated Client ID:', client.id)

    const config = getClientConfig(client.id)

    console.log('--- GENERATED CONFIG START ---')
    console.log(config)
    console.log('--- GENERATED CONFIG END ---')

} catch (error) {
    console.error('Error:', error)
}
