<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../lib/api'

interface Server {
  id: string
  name: string
  location: string
  country_code: string
  current_peers: number
  max_peers: number
}

interface Peer {
  id: string
  server_id: string
  public_key: string
  assigned_ip: string
  is_active: boolean
  bytes_sent: number
  bytes_received: number
  created_at: string
}

const servers = ref<Server[]>([])
const peers = ref<Peer[]>([])
const loading = ref(true)
const connecting = ref(false)

const form = ref({
  server_id: '',
  public_key: '',
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [s, p] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<Peer[]>('/api/v1/control/peers'),
    ])
    servers.value = s || []
    peers.value = p || []
  } catch (e) {
    console.error('Failed to load data', e)
  } finally {
    loading.value = false
  }
}

async function connectPeer() {
  if (!form.value.server_id || !form.value.public_key) return
  connecting.value = true
  try {
    await api.post('/api/v1/control/peers', form.value)
    form.value = { server_id: '', public_key: '' }
    await loadData()
  } catch (e: any) {
    alert(e.message)
  } finally {
    connecting.value = false
  }
}

async function disconnectPeer(id: string) {
  if (!confirm('¿Desconectar este peer?')) return
  try {
    await api.delete(`/api/v1/control/peers/${id}`)
    await loadData()
  } catch (e: any) {
    alert(e.message)
  }
}

function serverName(id: string): string {
  return servers.value.find((s) => s.id === id)?.name || id.slice(0, 8)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Mis Conexiones VPN</h1>

    <!-- Connect form -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Nueva conexión</h2>
      <form @submit.prevent="connectPeer" class="flex flex-col sm:flex-row gap-3">
        <select
          v-model="form.server_id"
          required
          class="border rounded-lg px-3 py-2 text-sm flex-1"
        >
          <option value="" disabled>Seleccionar servidor</option>
          <option v-for="s in servers" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.location }}) — {{ s.current_peers }}/{{ s.max_peers }}
          </option>
        </select>
        <input
          v-model="form.public_key"
          placeholder="Tu clave pública WireGuard"
          required
          class="border rounded-lg px-3 py-2 text-sm flex-1 font-mono"
        />
        <button
          type="submit"
          :disabled="connecting"
          class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {{ connecting ? 'Conectando...' : 'Conectar' }}
        </button>
      </form>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="peers.length === 0" class="text-center py-12 text-gray-400">
      No tienes conexiones activas.
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Servidor</th>
            <th class="px-6 py-3">IP asignada</th>
            <th class="px-6 py-3 hidden md:table-cell">Enviado</th>
            <th class="px-6 py-3 hidden md:table-cell">Recibido</th>
            <th class="px-6 py-3">Estado</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="peer in peers" :key="peer.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ serverName(peer.server_id) }}</td>
            <td class="px-6 py-4 font-mono text-gray-600">{{ peer.assigned_ip }}</td>
            <td class="px-6 py-4 text-gray-500 hidden md:table-cell">{{ formatBytes(peer.bytes_sent) }}</td>
            <td class="px-6 py-4 text-gray-500 hidden md:table-cell">{{ formatBytes(peer.bytes_received) }}</td>
            <td class="px-6 py-4">
              <span
                :class="peer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ peer.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                @click="disconnectPeer(peer.id)"
                class="text-xs text-red-500 hover:text-red-700 transition-colors"
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
