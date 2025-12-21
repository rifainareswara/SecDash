<script setup lang="ts">
interface Props {
  currentPage: number
  totalItems: number
  itemsPerPage: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'previous'): void
  (e: 'next'): void
}>()

const startItem = computed(() => {
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endItem = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
})

const hasPrevious = computed(() => props.currentPage > 1)
const hasNext = computed(() => endItem.value < props.totalItems)
</script>

<template>
  <div class="bg-surface-dark px-6 py-4 border-t border-surface-highlight flex flex-col sm:flex-row items-center justify-between gap-3">
    <p class="text-sm text-text-secondary">
      Showing <span class="font-medium text-white">{{ startItem }}</span> to
      <span class="font-medium text-white">{{ endItem }}</span> of
      <span class="font-medium text-white">{{ totalItems }}</span> results
    </p>
    <div class="flex gap-2">
      <button
        :disabled="!hasPrevious"
        class="px-3 py-1 text-sm rounded border border-surface-highlight text-text-secondary hover:text-white hover:bg-surface-highlight disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="emit('previous')"
      >
        Previous
      </button>
      <button
        :disabled="!hasNext"
        class="px-3 py-1 text-sm rounded border border-surface-highlight text-text-secondary hover:text-white hover:bg-surface-highlight disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="emit('next')"
      >
        Next
      </button>
    </div>
  </div>
</template>
