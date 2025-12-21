<script setup lang="ts">
const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
    <div class="flex h-screen w-full">
      <!-- Desktop Sidebar -->
      <div class="hidden md:flex">
        <Sidebar />
      </div>

      <!-- Mobile Sidebar Overlay -->
      <Transition name="fade">
        <div
          v-if="isSidebarOpen"
          class="fixed inset-0 bg-black/60 z-40 md:hidden"
          @click="closeSidebar"
        ></div>
      </Transition>

      <!-- Mobile Sidebar Drawer -->
      <Transition name="slide">
        <div
          v-if="isSidebarOpen"
          class="fixed inset-y-0 left-0 z-50 md:hidden"
        >
          <Sidebar :is-open="isSidebarOpen" @close="closeSidebar" />
        </div>
      </Transition>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        <!-- Mobile Header -->
        <div class="md:hidden flex items-center justify-between p-4 border-b border-surface-highlight bg-[#0d0d0d]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">vpn_lock</span>
            <span class="font-bold text-white">WireGuard Admin</span>
          </div>
          <button
            class="text-white p-1 hover:bg-surface-highlight rounded transition-colors"
            @click="toggleSidebar"
          >
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>

        <!-- Page Content -->
        <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scroll-smooth">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for drawer */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
