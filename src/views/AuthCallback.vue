<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const errorMsg = ref('')
const { t } = useLocale()

onMounted(async () => {
  const code = route.query.code as string
  const error = route.query.error as string
  const returnedState = route.query.state as string

  if (error) {
    errorMsg.value = route.query.error_description as string || error
    return
  }

  if (!code) {
    errorMsg.value = t('authCallback.missingCode')
    return
  }

  // Validate OAuth state to prevent CSRF
  const savedState = sessionStorage.getItem('oauth_state')
  sessionStorage.removeItem('oauth_state')
  if (!savedState || savedState !== returnedState) {
    errorMsg.value = t('authCallback.invalidState')
    return
  }

  try {
    await auth.handleCallback(code)
    router.replace({ name: 'dashboard' })
  } catch (e: any) {
    errorMsg.value = e.message || t('authCallback.authError')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div v-if="errorMsg" class="bg-red-50 text-red-700 rounded-lg p-6 max-w-md">
        <h2 class="text-lg font-semibold mb-2">{{ t('authCallback.title') }}</h2>
        <p class="text-sm">{{ errorMsg }}</p>
        <router-link to="/login" class="mt-4 inline-block text-midori-600 hover:underline text-sm">
          {{ t('authCallback.backToLogin') }}
        </router-link>
      </div>
      <div v-else class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-midori-600 mx-auto"></div>
        <p class="text-gray-500">{{ t('authCallback.authenticating') }}</p>
      </div>
    </div>
  </div>
</template>
