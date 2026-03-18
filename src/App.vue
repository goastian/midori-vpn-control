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
  <!-- Full-page routes (landing, etc.) render without shell -->
  <RouterView v-if="isFullPage" />

  <!-- App shell for authenticated / standard routes -->
  <div v-else class="min-h-screen bg-gray-50">
    <NavBar v-if="auth.isAuthenticated" />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RouterView />
    </main>
  </div>
</template>
