<script setup lang="ts">
defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const { user, logout } = useAuth()

// State for collapsible menus
const wireGuardExpanded = ref(true)

// Regular nav items (non-grouped)
const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/' },
  { icon: 'speed', label: 'Uptime Monitor', href: '/uptime' },
  { icon: 'monitoring', label: 'Monitoring', href: '/activity-monitor' },
  { icon: 'psychology', label: 'AI Insights', href: '/ai-insights', isNew: true },
  { icon: 'admin_panel_settings', label: 'Admin Users', href: '/admin' }
]

// WireGuard sub-menu items
const wireGuardItems = [
  { icon: 'dns', label: 'Server Config', href: '/config' },
  { icon: 'group', label: 'Clients', href: '/users' },
  { icon: 'settings_input_component', label: 'Connections', href: '/vpn-monitor' },
  { icon: 'monitoring', label: 'Status', href: '/status' },
  { icon: 'power_settings_new', label: 'WoL Hosts', href: '/wol' }
]

const isActive = (href: string) => {
  return route.path === href
}

// Check if any WireGuard sub-item is active
const isWireGuardActive = computed(() => {
  return wireGuardItems.some(item => route.path === item.href)
})

const toggleWireGuard = () => {
  wireGuardExpanded.value = !wireGuardExpanded.value
}

const handleLogout = async () => {
  await logout()
}

// Get user initials
const userInitials = computed(() => {
  if (!user.value?.username) return 'AU'
  return user.value.username.substring(0, 2).toUpperCase()
})
</script>

<template>
  <aside class="flex flex-col w-72 h-full border-r border-slate-800/50 bg-[#0a0a0f]">
    <!-- Logo -->
    <div class="p-6">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10">
          <span class="material-symbols-outlined text-[24px]">vpn_lock</span>
        </div>
        <div class="flex flex-col">
          <h1 class="text-white text-base font-bold tracking-wide">SecDash</h1>
          <p class="text-slate-500 text-xs font-normal">v1.0</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col flex-1 gap-1 px-4 py-2 overflow-y-auto">
      <!-- Dashboard (first item) -->
      <NuxtLink
        to="/"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
          isActive('/')
            ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 shadow-sm shadow-blue-500/10'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        ]"
        @click="emit('close')"
      >
        <span
          class="material-symbols-outlined text-[20px]"
          :class="{ 'group-hover:scale-110 transition-transform': !isActive('/') }"
        >
          dashboard
        </span>
        <p class="text-sm font-medium">Dashboard</p>
      </NuxtLink>

      <!-- WireGuard Collapsible Group -->
      <div class="mt-2">
        <button
          @click="toggleWireGuard"
          :class="[
            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group',
            isWireGuardActive
              ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          ]"
        >
          <div class="flex items-center gap-3">
            <span
              class="material-symbols-outlined text-[20px]"
              :class="{ 'group-hover:scale-110 transition-transform': !isWireGuardActive }"
            >
              vpn_key
            </span>
            <p class="text-sm font-medium">WireGuard</p>
          </div>
          <span
            class="material-symbols-outlined text-[18px] transition-transform duration-200"
            :class="{ 'rotate-180': wireGuardExpanded }"
          >
            expand_more
          </span>
        </button>

        <!-- WireGuard Sub-items -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-64"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-64"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-show="wireGuardExpanded" class="overflow-hidden">
            <div class="ml-4 mt-1 pl-3 border-l border-slate-700/50 space-y-1">
              <NuxtLink
                v-for="item in wireGuardItems"
                :key="item.href"
                :to="item.href"
                :class="[
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm',
                  isActive(item.href)
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-500 hover:bg-slate-800/30 hover:text-white'
                ]"
                @click="emit('close')"
              >
                <span
                  class="material-symbols-outlined text-[18px]"
                  :class="{ 'group-hover:scale-110 transition-transform': !isActive(item.href) }"
                >
                  {{ item.icon }}
                </span>
                <p class="font-medium">{{ item.label }}</p>
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Divider -->
      <div class="my-3 border-t border-slate-800/50"></div>

      <!-- Other nav items -->
      <NuxtLink
        v-for="item in navItems.slice(1)"
        :key="item.href"
        :to="item.href"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
          isActive(item.href)
            ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 shadow-sm shadow-blue-500/10'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        ]"
        @click="emit('close')"
      >
        <span
          class="material-symbols-outlined text-[20px]"
          :class="{ 'group-hover:scale-110 transition-transform': !isActive(item.href) }"
        >
          {{ item.icon }}
        </span>
        <p class="text-sm font-medium">{{ item.label }}</p>
      </NuxtLink>
    </nav>

    <!-- User Profile -->
    <div class="p-4 border-t border-slate-800/50">
      <div class="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
        <div class="relative size-10 rounded-full bg-cover bg-center bg-gradient-to-br from-blue-500 to-cyan-500">
          <div class="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
            {{ userInitials }}
          </div>
          <div class="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]"></div>
        </div>
        <div class="flex flex-col overflow-hidden flex-1">
          <p class="text-sm font-medium text-white truncate">{{ user?.username || 'Admin' }}</p>
          <p class="text-xs text-slate-500 truncate">{{ user?.isAdmin ? 'Administrator' : 'User' }}</p>
        </div>
        <button 
          class="text-slate-500 hover:text-red-400 transition-colors"
          @click="handleLogout"
          title="Sign Out"
        >
          <span class="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </div>
  </aside>
</template>
