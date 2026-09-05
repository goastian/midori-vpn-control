<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'

import AsyncState from '../components/AsyncState.vue'
import QuotaSummary from '../components/QuotaSummary.vue'
import ResourceSkeleton from '../components/ResourceSkeleton.vue'
import { api } from '../lib/api'
import { generateClientKeypair } from '../lib/crypto'
import { useLocale } from '../lib/i18n'
import {
  ConnectionConfigSchema,
  DeviceDeleteResponseSchema,
  DeviceListSchema,
  DeviceSchema,
  DeviceSessionPageSchema,
  LifecycleStatusSchema,
  ServerCandidateListSchema,
  ServerListSchema,
} from '../lib/schemas'
import type {
  ConnectionConfig,
  Device,
  DeviceConnection,
  DeviceSessionPage,
  Server,
  ServerCandidate,
} from '../lib/schemas'
import { PRIVATE_KEYS_STORAGE_KEY } from '../lib/storage-keys'
import { beginResourceLoad, completeResourceLoad, type ResourceState } from '../lib/resource-state'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { t } = useLocale()

const servers = ref<Server[]>([])
const candidates = ref<ServerCandidate[]>([])
const devices = ref<Device[]>([])
const serversState = ref<ResourceState>('idle')
const devicesState = ref<ResourceState>('idle')
const connecting = ref(false)
const pendingDeviceID = ref('')
const pendingDeviceAction = ref<'disconnect' | 'delete' | ''>('')

const form = ref({ server_id: '', device_name: '' })
const userQuota = computed(() => auth.userQuota)
const isQuotaReached = computed(() =>
  Boolean(userQuota.value && userQuota.value.available_devices === 0),
)

const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | null = null
let clipboardTimer: ReturnType<typeof setTimeout> | null = null

const deviceModal = ref<{
  open: boolean
  device: Device | null
  configState: ResourceState
  configText: string
  qrUrl: string
  copied: boolean
  historyOpen: boolean
  historyState: ResourceState
  history: DeviceSessionPage | null
  aliasDraft: string
  savingAlias: boolean
}>({
  open: false,
  device: null,
  configState: 'idle',
  configText: '',
  qrUrl: '',
  copied: false,
  historyOpen: false,
  historyState: 'idle',
  history: null,
  aliasDraft: '',
  savingAlias: false,
})

onMounted(async () => {
  await Promise.all([loadData(), auth.fetchQuota()])
  if (
    route.query.server_id &&
    candidates.value.some((candidate) => candidate.id === String(route.query.server_id))
  ) {
    form.value.server_id = String(route.query.server_id)
  }
  document.addEventListener('keydown', onEscapeKey)
})

onUnmounted(() => {
  if (notificationTimer) clearTimeout(notificationTimer)
  if (clipboardTimer) clearTimeout(clipboardTimer)
  document.removeEventListener('keydown', onEscapeKey)
})

function onEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeDeviceModal()
}

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => {
    notification.value = null
  }, 5000)
}

async function loadData() {
  await Promise.all([loadServers(), loadDevices()])
}

async function loadServers() {
  serversState.value = beginResourceLoad(servers.value.length > 0 || serversState.value === 'empty')
  try {
    const [catalog, eligible] = await Promise.all([
      api.validated('/api/v1/control/servers', ServerListSchema),
      api.validated(
        '/api/v1/control/servers/candidates?protocol=wireguard',
        ServerCandidateListSchema,
      ),
    ])
    servers.value = catalog
    candidates.value = eligible
    serversState.value = completeResourceLoad(candidates.value.length > 0)
  } catch {
    serversState.value = 'error'
  }
}

async function loadDevices() {
  devicesState.value = beginResourceLoad(devices.value.length > 0 || devicesState.value === 'empty')
  try {
    devices.value = await api.validated('/api/v1/control/devices', DeviceListSchema)
    devicesState.value = completeResourceLoad(devices.value.length > 0)

    if (deviceModal.value.open && deviceModal.value.device) {
      const refreshed = devices.value.find((device) => device.id === deviceModal.value.device?.id)
      if (refreshed) {
        deviceModal.value.device = refreshed
        deviceModal.value.aliasDraft = refreshed.alias
      }
    }
  } catch {
    devicesState.value = 'error'
  }
}

function availableServerCount(): number {
  return candidates.value.length
}

function deviceBadge(type: Device['device_type']) {
  if (type === 'desktop') {
    return {
      icon: '🖥️',
      label: t('connectionsView.deviceDesktop'),
      tone: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/50',
    }
  }
  if (type === 'extension') {
    return {
      icon: '🧩',
      label: t('connectionsView.deviceExtension'),
      tone: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
    }
  }
  if (type === 'mobile') {
    return {
      icon: '📱',
      label: t('connectionsView.deviceMobile'),
      tone: 'text-violet-300 bg-violet-950/60 border-violet-800/50',
    }
  }
  return {
    icon: '🔑',
    label: t('connectionsView.deviceManual'),
    tone: 'text-midori-400 bg-midori-950/60 border-midori-800/50',
  }
}

function statusLabel(status: Device['status']): string {
  return t(`connectionsView.status.${status}`)
}

function statusTone(status: Device['status']): string {
  if (status === 'connected') return 'bg-midori-950/60 border-midori-700/50 text-midori-300'
  if (status === 'connecting' || status === 'disconnecting' || status === 'cleanup_pending')
    return 'bg-amber-950/60 border-amber-700/50 text-amber-300'
  if (status === 'revoked') return 'bg-rose-950/60 border-rose-700/50 text-rose-300'
  return 'bg-slate-800 border-slate-700 text-slate-400'
}

function effectiveStatus(device: Device): Device['status'] {
  if (pendingDeviceID.value !== device.id) return device.status
  return pendingDeviceAction.value === 'disconnect' ? 'disconnecting' : 'cleanup_pending'
}

function serverName(id?: string): string {
  if (!id) return t('common.unavailable')
  return (
    servers.value.find((server) => server.id === id)?.name ||
    candidates.value.find((server) => server.id === id)?.name ||
    t('common.unavailable')
  )
}

function sessionIP(session?: DeviceConnection | null): string {
  return session?.assigned_ip ? session.assigned_ip.replace(/\/32$/, '') : t('common.unavailable')
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return t('common.unavailable')
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  return `${Number((bytes / Math.pow(1024, index)).toFixed(1))} ${sizes[index]}`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? t('common.unavailable') : date.toLocaleString()
}

function readStoredPrivateKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(PRIVATE_KEYS_STORAGE_KEY) || '{}')
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function savePrivateKeyForPeer(peerID: string, privateKey: string) {
  const keys = readStoredPrivateKeys()
  keys[peerID] = privateKey
  sessionStorage.setItem(PRIVATE_KEYS_STORAGE_KEY, JSON.stringify(keys))
}

function getPrivateKeyForPeer(peerID: string): string {
  return readStoredPrivateKeys()[peerID] || ''
}

function forgetPrivateKey(peerID?: string) {
  if (!peerID) return
  const keys = readStoredPrivateKeys()
  delete keys[peerID]
  sessionStorage.setItem(PRIVATE_KEYS_STORAGE_KEY, JSON.stringify(keys))
}

function buildClientConfigText(config: ConnectionConfig, privateKey?: string): string {
  const address = config.peer_ip.includes('/') ? config.peer_ip : `${config.peer_ip}/32`
  const pskLine = config.preshared_key ? `\nPresharedKey = ${config.preshared_key}` : ''
  return `[Interface]
PrivateKey = ${privateKey || t('connectionsView.privateKeyPlaceholder')}
Address = ${address}
DNS = ${config.dns}

[Peer]
PublicKey = ${config.server_public_key}
Endpoint = ${config.server_endpoint}${pskLine}
AllowedIPs = ${config.allowed_ips}
PersistentKeepalive = 25`
}

async function handleCreateDevice() {
  const name = form.value.device_name.trim()
  if (!name) {
    showNotification('error', t('connectionsView.deviceNameRequired'))
    return
  }
  connecting.value = true
  try {
    const keypair = await generateClientKeypair()
    const config = await api.validated('/api/v1/control/connections', ConnectionConfigSchema, {
      method: 'POST',
      body: JSON.stringify({
        server_id: form.value.server_id || undefined,
        device_name: name,
        public_key: keypair.publicKey,
      }),
    })
    savePrivateKeyForPeer(config.peer_id, keypair.privateKey)
    const configText = buildClientConfigText(config, keypair.privateKey)
    const qrUrl = await QRCode.toDataURL(configText, { errorCorrectionLevel: 'L', scale: 5 })
    form.value.device_name = ''
    await Promise.all([loadData(), auth.fetchQuota()])
    const created = devices.value.find((device) => device.id === config.device_id)
    if (!created) throw new Error(t('connectionsView.loadError'))
    openDeviceDetail(created, { configText, qrUrl })
    showNotification('success', t('connectionsView.connectedSuccess'))
  } catch (error) {
    showNotification(
      'error',
      error instanceof Error ? error.message : t('connectionsView.loadError'),
    )
  } finally {
    connecting.value = false
  }
}

async function openDeviceDetail(device: Device, prepared?: { configText: string; qrUrl: string }) {
  deviceModal.value = {
    open: true,
    device,
    configState: device.active_connection && !prepared ? 'loading' : prepared ? 'ready' : 'empty',
    configText: prepared?.configText || '',
    qrUrl: prepared?.qrUrl || '',
    copied: false,
    historyOpen: false,
    historyState: 'idle',
    history: null,
    aliasDraft: device.alias,
    savingAlias: false,
  }
  const peerID = device.active_connection?.id
  if (!peerID || prepared) return
  try {
    const response = await api.fetchRaw(`/api/v1/control/connections/${peerID}/config`)
    if (!response.ok)
      throw new Error(t('connectionsView.configLoadError', { status: response.status }))
    let configText = await response.text()
    const privateKey = getPrivateKeyForPeer(peerID)
    if (privateKey)
      configText = configText.replace(
        'PrivateKey = <YOUR_PRIVATE_KEY>',
        `PrivateKey = ${privateKey}`,
      )
    deviceModal.value.configText = configText
    deviceModal.value.qrUrl = await QRCode.toDataURL(configText, {
      errorCorrectionLevel: 'L',
      scale: 5,
    })
    deviceModal.value.configState = 'ready'
  } catch (error) {
    deviceModal.value.configState = 'error'
    showNotification(
      'error',
      error instanceof Error
        ? error.message
        : t('connectionsView.configLoadError', { status: '?' }),
    )
  }
}

function closeDeviceModal() {
  deviceModal.value.open = false
  deviceModal.value.device = null
  deviceModal.value.configText = ''
  deviceModal.value.qrUrl = ''
  deviceModal.value.history = null
  deviceModal.value.configState = 'idle'
  deviceModal.value.historyState = 'idle'
}

async function toggleHistory() {
  deviceModal.value.historyOpen = !deviceModal.value.historyOpen
  if (deviceModal.value.historyOpen && !deviceModal.value.history && deviceModal.value.device)
    await loadHistory(1)
}

async function loadHistory(page: number) {
  const device = deviceModal.value.device
  if (!device) return
  deviceModal.value.historyState = beginResourceLoad(deviceModal.value.history !== null)
  try {
    deviceModal.value.history = await api.validated(
      `/api/v1/control/devices/${device.id}/sessions?page=${page}&page_size=10`,
      DeviceSessionPageSchema,
    )
    deviceModal.value.historyState = completeResourceLoad(
      deviceModal.value.history.items.length > 0,
    )
  } catch (error) {
    deviceModal.value.historyState = 'error'
    showNotification(
      'error',
      error instanceof Error ? error.message : t('connectionsView.historyLoadError'),
    )
  }
}

async function saveAlias() {
  const device = deviceModal.value.device
  if (!device) return
  deviceModal.value.savingAlias = true
  try {
    const updated = await api.validated(`/api/v1/control/devices/${device.id}`, DeviceSchema, {
      method: 'PATCH',
      body: JSON.stringify({ alias: deviceModal.value.aliasDraft }),
    })
    deviceModal.value.device = updated
    deviceModal.value.aliasDraft = updated.alias
    devices.value = devices.value.map((item) => (item.id === updated.id ? updated : item))
    showNotification('success', t('connectionsView.aliasSaved'))
  } catch (error) {
    showNotification(
      'error',
      error instanceof Error ? error.message : t('connectionsView.aliasSaveError'),
    )
  } finally {
    deviceModal.value.savingAlias = false
  }
}

async function disconnectDevice(device: Device) {
  const peerID = device.active_connection?.id
  if (!peerID || !confirm(t('connectionsView.disconnectConfirm'))) return
  pendingDeviceID.value = device.id
  pendingDeviceAction.value = 'disconnect'
  try {
    const outcome = await api.validated(
      `/api/v1/control/connections/${peerID}`,
      LifecycleStatusSchema,
      { method: 'DELETE' },
    )
    if (outcome.status === 'disconnect_pending') {
      showNotification('error', t('connectionsView.disconnectPending'))
    } else {
      forgetPrivateKey(peerID)
      showNotification('success', t('connectionsView.disconnectedSuccess'))
    }
    await Promise.all([loadData(), auth.fetchQuota()])
  } catch (error) {
    showNotification(
      'error',
      error instanceof Error ? error.message : t('connectionsView.loadError'),
    )
  } finally {
    pendingDeviceID.value = ''
    pendingDeviceAction.value = ''
  }
}

async function deleteDevice(device: Device) {
  if (!confirm(t('connectionsView.deleteConfirm'))) return
  pendingDeviceID.value = device.id
  pendingDeviceAction.value = 'delete'
  try {
    const outcome = await api.validated(
      `/api/v1/control/devices/${device.id}`,
      DeviceDeleteResponseSchema,
      { method: 'DELETE' },
    )
    if ('status' in outcome && outcome.status === 'device_cleanup_pending') {
      showNotification('error', t('connectionsView.cleanupPending'))
    } else {
      forgetPrivateKey(device.active_connection?.id)
      showNotification('success', t('connectionsView.deletedSuccess'))
    }
    await Promise.all([loadData(), auth.fetchQuota()])
  } catch (error) {
    showNotification(
      'error',
      error instanceof Error ? error.message : t('connectionsView.loadError'),
    )
    await loadData()
  } finally {
    pendingDeviceID.value = ''
    pendingDeviceAction.value = ''
  }
}

async function copyDeviceModalConfig() {
  if (!deviceModal.value.configText) return
  await navigator.clipboard.writeText(deviceModal.value.configText)
  deviceModal.value.copied = true
  showNotification('success', t('connectionsView.copied'))
  if (clipboardTimer) clearTimeout(clipboardTimer)
  clipboardTimer = setTimeout(() => {
    deviceModal.value.copied = false
  }, 3000)
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'device'
}

function downloadConfig() {
  const device = deviceModal.value.device
  if (!device || !deviceModal.value.configText) return
  const blobURL = URL.createObjectURL(
    new Blob([deviceModal.value.configText], { type: 'text/plain;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = blobURL
  link.download = `wg-${safeFilename(device.display_name)}.conf`
  link.click()
  URL.revokeObjectURL(blobURL)
}

function downloadQR() {
  const device = deviceModal.value.device
  if (!device || !deviceModal.value.qrUrl) return
  const link = document.createElement('a')
  link.href = deviceModal.value.qrUrl
  link.download = `wg-${safeFilename(device.display_name)}-qr.png`
  link.click()
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('connectionsView.title') }}</h1>
      <p class="mt-1 text-sm text-slate-400">{{ t('connectionsView.subtitle') }}</p>
    </header>

    <ResourceSkeleton
      v-if="auth.quotaState === 'loading' && !userQuota"
      :title="t('quota.loading')"
      :count="1"
      item-class="h-28"
    />
    <QuotaSummary v-else-if="userQuota" :quota="userQuota" />
    <p
      v-if="auth.quotaState === 'error'"
      role="alert"
      class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
    >
      {{ userQuota ? t('common.refreshFailed') : t('quota.loadError') }}
    </p>

    <Transition name="fade">
      <div
        v-if="notification"
        :role="notification.type === 'error' ? 'alert' : 'status'"
        :class="
          notification.type === 'success'
            ? 'border-midori-700/60 bg-midori-950/50 text-midori-200'
            : 'border-rose-700/60 bg-rose-950/50 text-rose-200'
        "
        class="flex items-center justify-between rounded-2xl border px-5 py-4 text-sm shadow-lg"
      >
        <span>{{ notification.message }}</span>
        <button
          type="button"
          class="ml-3 text-lg opacity-60 hover:opacity-100"
          :aria-label="t('connectionsView.closeNotification')"
          @click="notification = null"
        >
          &times;
        </button>
      </div>
    </Transition>

    <section
      class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl md:p-8"
    >
      <h2 class="mb-2 text-xl font-bold text-white">{{ t('connectionsView.newConnection') }}</h2>
      <p class="mb-6 text-xs text-slate-400">{{ t('connectionsView.formHelp') }}</p>
      <form class="space-y-5" @submit.prevent="handleCreateDevice">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              for="connection-server"
              class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >{{ t('common.server') }}</label
            >
            <select
              id="connection-server"
              v-model="form.server_id"
              :disabled="
                serversState === 'idle' || serversState === 'loading' || serversState === 'error'
              "
              class="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-white outline-none focus:border-midori-500 disabled:opacity-50"
            >
              <option value="">{{ t('connectionsView.autoServer') }}</option>
              <option v-for="server in candidates" :key="server.id" :value="server.id">
                {{ server.name }} ({{ server.location }})
              </option>
            </select>
          </div>
          <div>
            <label
              for="connection-device-name"
              class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >{{ t('common.device') }}</label
            >
            <input
              id="connection-device-name"
              v-model="form.device_name"
              required
              maxlength="64"
              :placeholder="t('connectionsView.deviceNamePlaceholder')"
              class="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-white outline-none focus:border-midori-500"
            />
          </div>
        </div>
        <p
          v-if="isQuotaReached"
          role="alert"
          class="rounded-xl border border-rose-800/60 bg-rose-950/40 px-4 py-3 text-xs font-medium text-rose-300"
        >
          {{
            t('connectionsView.quotaReached', {
              maximum: userQuota?.max_devices ?? t('common.unavailable'),
            })
          }}
        </p>
        <p
          v-if="serversState === 'idle' || serversState === 'loading'"
          role="status"
          class="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-xs text-slate-400"
        >
          {{ t('serversView.loading') }}
        </p>
        <p
          v-else-if="serversState === 'error'"
          role="alert"
          class="rounded-xl border border-rose-800/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-300"
        >
          {{ t('serversView.loadErrorTitle') }}
        </p>
        <p
          v-else-if="serversState === 'empty'"
          role="status"
          class="rounded-xl border border-amber-800/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-300"
        >
          {{ t('connectionsView.noActiveServers') }}
        </p>
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            :aria-busy="connecting"
            :disabled="
              connecting ||
              !form.device_name.trim() ||
              availableServerCount() === 0 ||
              isQuotaReached ||
              !userQuota ||
              auth.quotaState === 'error' ||
              serversState !== 'ready'
            "
            class="inline-flex items-center gap-2 rounded-xl bg-midori-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-midori-900/30 transition-all hover:bg-midori-500 disabled:opacity-50"
          >
            <span
              v-if="connecting"
              aria-hidden="true"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            ></span
            >{{ connecting ? t('connectionsView.creating') : t('common.create') }}
          </button>
        </div>
      </form>
    </section>

    <ResourceSkeleton
      v-if="devicesState === 'idle' || devicesState === 'loading'"
      :title="t('common.loading')"
      item-class="h-24"
    />
    <AsyncState
      v-else-if="devicesState === 'error' && devices.length === 0"
      kind="error"
      :title="t('connectionsView.loadError')"
      :retry-label="t('common.retry')"
      @retry="loadData"
    />
    <AsyncState
      v-else-if="devicesState === 'empty'"
      kind="empty"
      :title="t('connectionsView.emptyDevices')"
    />

    <section
      v-else
      class="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 shadow-xl shadow-black/30 backdrop-blur-xl"
    >
      <p
        v-if="devicesState === 'refreshing'"
        class="border-b border-slate-800 px-6 py-3 text-xs text-slate-400"
        role="status"
      >
        {{ t('common.refreshing') }}
      </p>
      <p
        v-else-if="devicesState === 'error'"
        class="border-b border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300"
        role="alert"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <div class="border-b border-slate-800 px-6 py-4 text-xs text-slate-400">
        {{ t('connectionsView.listHint') }}
      </div>
      <div class="divide-y divide-slate-800/70">
        <article
          v-for="device in devices"
          :key="device.id"
          class="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-800/40 md:grid-cols-[minmax(13rem,1.3fr)_minmax(10rem,1fr)_minmax(8rem,.8fr)_auto] md:items-center md:px-6"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-semibold text-white">
                {{ device.display_name || device.reported_name || t('common.unavailable') }}
              </h2>
              <span
                :class="deviceBadge(device.device_type).tone"
                class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs"
                ><span aria-hidden="true">{{ deviceBadge(device.device_type).icon }}</span
                >{{ deviceBadge(device.device_type).label }}</span
              >
            </div>
            <p v-if="device.alias" class="mt-1 truncate text-xs text-slate-500">
              {{ device.reported_name || t('common.unavailable') }}
            </p>
            <p v-if="device.adapter_label" class="mt-1 font-mono text-xs text-slate-400">
              {{ t('connectionsView.adapterReference') }}: {{ device.adapter_label }}
            </p>
          </div>
          <div class="text-sm">
            <p class="font-medium text-slate-300">
              {{ serverName(device.active_connection?.server_id) }}
            </p>
            <p class="mt-1 font-mono text-xs text-midori-300">
              {{ sessionIP(device.active_connection) }}
            </p>
          </div>
          <div class="text-xs text-slate-400">
            <p v-if="device.active_connection" class="font-mono">
              ↑{{ formatBytes(device.active_connection.bytes_sent) }} · ↓{{
                formatBytes(device.active_connection.bytes_received)
              }}
            </p>
            <p class="mt-1">
              {{ t('connectionsView.lastSeen') }}: {{ formatDate(device.last_seen_at) }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 md:justify-end">
            <span
              :class="statusTone(effectiveStatus(device))"
              class="rounded-full border px-2.5 py-1 text-xs font-semibold"
              >{{ statusLabel(effectiveStatus(device)) }}</span
            >
            <button
              type="button"
              :disabled="pendingDeviceID === device.id"
              class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-white disabled:opacity-50"
              @click="openDeviceDetail(device)"
            >
              {{ t('common.details') }}
            </button>
            <button
              v-if="device.active_connection && device.status !== 'revoked'"
              type="button"
              :disabled="pendingDeviceID === device.id"
              class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-white disabled:opacity-50"
              @click="disconnectDevice(device)"
            >
              {{ t('common.disconnect') }}
            </button>
            <button
              v-if="device.status !== 'revoked'"
              type="button"
              :disabled="pendingDeviceID === device.id"
              class="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-950/30 disabled:opacity-50"
              @click="deleteDevice(device)"
            >
              {{ t('connectionsView.deleteDevice') }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="deviceModal.open && deviceModal.device"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            class="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            :aria-label="t('connectionsView.closeModal')"
            @click="closeDeviceModal"
          ></button>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-modal-title"
            class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800/90 bg-slate-900 p-6 text-left shadow-2xl md:p-8"
          >
            <button
              type="button"
              class="absolute right-5 top-5 text-2xl text-slate-400 hover:text-white"
              :aria-label="t('connectionsView.closeModal')"
              @click="closeDeviceModal"
            >
              &times;
            </button>
            <div class="pr-10">
              <div class="flex flex-wrap items-center gap-2">
                <h3 id="device-modal-title" class="text-2xl font-bold text-white">
                  {{
                    deviceModal.device.display_name ||
                    deviceModal.device.reported_name ||
                    t('common.unavailable')
                  }}
                </h3>
                <span
                  :class="statusTone(effectiveStatus(deviceModal.device))"
                  class="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  >{{ statusLabel(effectiveStatus(deviceModal.device)) }}</span
                >
              </div>
              <p class="mt-1 text-xs text-slate-400">
                {{ deviceModal.device.reported_name || t('common.unavailable')
                }}<span v-if="deviceModal.device.adapter_label">
                  · {{ t('connectionsView.adapterReference') }}:
                  {{ deviceModal.device.adapter_label }}</span
                >
              </p>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label
                  for="device-alias"
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >{{ t('connectionsView.aliasLabel') }}</label
                ><input
                  id="device-alias"
                  v-model="deviceModal.aliasDraft"
                  maxlength="64"
                  :disabled="deviceModal.savingAlias || pendingDeviceID === deviceModal.device.id"
                  :placeholder="t('connectionsView.aliasPlaceholder')"
                  class="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-white outline-none focus:border-midori-500 disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                :disabled="deviceModal.savingAlias || pendingDeviceID === deviceModal.device.id"
                class="self-end rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-midori-300 hover:bg-slate-700 disabled:opacity-50"
                @click="saveAlias"
              >
                {{ t('common.save') }}
              </button>
            </div>

            <div
              v-if="deviceModal.device.active_connection"
              class="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <div class="flex flex-wrap justify-between gap-3 text-xs text-slate-400">
                <span
                  >{{ t('connectionsView.serverLabel') }}:
                  <strong class="text-slate-200">{{
                    serverName(deviceModal.device.active_connection.server_id)
                  }}</strong></span
                ><span
                  >{{ t('common.ip') }}:
                  <strong class="font-mono text-midori-300">{{
                    sessionIP(deviceModal.device.active_connection)
                  }}</strong></span
                ><span
                  >{{ t('connectionsView.trafficLabel') }}: ↑{{
                    formatBytes(deviceModal.device.active_connection.bytes_sent)
                  }}
                  · ↓{{ formatBytes(deviceModal.device.active_connection.bytes_received) }}</span
                >
              </div>
              <ResourceSkeleton
                v-if="deviceModal.configState === 'loading'"
                :title="t('common.loading')"
                :count="1"
                item-class="h-44"
              />
              <AsyncState
                v-else-if="deviceModal.configState === 'error'"
                kind="error"
                :title="t('connectionsView.configLoadError', { status: t('common.unavailable') })"
              />
              <div
                v-else-if="deviceModal.configText"
                class="mt-4 grid gap-4 md:grid-cols-[1fr_auto]"
              >
                <div class="min-w-0">
                  <pre
                    class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-midori-200"
                    >{{ deviceModal.configText }}</pre>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-midori-700/50 bg-midori-900/40 px-3 py-1.5 text-xs font-semibold text-midori-300"
                      @click="copyDeviceModalConfig"
                    >
                      {{
                        deviceModal.copied ? t('connectionsView.copiedShort') : t('common.copy')
                      }}</button
                    ><button
                      type="button"
                      class="rounded-lg border border-midori-700/50 bg-midori-900/40 px-3 py-1.5 text-xs font-semibold text-midori-300"
                      @click="downloadConfig"
                    >
                      .conf</button
                    ><button
                      v-if="deviceModal.qrUrl"
                      type="button"
                      class="rounded-lg border border-cyan-700/50 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300"
                      @click="downloadQR"
                    >
                      QR
                    </button>
                  </div>
                </div>
                <img
                  v-if="deviceModal.qrUrl"
                  :src="deviceModal.qrUrl"
                  :alt="t('connectionsView.qrAlt')"
                  class="h-44 w-44 rounded-xl bg-white p-2"
                />
              </div>
            </div>

            <div class="mt-6 border-t border-slate-800 pt-5">
              <button
                type="button"
                :disabled="pendingDeviceID === deviceModal.device.id"
                :aria-expanded="deviceModal.historyOpen"
                class="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-200 disabled:opacity-50"
                @click="toggleHistory"
              >
                <span>{{ t('connectionsView.sessionHistory') }}</span
                ><span aria-hidden="true">{{ deviceModal.historyOpen ? '−' : '+' }}</span>
              </button>
              <div v-if="deviceModal.historyOpen" class="mt-4">
                <ResourceSkeleton
                  v-if="deviceModal.historyState === 'loading'"
                  :title="t('common.loading')"
                  :count="2"
                  item-class="h-16"
                />
                <AsyncState
                  v-else-if="deviceModal.historyState === 'error' && !deviceModal.history"
                  kind="error"
                  :title="t('connectionsView.historyLoadError')"
                  :retry-label="t('common.retry')"
                  @retry="loadHistory(1)"
                />
                <p v-else-if="deviceModal.historyState === 'empty'" class="text-sm text-slate-400">
                  {{ t('connectionsView.noHistory') }}
                </p>
                <div v-else-if="deviceModal.history" class="space-y-2">
                  <p
                    v-if="deviceModal.historyState === 'refreshing'"
                    class="text-xs text-slate-400"
                    role="status"
                  >
                    {{ t('common.refreshing') }}
                  </p>
                  <p
                    v-else-if="deviceModal.historyState === 'error'"
                    class="text-xs text-rose-300"
                    role="alert"
                  >
                    {{ t('common.refreshFailed') }}
                  </p>
                  <div
                    v-for="session in deviceModal.history.items"
                    :key="session.id"
                    class="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400 sm:grid-cols-4"
                  >
                    <span>{{ formatDate(session.created_at) }}</span
                    ><span>{{ serverName(session.server_id) }}</span
                    ><span class="font-mono text-midori-300">{{ sessionIP(session) }}</span
                    ><span>{{
                      session.is_active ? t('common.active') : t('common.inactive')
                    }}</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 text-xs text-slate-400">
                    <button
                      type="button"
                      :disabled="deviceModal.history.page <= 1"
                      class="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
                      @click="loadHistory(deviceModal.history.page - 1)"
                    >
                      {{ t('connectionsView.previousPage') }}</button
                    ><span
                      >{{ deviceModal.history.page }} · {{ deviceModal.history.total }}
                      {{ t('connectionsView.sessions') }}</span
                    ><button
                      type="button"
                      :disabled="
                        deviceModal.history.page * deviceModal.history.page_size >=
                        deviceModal.history.total
                      "
                      class="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
                      @click="loadHistory(deviceModal.history.page + 1)"
                    >
                      {{ t('connectionsView.nextPage') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="deviceModal.device.status !== 'revoked'"
              class="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4"
            >
              <button
                v-if="deviceModal.device.active_connection"
                type="button"
                :disabled="pendingDeviceID === deviceModal.device.id"
                class="rounded-xl border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 disabled:opacity-50"
                @click="disconnectDevice(deviceModal.device)"
              >
                {{ t('common.disconnect') }}
              </button>
              <button
                type="button"
                :disabled="pendingDeviceID === deviceModal.device.id"
                class="rounded-xl border border-rose-800/50 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 disabled:opacity-50"
                @click="deleteDevice(deviceModal.device)"
              >
                {{ t('connectionsView.deleteDevice') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
