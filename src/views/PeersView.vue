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

interface Connection {
  id: string
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

interface ConnectionConfig {
  peer_id: string
  peer_ip: string
  server_public_key: string
  server_endpoint: string
  dns: string
  allowed_ips: string
}

const servers = ref<Server[]>([])
const connections = ref<Connection[]>([])
const loading = ref(true)
const connecting = ref(false)
const lastConfig = ref<ConnectionConfig | null>(null)

const form = ref({
  server_id: '',
  public_key: '',
  device_name: '',
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [s, c] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<Connection[]>('/api/v1/control/connections'),
    ])
    servers.value = s || []
    connections.value = c || []
  } catch (e) {
    console.error('Failed to load data', e)
  } finally {
    loading.value = false
  }
}

async function connect() {
  if (!form.value.public_key) return
  connecting.value = true
  try {
    const config = await api.post<ConnectionConfig>('/api/v1/control/connections', form.value)
    lastConfig.value = config
    form.value = { server_id: '', public_key: '', device_name: '' }
    await loadData()
  } catch (e: any) {
    alert(e.message)
  } finally {
    connecting.value = false
  }
}

async function disconnect(id: string) {
  if (!confirm('¿Desconectar este dispositivo?')) return
  try {
    await api.delete(`/api/v1/control/connections/${id}`)
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
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function copyConfig() {
  if (!lastConfig.value) return
  const c = lastConfig.value
  const text = `[Interface]
Address = ${c.peer_ip}/32
DNS = ${c.dns}

[Peer]
PublicKey = ${c.server_public_key}
Endpoint = ${c.server_endpoint}
AllowedIPs = ${c.allowed_ips}`
  navigator.clipboard.writeText(text)
  alert('Configuración copiada al portapapeles')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Mis Conexiones VPN</h1>

    <!-- Connect form -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Nueva conexión</h2>
      <form @submit.prevent="connect" class="space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <select
            v-model="form.server_id"
            class="border rounded-lg px-3 py-2 text-sm flex-1"
          >
            <option value="">Auto (menos cargado)</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.location }}) — {{ s.current_peers }}/{{ s.max_peers }}
            </option>
          </select>
          <input
            v-model="form.device_name"
            placeholder="Nombre del dispositivo (opcional)"
            class="border rounded-lg px-3 py-2 text-sm flex-1"
          />
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
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
        </div>
      </form>
    </div>

    <!-- WireGuard config result -->
    <div v-if="lastConfig" class="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-green-800">Configuración WireGuard</h3>
        <button @click="copyConfig" class="text-sm text-green-700 hover:text-green-900 font-medium">
          Copiar
        </button>
      </div>
      <pre class="text-xs bg-white rounded-lg p-4 font-mono text-gray-700 overflow-x-auto">[Interface]
Address = {{ lastConfig.peer_ip }}/32
DNS = {{ lastConfig.dns }}

[Peer]
PublicKey = {{ lastConfig.server_public_key }}
Endpoint = {{ lastConfig.server_endpoint }}
AllowedIPs = {{ lastConfig.allowed_ips }}</pre>
      <button @click="lastConfig = null" class="mt-3 text-xs text-gray-500 hover:text-gray-700">Cerrar</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="connections.length === 0" class="text-center py-12 text-gray-400">
      No tienes conexiones activas.
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Dispositivo</th>
            <th class="px-6 py-3">Servidor</th>
            <th class="px-6 py-3">IP</th>
            <th class="px-6 py-3 hidden md:table-cell">Tráfico</th>
            <th class="px-6 py-3">Estado</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="conn in connections" :key="conn.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-gray-900">{{ conn.device_name || 'Sin nombre' }}</td>
            <td class="px-6 py-4 font-medium text-gray-700">{{ serverName(conn.server_id) }}</td>
            <td class="px-6 py-4 font-mono text-gray-600 text-xs">{{ conn.assigned_ip }}</td>
            <td class="px-6 py-4 text-gray-500 hidden md:table-cell text-xs">
              ↑{{ formatBytes(conn.bytes_sent) }} ↓{{ formatBytes(conn.bytes_received) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="conn.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ conn.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="conn.is_active"
                @click="disconnect(conn.id)"
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
