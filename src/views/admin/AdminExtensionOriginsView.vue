<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import { ExtensionOriginListSchema, type ExtensionOrigin } from '../../lib/schemas'
import AsyncState from '../../components/AsyncState.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import {
  beginResourceLoad,
  completeResourceLoad,
  type ResourceState,
} from '../../lib/resource-state'

const origins = ref<ExtensionOrigin[]>([])
const originsState = ref<ResourceState>('idle')
const updatingID = ref('')
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const { t, formatDateTime } = useLocale()

function browserName(origin: string): string {
  return origin.startsWith('moz-extension://')
    ? t('adminExtensions.firefox')
    : t('adminExtensions.chromium')
}

async function loadOrigins() {
  originsState.value = beginResourceLoad(origins.value.length > 0 || originsState.value === 'empty')
  try {
    origins.value = await api.validated(
      '/api/v1/admin/trusted-extension-origins',
      ExtensionOriginListSchema,
    )
    originsState.value = completeResourceLoad(origins.value.length > 0)
  } catch {
    originsState.value = 'error'
  }
}

async function toggleOrigin(origin: ExtensionOrigin) {
  const nextRevoked = !origin.revoked
  if (
    !window.confirm(
      t(nextRevoked ? 'adminExtensions.revokeConfirm' : 'adminExtensions.restoreConfirm'),
    )
  )
    return

  updatingID.value = origin.id
  feedback.value = null
  try {
    await api.put(`/api/v1/admin/trusted-extension-origins/${origin.id}`, { revoked: nextRevoked })
    origin.revoked = nextRevoked
    origin.updated_at = new Date().toISOString()
    feedback.value = {
      kind: 'success',
      message: t(nextRevoked ? 'adminExtensions.revokeSuccess' : 'adminExtensions.restoreSuccess'),
    }
  } catch {
    feedback.value = { kind: 'error', message: t('adminExtensions.updateError') }
  } finally {
    updatingID.value = ''
  }
}

onMounted(loadOrigins)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">
          {{ t('adminExtensions.title') }}
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-400">{{ t('adminExtensions.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-midori-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-midori-500 disabled:opacity-50"
        :disabled="originsState === 'loading' || originsState === 'refreshing'"
        :aria-busy="originsState === 'loading' || originsState === 'refreshing'"
        @click="loadOrigins"
      >
        {{ t('adminExtensions.refresh') }}
      </button>
    </div>

    <div
      v-if="feedback"
      :role="feedback.kind === 'error' ? 'alert' : 'status'"
      class="rounded-2xl border p-4 text-sm"
      :class="
        feedback.kind === 'error'
          ? 'border-rose-800/50 bg-rose-950/40 text-rose-300'
          : 'border-midori-800/50 bg-midori-950/40 text-midori-300'
      "
    >
      {{ feedback.message }}
    </div>

    <ResourceSkeleton
      v-if="originsState === 'idle' || originsState === 'loading'"
      :title="t('adminExtensions.loading')"
      item-class="h-20"
    />
    <AsyncState
      v-else-if="originsState === 'error' && origins.length === 0"
      kind="error"
      :title="t('adminExtensions.loadError')"
      :retry-label="t('common.retry')"
      @retry="loadOrigins"
    />
    <AsyncState
      v-else-if="originsState === 'empty'"
      kind="empty"
      :title="t('adminExtensions.empty')"
    />

    <div
      v-else
      class="overflow-x-auto rounded-3xl border border-slate-800/80 bg-slate-900/80 shadow-xl shadow-black/30"
    >
      <p
        v-if="originsState === 'refreshing'"
        role="status"
        class="border-b border-slate-800 px-6 py-3 text-xs text-slate-400"
      >
        {{ t('common.refreshing') }}
      </p>
      <p
        v-else-if="originsState === 'error'"
        role="alert"
        class="border-b border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <table class="w-full text-sm">
        <thead
          class="border-b border-slate-800 bg-slate-950/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          <tr>
            <th class="px-6 py-4">{{ t('adminExtensions.origin') }}</th>
            <th class="px-6 py-4">{{ t('adminExtensions.browser') }}</th>
            <th class="hidden px-6 py-4 lg:table-cell">{{ t('adminExtensions.firstSeen') }}</th>
            <th class="hidden px-6 py-4 md:table-cell">{{ t('adminExtensions.lastSeen') }}</th>
            <th class="px-6 py-4">{{ t('common.status') }}</th>
            <th class="px-6 py-4 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr
            v-for="origin in origins"
            :key="origin.id"
            class="transition-colors hover:bg-slate-800/50"
          >
            <td class="max-w-sm break-all px-6 py-4 font-mono text-xs text-midori-300">
              {{ origin.origin }}
            </td>
            <td class="px-6 py-4 text-slate-300">{{ browserName(origin.origin) }}</td>
            <td class="hidden whitespace-nowrap px-6 py-4 text-xs text-slate-400 lg:table-cell">
              {{ formatDateTime(origin.created_at) }}
            </td>
            <td class="hidden whitespace-nowrap px-6 py-4 text-xs text-slate-400 md:table-cell">
              {{ formatDateTime(origin.updated_at) }}
            </td>
            <td class="px-6 py-4">
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                :class="
                  origin.revoked
                    ? 'border-rose-700/50 bg-rose-950/60 text-rose-300'
                    : 'border-midori-700/50 bg-midori-950/60 text-midori-300'
                "
              >
                {{ t(origin.revoked ? 'adminExtensions.revoked' : 'adminExtensions.trusted') }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                type="button"
                class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50"
                :class="
                  origin.revoked
                    ? 'border-midori-700/50 text-midori-300 hover:bg-midori-950/50'
                    : 'border-rose-700/50 text-rose-300 hover:bg-rose-950/50'
                "
                :disabled="updatingID === origin.id"
                :aria-busy="updatingID === origin.id"
                @click="toggleOrigin(origin)"
              >
                {{ t(origin.revoked ? 'adminExtensions.restore' : 'adminExtensions.revoke') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
