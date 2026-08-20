<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import type { Server } from '../lib/schemas'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const router = useRouter()
const servers = ref<Server[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const loading = ref(true)
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

onMounted(async () => {
  await loadServers()
  refreshTimer = setInterval(() => {
    loadServers({ silent: true })
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
  try {
    const [serverList, pings] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<ServerPingResult[]>('/api/v1/control/servers/ping').then((data) => data || null).catch(() => null),
    ])
    servers.value = serverList || []
    if (pings) {
      serverPing.value = Object.fromEntries((pings || []).map((item) => [item.server_id, item]))
    }
  } catch (e) {
    console.error('Failed to load servers', e)
  } finally {
    if (!options.silent) loading.value = false
  }
}

function isServerOnline(server: Server): boolean {
  return serverPing.value[server.id]?.available === true
}

function loadPercent(server: Server): number {
  if (server.max_peers === 0) return 0
  return Math.round((server.current_peers / server.max_peers) * 100)
}

function loadLabel(pct: number): string {
  if (pct >= 85) return 'Alta demanda'
  if (pct >= 50) return 'Carga moderada'
  return 'Excelente · Carga baja'
}

function loadBarClass(pct: number): string {
  if (pct >= 85) return 'from-rose-600 to-rose-400'
  if (pct >= 50) return 'from-amber-500 to-amber-400'
  return 'from-midori-500 to-cyan-400'
}

function connectToServer(serverId: string) {
  router.push({ path: '/connections', query: { server_id: serverId } })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('serversView.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ servers.length }} servidores disponibles y protegidos con Post-Quantum PSK</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-midori-500"></div>
    </div>

    <div v-else-if="servers.length === 0" class="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
      {{ t('serversView.empty') }}
    </div>

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
              DNS Seguro
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-purple-300">
              <span class="w-1 h-1 rounded-full bg-purple-400"></span>
              Post-Quantum
            </span>
          </div>

          <!-- Load metrics -->
          <div class="space-y-2 mb-6">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Disponibilidad</span>
              <span class="font-semibold text-slate-200">{{ loadLabel(loadPercent(server)) }}</span>
            </div>
            <div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
              <div
                class="h-2 rounded-full transition-all duration-500 bg-gradient-to-r"
                :class="loadBarClass(loadPercent(server))"
                :style="{ width: `${Math.max(loadPercent(server), 8)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Action button -->
        <button
          @click="connectToServer(server.id)"
          class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-slate-800 hover:bg-midori-600 border border-slate-700/80 hover:border-midori-500 shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 group-hover:shadow-midori-950/40"
        >
          <svg class="w-4 h-4 text-midori-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Conectar dispositivo aquí
        </button>
      </div>
    </div>
  </div>
</template>
