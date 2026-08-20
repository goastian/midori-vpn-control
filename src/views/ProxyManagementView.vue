<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">Credenciales Proxy para Extensión</h1>
        <p class="text-sm text-slate-400 mt-1">
          Gestiona tokens efímeros seguros (<code class="text-midori-400 font-mono">aud=vpn-proxy</code>) y túneles HTTPS CONNECT para extensiones de navegador.
        </p>
      </div>
      <button
        @click="generateCredentials"
        :disabled="loading"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-midori-600 hover:bg-midori-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-midori-900/30 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
      >
        <span v-if="loading" class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span>Generar Nueva Credencial</span>
      </button>
    </div>

    <!-- Active Credential Card -->
    <div v-if="credential" class="bg-slate-900/80 rounded-3xl p-6 md:p-8 border border-slate-800/80 shadow-xl shadow-black/30 backdrop-blur-xl space-y-6">
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-midori-950/60 border border-midori-700/50 text-midori-300">
          <span class="w-1.5 h-1.5 rounded-full bg-midori-400 animate-pulse"></span>
          Token Activo (HTTPS CONNECT)
        </span>
        <span class="text-xs text-slate-400 font-mono">Expira en: {{ formatExpiresIn(credential.expires_in) }}</span>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proxy Token</label>
        <div class="flex items-center gap-3">
          <input
            type="password"
            readonly
            :value="credential.proxy_token"
            class="flex-1 px-4 py-2.5 text-sm bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-200 font-mono outline-none"
          />
          <button
            @click="copyToken"
            class="px-4 py-2.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-slate-200 transition cursor-pointer"
          >
            {{ copied ? '✓ Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <!-- Proxy Endpoints List -->
      <div class="space-y-3 pt-2">
        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Endpoints Disponibles</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="ep in credential.proxy_endpoints"
            :key="ep.host"
            class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-sm hover:border-slate-700 transition-all"
          >
            <div class="flex items-center gap-3">
              <span class="w-2 h-2 rounded-full bg-midori-400"></span>
              <span class="font-mono text-xs text-white">{{ ep.host }}:{{ ep.port }}</span>
            </div>
            <span class="text-xs text-slate-400 font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">{{ ep.country_code }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="bg-slate-900/60 rounded-3xl p-12 text-center border border-slate-800 text-slate-400 text-sm">
      <p>No has generado credenciales de proxy recientes.</p>
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
