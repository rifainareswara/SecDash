<script setup lang="ts">
export interface VpnClient {
  id: string
  name: string
  publicKey: string
  avatarInitials: string
  avatarGradient: string
  sourceIp: string
  sourcePort: string
  sourceIcon: string
  virtualIp: string
  lastHandshake: string
  handshakeStatus: 'active' | 'recent' | 'stale' | 'offline'
  downloadData: string
  uploadData: string
  isStale?: boolean
}

defineProps<{
  clients: VpnClient[]
}>()

const emit = defineEmits<{
  (e: 'qrCode', clientId: string, clientName: string): void
  (e: 'download', clientId: string, clientName: string): void
  (e: 'email', clientId: string, clientEmail: string): void
  (e: 'edit', clientId: string): void
  (e: 'delete', clientId: string): void
}>()

// Dropdown state
const openDropdownId = ref<string | null>(null)

const closeDropdown = () => {
  openDropdownId.value = null
}

// Store button positions for dropdown positioning
const dropdownPositions = ref<Record<string, { top: number; left: number }>>({})

const getDropdownPosition = (clientId: string) => {
  const pos = dropdownPositions.value[clientId]
  if (pos) {
    return {
      top: `${pos.top}px`,
      left: `${pos.left}px`
    }
  }
  return { top: '0px', left: '0px' }
}

const toggleDropdown = (clientId: string) => {
  if (openDropdownId.value === clientId) {
    openDropdownId.value = null
  } else {
    // Calculate position based on button position and screen bounds
    const button = document.querySelector(`[data-dropdown-btn="${clientId}"]`) as HTMLElement
    if (button) {
      const rect = button.getBoundingClientRect()
      const dropdownHeight = 280 // Approximate height of dropdown menu
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      let top: number
      // If not enough space below and more space above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - dropdownHeight - 4
      } else {
        top = rect.bottom + 4
      }
      
      // Ensure left doesn't go off-screen
      let left = rect.right - 192
      if (left < 8) left = 8
      
      dropdownPositions.value[clientId] = { top, left }
    }
    openDropdownId.value = clientId
  }
}

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

const handleAction = (action: string, client: VpnClient, event: Event) => {
  event.stopPropagation()
  closeDropdown()
  
  switch (action) {
    case 'qr':
      emit('qrCode', client.id, client.name)
      break
    case 'download':
      emit('download', client.id, client.name)
      break
    case 'email':
      emit('email', client.id, (client as any).email || '')
      break
    case 'edit':
      emit('edit', client.id)
      break
    case 'delete':
      emit('delete', client.id)
      break
  }
}

const getHandshakeClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-primary animate-pulse'
    case 'recent':
      return 'bg-primary'
    case 'stale':
      return 'bg-yellow-600'
    case 'offline':
      return 'bg-blue-500'
    default:
      return 'bg-primary'
  }
}

const getHandshakeTextClass = (status: string) => {
  return status === 'stale' ? 'text-yellow-500/80' : 'text-white'
}
</script>

<template>
  <div class="w-full overflow-hidden rounded-xl border border-surface-highlight bg-surface-dark shadow-xl">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-surface-highlight bg-[#12121a]">
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Client / User
            </th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Real Source IP
            </th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Virtual IP
            </th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Latest Handshake
            </th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
              Data Transfer
            </th>
            <th class="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">
              Action
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-highlight">
          <tr
            v-for="client in clients"
            :key="client.id"
            class="group hover:bg-surface-highlight/40 transition-colors"
          >
            <!-- Client Info -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'size-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner',
                    client.isStale
                      ? 'bg-surface-highlight text-text-secondary border border-text-secondary/20'
                      : `bg-gradient-to-br ${client.avatarGradient} text-white`
                  ]"
                >
                  {{ client.avatarInitials }}
                </div>
                <div>
                  <p
                    :class="[
                      'text-sm font-medium transition-colors',
                      client.isStale
                        ? 'text-text-secondary group-hover:text-white'
                        : 'text-white group-hover:text-primary'
                    ]"
                  >
                    {{ client.name }}
                  </p>
                  <p :class="['text-xs', client.isStale ? 'text-text-secondary opacity-60' : 'text-text-secondary']">
                    PublicKey: ...{{ client.publicKey }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Source IP -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'material-symbols-outlined text-[16px]',
                    client.isStale ? 'text-text-secondary opacity-50' : 'text-text-secondary'
                  ]"
                >
                  {{ client.sourceIcon }}
                </span>
                <span
                  :class="['font-mono text-sm', client.isStale ? 'text-gray-500' : 'text-slate-300']"
                >
                  {{ client.sourceIp }}:{{ client.sourcePort }}
                </span>
              </div>
            </td>

            <!-- Virtual IP -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'font-mono text-sm px-2 py-1 rounded',
                  client.isStale
                    ? 'text-gray-500 bg-surface-highlight/30'
                    : 'text-primary bg-primary/10'
                ]"
              >
                {{ client.virtualIp }}
              </span>
            </td>

            <!-- Handshake -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div
                  :class="['size-2 rounded-full', getHandshakeClass(client.handshakeStatus)]"
                ></div>
                <span :class="['text-sm', getHandshakeTextClass(client.handshakeStatus)]">
                  {{ client.lastHandshake }}
                </span>
              </div>
            </td>

            <!-- Data Transfer -->
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div :class="['flex flex-col items-end gap-0.5', { 'opacity-50': client.isStale }]">
                <div class="flex items-center gap-1 text-xs text-text-secondary">
                  <span class="material-symbols-outlined text-[14px]">arrow_downward</span>
                  <span class="text-white font-medium">{{ client.downloadData }}</span>
                </div>
                <div class="flex items-center gap-1 text-xs text-text-secondary">
                  <span class="material-symbols-outlined text-[14px]">arrow_upward</span>
                  <span class="text-white font-medium">{{ client.uploadData }}</span>
                </div>
              </div>
            </td>

            <!-- Action -->
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="relative inline-block">
                <button
                  :data-dropdown-btn="client.id"
                  class="text-text-secondary hover:text-white hover:bg-surface-highlight p-2 rounded-lg transition-colors"
                  @click.stop="toggleDropdown(client.id)"
                >
                  <span class="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
                
                <!-- Dropdown Menu -->
                <Teleport to="body">
                  <Transition name="dropdown">
                    <div
                      v-if="openDropdownId === client.id"
                      class="fixed z-50"
                      :style="getDropdownPosition(client.id)"
                      @click.stop
                    >
                      <div class="w-48 bg-[#12121a] border border-surface-highlight rounded-xl shadow-2xl overflow-hidden">
                        <button
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surface-highlight transition-colors"
                          @click="handleAction('qr', client, $event)"
                        >
                          <span class="material-symbols-outlined text-[18px] text-primary">qr_code_2</span>
                          QR Code
                        </button>
                        <button
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surface-highlight transition-colors"
                          @click="handleAction('download', client, $event)"
                        >
                          <span class="material-symbols-outlined text-[18px] text-blue-400">download</span>
                          Download Config
                        </button>
                        <button
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surface-highlight transition-colors"
                          @click="handleAction('email', client, $event)"
                        >
                          <span class="material-symbols-outlined text-[18px] text-orange-400">mail</span>
                          Email Config
                        </button>
                        <div class="border-t border-surface-highlight my-1"></div>
                        <button
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-surface-highlight transition-colors"
                          @click="handleAction('edit', client, $event)"
                        >
                          <span class="material-symbols-outlined text-[18px] text-yellow-400">edit</span>
                          Edit Client
                        </button>
                        <button
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                          @click="handleAction('delete', client, $event)"
                        >
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  </Transition>
                </Teleport>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <slot name="pagination" />
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
