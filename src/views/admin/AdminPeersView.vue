<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import { LifecycleStatusSchema } from '../../lib/schemas'
import type { AdminPeer } from '../../lib/schemas'
import AsyncState from '../../components/AsyncState.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import { beginResourceLoad, completeResourceLoad, type ResourceState } from '../../lib/resource-state'

const peers = ref<AdminPeer[]>([])
const peersState = ref<ResourceState>('idle')
const disconnectingID = ref('')
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const { t } = useLocale()

onMounted(() => loadPeers())

async function loadPeers() {
  peersState.value = beginResourceLoad(peers.value.length > 0 || peersState.value === 'empty')
  try {
    peers.value = (await api.get<AdminPeer[]>('/api/v1/admin/peers')) || []
    peersState.value = completeResourceLoad(peers.value.length > 0)
  } catch {
    peersState.value = 'error'
  }
}

async function forceDisconnect(id: string) {
  if (!confirm(t('adminPeers.forceDisconnectConfirm'))) return
  disconnectingID.value = id
  feedback.value = null
  try {
    const outcome = await api.validated(`/api/v1/admin/peers/${id}`, LifecycleStatusSchema, { method: 'DELETE' })
    await loadPeers()
    feedback.value = outcome.status === 'disconnect_pending'
      ? { kind: 'error', message: t('adminPeers.disconnectPending') }
      : { kind: 'success', message: t('adminPeers.disconnectSuccess') }
  } catch {
    feedback.value = { kind: 'error', message: t('adminPeers.disconnectError') }
  } finally {
    disconnectingID.value = ''
  }
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return t('common.unavailable')
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminPeers.title') }}</h1>
      <p class="text-sm text-slate-400 mt-1">{{ t('adminPeers.subtitle') }}</p>
    </div>

    <div
      v-if="feedback"
      :role="feedback.kind === 'error' ? 'alert' : 'status'"
      class="rounded-2xl border p-4 text-sm"
      :class="feedback.kind === 'error' ? 'border-rose-800/50 bg-rose-950/40 text-rose-300' : 'border-midori-800/50 bg-midori-950/40 text-midori-300'"
    >
      {{ feedback.message }}
    </div>

    <ResourceSkeleton v-if="peersState === 'idle' || peersState === 'loading'" :title="t('adminPeers.loading')" item-class="h-20" />
    <AsyncState v-else-if="peersState === 'error' && peers.length === 0" kind="error" :title="t('adminPeers.loadError')" :retry-label="t('common.retry')" @retry="loadPeers" />
    <AsyncState v-else-if="peersState === 'empty'" kind="empty" :title="t('adminPeers.empty')" />

    <div v-else class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
      <p v-if="peersState === 'refreshing'" role="status" class="border-b border-slate-800 px-6 py-3 text-xs text-slate-400">{{ t('common.refreshing') }}</p>
      <p v-else-if="peersState === 'error'" role="alert" class="border-b border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300">{{ t('common.refreshFailed') }}</p>
      <table class="w-full text-sm">
        <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="px-6 py-4">{{ t('common.device') }}</th>
            <th class="px-6 py-4">{{ t('common.ip') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('common.user') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('common.traffic') }}</th>
            <th class="px-6 py-4">{{ t('common.status') }}</th>
            <th class="px-6 py-4 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-for="p in peers" :key="p.id" class="hover:bg-slate-800/50 transition-colors">
            <td class="px-6 py-4 font-semibold text-white">{{ p.device_name || t('common.unavailable') }}</td>
            <td class="px-6 py-4 font-mono text-xs text-midori-300">{{ p.assigned_ip }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-slate-300">
              {{ p.user_email || t('common.unavailable') }}
            </td>
            <td class="px-6 py-4 hidden md:table-cell text-xs text-slate-400 font-mono">
              ↑{{ formatBytes(p.bytes_sent) }} · ↓{{ formatBytes(p.bytes_received) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="p.is_active ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
                class="text-xs font-semibold px-2.5 py-1 rounded-full border"
              >
                {{ p.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="p.is_active"
                type="button"
                class="px-2.5 py-1 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs font-medium text-rose-400 hover:bg-rose-900/40 transition cursor-pointer"
                :disabled="disconnectingID === p.id"
                :aria-busy="disconnectingID === p.id"
                @click="forceDisconnect(p.id)"
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
