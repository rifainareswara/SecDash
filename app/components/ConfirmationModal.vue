<script setup lang="ts">
defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
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
          @click="!loading && emit('close')"
        />
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-surface-dark border border-surface-highlight rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div 
                v-if="type === 'danger'"
                class="size-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-red-500">warning</span>
              </div>
              <div 
                v-else-if="type === 'warning'"
                class="size-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-yellow-500">warning</span>
              </div>
              <div 
                v-else
                class="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
              >
                <span class="material-symbols-outlined text-primary">info</span>
              </div>

              <div>
                <h3 class="text-lg font-bold text-white mb-2">{{ title }}</h3>
                <p class="text-text-secondary text-sm leading-relaxed">{{ message }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 p-4 bg-surface-highlight/20 border-t border-surface-highlight">
            <button
              class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
              :disabled="loading"
              @click="emit('close')"
            >
              {{ cancelText || 'Cancel' }}
            </button>
            <button
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg',
                type === 'danger' 
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' 
                  : 'bg-primary hover:bg-gray-400 text-black shadow-primary/20'
              ]"
              :disabled="loading"
              @click="emit('confirm')"
            >
              <span v-if="loading" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              {{ confirmText || 'Confirm' }}
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
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
