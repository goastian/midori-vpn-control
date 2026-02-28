<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  metadata: Record<string, any>
  ip_address: string
  created_at: string
}

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const actionFilter = ref('')

onMounted(() => loadLogs())

async function loadLogs() {
  loading.value = true
  try {
    const params = actionFilter.value ? `?action=${encodeURIComponent(actionFilter.value)}` : ''
    logs.value = (await api.get<AuditLog[]>(`/api/v1/admin/audit-logs${params}`)) || []
  } catch (e) {
    console.error('Failed to load audit logs', e)
  } finally {
    loading.value = false
  }
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'peer.connect': 'Conexión VPN',
    'peer.disconnect': 'Desconexión VPN',
    'peer.cleanup': 'Limpieza automática',
    'admin.server.create': 'Servidor creado',
    'admin.server.update': 'Servidor actualizado',
    'admin.server.delete': 'Servidor eliminado',
    'admin.user.create': 'Usuario creado',
    'admin.user.update': 'Usuario actualizado',
    'admin.user.delete': 'Usuario eliminado',
    'admin.user.ban': 'Usuario baneado',
    'admin.peer.disconnect': 'Desconexión forzada',
  }
  return map[action] || action
}

function actionColor(action: string): string {
  if (action.includes('ban') || action.includes('delete') || action.includes('disconnect')) return 'bg-red-100 text-red-600'
  if (action.includes('create') || action.includes('connect')) return 'bg-green-100 text-green-700'
  if (action.includes('update')) return 'bg-blue-100 text-blue-700'
  if (action.includes('cleanup')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Admin — Audit Logs</h1>

    <div class="flex items-center gap-3 mb-6">
      <select v-model="actionFilter" @change="loadLogs" class="border rounded-lg px-3 py-2 text-sm">
        <option value="">Todas las acciones</option>
        <option value="peer.connect">peer.connect</option>
        <option value="peer.disconnect">peer.disconnect</option>
        <option value="peer.cleanup">peer.cleanup</option>
        <option value="admin.server.create">admin.server.create</option>
        <option value="admin.server.update">admin.server.update</option>
        <option value="admin.server.delete">admin.server.delete</option>
        <option value="admin.user.create">admin.user.create</option>
        <option value="admin.user.ban">admin.user.ban</option>
        <option value="admin.peer.disconnect">admin.peer.disconnect</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-400">
      No hay registros.
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Fecha</th>
            <th class="px-6 py-3">Acción</th>
            <th class="px-6 py-3 hidden md:table-cell">Usuario</th>
            <th class="px-6 py-3 hidden md:table-cell">IP</th>
            <th class="px-6 py-3 hidden lg:table-cell">Detalles</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
              {{ new Date(log.created_at).toLocaleString() }}
            </td>
            <td class="px-6 py-4">
              <span :class="actionColor(log.action)" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">
              {{ log.user_id ? log.user_id.slice(0, 8) + '…' : 'sistema' }}
            </td>
            <td class="px-6 py-4 font-mono text-gray-500 hidden md:table-cell text-xs">{{ log.ip_address }}</td>
            <td class="px-6 py-4 text-xs text-gray-400 hidden lg:table-cell font-mono max-w-xs truncate">
              {{ JSON.stringify(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
