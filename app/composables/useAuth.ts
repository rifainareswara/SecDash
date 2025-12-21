interface AuthUser {
    username: string
    isAdmin: boolean
}

export const useAuth = () => {
    const user = useState<AuthUser | null>('auth-user', () => null)
    const isAuthenticated = computed(() => !!user.value)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Check if already logged in on client side
    const checkAuth = async () => {
        if (import.meta.server) return

        try {
            const response = await $fetch<{ authenticated: boolean; user?: AuthUser }>('/api/auth/me')
            if (response.authenticated && response.user) {
                user.value = response.user
            } else {
                user.value = null
            }
        } catch (err) {
            user.value = null
        }
    }

    const login = async (username: string, password: string) => {
        isLoading.value = true
        error.value = null

        try {
            const response = await $fetch<{ success: boolean; user?: AuthUser; message?: string }>('/api/auth/login', {
                method: 'POST',
                body: { username, password }
            })

            if (response.success && response.user) {
                user.value = response.user
                return true
            } else {
                error.value = response.message || 'Login failed'
                return false
            }
        } catch (err: any) {
            error.value = err.data?.message || 'Login failed'
            return false
        } finally {
            isLoading.value = false
        }
    }

    const logout = async () => {
        try {
            await $fetch('/api/auth/logout', { method: 'POST' })
        } catch (err) {
            // Ignore errors
        }
        user.value = null
        navigateTo('/login')
    }

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        checkAuth,
        login,
        logout
    }
}
