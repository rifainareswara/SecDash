<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  clientId: string
  clientName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const config = ref<string>('')
const qrCode = ref<string>('')
const activeTab = ref<'qr' | 'config'>('qr')

// Fetch config when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.clientId) {
    await fetchConfig()
  }
})

async function fetchConfig() {
  loading.value = true
  error.value = null
  
  try {
    const response = await $fetch<{
      success: boolean
      config: string
      qrCode: string
      error?: string
    }>(`/api/clients/${props.clientId}/config`)
    
    if (response.success) {
      config.value = response.config
      qrCode.value = response.qrCode
    } else {
      error.value = response.error || 'Failed to load config'
    }
  } catch (err: any) {
    error.value = err.message || 'Network error'
  } finally {
    loading.value = false
  }
}

function downloadConfig() {
  if (!config.value) return
  
  const blob = new Blob([config.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.clientName.replace(/\s+/g, '_')}.conf`
  a.click()
  URL.revokeObjectURL(url)
}

function copyConfig() {
  navigator.clipboard.writeText(config.value)
}

function closeModal() {
  emit('close')
  // Reset state
  config.value = ''
  qrCode.value = ''
  activeTab.value = 'qr'
  error.value = null
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="closeModal"
        />
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-lg bg-surface-dark border border-surface-highlight rounded-2xl shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-surface-highlight">
            <div class="flex items-center gap-3">
              <div class="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-primary">qr_code_2</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">{{ clientName }}</h3>
                <p class="text-sm text-text-secondary">WireGuard Configuration</p>
              </div>
            </div>
            <button
              class="p-2 hover:bg-surface-highlight rounded-lg transition-colors"
              @click="closeModal"
            >
              <span class="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>
          
          <!-- Tabs -->
          <div class="flex border-b border-surface-highlight">
            <button
              :class="[
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'qr'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-white'
              ]"
              @click="activeTab = 'qr'"
            >
              <span class="material-symbols-outlined text-[18px] align-middle mr-1">qr_code_2</span>
              QR Code
            </button>
            <button
              :class="[
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'config'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-white'
              ]"
              @click="activeTab = 'config'"
            >
              <span class="material-symbols-outlined text-[18px] align-middle mr-1">description</span>
              Config File
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-5">
            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-12">
              <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
              <p class="text-text-secondary mt-3">Loading configuration...</p>
            </div>
            
            <!-- Error State -->
            <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
              <span class="material-symbols-outlined text-4xl text-red-400">error</span>
              <p class="text-red-400 mt-3">{{ error }}</p>
              <button
                class="mt-4 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-gray-400 transition-colors"
                @click="fetchConfig"
              >
                Retry
              </button>
            </div>
            
            <!-- QR Code Tab -->
            <div v-else-if="activeTab === 'qr'" class="flex flex-col items-center">
              <div class="bg-white p-4 rounded-xl">
                <img :src="qrCode" alt="QR Code" class="w-64 h-64" />
              </div>
              <p class="text-text-secondary text-sm mt-4 text-center">
                Scan this QR code with WireGuard mobile app
              </p>
            </div>
            
            <!-- Config Tab -->
            <div v-else class="space-y-4">
              <div class="relative">
                <pre class="bg-[#0a150a] p-4 rounded-xl text-sm text-gray-300 font-mono overflow-x-auto max-h-64 overflow-y-auto border border-surface-highlight">{{ config }}</pre>
                <button
                  class="absolute top-2 right-2 p-2 bg-surface-highlight hover:bg-surface-highlight/80 rounded-lg transition-colors"
                  @click="copyConfig"
                  title="Copy to clipboard"
                >
                  <span class="material-symbols-outlined text-[18px] text-text-secondary">content_copy</span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="flex gap-3 p-5 border-t border-surface-highlight">
            <button
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-highlight hover:bg-[#2c5e2c] text-white rounded-xl text-sm font-medium transition-colors"
              @click="closeModal"
            >
              Close
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-gray-400 text-black rounded-xl text-sm font-bold transition-colors shadow-[0_0_15px_rgba(160,160,160,0.3)]"
              :disabled="loading || !!error"
              @click="downloadConfig"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              Download .conf
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
