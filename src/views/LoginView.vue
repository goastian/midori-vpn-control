<script setup lang="ts">
import { onMounted } from 'vue'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const { t } = useLocale()

onMounted(() => {
  if (!auth.loading) {
    void auth.startLogin()
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-midori-50 to-midori-100 dark:from-gray-900 dark:to-gray-800">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ t('common.appName') }}</h1>
      <p class="text-gray-500 dark:text-gray-400">{{ t('login.connecting') }}</p>

      <div class="mt-6 flex justify-center">
        <div class="h-9 w-9 animate-spin rounded-full border-b-2 border-midori-600"></div>
      </div>

      <p v-if="auth.error" class="mt-6 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg p-3">
        {{ auth.error }}
      </p>
    </div>
  </div>
</template>
