<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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

const form = ref({
  server_id: '',
  public_key: '',
  device_name: '',
})

onMounted(async () => {
  await loadData()
})

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
  } catch (e) {
    console.error('Failed to load data', e)
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
  } catch (e: any) {
    alert(e.message)
  } finally {
    connecting.value = false
  }
}

async function generateKeypair() {
  generatingKeypair.value = true
  try {
    const kp = await api.post<Keypair>('/api/v1/control/keypair')
    generatedPrivateKey.value = kp.private_key
    form.value.public_key = kp.public_key
  } catch (e: any) {
    alert(e.message)
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
    alert(e.message)
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

onUnmounted(() => {
  if (clipboardTimer) clearTimeout(clipboardTimer)
})

function copyConfig() {
  if (!lastConfig.value) return
  const text = buildClientConfig(lastConfig.value)
  navigator.clipboard.writeText(text)
  alert(t('connectionsView.copied'))
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

function readStoredPrivateKeys(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PRIVATE_KEYS_STORAGE_KEY)
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
  localStorage.setItem(PRIVATE_KEYS_STORAGE_KEY, JSON.stringify(map))
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
    alert(e.message)
  }
}

async function downloadQR(id: string, deviceName: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/control/connections/${id}/qr`, {
      headers: authHeader(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }))
      throw new Error(err.error || `Request failed: ${res.status}`)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wg-${deviceName || id.slice(0, 8)}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ t('connectionsView.title') }}</h1>

    <!-- Connect form -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 dark:text-gray-100">{{ t('connectionsView.newConnection') }}</h2>
      <form @submit.prevent="connect" class="space-y-3">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Este panel aprovisiona un perfil WireGuard para tu dispositivo. Si no eliges servidor, se usa el menos cargado automáticamente.
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <select
            v-model="form.server_id"
            class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">{{ t('connectionsView.autoServer') }}</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.location }}) — {{ s.current_peers }}/{{ s.max_peers }}
              {{ serverPing[s.id] ? (serverPing[s.id].available ? ` · ${serverPing[s.id].latency_ms}ms` : ' · no disponible') : '' }}
            </option>
          </select>
          <input
            v-model="form.device_name"
            :placeholder="t('connectionsView.deviceNamePlaceholder')"
            class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-700 dark:text-gray-200"
          />
        </div>
        <div v-if="servers.length === 0" class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          No hay servidores activos para elegir. Si eres admin, actívalos en Admin Servers.
        </div>
        <div v-else-if="availableServerCount() === 0" class="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Hay servidores registrados, pero ninguno está respondiendo al health check del core. Así se evita crear perfiles que luego fallen con 502.
        </div>
        <div v-if="selectedServerUnavailable()" class="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          El servidor seleccionado no está disponible. Elige otro o usa modo auto.
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="form.public_key"
            :placeholder="t('connectionsView.publicKeyPlaceholder')"
            required
            class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 font-mono bg-white dark:bg-gray-700 dark:text-gray-200"
          />
          <button
            type="button"
            :disabled="generatingKeypair"
            @click="generateKeypair"
            class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {{ generatingKeypair ? 'Generando claves...' : 'Generar clave WG' }}
          </button>
          <button
            type="submit"
            :disabled="connecting || !canProvision()"
            class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {{ connecting ? t('common.connecting') : 'Aprovisionar perfil' }}
          </button>
        </div>
      </form>
    </div>

    <!-- WireGuard config result -->
    <div v-if="lastConfig" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-green-800 dark:text-green-400">{{ t('connectionsView.configTitle') }}</h3>
        <div class="flex items-center gap-3">
          <button @click="copyConfig" class="text-sm text-green-700 hover:text-green-900 font-medium">
            {{ t('common.copy') }}
          </button>
          <button @click="downloadGeneratedConfig" class="text-sm text-green-700 hover:text-green-900 font-medium">
            Descargar .conf
          </button>
        </div>
      </div>
      <div class="text-xs text-green-800 dark:text-green-300 mb-2">
        Si generaste la clave aquí, el .conf ya incluye PrivateKey. Si no, reemplaza PrivateKey con tu clave privada.
      </div>
      <pre class="text-xs bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">{{ buildClientConfig(lastConfig) }}</pre>
      <button @click="lastConfig = null" class="mt-3 text-xs text-gray-500 hover:text-gray-700">{{ t('connectionsView.closeConfig') }}</button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="connections.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('connectionsView.empty') }}
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
            <td class="px-6 py-4 text-gray-900">{{ conn.device_name || t('common.unnamed') }}</td>
            <td class="px-6 py-4 font-medium text-gray-700">{{ serverName(conn.server_id) }}</td>
            <td class="px-6 py-4 font-mono text-gray-600 text-xs">{{ conn.assigned_ip }}</td>
            <td class="px-6 py-4 text-gray-500 hidden md:table-cell text-xs">
              ↑{{ formatBytes(conn.bytes_sent) }} ↓{{ formatBytes(conn.bytes_received) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="conn.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ conn.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div v-if="conn.is_active" class="flex items-center justify-end gap-3">
                <button
                  @click="downloadConfig(conn.id, conn.device_name)"
                  class="text-xs text-midori-600 hover:text-midori-700 transition-colors"
                >
                  .conf
                </button>
                <button
                  @click="downloadQR(conn.id, conn.device_name)"
                  class="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                >
                  QR
                </button>
                <button
                  @click="disconnect(conn.id)"
                  class="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {{ t('common.disconnect') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
