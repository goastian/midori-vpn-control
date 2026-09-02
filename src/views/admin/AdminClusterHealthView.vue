<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AsyncState from '../../components/AsyncState.vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'

interface HealthCheck {
  status: string
  latency_ms?: number
  interface?: string
}

interface HealthResponse {
  status: string
  checks: {
    postgres?: HealthCheck
    wireguard?: HealthCheck
    redis?: HealthCheck
  }
}

interface HealthEnvelope {
  ok: boolean
  data?: HealthResponse
}

const { t, formatDate } = useLocale()
const healthData = ref<HealthResponse | null>(null)
const loading = ref(false)
const failed = ref(false)
const lastChecked = ref('')

function statusLabel(status?: string) {
  return status === 'ok' ? t('clusterHealth.statusOk') : t('clusterHealth.statusError')
}

function statusClass(status?: string) {
  return status === 'ok'
    ? 'bg-midori-950/60 border-midori-700/50 text-midori-300'
    : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
}

async function fetchHealth() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    // The protected readiness endpoint intentionally returns HTTP 503 with an
    // ok envelope when dependencies are degraded. Preserve that useful body.
    const response = await api.fetchRaw('/api/v1/admin/health')
    const envelope = await response.json() as HealthEnvelope
    if (!envelope.ok || !envelope.data) throw new Error('invalid health response')
    healthData.value = envelope.data
    lastChecked.value = formatDate(new Date(), { timeStyle: 'medium' })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchHealth)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('clusterHealth.title') }}</h1>
        <p class="mt-1 text-sm text-slate-400">{{ t('clusterHealth.subtitle') }}</p>
      </div>
      <button
        type="button"
        :disabled="loading"
        :aria-busy="loading"
        class="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        @click="fetchHealth"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
        {{ loading ? t('clusterHealth.refreshing') : t('clusterHealth.refresh') }}
      </button>
    </div>

    <AsyncState
      v-if="loading && !healthData"
      kind="loading"
      :title="t('clusterHealth.loadingTitle')"
      :detail="t('clusterHealth.loadingDetail')"
    />

    <AsyncState
      v-else-if="failed"
      kind="error"
      :title="t('clusterHealth.errorTitle')"
      :detail="t('clusterHealth.errorDetail')"
      :retry-label="t('common.retry')"
      @retry="fetchHealth"
    />

    <template v-else-if="healthData">
      <div
        role="status"
        :class="[
          'flex flex-col gap-3 rounded-3xl border p-5 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between',
          healthData.status === 'ready'
            ? 'border-midori-700/50 bg-midori-950/40 text-midori-200'
            : 'border-amber-700/50 bg-amber-950/40 text-amber-200',
        ]"
      >
        <div class="flex items-center gap-3">
          <span :class="['h-3 w-3 rounded-full', healthData.status === 'ready' ? 'animate-pulse bg-midori-400' : 'bg-amber-400']" aria-hidden="true"></span>
          <span class="text-lg font-bold text-white">
            {{ t('clusterHealth.overall', { status: healthData.status === 'ready' ? t('clusterHealth.ready') : t('clusterHealth.degraded') }) }}
          </span>
        </div>
        <span class="font-mono text-xs text-slate-400">{{ t('clusterHealth.lastChecked', { time: lastChecked }) }}</span>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div class="glass-card space-y-4 p-6">
          <div class="flex items-center justify-between gap-3">
            <span class="text-base font-bold text-white">{{ t('clusterHealth.postgres') }}</span>
            <span :class="['rounded-full border px-2.5 py-1 text-xs font-semibold uppercase', statusClass(healthData.checks.postgres?.status)]">
              {{ statusLabel(healthData.checks.postgres?.status) }}
            </span>
          </div>
          <p class="font-mono text-xs text-slate-400">{{ t('clusterHealth.pingLatency') }}: <span class="text-midori-300">{{ healthData.checks.postgres?.latency_ms ?? 0 }} ms</span></p>
        </div>

        <div class="glass-card space-y-4 p-6">
          <div class="flex items-center justify-between gap-3">
            <span class="text-base font-bold text-white">{{ t('clusterHealth.wireguard') }}</span>
            <span :class="['rounded-full border px-2.5 py-1 text-xs font-semibold uppercase', statusClass(healthData.checks.wireguard?.status)]">
              {{ statusLabel(healthData.checks.wireguard?.status) }}
            </span>
          </div>
          <p class="font-mono text-xs text-slate-400">{{ t('clusterHealth.interface') }}: <span class="text-cyan-300">{{ healthData.checks.wireguard?.interface || t('clusterHealth.unavailable') }}</span></p>
        </div>

        <div class="glass-card space-y-4 p-6">
          <div class="flex items-center justify-between gap-3">
            <span class="text-base font-bold text-white">{{ t('clusterHealth.redis') }}</span>
            <span :class="['rounded-full border px-2.5 py-1 text-xs font-semibold uppercase', statusClass(healthData.checks.redis?.status)]">
              {{ statusLabel(healthData.checks.redis?.status) }}
            </span>
          </div>
          <p class="font-mono text-xs text-slate-400">{{ t('clusterHealth.pingLatency') }}: <span class="text-midori-300">{{ healthData.checks.redis?.latency_ms ?? 0 }} ms</span></p>
        </div>
      </div>
    </template>
  </div>
</template>
