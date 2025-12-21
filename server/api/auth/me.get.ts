export default defineEventHandler(async (event) => {
    const sessionId = getCookie(event, 'session')

    if (!sessionId) {
        return { authenticated: false }
    }

    // Import sessions from login handler
    const { sessions } = await import('./login.post')
    const session = sessions.get(sessionId)

    if (!session || session.expiresAt < Date.now()) {
        if (session) sessions.delete(sessionId)
        return { authenticated: false }
    }

    return {
        authenticated: true,
        user: {
            username: session.username,
            isAdmin: session.isAdmin
        }
    }
})
