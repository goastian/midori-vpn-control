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
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminAudit.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">Historial inmutable de eventos de seguridad y acciones administrativas</p>
      </div>
      <div>
        <select
          v-model="actionFilter"
          @change="loadLogs()"
          class="border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-900/80 text-white outline-none focus:border-midori-500 transition-colors cursor-pointer"
        >
          <option value="" class="bg-slate-900 text-slate-100">{{ t('common.allActions') }}</option>
          <option value="peer.connect" class="bg-slate-900 text-slate-100">peer.connect</option>
          <option value="peer.disconnect" class="bg-slate-900 text-slate-100">peer.disconnect</option>
          <option value="peer.cleanup" class="bg-slate-900 text-slate-100">peer.cleanup</option>
          <option value="admin.server.create" class="bg-slate-900 text-slate-100">admin.server.create</option>
          <option value="admin.server.update" class="bg-slate-900 text-slate-100">admin.server.update</option>
          <option value="admin.server.delete" class="bg-slate-900 text-slate-100">admin.server.delete</option>
          <option value="admin.user.create" class="bg-slate-900 text-slate-100">admin.user.create</option>
          <option value="admin.user.ban" class="bg-slate-900 text-slate-100">admin.user.ban</option>
          <option value="admin.peer.disconnect" class="bg-slate-900 text-slate-100">admin.peer.disconnect</option>
        </select>
      </div>
    </div>

    <div v-if="loadError" class="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-sm text-rose-300 flex items-center justify-between">
      <span>{{ loadError }}</span>
      <button @click="loadLogs()" class="text-xs underline ml-3 font-semibold">{{ t('common.retry') }}</button>
    </div>

    <div v-if="loading && logs.length === 0" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-midori-500"></div>
    </div>

    <div v-else-if="logs.length === 0" class="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
      {{ t('adminAudit.empty') }}
    </div>

    <div v-else class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="px-6 py-4">{{ t('common.date') }}</th>
            <th class="px-6 py-4">{{ t('auditView.action') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('common.user') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('auditView.ip') }}</th>
            <th class="px-6 py-4 hidden lg:table-cell">{{ t('common.details') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-800/50 transition-colors">
            <td class="px-6 py-4 text-slate-400 whitespace-nowrap text-xs font-mono">
              {{ formatDateTime(log.created_at) }}
            </td>
            <td class="px-6 py-4">
              <span :class="actionColor(log.action)" class="text-xs font-semibold px-2.5 py-1 rounded-full border">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-4 hidden md:table-cell text-xs font-medium text-slate-300">
              {{ log.user_email || (log.user_id ? log.user_id.slice(0, 8) + '…' : t('common.system')) }}
            </td>
            <td class="px-6 py-4 font-mono text-midori-300 hidden md:table-cell text-xs">{{ log.ip_address }}</td>
            <td class="px-6 py-4 text-xs text-slate-400 hidden lg:table-cell font-mono max-w-xs truncate">
              {{ JSON.stringify(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="hasMore" class="px-6 py-4 border-t border-slate-800 text-center">
        <button
          @click="loadMoreLogs"
          :disabled="loading"
          class="text-sm font-semibold text-midori-400 hover:text-midori-300 disabled:opacity-50 cursor-pointer"
        >
          {{ loading ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>
