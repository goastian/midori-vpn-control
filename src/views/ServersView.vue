<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'
import type { Server } from '../lib/schemas'
import AsyncState from '../components/AsyncState.vue'
import QuotaSummary from '../components/QuotaSummary.vue'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const router = useRouter()
const auth = useAuthStore()
const servers = ref<Server[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const loading = ref(true)
const failed = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

const userQuota = computed(() => auth.userQuota)

onMounted(async () => {
  await Promise.all([
    loadServers(),
    auth.fetchQuota(),
  ])
  refreshTimer = setInterval(() => {
    loadServers({ silent: true })
    auth.fetchQuota()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

async function loadServers(options: { silent?: boolean } = {}) {
  if (!options.silent) loading.value = true
  if (!options.silent) failed.value = false
  try {
    const serverList = await api.get<Server[]>('/api/v1/control/servers')
    servers.value = serverList || []
    if (!options.silent) loading.value = false

    // Fetch latency pings in background non-blockingly
    api.get<ServerPingResult[]>('/api/v1/control/servers/ping')
      .then((pings) => {
        if (pings) {
          serverPing.value = Object.fromEntries(pings.map((item) => [item.server_id, item]))
        }
      })
      .catch((e) => console.warn('Background server ping error:', e))
  } catch {
    if (!options.silent) failed.value = true
  } finally {
    if (!options.silent) loading.value = false
  }
}

async function retryLoad() {
  await Promise.all([loadServers(), auth.fetchQuota()])
}

function isServerOnline(server: Server): boolean {
  return serverPing.value[server.id]?.available === true
}

function connectToServer(serverId: string) {
  router.push({ path: '/connections', query: { server_id: serverId } })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('serversView.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ t('serversView.subtitle', { count: servers.length }) }}</p>
      </div>
    </div>

    <!-- Global User Quota Bar -->
    <QuotaSummary v-if="userQuota" :quota="userQuota" />

    <AsyncState v-if="loading" kind="loading" :title="t('serversView.loading')" />

    <AsyncState v-else-if="failed" kind="error" :title="t('serversView.loadErrorTitle')" :detail="t('serversView.loadErrorDetail')" :retry-label="t('common.retry')" @retry="retryLoad" />

    <AsyncState v-else-if="servers.length === 0" kind="empty" :title="t('serversView.empty')" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="server in servers"
        :key="server.id"
        class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl transition-all hover:border-slate-700 hover:-translate-y-1"
      >
        <div class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-midori-500/10 blur-xl group-hover:bg-midori-500/20 transition-all"></div>

        <div>
          <!-- Header -->
          <div class="relative z-10 flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-white group-hover:text-midori-300 transition-colors">{{ server.name }}</h3>
              <p class="text-xs text-slate-400 mt-0.5">{{ server.location }} {{ server.country_code ? `· ${server.country_code}` : '' }}</p>
            </div>
            <span
              :class="isServerOnline(server)
                ? 'bg-midori-950/60 border-midori-700/50 text-midori-300'
                : 'bg-rose-950/60 border-rose-700/50 text-rose-300'"
              class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="isServerOnline(server) ? 'bg-midori-400 animate-pulse' : 'bg-rose-400'"></span>
              {{ isServerOnline(server) ? (serverPing[server.id]?.latency_ms ? `${serverPing[server.id].latency_ms}ms` : t('common.active')) : t('common.inactive') }}
            </span>
          </div>

          <!-- Security Badges -->
          <div class="flex flex-wrap gap-1.5 mb-5">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-midori-300">
              <span class="w-1 h-1 rounded-full bg-midori-400"></span>
              WireGuard
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-cyan-300">
              <span class="w-1 h-1 rounded-full bg-cyan-400"></span>
              {{ t('serversView.dnsSecure') }}
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-purple-300">
              <span class="w-1 h-1 rounded-full bg-purple-400"></span>
              Post-Quantum
            </span>
          </div>

        </div>

        <!-- Action button -->
        <button
          type="button"
          :class="userQuota && userQuota.available_devices === 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            : 'bg-slate-800 hover:bg-midori-600 border-slate-700/80 hover:border-midori-500 text-white'"
          class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 group-hover:shadow-midori-950/40"
          @click="connectToServer(server.id)"
        >
          <svg class="w-4 h-4 text-midori-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span v-if="userQuota && userQuota.available_devices === 0">{{ t('serversView.manageLimit', { connected: userQuota.connected_devices, maximum: userQuota.max_devices }) }}</span>
          <span v-else>{{ t('serversView.connectHere') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
