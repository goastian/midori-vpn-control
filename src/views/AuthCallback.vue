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
  console.log('[AUTH-CALLBACK] Component mounted')
  console.log('[AUTH-CALLBACK] Current URL:', window.location.href)
  console.log('[AUTH-CALLBACK] Query params:', { ...route.query })

  const code = route.query.code as string
  const error = route.query.error as string
  const returnedState = route.query.state as string

  if (error) {
    console.error('[AUTH-CALLBACK] Authentik returned error:', error, route.query.error_description)
    errorMsg.value = route.query.error_description as string || error
    return
  }

  if (!code) {
    console.error('[AUTH-CALLBACK] No authorization code in URL')
    errorMsg.value = t('authCallback.missingCode')
    return
  }

  console.log('[AUTH-CALLBACK] Code received, length:', code.length)
  console.log('[AUTH-CALLBACK] State received:', returnedState)

  // Validate OAuth state to prevent CSRF
  const savedState = sessionStorage.getItem('oauth_state')
  console.log('[AUTH-CALLBACK] Saved state:', savedState)
  sessionStorage.removeItem('oauth_state')
  if (!savedState || savedState !== returnedState) {
    console.error('[AUTH-CALLBACK] State mismatch!', { saved: savedState, returned: returnedState })
    errorMsg.value = t('authCallback.invalidState')
    return
  }

  console.log('[AUTH-CALLBACK] State validated OK, calling handleCallback...')

  try {
    await auth.handleCallback(code)
    console.log('[AUTH-CALLBACK] handleCallback SUCCESS, redirecting to dashboard')
    router.replace({ name: 'dashboard' })
  } catch (e: any) {
    console.error('[AUTH-CALLBACK] handleCallback FAILED:', e.message, e)
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
