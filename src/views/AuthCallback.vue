<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLocale } from '../lib/i18n'
import { DesktopAgentCallbackResponseSchema } from '../lib/schemas'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const errorMsg = ref('')
const isDesktopSuccess = ref(false)
const desktopUser = ref('')
const { t } = useLocale()

const countdown = ref(3)

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function closeTab() {
  try {
    window.open('', '_self', '')
    window.close()
  } catch {
    // Closing a tab is browser-policy dependent.
  }
  try {
    window.close()
  } catch {
    // Closing a tab is browser-policy dependent.
  }
  try {
    if (window.top && window.top !== window) {
      window.top.close()
    }
  } catch {
    // Cross-origin frames cannot always be closed by this page.
  }
}

onMounted(async () => {
  const code = queryString(route.query.code)
  const error = queryString(route.query.error)
  const returnedState = queryString(route.query.state)

  if (error) {
    // If desktop agent is listening, notify it of cancellation
    try {
      await fetch(
        `http://127.0.0.1:7071/oauth/callback?error=${encodeURIComponent(error)}&state=${encodeURIComponent(returnedState || '')}`,
        {
          headers: { Accept: 'application/json' },
        },
      )
    } catch {
      // ignore
    }
    errorMsg.value = queryString(route.query.error_description) || error
    return
  }

  if (!code) {
    errorMsg.value = t('authCallback.missingCode')
    return
  }

  // 1. Check if this callback was initiated by the Web SPA
  const savedState = sessionStorage.getItem('oauth_state')
  if (savedState && savedState === returnedState) {
    sessionStorage.removeItem('oauth_state')
    try {
      await auth.handleCallback(code)
      router.replace({ name: 'dashboard' })
      return
    } catch (e: any) {
      errorMsg.value = e.message || t('authCallback.authError')
      return
    }
  }

  // 2. If not a web session or state differs, attempt relaying to Desktop Agent
  try {
    const agentRes = await fetch(
      `http://127.0.0.1:7071/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(returnedState || '')}`,
      {
        headers: { Accept: 'application/json' },
      },
    )
    if (agentRes.ok) {
      const data = DesktopAgentCallbackResponseSchema.safeParse(
        await agentRes.json().catch(() => null),
      )
      if (!data.success) {
        throw new Error('Invalid desktop agent callback response')
      }
      desktopUser.value = data.data.username
      isDesktopSuccess.value = true
      sessionStorage.removeItem('oauth_state')

      // Proactive close attempt
      closeTab()

      const timer = setInterval(() => {
        countdown.value--
        closeTab()
        if (countdown.value <= 0) {
          clearInterval(timer)
          closeTab()
        }
      }, 1000)
      return
    }
  } catch {
    // Desktop agent not running or unreachable
  }

  // 3. Neither web state matched nor desktop agent handled it
  sessionStorage.removeItem('oauth_state')
  errorMsg.value = t('authCallback.invalidState')
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
    <div class="text-center max-w-md w-full">
      <!-- Success for Desktop App -->
      <div
        v-if="isDesktopSuccess"
        class="bg-slate-900/80 border border-emerald-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl animate-fade-in"
      >
        <div
          class="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-950/50"
        >
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">¡Inicio de sesión completado!</h2>
        <p class="text-sm text-slate-300 mb-2">
          Has iniciado sesión en <strong>MidoriVPN Desktop</strong
          ><span v-if="desktopUser">
            como <span class="text-emerald-400 font-semibold">{{ desktopUser }}</span></span
          >.
        </p>
        <p class="text-xs text-slate-400 mb-6">
          Tu aplicación de escritorio ya está conectada y activa.
        </p>

        <button
          class="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
          @click="closeTab"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Cerrar esta pestaña
        </button>
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorMsg"
        class="bg-slate-900/80 border border-rose-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
      >
        <div
          class="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-700/50 flex items-center justify-center mx-auto mb-4 text-rose-400"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">{{ t('authCallback.title') }}</h2>
        <p class="text-sm text-slate-400 mb-6">{{ errorMsg }}</p>
        <button
          class="w-full bg-midori-600 hover:bg-midori-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer"
          @click="auth.startLogin()"
        >
          {{ t('authCallback.backToLogin') }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-else class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-midori-500 mx-auto"></div>
        <p class="text-slate-400 text-sm font-medium">{{ t('authCallback.authenticating') }}</p>
      </div>
    </div>
  </div>
</template>
