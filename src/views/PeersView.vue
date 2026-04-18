<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import type { Server, Connection, ConnectionConfig } from '../lib/schemas'

type Keypair = {
  private_key: string
  public_key: string
}

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const API_URL = import.meta.env.VITE_API_URL || ''

const servers = ref<Server[]>([])
const connections = ref<Connection[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const loading = ref(true)
const connecting = ref(false)
const generatingKeypair = ref(false)
const lastConfig = ref<ConnectionConfig | null>(null)
const generatedPrivateKey = ref('')
const lastProvisionedDeviceName = ref('midori-client')
const { t } = useLocale()
const PRIVATE_KEYS_STORAGE_KEY = 'midori-private-keys-by-peer'

// Inline notification
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | null = null

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => { notification.value = null }, 5000)
}

// QR for post-provision config
const provisionQRUrl = ref('')
const provisionQRLoading = ref(false)

// QR modal state
const qrModal = ref<{ open: boolean; url: string; loading: boolean; deviceName: string }>({
  open: false, url: '', loading: false, deviceName: '',
})

const form = ref({
  server_id: '',
  public_key: '',
  device_name: '',
})

onMounted(async () => {
  await loadData()
  document.addEventListener('keydown', onEscapeKey)
})

onUnmounted(() => {
  if (clipboardTimer) clearTimeout(clipboardTimer)
  if (notificationTimer) clearTimeout(notificationTimer)
  if (provisionQRUrl.value) URL.revokeObjectURL(provisionQRUrl.value)
  if (qrModal.value.url) URL.revokeObjectURL(qrModal.value.url)
  document.removeEventListener('keydown', onEscapeKey)
})

function onEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeQRModal()
}

async function loadData() {
  loading.value = true
  try {
    const [s, c, pings] = await Promise.all([
      api.get<Server[]>('/api/v1/control/servers'),
      api.get<Connection[]>('/api/v1/control/connections'),
      api.get<ServerPingResult[]>('/api/v1/control/servers/ping').catch(() => []),
    ])
    servers.value = s || []
    connections.value = c || []
    serverPing.value = Object.fromEntries((pings || []).map((item) => [item.server_id, item]))
  } catch (e: any) {
    showNotification('error', e.message || 'Failed to load data')
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

function canProvision(): boolean {
  if (!form.value.public_key) return false
  if (selectedServerUnavailable()) return false
  return availableServerCount() > 0
}

async function connect() {
  if (!canProvision()) return
  connecting.value = true
  try {
    const currentDeviceName = form.value.device_name || 'midori-client'
    const config = await api.post<ConnectionConfig>('/api/v1/control/connections', form.value)
    lastConfig.value = config
    lastProvisionedDeviceName.value = currentDeviceName
    if (generatedPrivateKey.value) {
      savePrivateKeyForPeer(config.peer_id, generatedPrivateKey.value)
    }
    form.value = { server_id: '', public_key: '', device_name: '' }
    await loadData()
    // Fetch QR for the newly provisioned config
    await nextTick()
    await fetchProvisionQR(config.peer_id)
  } catch (e: any) {
    showNotification('error', e.message)
  } finally {
    connecting.value = false
  }
}

async function fetchProvisionQR(peerId: string) {
  provisionQRLoading.value = true
  if (provisionQRUrl.value) URL.revokeObjectURL(provisionQRUrl.value)
  provisionQRUrl.value = ''
  try {
    const res = await fetch(`${API_URL}/api/v1/control/connections/${peerId}/qr`, {
      headers: authHeader(),
    })
    if (!res.ok) throw new Error('QR fetch failed')
    const blob = await res.blob()
    provisionQRUrl.value = URL.createObjectURL(blob)
  } catch {
    // QR is optional — don't block the flow
  } finally {
    provisionQRLoading.value = false
  }
}

async function generateKeypair() {
  generatingKeypair.value = true
  try {
    const kp = await api.post<Keypair>('/api/v1/control/keypair')
    generatedPrivateKey.value = kp.private_key
    form.value.public_key = kp.public_key
  } catch (e: any) {
    showNotification('error', e.message)
  } finally {
    generatingKeypair.value = false
  }
}

async function disconnect(id: string) {
  if (!confirm(t('connectionsView.disconnectConfirm'))) return
  try {
    await api.delete(`/api/v1/control/connections/${id}`)
    await loadData()
  } catch (e: any) {
    showNotification('error', e.message)
  }
}

async function deleteConnection(id: string) {
  if (!confirm(t('connectionsView.deleteConfirm'))) return
  try {
    await api.delete(`/api/v1/control/connections/${id}/device`)
    await loadData()
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

let clipboardTimer: ReturnType<typeof setTimeout> | null = null

function copyConfig() {
  if (!lastConfig.value) return
  const text = buildClientConfig(lastConfig.value)
  navigator.clipboard.writeText(text)
  showNotification('success', t('connectionsView.copied'))
  if (clipboardTimer) clearTimeout(clipboardTimer)
  clipboardTimer = setTimeout(() => {
    navigator.clipboard.writeText('').catch(() => {})
  }, 60_000)
}

function buildClientConfig(config: ConnectionConfig): string {
  const privateKeyLine = generatedPrivateKey.value
    ? `PrivateKey = ${generatedPrivateKey.value}`
    : 'PrivateKey = <PEGA_AQUI_TU_PRIVATE_KEY>'

  return `[Interface]
${privateKeyLine}
Address = ${config.peer_ip}/32
DNS = ${config.dns}

[Peer]
PublicKey = ${config.server_public_key}
Endpoint = ${config.server_endpoint}
AllowedIPs = ${config.allowed_ips}
PersistentKeepalive = 25`
}

function downloadGeneratedConfig() {
  if (!lastConfig.value) return
  const text = buildClientConfig(lastConfig.value)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${lastProvisionedDeviceName.value || 'midori-client'}.conf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadProvisionQR() {
  if (!provisionQRUrl.value) return
  const link = document.createElement('a')
  link.href = provisionQRUrl.value
  link.download = `${lastProvisionedDeviceName.value || 'midori-client'}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function closeProvisionConfig() {
  lastConfig.value = null
  generatedPrivateKey.value = ''
  if (provisionQRUrl.value) URL.revokeObjectURL(provisionQRUrl.value)
  provisionQRUrl.value = ''
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

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function downloadConfig(id: string, deviceName: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/control/connections/${id}/config`, {
      headers: authHeader(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }))
      throw new Error(err.error || `Request failed: ${res.status}`)
    }

    let text = await res.text()
    const privateKey = getPrivateKeyForPeer(id)
    if (privateKey) {
      text = text.replace('PrivateKey = <YOUR_PRIVATE_KEY>', `PrivateKey = ${privateKey}`)
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wg-${deviceName || id.slice(0, 8)}.conf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    showNotification('error', e.message)
  }
}

// --- QR Modal ---

async function openQRModal(id: string, deviceName: string) {
  qrModal.value = { open: true, url: '', loading: true, deviceName: deviceName || id.slice(0, 8) }
  try {
    const res = await fetch(`${API_URL}/api/v1/control/connections/${id}/qr`, {
      headers: authHeader(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }))
      throw new Error(err.error || `Request failed: ${res.status}`)
    }
    const blob = await res.blob()
    qrModal.value.url = URL.createObjectURL(blob)
  } catch (e: any) {
    showNotification('error', e.message)
    qrModal.value.open = false
  } finally {
    qrModal.value.loading = false
  }
}

function closeQRModal() {
  if (qrModal.value.url) URL.revokeObjectURL(qrModal.value.url)
  qrModal.value = { open: false, url: '', loading: false, deviceName: '' }
}

function downloadModalQR() {
  if (!qrModal.value.url) return
  const link = document.createElement('a')
  link.href = qrModal.value.url
  link.download = `wg-${qrModal.value.deviceName}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('connectionsView.title') }}</h1>

    <!-- Inline notification -->
    <Transition name="fade">
      <div
        v-if="notification"
        :class="notification.type === 'success'
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'"
        class="border rounded-lg px-4 py-3 mb-4 text-sm flex items-center justify-between"
      >
        <span>{{ notification.message }}</span>
        <button @click="notification = null" class="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
      </div>
    </Transition>

    <!-- Connect form -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 dark:text-gray-100">{{ t('connectionsView.newConnection') }}</h2>
      <form @submit.prevent="connect" class="space-y-4">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ t('connectionsView.provisionDescription') }}
        </p>

        <!-- Server + device name -->
        <div class="flex flex-col sm:flex-row gap-3">
          <select
            v-model="form.server_id"
            class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">{{ t('connectionsView.autoServer') }}</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.location }}) — {{ s.current_peers }}/{{ s.max_peers }}
              {{ serverPing[s.id] ? (serverPing[s.id].available ? ` · ${serverPing[s.id].latency_ms}ms` : ` · ${t('connectionsView.unavailableLabel')}`) : '' }}
            </option>
          </select>
          <input
            v-model="form.device_name"
            :placeholder="t('connectionsView.deviceNamePlaceholder')"
            class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        <!-- Warnings -->
        <div v-if="servers.length === 0" class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          {{ t('connectionsView.noActiveServers') }}
        </div>
        <div v-else-if="availableServerCount() === 0" class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          {{ t('connectionsView.noRespondingServers') }}
        </div>
        <div v-if="selectedServerUnavailable()" class="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {{ t('connectionsView.serverUnavailable') }}
        </div>

        <!-- Public key + generate + provision -->
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div class="relative flex-1">
            <input
              v-model="form.public_key"
              :placeholder="t('connectionsView.publicKeyPlaceholder')"
              required
              class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 pr-28"
            />
            <span
              v-if="generatedPrivateKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full"
            >
              ✓ {{ t('connectionsView.keyGenerated') }}
            </span>
          </div>
          <button
            type="button"
            :disabled="generatingKeypair"
            @click="generateKeypair"
            class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap text-sm"
          >
            {{ generatingKeypair ? t('connectionsView.generatingKeys') : t('connectionsView.generateKey') }}
          </button>
          <button
            type="submit"
            :disabled="connecting || !canProvision()"
            class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap text-sm"
          >
            {{ connecting ? t('common.connecting') : t('connectionsView.provisionProfile') }}
          </button>
        </div>
      </form>
    </div>

    <!-- WireGuard config result with QR -->
    <div v-if="lastConfig" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-green-800 dark:text-green-400">{{ t('connectionsView.configTitle') }}</h3>
        <div class="flex items-center gap-3">
          <button @click="copyConfig" class="text-sm text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 font-medium">
            {{ t('common.copy') }}
          </button>
          <button @click="downloadGeneratedConfig" class="text-sm text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 font-medium">
            {{ t('connectionsView.downloadConf') }}
          </button>
          <button v-if="provisionQRUrl" @click="downloadProvisionQR" class="text-sm text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 font-medium">
            {{ t('connectionsView.downloadQR') }}
          </button>
        </div>
      </div>
      <p class="text-xs text-green-800 dark:text-green-300 mb-3">
        {{ t('connectionsView.configPrivateKeyHint') }}
      </p>
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Config text -->
        <pre class="text-xs bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-gray-700 dark:text-gray-300 overflow-x-auto flex-1 min-w-0">{{ buildClientConfig(lastConfig) }}</pre>
        <!-- QR code -->
        <div class="flex-shrink-0 flex flex-col items-center justify-center">
          <div v-if="provisionQRLoading" class="w-48 h-48 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
          <img
            v-else-if="provisionQRUrl"
            :src="provisionQRUrl"
            alt="WireGuard QR Code"
            class="w-48 h-48 rounded-lg border border-green-200 dark:border-green-700 bg-white"
          />
        </div>
      </div>
      <button @click="closeProvisionConfig" class="mt-4 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        {{ t('connectionsView.closeConfig') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="connections.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('connectionsView.empty') }}
    </div>

    <!-- Connections: responsive (mobile cards + desktop table) -->
    <div v-else>
      <!-- Mobile cards -->
      <div class="sm:hidden space-y-3">
        <div
          v-for="conn in connections"
          :key="conn.id"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ conn.device_name || t('common.unnamed') }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ serverName(conn.server_id) }} · <span class="font-mono">{{ conn.assigned_ip.replace('/32','') }}</span>
              </p>
            </div>
            <span
              :class="conn.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
              class="text-xs font-medium px-2 py-1 rounded-full ml-2 whitespace-nowrap"
            >
              {{ conn.is_active ? t('common.active') : t('common.inactive') }}
            </span>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">
            ↑{{ formatBytes(conn.bytes_sent) }} ↓{{ formatBytes(conn.bytes_received) }}
          </p>
          <div class="flex items-center gap-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <template v-if="conn.is_active">
              <button
                @click="downloadConfig(conn.id, conn.device_name)"
                class="text-xs text-midori-600 hover:text-midori-700 dark:text-midori-400 dark:hover:text-midori-300 font-medium transition-colors"
              >
                .conf
              </button>
              <button
                @click="openQRModal(conn.id, conn.device_name)"
                class="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                QR
              </button>
              <button
                @click="disconnect(conn.id)"
                class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
              >
                {{ t('common.disconnect') }}
              </button>
            </template>
            <button
              @click="deleteConnection(conn.id)"
              class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium transition-colors ml-auto"
            >
              {{ t('connectionsView.deleteDevice') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop table -->
      <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3">{{ t('common.device') }}</th>
              <th class="px-6 py-3">{{ t('common.server') }}</th>
              <th class="px-6 py-3">{{ t('common.ip') }}</th>
              <th class="px-6 py-3 hidden md:table-cell">{{ t('connectionsView.trafficHeader') }}</th>
              <th class="px-6 py-3">{{ t('common.status') }}</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
            <tr v-for="conn in connections" :key="conn.id" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <td class="px-6 py-4 text-gray-900 dark:text-gray-100">{{ conn.device_name || t('common.unnamed') }}</td>
              <td class="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{{ serverName(conn.server_id) }}</td>
              <td class="px-6 py-4 font-mono text-gray-600 dark:text-gray-400 text-xs">{{ conn.assigned_ip.replace('/32','') }}</td>
              <td class="px-6 py-4 text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">
                ↑{{ formatBytes(conn.bytes_sent) }} ↓{{ formatBytes(conn.bytes_received) }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="conn.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
                  class="text-xs font-medium px-2 py-1 rounded-full"
                >
                  {{ conn.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-3">
                  <template v-if="conn.is_active">
                    <button
                      @click="downloadConfig(conn.id, conn.device_name)"
                      class="text-xs text-midori-600 hover:text-midori-700 dark:text-midori-400 dark:hover:text-midori-300 transition-colors"
                    >
                      .conf
                    </button>
                    <button
                      @click="openQRModal(conn.id, conn.device_name)"
                      class="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      QR
                    </button>
                    <button
                      @click="disconnect(conn.id)"
                      class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      {{ t('common.disconnect') }}
                    </button>
                  </template>
                  <button
                    @click="deleteConnection(conn.id)"
                    class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors"
                    :title="t('connectionsView.deleteDevice')"
                  >
                    &#x1F5D1;
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- QR Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="qrModal.open"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeQRModal"
        >
          <!-- Overlay -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <!-- Modal content -->
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
            <button
              @click="closeQRModal"
              class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ qrModal.deviceName }}
            </h3>
            <div v-if="qrModal.loading" class="w-64 h-64 flex items-center justify-center">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-midori-600"></div>
            </div>
            <img
              v-else-if="qrModal.url"
              :src="qrModal.url"
              alt="WireGuard QR Code"
              class="w-64 h-64 rounded-lg border border-gray-200 dark:border-gray-600 bg-white"
            />
            <div class="flex gap-3">
              <button
                v-if="qrModal.url"
                @click="downloadModalQR"
                class="bg-midori-600 hover:bg-midori-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {{ t('connectionsView.downloadQR') }}
              </button>
              <button
                @click="closeQRModal"
                class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {{ t('connectionsView.closeModal') }}
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
