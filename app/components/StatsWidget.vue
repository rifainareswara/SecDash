<script setup lang="ts">
interface Props {
  icon: string
  title: string
  value: string
  subValue?: string
  status?: {
    text: string
    variant: 'success' | 'info' | 'default'
    pulse?: boolean
  }
  progress?: number
  progressVariant?: 'primary' | 'white'
}

defineProps<Props>()
</script>

<template>
  <div class="glass-panel p-5 rounded-xl flex flex-col gap-4 hover:bg-surface-highlight/20 transition-colors">
    <div class="flex justify-between items-start">
      <div
        :class="[
          'p-2 rounded-lg',
          status?.variant === 'success' ? 'bg-primary/10 text-primary' : 'bg-surface-highlight text-white'
        ]"
      >
        <span class="material-symbols-outlined">{{ icon }}</span>
      </div>
      <span
        v-if="status"
        :class="[
          'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full',
          status.variant === 'success'
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-surface-highlight text-white'
        ]"
      >
        <span
          v-if="status.pulse"
          class="size-1.5 rounded-full bg-primary animate-pulse"
        ></span>
        {{ status.text }}
      </span>
    </div>
    <div>
      <p class="text-text-secondary text-sm font-medium">{{ title }}</p>
      <div class="flex items-baseline gap-1 mt-1">
        <p class="text-white text-2xl font-bold">{{ value }}</p>
        <span v-if="subValue" class="text-text-secondary text-lg">{{ subValue }}</span>
      </div>
      <div
        v-if="progress !== undefined"
        class="w-full bg-surface-highlight h-1.5 rounded-full mt-3 overflow-hidden"
      >
        <div
          :class="[
            'h-full rounded-full transition-all duration-500',
            progressVariant === 'white' ? 'bg-white' : 'bg-primary'
          ]"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
