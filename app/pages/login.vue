<script setup lang="ts">
definePageMeta({
  layout: false
})

const { login, isLoading, error } = useAuth()
const router = useRouter()

const form = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)

const handleSubmit = async () => {
  if (!form.username || !form.password) return
  
  const success = await login(form.username, form.password)
  if (success) {
    router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a1a0a] flex items-center justify-center p-4">
    <!-- Background gradient -->
    <div class="fixed inset-0 bg-gradient-to-br from-gray-900/20 via-transparent to-slate-900/20"></div>
    
    <div class="relative w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <span class="material-symbols-outlined text-[32px] text-primary">vpn_lock</span>
        </div>
        <h1 class="text-2xl font-bold text-white">SecDash</h1>
        <p class="text-text-secondary text-sm mt-1">Sign in to continue</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="glass-panel p-8 rounded-2xl space-y-6">
        <!-- Error Message -->
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <!-- Username -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Username</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary text-[20px]">person</span>
            <input
              v-model="form.username"
              type="text"
              class="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter username"
              autocomplete="username"
            />
          </div>
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Password</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary text-[20px]">lock</span>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-12 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter password"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
              @click="showPassword = !showPassword"
            >
              <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading || !form.username || !form.password"
          class="w-full py-3 bg-primary hover:bg-gray-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span v-if="isLoading" class="material-symbols-outlined text-[20px] animate-spin">sync</span>
          <span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </form>

      <!-- Footer -->
      <p class="text-center text-text-secondary text-xs mt-6">
        Default: admin / password (change in Admin Users)
      </p>
    </div>
  </div>
</template>

<style>
.glass-panel {
  background: rgba(26, 47, 26, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Fix input text visibility */
input {
  background-color: #1a1a1a !important;
  color: #ffffff !important;
  caret-color: #06f906 !important;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4) !important;
}

input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #ffffff !important;
  -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
