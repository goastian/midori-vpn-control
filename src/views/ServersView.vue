<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../lib/api'

interface Server {
  id: string
  name: string
  host: string
  port: number
  wg_port: number
  public_key: string
  location: string
  country_code: string
  max_peers: number
  current_peers: number
  is_active: boolean
}

const servers = ref<Server[]>([])
const loading = ref(true)

onMounted(async () => {
  await loadServers()
})

async function loadServers() {
  loading.value = true
  try {
    servers.value = (await api.get<Server[]>('/api/v1/control/servers')) || []
  } catch (e) {
    console.error('Failed to load servers', e)
  } finally {
    loading.value = false
  }
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
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Servidores VPN</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="servers.length === 0" class="text-center py-12 text-gray-400">
      No hay servidores disponibles.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="server in servers" :key="server.id" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-900">{{ server.name }}</h3>
          <span
            :class="server.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
            class="text-xs font-medium px-2 py-1 rounded-full"
          >
            {{ server.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="space-y-2 text-sm text-gray-500">
          <p>{{ server.location }} {{ server.country_code ? `(${server.country_code})` : '' }}</p>
          <p class="font-mono text-xs">{{ server.host }}:{{ server.wg_port }}</p>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span>Carga</span>
              <span>{{ server.current_peers }}/{{ server.max_peers }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
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
