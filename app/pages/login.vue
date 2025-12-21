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
const isFormFocused = ref(false)

const handleSubmit = async () => {
  if (!form.username || !form.password) return
  
  const success = await login(form.username, form.password)
  if (success) {
    router.push('/')
  }
}

// Generate random particles
const particles = ref<Array<{id: number, size: number, left: number, delay: number, duration: number}>>([])

onMounted(() => {
  particles.value = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: Math.random() * 20 + 15
  }))
})
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden relative">
    <!-- Animated Background -->
    <div class="absolute inset-0 animated-gradient opacity-50"></div>
    
    <!-- Floating Particles -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        v-for="p in particles"
        :key="p.id"
        class="absolute rounded-full bg-blue-500/20 blur-sm"
        :style="{
          width: p.size + 'px',
          height: p.size + 'px',
          left: p.left + '%',
          bottom: '-10px',
          animation: `float-particle ${p.duration}s linear ${p.delay}s infinite`
        }"
      ></div>
    </div>

    <!-- Glowing orbs -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
    <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 2s;"></div>
    
    <!-- Content -->
    <div class="relative w-full max-w-md z-10">
      <!-- Logo with animation -->
      <div class="text-center mb-8 animate-fade-in">
        <div 
          class="inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 mb-4 animate-float shadow-lg shadow-blue-500/20"
        >
          <span class="material-symbols-outlined text-[40px] text-blue-400">vpn_lock</span>
        </div>
        <h1 class="text-3xl font-bold gradient-text">SecDash</h1>
        <p class="text-slate-400 text-sm mt-2">Security Dashboard Management</p>
      </div>

      <!-- Login Form with glass effect -->
      <form 
        @submit.prevent="handleSubmit" 
        class="login-card p-8 rounded-2xl space-y-6 transition-all duration-500"
        :class="{ 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10': isFormFocused }"
      >
        <!-- Error Message with animation -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span>
            {{ error }}
          </div>
        </Transition>

        <!-- Username -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-400">Username</label>
          <div class="relative group">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[20px] transition-colors group-focus-within:text-blue-400">person</span>
            <input
              v-model="form.username"
              type="text"
              class="w-full bg-[#12121a] border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 placeholder:text-slate-600"
              placeholder="Enter username"
              autocomplete="username"
              @focus="isFormFocused = true"
              @blur="isFormFocused = false"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-400">Password</label>
          <div class="relative group">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[20px] transition-colors group-focus-within:text-blue-400">lock</span>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full bg-[#12121a] border border-slate-700/50 rounded-xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 placeholder:text-slate-600"
              placeholder="Enter password"
              autocomplete="current-password"
              @focus="isFormFocused = true"
              @blur="isFormFocused = false"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
              @click="showPassword = !showPassword"
            >
              <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>

        <!-- Submit Button with glow -->
        <button
          type="submit"
          :disabled="isLoading || !form.username || !form.password"
          class="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-cyan-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:shadow-none disabled:hover:scale-100"
        >
          <span v-if="isLoading" class="material-symbols-outlined text-[20px] animate-spin">sync</span>
          <span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span>
          <span v-if="!isLoading" class="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </form>

      <!-- Footer -->
      <div class="text-center mt-8 space-y-2">
        <p class="text-slate-500 text-sm flex items-center justify-center gap-1">
          made with <span class="text-red-500">❤️</span> by <span class="text-blue-400 font-medium">rifai</span>
        </p>
        <p class="text-slate-600 text-xs flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-[14px]">shield</span>
          Secure connection established
        </p>
      </div>
    </div>
  </div>
</template>

<style>
.login-card {
  background: rgba(18, 18, 26, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Fix input text visibility */
input {
  background-color: #12121a !important;
  color: #ffffff !important;
  caret-color: #3b82f6 !important;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.3) !important;
}

input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #ffffff !important;
  -webkit-box-shadow: 0 0 0px 1000px #12121a inset !important;
  transition: background-color 5000s ease-in-out 0s;
}

/* Animated gradient background */
.animated-gradient {
  background: linear-gradient(-45deg, #0a0a0f, #0f172a, #1e1e2e, #0a0a0f);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float-particle {
  0% {
    transform: translateY(0) translateX(0) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
    transform: scale(1);
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) translateX(50px) scale(0.5);
    opacity: 0;
  }
}

.animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
