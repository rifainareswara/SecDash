<script setup lang="ts">
const searchQuery = ref('')
const activeFilter = ref('all')

const filters = [
  { id: 'all', label: 'All Clients' },
  { id: 'active', label: 'Active Handshakes' },
  { id: 'stale', label: 'Stale Connections' },
  { id: 'high', label: 'High Usage' }
]

const emit = defineEmits<{
  (e: 'search', query: string): void
  (e: 'filter', filterId: string): void
}>()

watch(searchQuery, (value) => {
  emit('search', value)
})

const setFilter = (filterId: string) => {
  activeFilter.value = filterId
  emit('filter', filterId)
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-dark p-2 rounded-xl border border-surface-highlight">
    <!-- Search Input -->
    <div class="relative w-full md:w-96 group">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary group-focus-within:text-white transition-colors">
        <span class="material-symbols-outlined">search</span>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="block w-full pl-10 pr-3 py-2.5 bg-[#0a0a0f] border border-transparent focus:border-primary/50 text-white rounded-lg placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary/50 sm:text-sm transition-all"
        placeholder="Search client, IP, or public key..."
      />
    </div>

    <!-- Filter Buttons -->
    <div class="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 md:px-0 scrollbar-hide">
      <button
        v-for="filter in filters"
        :key="filter.id"
        :class="[
          'whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
          activeFilter === filter.id
            ? 'bg-primary/20 text-primary border-primary/20 hover:bg-primary/30'
            : 'bg-surface-highlight text-text-secondary border-transparent hover:text-white hover:bg-[#2a2a3a]'
        ]"
        @click="setFilter(filter.id)"
      >
        {{ filter.label }}
      </button>
    </div>
  </div>
</template>
