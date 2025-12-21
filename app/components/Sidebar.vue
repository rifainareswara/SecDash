<script setup lang="ts">
defineProps<{
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const { user, logout } = useAuth()

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/' },
  { icon: 'dns', label: 'WireGuard Server', href: '/config' },
  { icon: 'group', label: 'WireGuard Clients', href: '/users' },
  { icon: 'shield', label: 'Access Control', href: '/access-control' },
  { icon: 'speed', label: 'Uptime Monitor', href: '/uptime' },
  { icon: 'settings_input_component', label: 'VPN Connections', href: '/vpn-monitor' },
  { icon: 'monitoring', label: 'Status', href: '/status' },
  { icon: 'history', label: 'Access Logs', href: '/logs' },
  { icon: 'admin_panel_settings', label: 'Admin Users', href: '/admin' },
  { icon: 'power_settings_new', label: 'WoL Hosts', href: '/wol' }
]

const isActive = (href: string) => {
  return route.path === href
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
  <aside class="flex flex-col w-72 h-full border-r border-surface-highlight bg-[#102310]">
    <!-- Logo -->
    <div class="p-6">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center size-10 rounded-full bg-primary/10 border border-primary/20 text-primary">
          <span class="material-symbols-outlined text-[24px]">vpn_lock</span>
        </div>
        <div class="flex flex-col">
          <h1 class="text-white text-base font-bold tracking-wide">SecDash</h1>
          <p class="text-text-secondary text-xs font-normal">v1</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col flex-1 gap-1 px-4 py-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.href"
        :to="item.href"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
          isActive(item.href)
            ? 'bg-surface-highlight/50 text-white border-l-2 border-primary'
            : 'text-text-secondary hover:bg-surface-highlight hover:text-white'
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
    <div class="p-4 border-t border-surface-highlight">
      <div class="glass-panel rounded-xl p-4 flex items-center gap-3">
        <div class="relative size-10 rounded-full bg-cover bg-center bg-gradient-to-br from-green-500 to-emerald-600">
          <div class="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
            {{ userInitials }}
          </div>
          <div class="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary border-2 border-[#102310]"></div>
        </div>
        <div class="flex flex-col overflow-hidden flex-1">
          <p class="text-sm font-medium text-white truncate">{{ user?.username || 'Admin' }}</p>
          <p class="text-xs text-text-secondary truncate">{{ user?.isAdmin ? 'Administrator' : 'User' }}</p>
        </div>
        <button 
          class="text-text-secondary hover:text-red-400 transition-colors"
          @click="handleLogout"
          title="Sign Out"
        >
          <span class="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </div>
  </aside>
</template>
