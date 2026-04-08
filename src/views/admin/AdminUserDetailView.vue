<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { User, AdminPeer } from '../../lib/schemas'

const route = useRoute()
const userId = route.params.id as string

const user = ref<User | null>(null)
const peers = ref<AdminPeer[]>([])
const loading = ref(true)
const { t, formatDate } = useLocale()

onMounted(async () => {
  try {
    const data = await api.get<{ user: User; peers: AdminPeer[] }>(
      `/api/v1/admin/users/${userId}`
    )
    user.value = data.user
    peers.value = data.peers || []
  } catch (e) {
    console.error('Failed to load user', e)
  } finally {
    loading.value = false
  }
})

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
    <router-link to="/admin/users" class="text-sm text-midori-600 hover:text-midori-700 mb-4 inline-block">
      ← {{ t('adminUserDetail.back') }}
    </router-link>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <template v-else-if="user">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ user.email }}</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold mb-4 dark:text-gray-100">{{ t('adminUserDetail.info') }}</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('common.name') }}</dt><dd>{{ user.display_name || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('common.groups') }}</dt><dd>{{ user.groups?.join(', ') || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">{{ t('adminUserDetail.registered') }}</dt><dd>{{ formatDate(user.created_at) }}</dd></div>
            <div class="flex justify-between">
              <dt class="text-gray-500">{{ t('common.status') }}</dt>
              <dd>
                <span v-if="user.is_banned" class="text-red-600 font-medium">{{ t('adminUserDetail.bannedWithReason', { reason: user.ban_reason || '—' }) }}</span>
                <span v-else class="text-green-600">{{ t('common.active') }}</span>
              </dd>
            </div>
          </dl>
        </div>

      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold">{{ t('adminUserDetail.activePeers', { count: peers.length }) }}</h2>
        </div>
        <div v-if="peers.length === 0" class="px-6 py-8 text-center text-gray-400 text-sm">{{ t('adminUserDetail.noPeers') }}</div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
            <tr>
              <th class="px-6 py-3">{{ t('common.device') }}</th>
              <th class="px-6 py-3">{{ t('common.ip') }}</th>
              <th class="px-6 py-3">{{ t('common.traffic') }}</th>
              <th class="px-6 py-3">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
            <tr v-for="p in peers" :key="p.id">
              <td class="px-6 py-3">{{ p.device_name || '—' }}</td>
              <td class="px-6 py-3 font-mono text-xs">{{ p.assigned_ip }}</td>
              <td class="px-6 py-3 text-xs">↑{{ formatBytes(p.bytes_sent) }} ↓{{ formatBytes(p.bytes_received) }}</td>
              <td class="px-6 py-3">
                <span :class="p.is_active ? 'text-green-600' : 'text-gray-400'" class="text-xs">
                  {{ p.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
