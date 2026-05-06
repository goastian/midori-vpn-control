<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import type { AuditLog } from '../lib/schemas'

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const loadError = ref('')
const { t, formatDateTime } = useLocale()

onMounted(async () => {
  try {
    logs.value = (await api.get<AuditLog[]>('/api/v1/control/audit-logs')) || []
  } catch (e: any) {
    loadError.value = e.message ?? 'Failed to load audit logs'
  } finally {
    loading.value = false
  }
})

function actionLabel(action: string): string {
  const label = t(`auditView.actions.${action}`)
  return label === `auditView.actions.${action}` ? action : label
}

function actionColor(action: string): string {
  if (action.includes('connect') && !action.includes('disconnect')) return 'bg-green-100 text-green-700'
  if (action.includes('disconnect') || action.includes('delete') || action.includes('ban')) return 'bg-red-100 text-red-600'
  if (action.includes('create')) return 'bg-blue-100 text-blue-700'
  if (action.includes('cleanup')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

function safeMetadata(metadata: Record<string, any>): string {
  try {
    const safe: Record<string, string> = {}
    for (const [key, value] of Object.entries(metadata)) {
      safe[String(key).slice(0, 64)] = String(value).slice(0, 256)
    }
    return JSON.stringify(safe)
  } catch {
    return '{}'
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('auditView.title') }}</h1>

    <div v-if="loadError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
      {{ loadError }}
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('auditView.empty') }}
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">{{ t('common.date') }}</th>
            <th class="px-6 py-3">{{ t('auditView.action') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('auditView.ip') }}</th>
            <th class="px-6 py-3 hidden lg:table-cell">{{ t('common.details') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <td class="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {{ formatDateTime(log.created_at) }}
            </td>
            <td class="px-6 py-4">
              <span :class="actionColor(log.action)" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 hidden md:table-cell">{{ log.ip_address }}</td>
            <td class="px-6 py-4 text-xs text-gray-400 dark:text-gray-500 hidden lg:table-cell font-mono">
              {{ safeMetadata(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
