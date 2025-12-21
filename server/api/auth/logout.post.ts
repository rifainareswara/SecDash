export default defineEventHandler(async (event) => {
    const sessionId = getCookie(event, 'session')

    if (sessionId) {
        // Import sessions from login handler
        const { sessions } = await import('./login.post')
        sessions.delete(sessionId)
    }

    // Clear cookie
    deleteCookie(event, 'session', { path: '/' })

    return {
        success: true,
        message: 'Logged out'
    }
})
