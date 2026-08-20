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
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
    <div class="text-center max-w-md w-full">
      <div v-if="errorMsg" class="bg-slate-900/80 border border-rose-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div class="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-700/50 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">{{ t('authCallback.title') }}</h2>
        <p class="text-sm text-slate-400 mb-6">{{ errorMsg }}</p>
        <button
          @click="auth.startLogin()"
          class="w-full bg-midori-600 hover:bg-midori-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer"
        >
          {{ t('authCallback.backToLogin') }}
        </button>
      </div>
      <div v-else class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-midori-500 mx-auto"></div>
        <p class="text-slate-400 text-sm font-medium">{{ t('authCallback.authenticating') }}</p>
      </div>
    </div>
  </div>
</template>
