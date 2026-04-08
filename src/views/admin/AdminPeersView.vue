<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { AdminPeer } from '../../lib/schemas'

const peers = ref<AdminPeer[]>([])
const loading = ref(true)
const { t } = useLocale()

onMounted(() => loadPeers())

async function loadPeers() {
  loading.value = true
  try {
    peers.value = (await api.get<AdminPeer[]>('/api/v1/admin/peers')) || []
  } catch (e) {
    console.error('Failed to load peers', e)
  } finally {
    loading.value = false
  }
}

async function forceDisconnect(id: string) {
  if (!confirm(t('adminPeers.forceDisconnectConfirm'))) return
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
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('adminPeers.title') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="peers.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('adminPeers.empty') }}
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">{{ t('common.device') }}</th>
            <th class="px-6 py-3">{{ t('common.ip') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('common.user') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('common.traffic') }}</th>
            <th class="px-6 py-3">{{ t('common.status') }}</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
          <tr v-for="p in peers" :key="p.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 text-gray-900">{{ p.device_name || '—' }}</td>
            <td class="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{{ p.assigned_ip }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">{{ p.user_id.slice(0, 8) }}…</td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">
              ↑{{ formatBytes(p.bytes_sent) }} ↓{{ formatBytes(p.bytes_received) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ p.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="p.is_active"
                @click="forceDisconnect(p.id)"
                class="text-xs text-red-500 hover:text-red-700"
              >
                {{ t('common.disconnect') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
