<template>
  <div class="max-w-5xl mx-auto p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Credenciales Proxy para Extensión</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Gestiona tokens efímeros seguros (aud=vpn-proxy) y túneles HTTPS CONNECT para extensiones de navegador.
        </p>
      </div>
      <button
        @click="generateCredentials"
        :disabled="loading"
        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50 flex items-center space-x-2"
      >
        <span v-if="loading" class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span>Generar Nueva Credencial</span>
      </button>
    </div>

    <!-- Active Credential Card -->
    <div v-if="credential" class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Token Activo (HTTPS CONNECT)
        </span>
        <span class="text-xs text-slate-500">Expira en: {{ formatExpiresIn(credential.expires_in) }}</span>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proxy Token</label>
        <div class="flex items-center space-x-2">
          <input
            type="password"
            readonly
            :value="credential.proxy_token"
            class="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono"
          />
          <button
            @click="copyToken"
            class="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition"
          >
            {{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <!-- Proxy Endpoints List -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endpoints Disponibles</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="ep in credential.proxy_endpoints"
            :key="ep.host"
            class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm"
          >
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="font-medium text-slate-800 dark:text-slate-200">{{ ep.host }}:{{ ep.port }}</span>
            </div>
            <span class="text-xs text-slate-500 font-mono uppercase">{{ ep.country_code }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
      <p class="text-slate-500 dark:text-slate-400 text-sm">No has generado credenciales de proxy recientes.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface ProxyEndpoint {
  host: string
  port: number
  country_code: string
  location: string
}

interface ProxyCredentialResponse {
  proxy_token: string
  expires_in: number
  proxy_endpoints: ProxyEndpoint[]
}

const credential = ref<ProxyCredentialResponse | null>(null)
const loading = ref(false)
const copied = ref(false)

async function generateCredentials() {
  loading.value = true
  try {
    const res = await fetch('/api/v1/control/proxy-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) {
      credential.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to request proxy credentials', err)
  } finally {
    loading.value = false
  }
}

function copyToken() {
  if (credential.value?.proxy_token) {
    navigator.clipboard.writeText(credential.value.proxy_token)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}

function formatExpiresIn(seconds: number) {
  const mins = Math.floor(seconds / 60)
  return `${mins} minutos`
}

onMounted(() => {
  generateCredentials()
})
</script>
