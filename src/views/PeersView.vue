<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import { generateClientKeypair } from '../lib/crypto'
import { PRIVATE_KEYS_STORAGE_KEY } from '../lib/storage-keys'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'
import type { Server, Connection, ConnectionConfig } from '../lib/schemas'
import AsyncState from '../components/AsyncState.vue'
import QuotaSummary from '../components/QuotaSummary.vue'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const route = useRoute()
const auth = useAuthStore()
const { t } = useLocale()

const servers = ref<Server[]>([])
const connections = ref<Connection[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const loading = ref(true)
const failed = ref(false)
const connecting = ref(false)

const userQuota = computed(() => auth.userQuota)
const isQuotaReached = computed(() => Boolean(userQuota.value && userQuota.value.available_devices === 0))

function getDeviceBadge(deviceName: string = '') {
  const lower = deviceName.toLowerCase()
  if (lower.includes('desktop') || lower.includes('app') || lower.includes('linux') || lower.includes('windows') || lower.includes('mac')) {
    return { icon: '🖥️', label: t('connectionsView.deviceDesktop'), tone: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/50' }
  }
  if (lower.includes('extension') || lower.includes('ext') || lower.includes('browser') || lower.includes('chrome') || lower.includes('firefox')) {
    return { icon: '🧩', label: t('connectionsView.deviceExtension'), tone: 'text-amber-400 bg-amber-950/60 border-amber-800/50' }
  }
  return { icon: '📱', label: t('connectionsView.deviceWireGuard'), tone: 'text-midori-400 bg-midori-950/60 border-midori-800/50' }
}

// Form state
const form = ref({
  server_id: '',
  device_name: '',
})

// Duplicate device name check
const isDuplicateDeviceName = computed(() => {
  const trimmed = form.value.device_name.trim().toLowerCase()
  if (!trimmed) return false
  return connections.value.some((c) => c.is_active && (c.device_name || '').trim().toLowerCase() === trimmed)
})

// Inline notification
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | null = null

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => { notification.value = null }, 5000)
}

// Unified Device Detail / QR Modal
const deviceModal = ref<{
  open: boolean
  loading: boolean
  conn: Connection | null
  configText: string
  qrUrl: string
  copied: boolean
}>({
  open: false,
  loading: false,
  conn: null,
  configText: '',
  qrUrl: '',
  copied: false,
})

let clipboardTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await Promise.all([loadData(), auth.fetchQuota()])
  if (route.query.server_id) {
    form.value.server_id = String(route.query.server_id)
  }
  document.addEventListener('keydown', onEscapeKey)
})

onUnmounted(() => {
  if (clipboardTimer) clearTimeout(clipboardTimer)
  if (notificationTimer) clearTimeout(notificationTimer)
  if (deviceModal.value.qrUrl) URL.revokeObjectURL(deviceModal.value.qrUrl)
  document.removeEventListener('keydown', onEscapeKey)
})

function onEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDeviceModal()
}

async function loadData() {
  loading.value = true
  failed.value = false
  try {
    const [s, c, pings] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<Connection[]>('/api/v1/control/connections'),
      api.get<ServerPingResult[]>('/api/v1/control/servers/ping').catch(() => []),
    ])
    servers.value = s || []
    connections.value = c || []
    serverPing.value = Object.fromEntries((pings || []).map((item) => [item.server_id, item]))
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

function availableServerCount(): number {
  return servers.value.filter((s) => serverPing.value[s.id]?.available !== false).length
}

function selectedServerUnavailable(): boolean {
  if (!form.value.server_id) return false
  return serverPing.value[form.value.server_id]?.available === false
}

function readStoredPrivateKeys(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(PRIVATE_KEYS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function savePrivateKeyForPeer(peerID: string, privateKey: string) {
  const map = readStoredPrivateKeys()
  map[peerID] = privateKey
  sessionStorage.setItem(PRIVATE_KEYS_STORAGE_KEY, JSON.stringify(map))
}

function getPrivateKeyForPeer(peerID: string): string {
  const map = readStoredPrivateKeys()
  return map[peerID] || ''
}

function buildClientConfigText(config: ConnectionConfig, privateKey?: string): string {
  const privKey = privateKey || t('connectionsView.privateKeyPlaceholder')
  const address = config.peer_ip.includes('/') ? config.peer_ip : `${config.peer_ip}/32`
  const pskLine = config.preshared_key ? `\nPresharedKey = ${config.preshared_key}` : ''

  return `[Interface]
PrivateKey = ${privKey}
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
  if (isDuplicateDeviceName.value) {
    showNotification('error', t('connectionsView.duplicateName'))
    return
  }

  connecting.value = true
  try {
    // 1. Generate the WireGuard keypair locally. The private key must never
    // cross the control API boundary.
    const kp = await generateClientKeypair()

    // 2. Connect / Provision device
    const config = await api.post<ConnectionConfig>('/api/v1/control/connections', {
      server_id: form.value.server_id || undefined,
      device_name: name,
      public_key: kp.publicKey,
    })

    savePrivateKeyForPeer(config.peer_id, kp.privateKey)

    // 3. Build text & QR and open modal
    const text = buildClientConfigText(config, kp.privateKey)
    const qr = await QRCode.toDataURL(text, { errorCorrectionLevel: 'L', scale: 5 })

    form.value.device_name = ''
    await loadData()

    const createdConn = connections.value.find((c) => c.id === config.peer_id) || {
      id: config.peer_id,
      user_id: '',
      server_id: form.value.server_id || servers.value[0]?.id || '',
      public_key: kp.publicKey,
      preshared_key: config.preshared_key || '',
      assigned_ip: config.peer_ip,
      device_name: name,
      is_active: true,
      last_handshake: null,
      bytes_sent: 0,
      bytes_received: 0,
      created_at: new Date().toISOString(),
      expires_at: null,
    }

    deviceModal.value = {
      open: true,
      loading: false,
      conn: createdConn,
      configText: text,
      qrUrl: qr,
      copied: false,
    }

    showNotification('success', t('connectionsView.connectedSuccess'))
  } catch (e: any) {
    showNotification('error', e.message)
  } finally {
    connecting.value = false
  }
}

async function openDeviceDetail(conn: Connection) {
  deviceModal.value = {
    open: true,
    loading: true,
    conn,
    configText: '',
    qrUrl: '',
    copied: false,
  }

  try {
    const res = await api.fetchRaw(`/api/v1/control/connections/${conn.id}/config`)
    if (!res.ok) {
      throw new Error(t('connectionsView.configLoadError', { status: res.status }))
    }

    let text = await res.text()
    const privateKey = getPrivateKeyForPeer(conn.id)
    if (privateKey) {
      text = text.replace('PrivateKey = <YOUR_PRIVATE_KEY>', `PrivateKey = ${privateKey}`)
    }

    deviceModal.value.configText = text
    deviceModal.value.qrUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: 'L', scale: 5 })
  } catch (e: any) {
    showNotification('error', e.message || t('connectionsView.configLoadError', { status: '?' }))
  } finally {
    deviceModal.value.loading = false
  }
}

function closeDeviceModal() {
  if (deviceModal.value.qrUrl) URL.revokeObjectURL(deviceModal.value.qrUrl)
  deviceModal.value = {
    open: false,
    loading: false,
    conn: null,
    configText: '',
    qrUrl: '',
    copied: false,
  }
}

function copyDeviceModalConfig() {
  if (!deviceModal.value.configText) return
  navigator.clipboard.writeText(deviceModal.value.configText)
  deviceModal.value.copied = true
  showNotification('success', t('connectionsView.copied'))
  if (clipboardTimer) clearTimeout(clipboardTimer)
  clipboardTimer = setTimeout(() => {
    deviceModal.value.copied = false
  }, 3000)
}

function downloadDeviceModalConfig() {
  if (!deviceModal.value.configText || !deviceModal.value.conn) return
  const blob = new Blob([deviceModal.value.configText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wg-${deviceModal.value.conn.device_name || deviceModal.value.conn.id.slice(0, 8)}.conf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadDeviceModalQR() {
  if (!deviceModal.value.qrUrl || !deviceModal.value.conn) return
  const link = document.createElement('a')
  link.href = deviceModal.value.qrUrl
  link.download = `wg-${deviceModal.value.conn.device_name || deviceModal.value.conn.id.slice(0, 8)}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function disconnect(id: string) {
  if (!confirm(t('connectionsView.disconnectConfirm'))) return
  try {
    await api.delete(`/api/v1/control/connections/${id}`)
    if (deviceModal.value.open && deviceModal.value.conn?.id === id) {
      closeDeviceModal()
    }
    await loadData()
    showNotification('success', t('connectionsView.disconnectedSuccess'))
  } catch (e: any) {
    showNotification('error', e.message)
  }
}

async function deleteConnection(id: string) {
  if (!confirm(t('connectionsView.deleteConfirm'))) return
  try {
    await api.delete(`/api/v1/control/connections/${id}/device`)
    if (deviceModal.value.open && deviceModal.value.conn?.id === id) {
      closeDeviceModal()
    }
    await loadData()
    showNotification('success', t('connectionsView.deletedSuccess'))
  } catch (e: any) {
    showNotification('error', e.message)
  }
}

function serverName(id: string): string {
  return servers.value.find((s) => s.id === id)?.name || id.slice(0, 8)
}

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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('connectionsView.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ t('connectionsView.subtitle') }}</p>
      </div>
    </div>

    <!-- Global User Quota Bar -->
    <QuotaSummary v-if="userQuota" :quota="userQuota" />

    <!-- Inline notification -->
    <Transition name="fade">
      <div
        v-if="notification"
        :role="notification.type === 'error' ? 'alert' : 'status'"
        :class="notification.type === 'success'
          ? 'bg-midori-950/50 border-midori-700/60 text-midori-200'
          : 'bg-rose-950/50 border-rose-700/60 text-rose-200'"
        class="border rounded-2xl px-5 py-4 text-sm flex items-center justify-between shadow-lg"
      >
        <span>{{ notification.message }}</span>
        <button type="button" class="ml-3 opacity-60 hover:opacity-100 text-lg leading-none" :aria-label="t('connectionsView.closeNotification')" @click="notification = null">&times;</button>
      </div>
    </Transition>

    <!-- Connect / Create device form -->
    <div class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl">
      <h2 class="text-xl font-bold text-white mb-2">{{ t('connectionsView.newConnection') }}</h2>
      <p class="text-xs text-slate-400 mb-6">
        {{ t('connectionsView.formHelp') }}
      </p>

      <form class="space-y-5" @submit.prevent="handleCreateDevice">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Server selection -->
          <div>
            <label for="connection-server" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('common.server') }}</label>
            <select
              id="connection-server"
              v-model="form.server_id"
              class="w-full border border-slate-700/80 bg-slate-950/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-midori-500 transition-colors"
            >
              <option value="" class="bg-slate-900 text-slate-100">{{ t('connectionsView.autoServer') }}</option>
              <option v-for="s in servers" :key="s.id" :value="s.id" class="bg-slate-900 text-slate-100">
                {{ s.name }} ({{ s.location }})
                {{ serverPing[s.id] ? (serverPing[s.id].available ? ` · ${serverPing[s.id].latency_ms}ms` : ` · ${t('connectionsView.unavailableLabel')}`) : '' }}
              </option>
            </select>
          </div>

          <!-- Device name -->
          <div>
            <label for="connection-device-name" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('common.device') }}</label>
            <input
              id="connection-device-name"
              v-model="form.device_name"
              :placeholder="t('connectionsView.deviceNamePlaceholder')"
              required
              :aria-invalid="isDuplicateDeviceName"
              :aria-describedby="isDuplicateDeviceName ? 'duplicate-device-name' : undefined"
              class="w-full border bg-slate-950/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              :class="isDuplicateDeviceName ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-midori-500'"
            />
            <p v-if="isDuplicateDeviceName" id="duplicate-device-name" class="text-xs text-rose-400 mt-1 font-medium" role="alert">
              {{ t('connectionsView.duplicateName') }}
            </p>
          </div>
        </div>

        <!-- Warnings -->
        <div v-if="userQuota && userQuota.available_devices === 0" class="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl px-4 py-3 font-medium" role="alert">
          {{ t('connectionsView.quotaReached', { maximum: userQuota.max_devices }) }}
        </div>
        <div v-if="servers.length === 0" class="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3" role="status">
          {{ t('connectionsView.noActiveServers') }}
        </div>
        <div v-else-if="availableServerCount() === 0" class="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3" role="status">
          {{ t('connectionsView.noRespondingServers') }}
        </div>
        <div v-if="selectedServerUnavailable()" class="text-xs text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-xl px-4 py-3" role="alert">
          {{ t('connectionsView.serverUnavailable') }}
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            :aria-busy="connecting"
            :disabled="connecting || isDuplicateDeviceName || !form.device_name.trim() || availableServerCount() === 0 || isQuotaReached"
            class="bg-midori-600 hover:bg-midori-500 text-white font-semibold px-8 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-midori-900/30 cursor-pointer inline-flex items-center gap-2"
          >
            <span v-if="connecting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
            <span>{{ connecting ? t('connectionsView.creating') : t('common.create') }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Loading -->
    <AsyncState v-if="loading" kind="loading" :title="t('common.loading')" />

    <AsyncState v-else-if="failed" kind="error" :title="t('connectionsView.loadError')" :retry-label="t('common.retry')" @retry="loadData" />

    <!-- Empty state -->
    <AsyncState v-else-if="connections.length === 0" kind="empty" :title="t('connectionsView.empty')" />

    <!-- Connections: Responsive (Mobile cards + Desktop table) -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between px-2">
        <p class="text-xs text-slate-400">
          {{ t('connectionsView.listHint') }}
        </p>
      </div>

      <!-- Mobile cards -->
      <div class="sm:hidden space-y-3">
        <div
          v-for="conn in connections"
          :key="conn.id"
          class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 hover:bg-slate-850/80 transition-all"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-0.5 rounded-md border font-medium inline-flex items-center gap-1" :class="getDeviceBadge(conn.device_name).tone">
                  <span>{{ getDeviceBadge(conn.device_name).icon }}</span>
                  <span>{{ getDeviceBadge(conn.device_name).label }}</span>
                </span>
              </div>
              <p class="font-bold text-white text-base flex items-center gap-2 mt-1.5">
                {{ conn.device_name || t('common.unnamed') }}
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ serverName(conn.server_id) }} · <span class="font-mono text-midori-400">{{ conn.assigned_ip.replace('/32','') }}</span>
              </p>
            </div>
            <span
              :class="conn.is_active ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
              class="text-xs font-semibold px-2.5 py-1 rounded-full border ml-2 whitespace-nowrap"
            >
              {{ conn.is_active ? t('common.active') : t('common.inactive') }}
            </span>
          </div>

          <p class="text-xs text-slate-400 mb-4 font-mono">
            ↑{{ formatBytes(conn.bytes_sent) }} · ↓{{ formatBytes(conn.bytes_received) }}
          </p>

          <div class="flex items-center gap-3 border-t border-slate-800 pt-3">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs text-cyan-400 hover:text-white font-medium transition-colors"
              @click.stop="openDeviceDetail(conn)"
            >
              {{ t('connectionsView.viewConfig') }}
            </button>
            <template v-if="conn.is_active">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs text-amber-400 hover:text-white font-medium transition-colors"
                @click.stop="disconnect(conn.id)"
              >
                {{ t('common.disconnect') }}
              </button>
            </template>
            <button
              type="button"
              class="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors ml-auto"
              @click.stop="deleteConnection(conn.id)"
            >
              {{ t('connectionsView.deleteDevice') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop table -->
      <div class="hidden sm:block bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
        <table class="w-full text-sm">
          <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">{{ t('common.device') }}</th>
              <th class="px-6 py-4">{{ t('connectionsView.type') }}</th>
              <th class="px-6 py-4">{{ t('common.server') }}</th>
              <th class="px-6 py-4">{{ t('common.ip') }}</th>
              <th class="px-6 py-4 hidden md:table-cell">{{ t('connectionsView.trafficHeader') }}</th>
              <th class="px-6 py-4">{{ t('common.status') }}</th>
              <th class="px-6 py-4 text-right"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="conn in connections"
              :key="conn.id"
              class="hover:bg-slate-800/60 transition-colors group"
            >
              <td class="px-6 py-4 font-semibold text-white group-hover:text-midori-300 transition-colors flex items-center gap-2">
                {{ conn.device_name || t('common.unnamed') }}
                <svg class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs px-2.5 py-1 rounded-lg border font-medium inline-flex items-center gap-1.5" :class="getDeviceBadge(conn.device_name).tone">
                  <span>{{ getDeviceBadge(conn.device_name).icon }}</span>
                  <span>{{ getDeviceBadge(conn.device_name).label }}</span>
                </span>
              </td>
              <td class="px-6 py-4 font-medium text-slate-300">{{ serverName(conn.server_id) }}</td>
              <td class="px-6 py-4 font-mono text-midori-300 text-xs">{{ conn.assigned_ip.replace('/32','') }}</td>
              <td class="px-6 py-4 text-slate-400 hidden md:table-cell text-xs font-mono">
                ↑{{ formatBytes(conn.bytes_sent) }} · ↓{{ formatBytes(conn.bytes_received) }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="conn.is_active ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
                  class="text-xs font-semibold px-2.5 py-1 rounded-full border"
                >
                  {{ conn.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-cyan-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                    @click.stop="openDeviceDetail(conn)"
                  >
                    {{ t('connectionsView.viewConfig') }}
                  </button>
                  <template v-if="conn.is_active">
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-amber-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                      @click.stop="disconnect(conn.id)"
                    >
                      {{ t('common.disconnect') }}
                    </button>
                  </template>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    :title="t('connectionsView.deleteDevice')"
                    :aria-label="t('connectionsView.deleteDevice')"
                    @click.stop="deleteConnection(conn.id)"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Unified Device Card / Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="deviceModal.open"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <button type="button" class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" :aria-label="t('connectionsView.closeModal')" @click="closeDeviceModal"></button>

          <!-- Modal Card Container -->
          <div role="dialog" aria-modal="true" aria-labelledby="device-modal-title" class="relative bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl p-6 md:p-8 max-w-2xl w-full mx-4 flex flex-col gap-6 text-left max-h-[90vh] overflow-y-auto">
            <!-- Close button -->
            <button
              type="button"
              class="absolute top-5 right-5 text-slate-400 hover:text-white text-2xl leading-none cursor-pointer"
              :aria-label="t('connectionsView.closeModal')"
              @click="closeDeviceModal"
            >
              &times;
            </button>

            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
              <div>
                <div class="flex items-center gap-2.5">
                  <h3 id="device-modal-title" class="text-2xl font-bold text-white">
                    {{ deviceModal.conn?.device_name || t('connectionsView.defaultDevice') }}
                  </h3>
                  <span
                    :class="deviceModal.conn?.is_active ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'"
                    class="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                  >
                    {{ deviceModal.conn?.is_active ? t('common.active') : t('common.inactive') }}
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1">
                  {{ t('connectionsView.serverLabel') }}: <span class="text-slate-200 font-medium">{{ serverName(deviceModal.conn?.server_id || '') }}</span> ·
                  {{ t('common.ip') }}: <span class="font-mono text-midori-300">{{ deviceModal.conn?.assigned_ip.replace('/32','') }}</span>
                </p>
              </div>

              <!-- Quick action buttons -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-midori-700/50 bg-midori-900/40 text-xs font-semibold text-midori-300 hover:bg-midori-900/70 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  @click="copyDeviceModalConfig"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  {{ deviceModal.copied ? t('connectionsView.copiedShort') : t('common.copy') }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-midori-700/50 bg-midori-900/40 text-xs font-semibold text-midori-300 hover:bg-midori-900/70 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  @click="downloadDeviceModalConfig"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  .conf
                </button>
                <button
                  v-if="deviceModal.qrUrl"
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/70 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  @click="downloadDeviceModalQR"
                >
                  QR
                </button>
              </div>
            </div>

            <!-- Modal Body (Config & QR) -->
            <AsyncState v-if="deviceModal.loading" kind="loading" :title="t('common.loading')" />

            <div v-else class="flex flex-col md:flex-row gap-6">
              <!-- Config code block -->
              <div class="flex-1 min-w-0 flex flex-col">
                <p class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('connectionsView.configLabel') }}</p>
                <pre class="text-xs bg-slate-950 border border-slate-800/90 rounded-2xl p-4 font-mono text-midori-200 overflow-x-auto flex-1 shadow-inner leading-relaxed select-all">{{ deviceModal.configText }}</pre>
              </div>

              <!-- QR Code Card -->
              <div class="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <p class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{{ t('connectionsView.scanMobile') }}</p>
                <img
                  v-if="deviceModal.qrUrl"
                  :src="deviceModal.qrUrl"
                  :alt="t('connectionsView.qrAlt')"
                  class="w-44 h-44 rounded-xl border border-white/10 bg-white p-2 shadow-md"
                />
              </div>
            </div>

            <!-- Footer Stats & Management Actions -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
              <div class="font-mono">
                {{ t('connectionsView.trafficLabel') }}: ↑{{ formatBytes(deviceModal.conn?.bytes_sent || 0) }} · ↓{{ formatBytes(deviceModal.conn?.bytes_received || 0) }}
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="deviceModal.conn?.is_active"
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-amber-700/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 font-semibold transition-colors cursor-pointer"
                  @click="disconnect(deviceModal.conn.id)"
                >
                  {{ t('common.disconnect') }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-rose-800/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 font-semibold transition-colors cursor-pointer"
                  @click="deleteConnection(deviceModal.conn?.id || '')"
                >
                  {{ t('connectionsView.deleteDevice') }}
                </button>
              </div>
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
