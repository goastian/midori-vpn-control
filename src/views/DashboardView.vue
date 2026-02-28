<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

const auth = useAuthStore()

interface AdminStats {
  total_users: number
  total_servers: number
  active_servers: number
  total_peers: number
  active_peers: number
  total_bytes_sent: number
  total_bytes_received: number
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

const connections = ref<Connection[]>([])
const adminStats = ref<AdminStats | null>(null)
const loading = ref(true)
let ws: WebSocket | null = null

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

onMounted(async () => {
  try {
    const promises: Promise<any>[] = [
      api.get<Connection[]>('/api/v1/control/connections'),
    ]
    if (auth.isAdmin) {
      promises.push(api.get<AdminStats>('/api/v1/admin/dashboard/stats'))
    }

    const results = await Promise.all(promises)
    connections.value = results[0] || []
    if (results[1]) adminStats.value = results[1]
  } catch (e) {
    console.error('Failed to load dashboard data', e)
  } finally {
    loading.value = false
  }

  // Connect WebSocket for real-time stats (JWT authenticated)
  try {
    const token = encodeURIComponent(auth.accessToken)
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws?token=${token}`
    ws = new WebSocket(wsUrl)
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'stats' && auth.isAdmin) {
        adminStats.value = msg.data
      }
    }
  } catch {
    // WebSocket is optional
  }
})

onUnmounted(() => {
  ws?.close()
})

const activeConnections = () => connections.value.filter((c) => c.is_active).length
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <template v-else>
      <!-- Admin stats -->
      <div v-if="auth.isAdmin && adminStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs text-gray-500 mb-1">Usuarios</p>
          <p class="text-2xl font-bold text-midori-600">{{ adminStats.total_users }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs text-gray-500 mb-1">Servidores</p>
          <p class="text-2xl font-bold text-midori-600">{{ adminStats.active_servers }}<span class="text-sm text-gray-400">/{{ adminStats.total_servers }}</span></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs text-gray-500 mb-1">Peers activos</p>
          <p class="text-2xl font-bold text-midori-600">{{ adminStats.active_peers }}<span class="text-sm text-gray-400">/{{ adminStats.total_peers }}</span></p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs text-gray-500 mb-1">Tráfico total</p>
          <p class="text-lg font-bold text-gray-700">
            <span class="text-green-600">↑{{ formatBytes(adminStats.total_bytes_sent) }}</span>
            <span class="text-blue-600 ml-1">↓{{ formatBytes(adminStats.total_bytes_received) }}</span>
          </p>
        </div>
      </div>

      <!-- User info cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500 mb-1">Mis conexiones</p>
          <p class="text-3xl font-bold text-midori-600">{{ activeConnections() }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500 mb-1">Cuenta</p>
          <p class="text-lg font-semibold text-gray-700 truncate">{{ auth.user?.email }}</p>
          <p v-if="auth.user?.display_name" class="text-sm text-gray-400">{{ auth.user.display_name }}</p>
          <p v-if="auth.isAdmin" class="text-xs text-midori-600 font-medium mt-1">Admin</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500 mb-1">Total conexiones</p>
          <p class="text-3xl font-bold text-gray-700">{{ connections.length }}</p>
        </div>
      </div>

      <!-- Recent connections -->
      <div v-if="connections.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">Conexiones recientes</h2>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="conn in connections.slice(0, 5)" :key="conn.id" class="px-6 py-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-mono text-gray-700">{{ conn.assigned_ip }}</p>
              <p class="text-xs text-gray-400">
                {{ conn.device_name || 'Sin nombre' }} · {{ new Date(conn.created_at).toLocaleString() }}
              </p>
              <p v-if="conn.bytes_sent > 0 || conn.bytes_received > 0" class="text-xs text-gray-400 mt-0.5">
                ↑{{ formatBytes(conn.bytes_sent) }} ↓{{ formatBytes(conn.bytes_received) }}
              </p>
            </div>
            <span
              :class="conn.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              class="text-xs font-medium px-2 py-1 rounded-full"
            >
              {{ conn.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
