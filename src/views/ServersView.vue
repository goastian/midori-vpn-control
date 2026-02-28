<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

const auth = useAuthStore()

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
const showForm = ref(false)

const form = ref({
  name: '',
  host: '',
  port: 8080,
  wg_port: 51820,
  public_key: '',
  core_token: '',
  location: '',
  country_code: '',
  max_peers: 250,
})

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

async function createServer() {
  try {
    await api.post('/api/v1/control/servers', form.value)
    showForm.value = false
    form.value = { name: '', host: '', port: 8080, wg_port: 51820, public_key: '', core_token: '', location: '', country_code: '', max_peers: 250 }
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteServer(id: string) {
  if (!confirm('¿Eliminar este servidor?')) return
  try {
    await api.delete(`/api/v1/control/servers/${id}`)
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Servidores VPN</h1>
      <button
        v-if="auth.isAdmin"
        @click="showForm = !showForm"
        class="bg-midori-600 hover:bg-midori-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {{ showForm ? 'Cancelar' : 'Agregar servidor' }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showForm && auth.isAdmin" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Nuevo servidor</h2>
      <form @submit.prevent="createServer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input v-model="form.name" placeholder="Nombre" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.host" placeholder="Host (IP/dominio)" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.port" type="number" placeholder="Puerto API" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.wg_port" type="number" placeholder="Puerto WireGuard" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.public_key" placeholder="Clave pública WireGuard" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.core_token" placeholder="Core Token" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.location" placeholder="Ubicación" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.country_code" placeholder="Código país (US, DE...)" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.max_peers" type="number" placeholder="Max peers" class="border rounded-lg px-3 py-2 text-sm" />
        <div class="md:col-span-2">
          <button type="submit" class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Crear servidor
          </button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="servers.length === 0" class="text-center py-12 text-gray-400">
      No hay servidores registrados.
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
        <div class="space-y-1 text-sm text-gray-500">
          <p>{{ server.location }} {{ server.country_code ? `(${server.country_code})` : '' }}</p>
          <p class="font-mono text-xs">{{ server.host }}:{{ server.wg_port }}</p>
          <p>Peers: {{ server.current_peers }} / {{ server.max_peers }}</p>
        </div>
        <button
          v-if="auth.isAdmin"
          @click="deleteServer(server.id)"
          class="mt-4 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
</template>
