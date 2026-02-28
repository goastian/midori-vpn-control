<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'

interface Server {
  id: string
  name: string
  host: string
  port: number
  wg_port: number
  public_key: string
  core_token: string
  location: string
  country_code: string
  max_peers: number
  current_peers: number
  is_active: boolean
}

const servers = ref<Server[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = {
  name: '', host: '', port: 8080, wg_port: 51820,
  public_key: '', core_token: '', location: '', country_code: '', max_peers: 250,
  is_active: true,
}
const form = ref({ ...emptyForm })

onMounted(() => loadServers())

async function loadServers() {
  loading.value = true
  try {
    servers.value = (await api.get<Server[]>('/api/v1/admin/servers')) || []
  } catch (e) {
    console.error('Failed to load servers', e)
  } finally {
    loading.value = false
  }
}

function startEdit(s: Server) {
  editingId.value = s.id
  form.value = {
    name: s.name, host: s.host, port: s.port, wg_port: s.wg_port,
    public_key: s.public_key, core_token: s.core_token || '',
    location: s.location, country_code: s.country_code, max_peers: s.max_peers,
    is_active: s.is_active,
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

async function saveServer() {
  try {
    if (editingId.value) {
      await api.put(`/api/v1/admin/servers/${editingId.value}`, form.value)
    } else {
      await api.post('/api/v1/admin/servers', form.value)
    }
    cancelForm()
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteServer(id: string) {
  if (!confirm('¿Eliminar este servidor permanentemente?')) return
  try {
    await api.delete(`/api/v1/admin/servers/${id}`)
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Admin — Servidores</h1>
      <button
        @click="showForm ? cancelForm() : (showForm = true)"
        class="bg-midori-600 hover:bg-midori-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        {{ showForm ? 'Cancelar' : 'Agregar servidor' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">{{ editingId ? 'Editar' : 'Nuevo' }} servidor</h2>
      <form @submit.prevent="saveServer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input v-model="form.name" placeholder="Nombre" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.host" placeholder="Host" required class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.port" type="number" placeholder="Puerto API" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.wg_port" type="number" placeholder="Puerto WG" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.public_key" placeholder="Clave pública WG" required class="border rounded-lg px-3 py-2 text-sm font-mono" />
        <input v-model="form.core_token" placeholder="Core Token" :required="!editingId" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.location" placeholder="Ubicación" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model="form.country_code" placeholder="País (US, DE...)" class="border rounded-lg px-3 py-2 text-sm" />
        <input v-model.number="form.max_peers" type="number" placeholder="Max peers" class="border rounded-lg px-3 py-2 text-sm" />
        <label class="flex items-center space-x-2">
          <input v-model="form.is_active" type="checkbox" class="rounded border-gray-300" />
          <span class="text-sm text-gray-700">Activo</span>
        </label>
        <div class="md:col-span-2">
          <button type="submit" class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg">
            {{ editingId ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Nombre</th>
            <th class="px-6 py-3">Host</th>
            <th class="px-6 py-3 hidden md:table-cell">Ubicación</th>
            <th class="px-6 py-3">Peers</th>
            <th class="px-6 py-3">Estado</th>
            <th class="px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="s in servers" :key="s.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-gray-900">{{ s.name }}</td>
            <td class="px-6 py-4 font-mono text-xs text-gray-600">{{ s.host }}:{{ s.port }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-gray-500">{{ s.location }} {{ s.country_code ? `(${s.country_code})` : '' }}</td>
            <td class="px-6 py-4">{{ s.current_peers }}/{{ s.max_peers }}</td>
            <td class="px-6 py-4">
              <span :class="s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ s.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4 space-x-2">
              <button @click="startEdit(s)" class="text-xs text-midori-600 hover:text-midori-700">Editar</button>
              <button @click="deleteServer(s.id)" class="text-xs text-red-500 hover:text-red-700">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
