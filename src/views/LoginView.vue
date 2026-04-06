<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-midori-50 to-midori-100 dark:from-gray-900 dark:to-gray-800">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">MidoriVPN</h1>
        <p class="text-gray-500 dark:text-gray-400">Panel de control</p>
      </div>

      <p v-if="auth.error" class="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg p-3">
        {{ auth.error }}
      </p>

      <button
        @click="auth.startLogin()"
        :disabled="auth.loading"
        class="w-full bg-midori-600 hover:bg-midori-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="auth.loading">Conectando...</span>
        <span v-else>Iniciar sesión con Astian</span>
      </button>

      <p class="mt-6 text-xs text-gray-400 dark:text-gray-500">
        Autenticación via accounts.astian.org
      </p>
    </div>
  </div>
</template>
