<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AsyncState from '../components/AsyncState.vue'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { ProxyCredentialResponseSchema, ServerListSchema } from '../lib/schemas'
import type { ProxyCredentialResponse, Server } from '../lib/schemas'

const { t } = useLocale()
const credential = ref<ProxyCredentialResponse | null>(null)
const loading = ref(false)
const copied = ref(false)
const failed = ref(false)
const proxyServers = ref<Server[]>([])
const selectedServerID = ref('')

function browserDeviceIdentity() {
  const key = 'midorivpn-control-proxy-device-v1'
  let clientInstanceID = localStorage.getItem(key)
  if (!clientInstanceID || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientInstanceID)) {
    clientInstanceID = crypto.randomUUID()
    localStorage.setItem(key, clientInstanceID)
  }
  return {
    client_instance_id: clientInstanceID,
    reported_name: 'MidoriVPN Control Browser',
    device_type: 'manual',
  }
}

onMounted(async () => {
  try {
    const servers = await api.validated('/api/v1/control/servers', ServerListSchema)
    proxyServers.value = servers.filter((server) => server.transports?.some(
      (transport) => transport.protocol === 'proxy' && transport.enabled && transport.health_status === 'healthy',
    ))
    selectedServerID.value = proxyServers.value[0]?.id ?? ''
  } catch {
    failed.value = true
  }
})

async function generateCredentials() {
  if (loading.value || !selectedServerID.value) return
  loading.value = true
  failed.value = false
  copied.value = false
  try {
    credential.value = await api.validated('/api/v1/control/proxy-credentials', ProxyCredentialResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ server_id: selectedServerID.value, device: browserDeviceIdentity() }),
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function copyToken() {
  if (!credential.value?.proxy_token) return
  try {
    await navigator.clipboard.writeText(credential.value.proxy_token)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    failed.value = true
  }
}

function formatExpiresIn(seconds: number) {
  return t('proxyView.expiresMinutes', { count: Math.max(0, Math.floor(seconds / 60)) })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('proxyView.title') }}</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ t('proxyView.subtitle') }}
          <code class="font-mono text-midori-400">aud=vpn-proxy</code>.
        </p>
      </div>
      <select
        v-model="selectedServerID"
        class="glass-input min-w-56"
        :aria-label="t('proxyView.endpoints')"
        :disabled="loading || proxyServers.length === 0"
      >
        <option v-for="server in proxyServers" :key="server.id" :value="server.id">
          {{ server.name }} · {{ server.location }}
        </option>
      </select>
      <button
        type="button"
        :disabled="loading || !selectedServerID"
        :aria-busy="loading"
        class="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        @click="generateCredentials"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
        {{ loading ? t('proxyView.generating') : t('proxyView.generate') }}
      </button>
    </div>

    <AsyncState
      v-if="failed"
      kind="error"
      :title="t('proxyView.errorTitle')"
      :detail="t('proxyView.errorDetail')"
      :retry-label="t('common.retry')"
      @retry="generateCredentials"
    />

    <AsyncState
      v-if="loading && !credential"
      kind="loading"
      :title="t('proxyView.loadingTitle')"
    />

    <div v-else-if="credential" class="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl md:p-8">
      <div class="flex items-center justify-between gap-3">
        <span class="badge-active">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-midori-400" aria-hidden="true"></span>
          {{ t('proxyView.activeToken') }}
        </span>
        <span class="font-mono text-xs text-slate-400">{{ t('proxyView.expiresIn', { duration: formatExpiresIn(credential.expires_in) }) }}</span>
      </div>

      <div class="space-y-2">
        <label for="proxy-token" class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ t('proxyView.tokenLabel') }}</label>
        <div class="flex items-center gap-3">
          <input id="proxy-token" type="password" readonly :value="credential.proxy_token" class="glass-input flex-1 font-mono text-sm" />
          <button type="button" class="btn-secondary text-xs" @click="copyToken">
            {{ copied ? t('proxyView.copied') : t('common.copy') }}
          </button>
        </div>
        <span class="sr-only" aria-live="polite">{{ copied ? t('proxyView.copied') : '' }}</span>
      </div>

      <div class="space-y-3 pt-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ t('proxyView.endpoints') }}</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
            <div class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-midori-400" aria-hidden="true"></span>
              <span class="font-mono text-xs text-white">{{ credential.proxy_endpoint.host }}:{{ credential.proxy_endpoint.port }}</span>
            </div>
            <span class="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-slate-400">{{ credential.proxy_endpoint.country_code }}</span>
          </div>
        </div>
      </div>
    </div>

    <AsyncState
      v-else-if="!loading && !failed"
      kind="empty"
      :title="t('proxyView.emptyTitle')"
      :detail="t('proxyView.emptyDetail')"
    />
  </div>
</template>
