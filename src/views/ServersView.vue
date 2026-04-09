<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import type { Server } from '../lib/schemas'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

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

function loadColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-yellow-500'
  return 'bg-midori-500'
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('serversView.title') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="servers.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('serversView.empty') }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="server in servers" :key="server.id" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ server.name }}</h3>
          <span
            :class="isServerOnline(server) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
            class="text-xs font-medium px-2 py-1 rounded-full"
          >
            {{ isServerOnline(server) ? t('common.active') : t('common.inactive') }}
          </span>
        </div>
        <div class="space-y-2 text-sm text-gray-500">
          <p>{{ server.location }} {{ server.country_code ? `(${server.country_code})` : '' }}</p>
          <p class="font-mono text-xs">{{ server.host }}:{{ server.wg_port }}</p>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span>{{ t('serversView.load') }}</span>
              <span>{{ server.current_peers }}/{{ server.max_peers }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                :class="loadColor(loadPercent(server))"
                class="h-2 rounded-full transition-all"
                :style="{ width: loadPercent(server) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
