<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

const auth = useAuthStore()

interface Server {
  id: string
  name: string
  location: string
  country_code: string
  current_peers: number
  max_peers: number
  is_active: boolean
}

interface Peer {
  id: string
  server_id: string
  public_key: string
  assigned_ip: string
  is_active: boolean
  created_at: string
}

const servers = ref<Server[]>([])
const peers = ref<Peer[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [s, p] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<Peer[]>('/api/v1/control/peers'),
    ])
    servers.value = s || []
    peers.value = p || []
  } catch (e) {
    console.error('Failed to load dashboard data', e)
  } finally {
    loading.value = false
  }
})

const activePeers = () => peers.value.filter((p) => p.is_active).length
const activeServers = () => servers.value.filter((s) => s.is_active).length
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500 mb-1">Servidores activos</p>
        <p class="text-3xl font-bold text-midori-600">{{ activeServers() }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500 mb-1">Mis conexiones</p>
        <p class="text-3xl font-bold text-midori-600">{{ activePeers() }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500 mb-1">Total peers</p>
        <p class="text-3xl font-bold text-gray-700">{{ peers.length }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p class="text-sm text-gray-500 mb-1">Cuenta</p>
        <p class="text-lg font-semibold text-gray-700 truncate">{{ auth.user?.email }}</p>
        <p v-if="auth.isAdmin" class="text-xs text-midori-600 font-medium mt-1">Admin</p>
      </div>
    </div>

    <div v-if="peers.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900">Conexiones recientes</h2>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="peer in peers.slice(0, 5)" :key="peer.id" class="px-6 py-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-mono text-gray-700">{{ peer.assigned_ip }}</p>
            <p class="text-xs text-gray-400">{{ new Date(peer.created_at).toLocaleString() }}</p>
          </div>
          <span
            :class="peer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
            class="text-xs font-medium px-2 py-1 rounded-full"
          >
            {{ peer.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
