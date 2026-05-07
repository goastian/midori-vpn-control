<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { useAuthStore } from './stores/auth'
import { computed } from 'vue'

const auth = useAuthStore()
const route = useRoute()

const isFullPage = computed(() => route.meta?.fullPage === true)
</script>

<template>
  <!-- Full-page routes (landing, login, oauth callbacks) render without shell -->
  <RouterView v-if="isFullPage" />

  <!-- Initialization guard: show a neutral spinner until session restore completes.
       This prevents any authenticated shell (NavBar, user email, admin role) from
       briefly flashing to unauthenticated visitors during the async restore window. -->
  <div v-else-if="!auth.initialized" class="min-h-screen app-shell-bg flex items-center justify-center">
    <div class="h-9 w-9 animate-spin rounded-full border-b-2 border-midori-600"></div>
  </div>

  <!-- App shell for authenticated / standard routes -->
  <div v-else class="min-h-screen app-shell-bg text-slate-900 dark:text-slate-100">
    <NavBar v-if="auth.isAuthenticated" />
    <main
      :class="[
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10',
        auth.isAuthenticated ? 'max-w-[1800px] lg:pl-[19rem]' : 'max-w-7xl',
      ]"
    >
      <RouterView />
    </main>
  </div>
</template>
