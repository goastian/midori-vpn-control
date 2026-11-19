<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { AUTH_LOGOUT_EVENT } from '../stores/auth'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { beginResourceLoad, type ResourceState } from '../lib/resource-state'
import AsyncState from '../components/AsyncState.vue'
import ResourceSkeleton from '../components/ResourceSkeleton.vue'
import {
  DashboardSummarySchema,
  WebSocketStatsMessageSchema,
  type DashboardSummary,
} from '../lib/schemas'

const auth = useAuthStore()
const { t, formatDateTime } = useLocale()

const summary = ref<DashboardSummary | null>(null)
const summaryState = ref<ResourceState>('idle')
const websocketState = ref<ResourceState>('idle')
let ws: WebSocket | null = null
let unmounting = false

const dashboardLoading = computed(
  () => summary.value === null && ['idle', 'loading'].includes(summaryState.value),
)

const dashboardHasError = computed(() => summaryState.value === 'error')

const activePercent = computed(() => {
  if (!summary.value) return null
  if (!summary.value.registered_devices) return 0
  return Math.round((summary.value.connected_devices / summary.value.registered_devices) * 100)
})
const activeStroke = computed(() => `${((activePercent.value ?? 0) / 100) * 301.6} 301.6`)

const dashboardCards = computed(() => {
  const snapshot = summary.value
  if (!snapshot) return []
  const cards = [
    {
      title: t('dashboard.cards.registeredDevices'),
      value: String(snapshot.registered_devices),
      subtitle: t('dashboard.cards.registeredDevicesDetail'),
      tone: 'emerald',
    },
    {
      title: t('dashboard.cards.connectedDevices'),
      value: String(snapshot.connected_devices),
      subtitle: t('dashboard.cards.connectedDevicesDetail'),
      tone: 'midori',
    },
    {
      title: t('dashboard.cards.availableSlots'),
      value: `${snapshot.available_devices} / ${snapshot.max_devices}`,
      subtitle: t('quota.plan', { name: snapshot.plan_name }),
      tone: 'violet',
    },
    {
      title: t('dashboard.cards.networkUsage'),
      value: formatBytes(snapshot.traffic.bytes_sent + snapshot.traffic.bytes_received),
      subtitle: `↑${formatBytes(snapshot.traffic.bytes_sent)} / ↓${formatBytes(snapshot.traffic.bytes_received)}`,
      tone: 'cyan',
    },
  ]

  if (snapshot.infrastructure) {
    const stats = snapshot.infrastructure
    cards.unshift(
      {
        title: t('common.users'),
        value: String(stats.total_users),
        subtitle: t('common.registeredAccounts'),
        tone: 'amber',
      },
      {
        title: t('common.servers'),
        value: `${stats.active_servers} / ${stats.total_servers}`,
        subtitle: t('dashboard.cards.infrastructureServers'),
        tone: 'rose',
      },
    )
  }

  return cards
})

const adminStats = computed(() => summary.value?.infrastructure ?? null)

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return t('common.unavailable')
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function loadDashboard() {
  summaryState.value = beginResourceLoad(summary.value !== null)
  try {
    const nextSummary = await api.validated(
      '/api/v1/control/dashboard/summary',
      DashboardSummarySchema,
    )
    if (auth.isAdmin && !nextSummary.infrastructure) {
      throw new Error('Administrator dashboard summary omitted infrastructure')
    }
    summary.value = nextSummary
    summaryState.value = 'ready'
  } catch {
    summaryState.value = 'error'
  }
}

function connectWebSocket() {
  websocketState.value = 'loading'
  try {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      websocketState.value = 'ready'
      ws?.send(JSON.stringify({ token: auth.accessToken }))
    }
    ws.onmessage = (event) => {
      let payload: unknown
      try {
        payload = JSON.parse(event.data)
      } catch {
        websocketState.value = 'error'
        return
      }
      const parsed = WebSocketStatsMessageSchema.safeParse(payload)
      if (!parsed.success) {
        websocketState.value = 'error'
        return
      }
      if (!auth.isAdmin || !summary.value) return
      summary.value = {
        ...summary.value,
        infrastructure: parsed.data.data,
      }
    }
    ws.onerror = () => {
      websocketState.value = 'error'
    }
    ws.onclose = () => {
      if (!unmounting) websocketState.value = 'error'
    }
  } catch {
    websocketState.value = 'error'
  }
}

onMounted(async () => {
  await loadDashboard()
  if (auth.isAdmin) connectWebSocket()
})

onUnmounted(() => {
  unmounting = true
  ws?.close(1000, 'unmount')
  window.removeEventListener(AUTH_LOGOUT_EVENT, closeWsForLogout)
})

function closeWsForLogout() {
  // Close the WebSocket cleanly before the auth store redirects to the IdP
  // end-session endpoint, so the server-side connection — still authenticated
  // with the access_token — is not left lingering during the redirect.
  try {
    ws?.close(1000, 'logout')
  } catch {
    /* already closed */
  }
  ws = null
  websocketState.value = 'idle'
}
window.addEventListener(AUTH_LOGOUT_EVENT, closeWsForLogout)
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-intro">
      <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-midori-700 dark:text-midori-400"
          >
            {{ t('dashboard.eyebrow') }}
          </p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {{ t('dashboard.title') }}
          </h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {{ t('dashboard.subtitle') }}
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            class="rounded-2xl border border-slate-700/60 bg-slate-100 dark:bg-slate-800/80 px-4 py-3 shadow-inner"
          >
            <p class="text-xs text-slate-600 dark:text-slate-400">
              {{ t('common.sessionActive') }}
            </p>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ auth.user?.email || t('common.unavailable') }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-midori-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :disabled="summaryState === 'loading' || summaryState === 'refreshing'"
            @click="loadDashboard"
          >
            {{ summaryState === 'refreshing' ? t('common.refreshing') : t('dashboard.refresh') }}
          </button>
        </div>
      </div>
    </section>

    <ResourceSkeleton
      v-if="dashboardLoading"
      :title="t('common.loading')"
      :count="auth.isAdmin ? 6 : 4"
      item-class="h-36"
    />

    <template v-else>
      <p
        v-if="dashboardHasError && summary"
        role="alert"
        class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
      >
        {{ t('resourceStatus.dashboardError') }}
      </p>
      <p
        v-else-if="summaryState === 'refreshing'"
        role="status"
        class="text-sm text-slate-600 dark:text-slate-400"
      >
        {{ t('common.refreshing') }}
      </p>
      <section class="desktop-download grain-surface">
        <p class="eyebrow">{{ t('dashboard.desktopDownload.eyebrow') }}</p>
        <h2>{{ t('dashboard.desktopDownload.title') }}</h2>
        <p class="desktop-download-description">{{ t('dashboard.desktopDownload.subtitle') }}</p>
        <a href="/download" class="vpn-text-link">{{ t('landing.footerDownload') }}</a>
      </section>

      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <article
          v-for="card in dashboardCards"
          :key="card.title"
          class="dashboard-metric rounded-2xl p-5 transition hover:-translate-y-0.5"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400"
          >
            {{ card.title }}
          </p>
          <p class="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">{{ card.subtitle }}</p>
        </article>
      </section>

      <section v-if="summary" class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article
          class="rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl xl:col-span-2"
        >
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ t('dashboard.aggregateTraffic') }}
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            {{ t('dashboard.aggregateTrafficSubtitle') }}
          </p>
          <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-5"
            >
              <p
                class="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400"
              >
                {{ t('common.total') }}
              </p>
              <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {{ formatBytes(summary.traffic.bytes_sent + summary.traffic.bytes_received) }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-5"
            >
              <p
                class="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400"
              >
                {{ t('dashboard.sentTraffic') }}
              </p>
              <p class="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                {{ formatBytes(summary.traffic.bytes_sent) }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-5"
            >
              <p
                class="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400"
              >
                {{ t('dashboard.receivedTraffic') }}
              </p>
              <p class="mt-2 text-2xl font-bold text-midori-700 dark:text-midori-300">
                {{ formatBytes(summary.traffic.bytes_received) }}
              </p>
            </div>
          </div>
        </article>

        <article
          class="rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
        >
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ t('dashboard.deviceStatus') }}
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {{ t('dashboard.deviceStatusSubtitle') }}
          </p>
          <div class="mt-6 flex items-center justify-center">
            <div class="relative">
              <svg viewBox="0 0 120 120" class="h-44 w-44 -rotate-90" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="currentColor"
                  stroke-width="14"
                  fill="none"
                  class="text-slate-800"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="currentColor"
                  stroke-width="14"
                  fill="none"
                  class="text-midori-500"
                  stroke-linecap="round"
                  :stroke-dasharray="activeStroke"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p class="text-3xl font-bold text-slate-900 dark:text-white">
                  {{ activePercent }}%
                </p>
                <p class="text-xs uppercase tracking-[0.2em] text-midori-700 dark:text-midori-400">
                  {{ t('dashboard.connectedLabel') }}
                </p>
              </div>
            </div>
          </div>
          <div class="mt-4 space-y-2 text-sm">
            <div
              class="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5"
            >
              <span class="text-slate-600 dark:text-slate-300">{{
                t('dashboard.registeredLabel')
              }}</span>
              <span class="font-bold text-slate-900 dark:text-white">{{
                summary.registered_devices
              }}</span>
            </div>
            <div
              class="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5"
            >
              <span class="text-slate-600 dark:text-slate-300">{{
                t('dashboard.connectedLabel')
              }}</span>
              <span class="font-bold text-midori-700 dark:text-midori-400">{{
                summary.connected_devices
              }}</span>
            </div>
          </div>
        </article>
      </section>

      <AsyncState
        v-else
        kind="error"
        :title="t('resourceStatus.dashboardError')"
        :retry-label="t('common.retry')"
        @retry="loadDashboard"
      />

      <section
        v-if="summary"
        class="rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ t('dashboard.recentSessions') }}
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {{ t('dashboard.recentSessionsSubtitle') }}
            </p>
          </div>
          <span
            v-if="auth.isAdmin"
            class="text-xs font-semibold uppercase tracking-[0.2em]"
            :class="
              websocketState === 'ready'
                ? 'text-midori-700 dark:text-midori-400'
                : websocketState === 'error'
                  ? 'text-amber-300'
                  : 'text-slate-600 dark:text-slate-400'
            "
            >{{
              websocketState === 'ready'
                ? t('resourceStatus.realtimeLive')
                : websocketState === 'error'
                  ? t('resourceStatus.realtimeUnavailable')
                  : t('resourceStatus.realtimeConnecting')
            }}</span
          >
        </div>
        <div v-if="summary.recent_sessions.length" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div
            v-for="session in summary.recent_sessions"
            :key="session.id"
            class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-4 shadow-sm"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {{ session.device_name }}
                </p>
                <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {{ session.server_name }} · {{ session.protocol.toUpperCase() }}
                </p>
              </div>
              <span
                class="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                :class="
                  session.is_active
                    ? 'border-midori-700/50 bg-midori-950/60 text-midori-700 dark:text-midori-300'
                    : 'border-slate-700 bg-slate-800 text-slate-600 dark:text-slate-400'
                "
              >
                {{ session.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </div>
            <p class="mt-3 text-xs font-mono text-midori-700 dark:text-midori-300">
              {{ session.assigned_ip }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ formatDateTime(session.last_handshake ?? session.created_at) }} · ↑{{
                formatBytes(session.bytes_sent)
              }}
              · ↓{{ formatBytes(session.bytes_received) }}
            </p>
          </div>
        </div>
        <p
          v-else
          class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400"
        >
          {{ t('dashboard.noRecentConnections') }}
        </p>
      </section>

      <section
        v-if="auth.isAdmin && adminStats"
        class="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ t('dashboard.platformMetrics') }}
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('dashboard.platformMetricsSubtitle') }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-slate-500">{{ t('common.users') }}</p>
              <p class="font-semibold text-slate-800 dark:text-slate-100">
                {{ adminStats.total_users }}
              </p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-slate-500">{{ t('common.servers') }}</p>
              <p class="font-semibold text-slate-800 dark:text-slate-100">
                {{ adminStats.active_servers }}/{{ adminStats.total_servers }}
              </p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-slate-500">{{ t('common.peers') }}</p>
              <p class="font-semibold text-slate-800 dark:text-slate-100">
                {{ adminStats.active_peers }}/{{ adminStats.total_peers }}
              </p>
            </div>
            <div class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <p class="text-xs text-slate-500">{{ t('dashboard.globalTraffic') }}</p>
              <p class="font-semibold text-slate-800 dark:text-slate-100">
                ↑{{ formatBytes(adminStats.total_bytes_sent) }} ↓{{
                  formatBytes(adminStats.total_bytes_received)
                }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
