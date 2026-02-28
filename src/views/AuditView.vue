<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../lib/api'

interface AuditLog {
  id: string
  action: string
  metadata: Record<string, any>
  ip_address: string
  created_at: string
}

const logs = ref<AuditLog[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    logs.value = (await api.get<AuditLog[]>('/api/v1/control/audit')) || []
  } catch (e) {
    console.error('Failed to load audit logs', e)
  } finally {
    loading.value = false
  }
})

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'peer.connect': 'Conexión VPN',
    'peer.disconnect': 'Desconexión VPN',
    'server.create': 'Servidor creado',
    'server.delete': 'Servidor eliminado',
  }
  return map[action] || action
}

function actionColor(action: string): string {
  if (action.includes('connect') && !action.includes('disconnect')) return 'bg-green-100 text-green-700'
  if (action.includes('disconnect') || action.includes('delete')) return 'bg-red-100 text-red-600'
  if (action.includes('create')) return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Registro de Auditoría</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-400">
      No hay registros de auditoría.
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">Fecha</th>
            <th class="px-6 py-3">Acción</th>
            <th class="px-6 py-3 hidden md:table-cell">IP</th>
            <th class="px-6 py-3 hidden lg:table-cell">Detalles</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-gray-500 whitespace-nowrap">
              {{ new Date(log.created_at).toLocaleString() }}
            </td>
            <td class="px-6 py-4">
              <span :class="actionColor(log.action)" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-4 font-mono text-gray-500 hidden md:table-cell">{{ log.ip_address }}</td>
            <td class="px-6 py-4 text-xs text-gray-400 hidden lg:table-cell font-mono">
              {{ JSON.stringify(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
