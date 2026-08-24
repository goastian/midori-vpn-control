<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'
import type { Server } from '../lib/schemas'

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
  } catch (e) {
    console.error('Failed to load servers', e)
  } finally {
    if (!options.silent) loading.value = false
  }
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
        <p class="text-sm text-slate-400 mt-1">{{ servers.length }} servidores disponibles y protegidos con Post-Quantum PSK</p>
      </div>
    </div>

    <!-- Global User Quota Bar -->
    <div v-if="userQuota" class="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-midori-400">Plan {{ userQuota.plan_name }}</span>
          <span v-if="userQuota.available_devices > 0" class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
            {{ userQuota.available_devices }} disponibles
          </span>
          <span v-else class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-700/50 text-rose-300">
            Límite alcanzado
          </span>
        </div>
        <p class="text-xl font-extrabold text-white">
          {{ userQuota.connected_devices }} <span class="text-slate-400 text-sm font-normal">/ {{ userQuota.max_devices }} dispositivos en uso</span>
        </p>
        <p class="text-xs text-slate-400">
          {{ userQuota.devices_by_type.desktop }} Desktop · {{ userQuota.devices_by_type.extension }} Extensión · {{ userQuota.devices_by_type.wireguard }} WireGuard
        </p>
      </div>

      <div class="w-full md:w-64 space-y-1.5">
        <div class="flex justify-between text-xs text-slate-400 font-medium">
          <span>Disponibilidad de tu cuenta</span>
          <span class="text-slate-200">{{ Math.round((userQuota.connected_devices / userQuota.max_devices) * 100) }}%</span>
        </div>
        <div class="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
            :class="userQuota.connected_devices >= userQuota.max_devices ? 'from-rose-600 to-rose-400' : 'from-midori-500 to-cyan-400'"
            :style="{ width: `${Math.min(Math.round((userQuota.connected_devices / userQuota.max_devices) * 100), 100)}%` }"
          ></div>
        </div>
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

          <!-- Availability / User Quota indicator -->
          <div v-if="userQuota" class="space-y-2 mb-6">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Disponibilidad en tu cuenta</span>
              <span :class="userQuota.available_devices > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'">
                {{ userQuota.available_devices > 0 ? `${userQuota.available_devices} de ${userQuota.max_devices} disponibles` : 'Sin cupo libre' }}
              </span>
            </div>
            <div class="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-slate-800/80">
              <div
                class="h-2 rounded-full transition-all duration-500 bg-gradient-to-r"
                :class="userQuota.connected_devices >= userQuota.max_devices ? 'from-rose-600 to-rose-400' : 'from-midori-500 to-cyan-400'"
                :style="{ width: `${Math.min(Math.round((userQuota.connected_devices / userQuota.max_devices) * 100), 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Action button -->
        <button
          :class="userQuota && userQuota.available_devices === 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            : 'bg-slate-800 hover:bg-midori-600 border-slate-700/80 hover:border-midori-500 text-white'"
          class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 group-hover:shadow-midori-950/40"
          @click="connectToServer(server.id)"
        >
          <svg class="w-4 h-4 text-midori-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span v-if="userQuota && userQuota.available_devices === 0">Límite alcanzado ({{ userQuota.connected_devices }}/{{ userQuota.max_devices }}) · Gestionar</span>
          <span v-else>Conectar dispositivo aquí</span>
        </button>
      </div>
    </div>
  </div>
</template>
