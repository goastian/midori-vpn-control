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
  <div class="space-y-6">
    <router-link to="/admin/users" class="inline-flex items-center gap-2 text-sm font-semibold text-midori-400 hover:text-midori-300 transition-colors">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      <span>{{ t('adminUserDetail.back') }}</span>
    </router-link>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-midori-500"></div>
    </div>

    <template v-else-if="user">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-white">{{ user.email }}</h1>
          <p class="text-sm text-slate-400 mt-1">Detalles de cuenta y túneles activos asociados</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl space-y-4">
          <h2 class="text-xl font-bold text-white">{{ t('adminUserDetail.info') }}</h2>
          <dl class="space-y-3 text-sm divide-y divide-slate-800/60">
            <div class="flex justify-between pt-2"><dt class="text-slate-400 font-medium">{{ t('common.name') }}</dt><dd class="text-white font-semibold">{{ user.display_name || '—' }}</dd></div>
            <div class="flex justify-between pt-3"><dt class="text-slate-400 font-medium">{{ t('common.groups') }}</dt><dd class="text-white">{{ user.groups?.join(', ') || '—' }}</dd></div>
            <div class="flex justify-between pt-3"><dt class="text-slate-400 font-medium">{{ t('adminUserDetail.registered') }}</dt><dd class="text-slate-300 font-mono text-xs">{{ formatDate(user.created_at) }}</dd></div>
            <div class="flex justify-between pt-3">
              <dt class="text-slate-400 font-medium">{{ t('common.status') }}</dt>
              <dd>
                <span v-if="user.is_banned" class="text-rose-400 font-semibold bg-rose-950/60 border border-rose-800/50 px-2.5 py-0.5 rounded-full text-xs">{{ t('adminUserDetail.bannedWithReason', { reason: user.ban_reason || '—' }) }}</span>
                <span v-else class="text-midori-300 font-semibold bg-midori-950/60 border border-midori-700/50 px-2.5 py-0.5 rounded-full text-xs">{{ t('common.active') }}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
        <div class="px-6 py-4 border-b border-slate-800">
          <h2 class="text-lg font-bold text-white">{{ t('adminUserDetail.activePeers', { count: peers.length }) }}</h2>
        </div>
        <div v-if="peers.length === 0" class="px-6 py-12 text-center text-slate-400 text-sm">{{ t('adminUserDetail.noPeers') }}</div>
        <table v-else class="w-full text-sm">
          <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">{{ t('common.device') }}</th>
              <th class="px-6 py-4">{{ t('common.ip') }}</th>
              <th class="px-6 py-4">{{ t('common.traffic') }}</th>
              <th class="px-6 py-4 text-right">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr v-for="p in peers" :key="p.id" class="hover:bg-slate-800/50 transition-colors">
              <td class="px-6 py-4 font-semibold text-white">{{ p.device_name || '—' }}</td>
              <td class="px-6 py-4 font-mono text-midori-300 text-xs">{{ p.assigned_ip }}</td>
              <td class="px-6 py-4 text-xs font-mono text-slate-400">↑{{ formatBytes(p.bytes_sent) }} · ↓{{ formatBytes(p.bytes_received) }}</td>
              <td class="px-6 py-4 text-right">
                <span
                  :class="p.is_active ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
                  class="text-xs font-semibold px-2.5 py-1 rounded-full border"
                >
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
