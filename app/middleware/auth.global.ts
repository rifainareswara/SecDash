export default defineNuxtRouteMiddleware(async (to) => {
    // Skip for login page
    if (to.path === '/login') return

    // Only run on client
    if (import.meta.server) return

    const { checkAuth, isAuthenticated } = useAuth()

    await checkAuth()

    if (!isAuthenticated.value) {
        return navigateTo('/login')
    }
})
