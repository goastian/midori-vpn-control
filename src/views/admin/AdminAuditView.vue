<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { AuditLog } from '../../lib/schemas'

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const loadError = ref('')
const currentOffset = ref(0)
const hasMore = ref(true)
const PAGE_SIZE = 50
const actionFilter = ref('')
const { t, formatDateTime } = useLocale()

onMounted(() => loadLogs())

async function loadLogs(append = false) {
  loading.value = true
  loadError.value = ''
  try {
    const offset = append ? currentOffset.value : 0
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
    if (actionFilter.value) params.set('action', actionFilter.value)
    const page = (await api.get<AuditLog[]>(`/api/v1/admin/audit-logs?${params}`)) || []
    if (append) {
      logs.value = [...logs.value, ...page]
    } else {
      logs.value = page
      currentOffset.value = 0
    }
    hasMore.value = page.length >= PAGE_SIZE
    currentOffset.value = (append ? currentOffset.value : 0) + page.length
  } catch (e: any) {
    loadError.value = e.message ?? 'Failed to load audit logs'
  } finally {
    loading.value = false
  }
}

async function loadMoreLogs() {
  await loadLogs(true)
}

function actionLabel(action: string): string {
  const label = t(`auditView.actions.${action}`)
  return label === `auditView.actions.${action}` ? action : label
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
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('adminAudit.title') }}</h1>

    <div class="flex items-center gap-3 mb-6">
      <select v-model="actionFilter" @change="loadLogs()" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200">
        <option value="">{{ t('common.allActions') }}</option>
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

    <div v-if="loadError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
      <span>{{ loadError }}</span>
      <button @click="loadLogs()" class="text-xs underline ml-3">{{ t('common.retry') }}</button>
    </div>

    <div v-if="loading && logs.length === 0" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('adminAudit.empty') }}
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">{{ t('common.date') }}</th>
            <th class="px-6 py-3">{{ t('auditView.action') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('common.user') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('auditView.ip') }}</th>
            <th class="px-6 py-3 hidden lg:table-cell">{{ t('common.details') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
              {{ formatDateTime(log.created_at) }}
            </td>
            <td class="px-6 py-4">
              <span :class="actionColor(log.action)" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-gray-500">
              {{ log.user_email || (log.user_id ? log.user_id.slice(0, 8) + '…' : t('common.system')) }}
            </td>
            <td class="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">{{ log.ip_address }}</td>
            <td class="px-6 py-4 text-xs text-gray-400 dark:text-gray-500 hidden lg:table-cell font-mono max-w-xs truncate">
              {{ JSON.stringify(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="hasMore" class="px-6 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
        <button
          @click="loadMoreLogs"
          :disabled="loading"
          class="text-sm text-midori-600 hover:text-midori-700 disabled:opacity-50"
        >
          {{ loading ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>
