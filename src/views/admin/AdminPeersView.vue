<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'

interface Peer {
  id: string
  user_id: string
  server_id: string
  public_key: string
  assigned_ip: string
  device_name: string
  is_active: boolean
  bytes_sent: number
  bytes_received: number
  last_handshake: string | null
  created_at: string
}

const peers = ref<Peer[]>([])
const loading = ref(true)

onMounted(() => loadPeers())

async function loadPeers() {
  loading.value = true
  try {
    peers.value = (await api.get<Peer[]>('/api/v1/admin/peers')) || []
  } catch (e) {
    console.error('Failed to load peers', e)
  } finally {
    loading.value = false
  }
}

async function forceDisconnect(id: string) {
  if (!confirm('¿Forzar desconexión de este peer?')) return
  try {
    await api.delete(`/api/v1/admin/peers/${id}`)
    await loadPeers()
  } catch (e: any) {
    alert(e.message)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Admin — Peers</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="peers.length === 0" class="text-center py-12 text-gray-400">
      No hay peers en el sistema.
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Dispositivo</th>
            <th class="px-6 py-3">IP</th>
            <th class="px-6 py-3 hidden md:table-cell">Usuario</th>
            <th class="px-6 py-3 hidden md:table-cell">Tráfico</th>
            <th class="px-6 py-3">Estado</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in peers" :key="p.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-gray-900">{{ p.device_name || '—' }}</td>
            <td class="px-6 py-4 font-mono text-xs text-gray-600">{{ p.assigned_ip }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">{{ p.user_id.slice(0, 8) }}…</td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">
              ↑{{ formatBytes(p.bytes_sent) }} ↓{{ formatBytes(p.bytes_received) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ p.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="p.is_active"
                @click="forceDisconnect(p.id)"
                class="text-xs text-red-500 hover:text-red-700"
              >
                Desconectar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
