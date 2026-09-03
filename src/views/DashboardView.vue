<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { AUTH_LOGOUT_EVENT } from '../stores/auth'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { detectDesktopEnvironment } from '../lib/platform'
import { beginResourceLoad, completeResourceLoad, type ResourceState } from '../lib/resource-state'
import AsyncState from '../components/AsyncState.vue'
import ResourceSkeleton from '../components/ResourceSkeleton.vue'
import {
  AdminStatsSchema,
  ConnectionListSchema,
  WebSocketStatsMessageSchema,
  type AdminStats,
  type Connection,
} from '../lib/schemas'
import type { DesktopPlatform, LinuxPackageFormat, DetectionConfidence } from '../lib/platform'

type DesktopDownload = {
  key: string
  label: string
  filename: string
  hintKey: string
  primary?: boolean
  visible?: boolean
}

const auth = useAuthStore()
const { t, formatDateTime, formatWeekdayShort } = useLocale()

const connections = ref<Connection[]>([])
const adminStats = ref<AdminStats | null>(null)
const connectionsState = ref<ResourceState>('idle')
const adminStatsState = ref<ResourceState>('idle')
const websocketState = ref<ResourceState>('idle')
const hasConnectionSnapshot = ref(false)
let ws: WebSocket | null = null
let unmounting = false

const dashboardLoading = computed(
  () =>
    connectionsState.value === 'idle' ||
    connectionsState.value === 'loading' ||
    auth.quotaState === 'idle' ||
    auth.quotaState === 'loading' ||
    (auth.isAdmin && (adminStatsState.value === 'idle' || adminStatsState.value === 'loading')),
)

const dashboardHasError = computed(
  () =>
    connectionsState.value === 'error' ||
    auth.quotaState === 'error' ||
    (auth.isAdmin && adminStatsState.value === 'error'),
)

const desktopReleaseBase = 'https://github.com/goastian/midori-vpn-desktop/releases/latest/download'
const detectedDesktopPlatform = ref<DesktopPlatform>('unknown')
const detectedDesktopArchitecture = ref('unknown')
const detectedLinuxPackageFormat = ref<LinuxPackageFormat>('unknown')
const detectedConfidence = ref<DetectionConfidence>('unknown')

const connectionTotals = computed(() => {
  const active = connections.value.filter((c) => c.is_active).length
  const inactive = Math.max(connections.value.length - active, 0)
  return {
    total: connections.value.length,
    active,
    inactive,
  }
})

const activePercent = computed(() => {
  if (!hasConnectionSnapshot.value) return null
  if (!connectionTotals.value.total) return 0
  return Math.round((connectionTotals.value.active / connectionTotals.value.total) * 100)
})

const dashboardCards = computed(() => {
  const quota = auth.userQuota
  const cards = [
    {
      title: t('dashboard.cards.activeConnections'),
      value: quota ? `${quota.connected_devices} / ${quota.max_devices}` : t('common.unavailable'),
      subtitle: quota
        ? `${t('quota.available', { count: quota.available_devices })} · ${t('quota.plan', { name: quota.plan_name })}`
        : t('common.unavailable'),
      tone: 'emerald',
    },
    {
      title: t('dashboard.cards.networkUsage'),
      value: hasConnectionSnapshot.value
        ? formatBytes(totalTransferredBytes.value)
        : t('common.unavailable'),
      subtitle: hasConnectionSnapshot.value
        ? `↑${formatBytes(totalSentBytes.value)} / ↓${formatBytes(totalReceivedBytes.value)}`
        : t('common.unavailable'),
      tone: 'cyan',
    },
    {
      title: t('dashboard.cards.currentStatus'),
      value: activePercent.value === null ? t('common.unavailable') : `${activePercent.value}%`,
      subtitle: t('common.peersConnected'),
      tone: 'violet',
    },
  ]

  if (auth.isAdmin) {
    const stats = adminStats.value
    cards.unshift(
      {
        title: t('common.users'),
        value: stats ? String(stats.total_users) : t('common.unavailable'),
        subtitle: t('common.registeredAccounts'),
        tone: 'midori',
      },
      {
        title: t('common.servers'),
        value: stats ? String(stats.active_servers) : t('common.unavailable'),
        subtitle: stats
          ? t('common.available', { count: stats.total_servers })
          : t('common.unavailable'),
        tone: 'amber',
      },
      {
        title: t('common.peers'),
        value: stats ? String(stats.active_peers) : t('common.unavailable'),
        subtitle: stats
          ? t('common.provisioned', { count: stats.total_peers })
          : t('common.unavailable'),
        tone: 'rose',
      },
    )
  }

  return cards
})

const totalSentBytes = computed(() =>
  connections.value.reduce((sum, conn) => sum + conn.bytes_sent, 0),
)
const totalReceivedBytes = computed(() =>
  connections.value.reduce((sum, conn) => sum + conn.bytes_received, 0),
)
const totalTransferredBytes = computed(() => totalSentBytes.value + totalReceivedBytes.value)

const trafficByDay = computed(() => {
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - i))
    date.setHours(0, 0, 0, 0)
    return {
      key: date.toISOString().slice(0, 10),
      label: formatWeekdayShort(date),
      value: 0,
    }
  })

  const map = new Map(days.map((d) => [d.key, d]))

  for (const conn of connections.value) {
    const key = conn.created_at.slice(0, 10)
    const bucket = map.get(key)
    if (!bucket) continue
    bucket.value += conn.bytes_sent + conn.bytes_received
  }

  return days
})

const maxTrafficDay = computed(() => Math.max(...trafficByDay.value.map((d) => d.value), 1))

const trafficSparkline = computed(() => {
  const values = trafficByDay.value.map((d) => d.value)
  const max = Math.max(...values, 1)
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 100 - (value / max) * 100
      return `${x},${y}`
    })
    .join(' ')
})

const deviceUsage = computed(() => {
  const deviceMap = new Map<string, { device: string; total: number; active: number }>()

  for (const conn of connections.value) {
    const name = (conn.device_name || t('common.noNamedDevice')).trim() || t('common.noNamedDevice')
    const current = deviceMap.get(name) || { device: name, total: 0, active: 0 }
    current.total += conn.bytes_sent + conn.bytes_received
    if (conn.is_active) current.active += 1
    deviceMap.set(name, current)
  }

  return Array.from(deviceMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

const mostUsedDeviceBytes = computed(() => Math.max(...deviceUsage.value.map((d) => d.total), 1))

const desktopDownloads = computed<DesktopDownload[]>(() => {
  const platform = detectedDesktopPlatform.value
  const architecture = detectedDesktopArchitecture.value
  const linuxPackageFormat = detectedLinuxPackageFormat.value
  // Only mark a primary when confidence is 'detected' — avoids false recommendations.
  const canRecommend = detectedConfidence.value === 'detected'

  if (platform === 'windows') {
    return [
      {
        key: 'windows',
        label: t('dashboard.desktopDownload.actions.windows'),
        filename: 'MidoriVPN-windows-x64.msi',
        hintKey: 'dashboard.desktopDownload.hints.windows',
        primary: canRecommend,
      },
    ]
  }

  if (platform === 'linux') {
    return [
      {
        key: 'linux-rpm',
        label: t('dashboard.desktopDownload.actions.linuxRpm'),
        filename: 'MidoriVPN-linux-x64.rpm',
        hintKey: 'dashboard.desktopDownload.hints.linuxRpm',
        primary: canRecommend && linuxPackageFormat === 'rpm',
      },
      {
        key: 'linux-deb',
        label: t('dashboard.desktopDownload.actions.linuxDeb'),
        filename: 'MidoriVPN-linux-x64.deb',
        hintKey: 'dashboard.desktopDownload.hints.linuxDeb',
        primary: canRecommend && linuxPackageFormat === 'deb',
      },
      {
        key: 'linux-appimage',
        label: t('dashboard.desktopDownload.actions.linuxAppImage'),
        filename: 'MidoriVPN-linux-x64.AppImage',
        hintKey: 'dashboard.desktopDownload.hints.linuxAppImage',
      },
    ]
  }

  if (platform === 'macos') {
    return [
      {
        key: 'macos-arm64',
        label: t('dashboard.desktopDownload.actions.macosArm'),
        filename: 'MidoriVPN-macos-arm64.dmg',
        hintKey: 'dashboard.desktopDownload.hints.macosArm',
        primary: canRecommend && architecture === 'arm64',
      },
      {
        key: 'macos-x64',
        label: t('dashboard.desktopDownload.actions.macosIntel'),
        filename: 'MidoriVPN-macos-x64.dmg',
        hintKey: 'dashboard.desktopDownload.hints.macosIntel',
        primary: canRecommend && architecture === 'x64',
      },
    ]
  }

  // unknown platform — show all options without recommendation
  return [
    {
      key: 'windows',
      label: t('dashboard.desktopDownload.actions.windows'),
      filename: 'MidoriVPN-windows-x64.msi',
      hintKey: 'dashboard.desktopDownload.hints.windows',
    },
    {
      key: 'macos-arm64',
      label: t('dashboard.desktopDownload.actions.macosArm'),
      filename: 'MidoriVPN-macos-arm64.dmg',
      hintKey: 'dashboard.desktopDownload.hints.macosArm',
    },
    {
      key: 'macos-x64',
      label: t('dashboard.desktopDownload.actions.macosIntel'),
      filename: 'MidoriVPN-macos-x64.dmg',
      hintKey: 'dashboard.desktopDownload.hints.macosIntel',
    },
    {
      key: 'linux-rpm',
      label: t('dashboard.desktopDownload.actions.linuxRpm'),
      filename: 'MidoriVPN-linux-x64.rpm',
      hintKey: 'dashboard.desktopDownload.hints.linuxRpm',
    },
    {
      key: 'linux-deb',
      label: t('dashboard.desktopDownload.actions.linuxDeb'),
      filename: 'MidoriVPN-linux-x64.deb',
      hintKey: 'dashboard.desktopDownload.hints.linuxDeb',
    },
    {
      key: 'linux-appimage',
      label: t('dashboard.desktopDownload.actions.linuxAppImage'),
      filename: 'MidoriVPN-linux-x64.AppImage',
      hintKey: 'dashboard.desktopDownload.hints.linuxAppImage',
    },
  ]
})

const primaryDesktopDownload = computed(
  () => desktopDownloads.value.find((download) => download.primary) || null,
)

function desktopDownloadUrl(filename: string): string {
  return `${desktopReleaseBase}/${filename}`
}

function desktopPlatformLabel(platform: DesktopPlatform): string {
  switch (platform) {
    case 'windows':
      return t('dashboard.desktopDownload.platforms.windows')
    case 'macos':
      return t('dashboard.desktopDownload.platforms.macos')
    case 'linux':
      return t('dashboard.desktopDownload.platforms.linux')
    default:
      return t('dashboard.desktopDownload.platforms.unknown')
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

async function loadConnections() {
  connectionsState.value = beginResourceLoad(hasConnectionSnapshot.value)
  try {
    connections.value = await api.validated('/api/v1/control/connections', ConnectionListSchema)
    hasConnectionSnapshot.value = true
    connectionsState.value = completeResourceLoad(connections.value.length > 0)
  } catch {
    connectionsState.value = 'error'
  }
}

async function loadAdminStats() {
  adminStatsState.value = beginResourceLoad(adminStats.value !== null)
  try {
    adminStats.value = await api.validated('/api/v1/admin/dashboard/stats', AdminStatsSchema)
    adminStatsState.value = 'ready'
  } catch {
    adminStatsState.value = 'error'
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
      if (!auth.isAdmin) return
      adminStats.value = parsed.data.data
      adminStatsState.value = 'ready'
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
  const desktopEnvironment = await detectDesktopEnvironment()
  detectedDesktopPlatform.value = desktopEnvironment.platform
  detectedDesktopArchitecture.value = desktopEnvironment.architecture
  detectedLinuxPackageFormat.value = desktopEnvironment.linuxPackageFormat
  detectedConfidence.value = desktopEnvironment.confidence

  await Promise.all([
    loadConnections(),
    auth.fetchQuota(),
    auth.isAdmin ? loadAdminStats() : Promise.resolve(),
  ])

  connectWebSocket()
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
    <section
      class="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div
        class="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-midori-500/10 blur-2xl"
      ></div>
      <div
        class="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl"
      ></div>
      <div class="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-midori-400">
            {{ t('dashboard.eyebrow') }}
          </p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-white">
            {{ t('dashboard.title') }}
          </h1>
          <p class="mt-2 text-sm text-slate-400">{{ t('dashboard.subtitle') }}</p>
        </div>
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/80 px-4 py-3 shadow-inner">
          <p class="text-xs text-slate-400">{{ t('common.sessionActive') }}</p>
          <p class="text-sm font-semibold text-slate-200">
            {{ auth.user?.email || t('common.unavailable') }}
          </p>
        </div>
      </div>
    </section>

    <ResourceSkeleton
      v-if="dashboardLoading"
      :title="t('common.loading')"
      :count="auth.isAdmin ? 6 : 3"
      item-class="h-36"
    />

    <template v-else>
      <p
        v-if="dashboardHasError"
        role="alert"
        class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
      >
        {{ t('resourceStatus.dashboardError') }}
      </p>
      <p
        v-else-if="
          connectionsState === 'refreshing' ||
          auth.quotaState === 'refreshing' ||
          adminStatsState === 'refreshing'
        "
        role="status"
        class="text-sm text-slate-400"
      >
        {{ t('common.refreshing') }}
      </p>
      <section
        v-if="detectedConfidence !== 'mobile'"
        class="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] p-6 shadow-xl shadow-cyan-950/10 lg:p-8"
      >
        <div class="absolute right-0 top-0 h-56 w-56 rounded-full bg-midori-500/10 blur-3xl"></div>
        <div
          class="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"
        ></div>

        <div
          class="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px] xl:items-center"
        >
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
              {{ t('dashboard.desktopDownload.eyebrow') }}
            </p>
            <h2 class="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              {{ t('dashboard.desktopDownload.title') }}
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
              {{ t('dashboard.desktopDownload.subtitle') }}
            </p>

            <div
              class="mt-5 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-50 backdrop-blur"
            >
              <span class="mr-2 h-2.5 w-2.5 rounded-full bg-midori-400"></span>
              {{
                t('dashboard.desktopDownload.detected', {
                  platform: desktopPlatformLabel(detectedDesktopPlatform),
                })
              }}
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <a
                v-for="download in desktopDownloads"
                :key="download.key"
                :href="desktopDownloadUrl(download.filename)"
                target="_blank"
                rel="noreferrer"
                class="group inline-flex min-w-[220px] flex-1 items-center justify-between rounded-2xl border px-4 py-3 transition md:flex-none"
                :class="
                  download.primary
                    ? 'border-midori-400/40 bg-midori-500/12 text-white hover:bg-midori-500/18'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-white/10'
                "
              >
                <div>
                  <p class="text-sm font-semibold">{{ download.label }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ t(download.hintKey) }}</p>
                </div>
                <span
                  v-if="download.primary"
                  class="ml-4 shrink-0 rounded-full bg-midori-400/15 px-2.5 py-1 text-[11px] font-semibold text-midori-200"
                >
                  {{ t('dashboard.desktopDownload.recommendedBadge') }}
                </span>
              </a>
            </div>
          </div>

          <div
            v-if="primaryDesktopDownload"
            class="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 backdrop-blur-md"
          >
            <div
              class="rounded-[1.4rem] border border-midori-400/20 bg-gradient-to-br from-midori-500 via-midori-600 to-emerald-500 p-6 text-white shadow-lg shadow-midori-950/20"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-midori-100/90">
                {{ t('dashboard.desktopDownload.recommended') }}
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight">
                {{ primaryDesktopDownload.label }}
              </p>
              <p class="mt-2 text-sm leading-6 text-midori-50/90">
                {{ t(primaryDesktopDownload.hintKey) }}
              </p>

              <a
                :href="desktopDownloadUrl(primaryDesktopDownload.filename)"
                target="_blank"
                rel="noreferrer"
                class="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-base font-semibold text-midori-700 transition hover:bg-slate-100"
              >
                {{ t('dashboard.desktopDownload.primaryAction') }}
              </a>

              <div class="mt-4 rounded-2xl border border-white/15 bg-black/10 px-4 py-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-midori-100/70">Asset</p>
                <p class="mt-1 break-all text-xs font-mono text-white/90">
                  {{ primaryDesktopDownload.filename }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="relative z-10 mt-5 flex flex-wrap items-center gap-3 text-sm">
          <a
            href="https://github.com/goastian/midori-vpn-desktop/releases"
            target="_blank"
            rel="noreferrer"
            class="font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {{ t('dashboard.desktopDownload.allReleases') }}
          </a>
          <span class="text-white/20">•</span>
          <span class="text-slate-400">{{ t('dashboard.desktopDownload.releaseSource') }}</span>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <article
          v-for="card in dashboardCards"
          :key="card.title"
          class="rounded-2xl border p-5 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5"
          :class="{
            'border-emerald-700/40 bg-emerald-950/30': card.tone === 'emerald',
            'border-cyan-700/40 bg-cyan-950/30': card.tone === 'cyan',
            'border-violet-700/40 bg-violet-950/30': card.tone === 'violet',
            'border-midori-700/40 bg-midori-950/30': card.tone === 'midori',
            'border-amber-700/40 bg-amber-950/30': card.tone === 'amber',
            'border-rose-700/40 bg-rose-950/30': card.tone === 'rose',
          }"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {{ card.title }}
          </p>
          <p class="mt-3 text-3xl font-bold text-white">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ card.subtitle }}</p>
        </article>
      </section>

      <section v-if="hasConnectionSnapshot" class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article
          class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl xl:col-span-2"
        >
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-white">{{ t('dashboard.weeklyTraffic') }}</h2>
              <p class="text-sm text-slate-400">{{ t('dashboard.weeklyTrafficSubtitle') }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs uppercase tracking-widest text-slate-400">
                {{ t('common.total') }}
              </p>
              <p class="text-sm font-semibold text-midori-400">
                {{ formatBytes(totalTransferredBytes) }}
              </p>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner">
            <svg viewBox="0 0 100 100" class="h-28 w-full">
              <polyline
                points="0,100 100,100"
                fill="none"
                class="stroke-slate-800"
                stroke-width="1"
              />
              <polyline
                :points="trafficSparkline"
                fill="none"
                class="stroke-midori-400"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
            <div class="mt-3 grid grid-cols-7 gap-2">
              <div v-for="day in trafficByDay" :key="day.key" class="space-y-1 text-center">
                <div class="mx-auto flex h-16 w-6 items-end rounded-full bg-slate-800/80 p-1">
                  <div
                    class="w-full rounded-full bg-gradient-to-t from-midori-600 to-cyan-400 shadow-sm"
                    :style="{
                      height: `${Math.max((day.value / maxTrafficDay) * 100, day.value > 0 ? 14 : 3)}%`,
                    }"
                  ></div>
                </div>
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {{ day.label }}
                </p>
              </div>
            </div>
          </div>
        </article>

        <article
          class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
        >
          <h2 class="text-lg font-bold text-white">{{ t('dashboard.connectionHealth') }}</h2>
          <p class="mt-1 text-sm text-slate-400">{{ t('dashboard.connectionHealthSubtitle') }}</p>

          <div class="mt-6 flex items-center justify-center">
            <div class="relative">
              <svg viewBox="0 0 120 120" class="h-44 w-44 -rotate-90">
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
                  :stroke-dasharray="`${((activePercent ?? 0) / 100) * 301.6} 301.6`"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p class="text-3xl font-bold text-white">
                  {{ activePercent ?? t('common.unavailable')
                  }}<span v-if="activePercent !== null">%</span>
                </p>
                <p class="text-xs uppercase tracking-[0.2em] text-midori-400">
                  {{ t('dashboard.activeLabel') }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-4 space-y-2 text-sm">
            <div
              class="flex items-center justify-between rounded-xl bg-slate-800/80 px-4 py-2.5 border border-slate-700/50"
            >
              <span class="text-slate-300">{{ t('dashboard.activeLabel') }}</span>
              <span class="font-bold text-midori-400">{{ connectionTotals.active }}</span>
            </div>
            <div
              class="flex items-center justify-between rounded-xl bg-slate-800/80 px-4 py-2.5 border border-slate-700/50"
            >
              <span class="text-slate-300">{{ t('dashboard.inactiveLabel') }}</span>
              <span class="font-bold text-slate-400">{{ connectionTotals.inactive }}</span>
            </div>
          </div>
        </article>
      </section>

      <AsyncState v-else kind="error" :title="t('resourceStatus.dashboardError')" />

      <section v-if="hasConnectionSnapshot" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article
          class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">{{ t('dashboard.performanceByDevice') }}</h2>
            <span class="text-xs uppercase tracking-[0.2em] text-midori-400 font-semibold">{{
              t('common.topFive')
            }}</span>
          </div>

          <div v-if="deviceUsage.length" class="space-y-3">
            <div
              v-for="device in deviceUsage"
              :key="device.device"
              class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm"
            >
              <div class="mb-2 flex items-center justify-between gap-4">
                <p class="truncate text-sm font-semibold text-white">{{ device.device }}</p>
                <span class="text-xs text-midori-400 font-mono">{{
                  formatBytes(device.total)
                }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-midori-500"
                  :style="{ width: `${Math.max((device.total / mostUsedDeviceBytes) * 100, 10)}%` }"
                ></div>
              </div>
              <p class="mt-2 text-xs text-slate-400">
                {{ t('dashboard.connectionsActiveSuffix', { count: device.active }) }}
              </p>
            </div>
          </div>

          <p
            v-else
            class="rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-8 text-center text-sm text-slate-400"
          >
            {{ t('dashboard.noDeviceTraffic') }}
          </p>
        </article>

        <article
          class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">{{ t('dashboard.recentActivity') }}</h2>
            <span
              class="text-xs uppercase tracking-[0.2em] font-semibold"
              :class="
                websocketState === 'ready'
                  ? 'text-midori-400'
                  : websocketState === 'error'
                    ? 'text-amber-300'
                    : 'text-slate-400'
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

          <div v-if="connections.length > 0" class="space-y-3">
            <div
              v-for="conn in connections.slice(0, 6)"
              :key="conn.id"
              class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-mono text-midori-300">{{ conn.assigned_ip }}</p>
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-semibold border"
                  :class="
                    conn.is_active
                      ? 'bg-midori-950/60 border-midori-700/50 text-midori-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  "
                >
                  {{ conn.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </div>
              <p class="mt-1 text-xs text-slate-300">
                {{ conn.device_name || t('common.unnamed') }} ·
                <span class="text-slate-500">{{ formatDateTime(conn.created_at) }}</span>
              </p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ↑{{ formatBytes(conn.bytes_sent) }} · ↓{{ formatBytes(conn.bytes_received) }}
              </p>
            </div>
          </div>

          <p
            v-else
            class="rounded-xl bg-slate-100 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300"
          >
            {{ t('dashboard.noRecentConnections') }}
          </p>
        </article>
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
