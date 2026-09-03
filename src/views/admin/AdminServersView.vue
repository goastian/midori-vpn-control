<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { Server, TransportCapability } from '../../lib/schemas'
import AsyncState from '../../components/AsyncState.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import { beginResourceLoad, completeResourceLoad, type ResourceState } from '../../lib/resource-state'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const servers = ref<Server[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const serversState = ref<ResourceState>('idle')
const pingState = ref<ResourceState>('idle')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

type FormTransport = Pick<TransportCapability, 'protocol' | 'host' | 'port' | 'enabled' | 'priority'> & {
  metadataText: string
}

const createEmptyForm = () => ({
  name: '', host: '', endpoint: '', port: 443, wg_port: 51820,
  public_key: '', location: '', country_code: '', max_peers: 250,
  is_active: true,
  transports: [{ protocol: 'wireguard', host: '', port: 51820, enabled: true, priority: 100, metadataText: '{}' }] as FormTransport[],
})
const form = ref(createEmptyForm())
const formErrors = ref<Record<string, string>>({})

onMounted(async () => {
  await loadServers()
  refreshTimer = setInterval(() => {
    loadServers()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

async function loadServers() {
  serversState.value = beginResourceLoad(servers.value.length > 0 || serversState.value === 'empty')
  try {
    const serverList = await api.get<Server[]>('/api/v1/admin/servers')
    servers.value = serverList || []
    serversState.value = completeResourceLoad(servers.value.length > 0)
    void loadPings()
  } catch {
    serversState.value = 'error'
  }
}

async function loadPings() {
  pingState.value = beginResourceLoad(Object.keys(serverPing.value).length > 0 || pingState.value === 'empty')
  try {
    const pings = (await api.get<ServerPingResult[]>('/api/v1/admin/servers/ping')) || []
    serverPing.value = Object.fromEntries(pings.map((item) => [item.server_id, item]))
    pingState.value = completeResourceLoad(pings.length > 0)
  } catch {
    pingState.value = 'error'
  }
}

function serverStatus(server: Server): 'online' | 'offline' | 'unknown' {
  const ping = serverPing.value[server.id]
  if (!ping) return 'unknown'
  return ping.available ? 'online' : 'offline'
}

function serverTransports(server: Server): TransportCapability[] {
  return server.transports ?? []
}

function startEdit(s: Server) {
  editingId.value = s.id
  form.value = {
    name: s.name, host: s.host, endpoint: s.endpoint ?? '', port: s.port, wg_port: s.wg_port,
    public_key: s.public_key,
    location: s.location, country_code: s.country_code, max_peers: s.max_peers,
    is_active: s.is_active,
    transports: serverTransports(s).map(({ protocol, host, port, enabled, priority, metadata }) => ({ protocol, host, port, enabled, priority, metadataText: JSON.stringify(metadata ?? {}) })),
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = createEmptyForm()
  formErrors.value = {}
}

function validateForm(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.name.trim()) errors.name = t('adminServers.nameRequired')
  if (!form.value.host.trim()) errors.host = t('adminServers.hostRequired')
  if (form.value.port < 1 || form.value.port > 65535) errors.port = t('adminServers.portInvalid')
  if (form.value.wg_port < 1 || form.value.wg_port > 65535) errors.wg_port = t('adminServers.wgPortInvalid')
  const seenProtocols = new Set<string>()
  for (const [index, transport] of form.value.transports.entries()) {
    if (seenProtocols.has(transport.protocol)) errors[`transport_${index}`] = t('adminServers.protocolUnique')
    seenProtocols.add(transport.protocol)
    if (!transport.host.trim()) errors[`transport_${index}`] = t('adminServers.transportHostRequired')
    if (transport.port < 1 || transport.port > 65535) errors[`transport_${index}`] = t('adminServers.transportPortInvalid')
    if (transport.priority < 0 || transport.priority > 1000) errors[`transport_${index}`] = t('adminServers.priorityInvalid')
    try {
      const metadata = JSON.parse(transport.metadataText)
      if (metadata === null || Array.isArray(metadata) || typeof metadata !== 'object') {
        errors[`transport_${index}`] = t('adminServers.metadataObject')
      }
    } catch {
      errors[`transport_${index}`] = t('adminServers.metadataInvalid')
    }
  }
  if (form.value.transports.length === 0) errors.transports = t('adminServers.transportRequired')
  if (!form.value.public_key.trim()) errors.public_key = t('adminServers.publicKeyRequired')
  if (form.value.max_peers < 1) errors.max_peers = t('adminServers.maxPeersInvalid')
  if (form.value.country_code && !/^[A-Z]{2}$/.test(form.value.country_code))
    errors.country_code = t('adminServers.countryInvalid')
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function saveServer() {
  if (!validateForm()) return
  const wasEditing = Boolean(editingId.value)
  saving.value = true
  feedback.value = null
  try {
    const transports = form.value.transports.map(({ metadataText, ...transport }) => ({
      ...transport,
      protocol: transport.protocol.toLowerCase(),
      metadata: JSON.parse(metadataText),
    }))
    const wireguard = transports.find((transport) => transport.protocol === 'wireguard')
    const payload = {
      ...form.value,
      transports,
      wg_port: wireguard?.port ?? form.value.wg_port,
      endpoint: wireguard?.host ?? form.value.endpoint,
    }
    if (editingId.value) {
      await api.put(`/api/v1/admin/servers/${editingId.value}`, payload)
    } else {
      await api.post('/api/v1/admin/servers', payload)
    }
    cancelForm()
    await loadServers()
    feedback.value = { kind: 'success', message: t(wasEditing ? 'adminServers.updateSuccess' : 'adminServers.createSuccess') }
  } catch {
    formErrors.value.general = t('adminServers.saveError')
  } finally {
    saving.value = false
  }
}

const transportProtocols: FormTransport['protocol'][] = ['wireguard', 'wss', 'masque', 'openvpn', 'ikev2', 'proxy']

function addTransport() {
  const protocol = transportProtocols.find((candidate) => !form.value.transports.some((item) => item.protocol === candidate))
  if (!protocol) return
  form.value.transports.push({ protocol, host: form.value.host, port: protocol === 'wireguard' ? 51820 : 443, enabled: true, priority: 50, metadataText: '{}' })
}

function removeTransport(index: number) {
  form.value.transports.splice(index, 1)
}

const confirmDelete = ref<string | null>(null)

function promptDeleteServer(id: string) {
  deleteError.value = ''
  feedback.value = null
  confirmDelete.value = id
}

async function executeDeleteServer() {
  if (!confirmDelete.value) return
  const id = confirmDelete.value
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete(`/api/v1/admin/servers/${id}`)
    confirmDelete.value = null
    await loadServers()
    feedback.value = { kind: 'success', message: t('adminServers.deleteSuccess') }
  } catch (error) {
    deleteError.value = error && typeof error === 'object' && 'code' in error && error.code === 'server_not_drained'
      ? t('adminServers.serverNotDrained')
      : t('adminServers.deleteError')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" :aria-label="t('adminServers.closeDialog')" @click="confirmDelete = null"></button>
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-server-title" aria-describedby="delete-server-detail" class="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-4 space-y-4">
        <h3 id="delete-server-title" class="text-xl font-bold text-white">{{ t('adminServers.deleteConfirm') }}</h3>
        <p id="delete-server-detail" class="text-sm text-slate-400">{{ t('adminServers.deleteDetail') }}</p>
        <p v-if="deleteError" role="alert" class="text-sm text-rose-300">{{ deleteError }}</p>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" :disabled="deleting" class="px-4 py-2.5 text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer" @click="confirmDelete = null">
            {{ t('common.cancel') }}
          </button>
          <button type="button" :disabled="deleting" :aria-busy="deleting" class="px-4 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/30 transition cursor-pointer disabled:opacity-50" @click="executeDeleteServer">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminServers.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ t('adminServers.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-midori-600 hover:bg-midori-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer self-start sm:self-auto"
        @click="showForm ? cancelForm() : (showForm = true)"
      >
        {{ showForm ? t('common.cancel') : t('adminServers.addServer') }}
      </button>
    </div>

    <!-- Server Form -->
    <div v-if="showForm" class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl space-y-6">
      <h2 class="text-xl font-bold text-white">{{ editingId ? t('adminServers.editServer') : t('adminServers.newServer') }}</h2>
      <div v-if="formErrors.general" role="alert" class="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-sm text-rose-300">
        {{ formErrors.general }}
      </div>
      <form class="grid grid-cols-1 md:grid-cols-2 gap-5" @submit.prevent="saveServer">
        <div>
          <label for="server-name" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('common.name') }}</label>
          <input id="server-name" v-model="form.name" :placeholder="t('common.name')" required :aria-invalid="Boolean(formErrors.name)" :aria-describedby="formErrors.name ? 'server-name-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.name ? 'border-rose-500' : ''" />
          <p v-if="formErrors.name" id="server-name-error" class="text-xs text-rose-400 mt-1">{{ formErrors.name }}</p>
        </div>
        <div>
          <label for="server-host" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.host') }}</label>
          <input id="server-host" v-model="form.host" :placeholder="t('adminServers.host')" required :aria-invalid="Boolean(formErrors.host)" :aria-describedby="formErrors.host ? 'server-host-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.host ? 'border-rose-500' : ''" />
          <p v-if="formErrors.host" id="server-host-error" class="text-xs text-rose-400 mt-1">{{ formErrors.host }}</p>
        </div>
        <div>
          <label for="server-endpoint" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.endpoint') }}</label>
          <input id="server-endpoint" v-model="form.endpoint" :placeholder="t('adminServers.endpoint')" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" />
        </div>
        <div>
          <label for="server-api-port" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.apiPort') }}</label>
          <input id="server-api-port" v-model.number="form.port" type="number" min="1" max="65535" :placeholder="t('adminServers.apiPort')" :aria-invalid="Boolean(formErrors.port)" :aria-describedby="formErrors.port ? 'server-api-port-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.port ? 'border-rose-500' : ''" />
          <p v-if="formErrors.port" id="server-api-port-error" class="text-xs text-rose-400 mt-1">{{ formErrors.port }}</p>
        </div>
        <div>
          <label for="server-wg-port" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.wgPort') }}</label>
          <input id="server-wg-port" v-model.number="form.wg_port" type="number" min="1" max="65535" :placeholder="t('adminServers.wgPort')" :aria-invalid="Boolean(formErrors.wg_port)" :aria-describedby="formErrors.wg_port ? 'server-wg-port-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.wg_port ? 'border-rose-500' : ''" />
          <p v-if="formErrors.wg_port" id="server-wg-port-error" class="text-xs text-rose-400 mt-1">{{ formErrors.wg_port }}</p>
        </div>
        <div>
          <label for="server-public-key" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.wgPublicKey') }}</label>
          <input id="server-public-key" v-model="form.public_key" :placeholder="t('adminServers.wgPublicKey')" required :aria-invalid="Boolean(formErrors.public_key)" :aria-describedby="formErrors.public_key ? 'server-public-key-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.public_key ? 'border-rose-500' : ''" />
          <p v-if="formErrors.public_key" id="server-public-key-error" class="text-xs text-rose-400 mt-1">{{ formErrors.public_key }}</p>
        </div>
        <div>
          <label for="server-location" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.location') }}</label>
          <input id="server-location" v-model="form.location" :placeholder="t('adminServers.location')" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" />
        </div>
        <div>
          <label for="server-country" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.country') }}</label>
          <input id="server-country" v-model="form.country_code" :placeholder="t('adminServers.country')" maxlength="2" :aria-invalid="Boolean(formErrors.country_code)" :aria-describedby="formErrors.country_code ? 'server-country-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white uppercase outline-none focus:border-midori-500 transition-colors" :class="formErrors.country_code ? 'border-rose-500' : ''" />
          <p v-if="formErrors.country_code" id="server-country-error" class="text-xs text-rose-400 mt-1">{{ formErrors.country_code }}</p>
        </div>
        <div>
          <label for="server-max-peers" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminServers.maxPeers') }}</label>
          <input id="server-max-peers" v-model.number="form.max_peers" type="number" min="1" :placeholder="t('adminServers.maxPeers')" :aria-invalid="Boolean(formErrors.max_peers)" :aria-describedby="formErrors.max_peers ? 'server-max-peers-error' : undefined" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.max_peers ? 'border-rose-500' : ''" />
          <p v-if="formErrors.max_peers" id="server-max-peers-error" class="text-xs text-rose-400 mt-1">{{ formErrors.max_peers }}</p>
        </div>
        <div class="flex items-center pt-6">
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded bg-slate-950 border-slate-700 text-midori-500 focus:ring-midori-500" />
            <span class="text-sm font-medium text-slate-200">{{ t('adminServers.activeToggle') }}</span>
          </label>
        </div>
        <div class="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-white">{{ t('adminServers.transports') }}</h3>
              <p class="text-xs text-slate-400 mt-1">{{ t('adminServers.transportsHelp') }}</p>
            </div>
            <button type="button" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-midori-300 disabled:opacity-40" :disabled="form.transports.length >= transportProtocols.length" @click="addTransport">{{ t('adminServers.addTransport') }}</button>
          </div>
          <p v-if="formErrors.transports" class="text-xs text-rose-400">{{ formErrors.transports }}</p>
          <div v-for="(transport, index) in form.transports" :key="`${transport.protocol}-${index}`" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-xl border border-slate-800 p-3">
            <label class="sm:col-span-2 text-xs text-slate-400">{{ t('adminServers.protocol') }}
              <select v-model="transport.protocol" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white">
                <option v-for="protocol in transportProtocols" :key="protocol" :value="protocol">{{ protocol }}</option>
              </select>
            </label>
            <label class="sm:col-span-4 text-xs text-slate-400">{{ t('adminServers.host') }}
              <input v-model="transport.host" placeholder="vpn.example.org" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white" />
            </label>
            <label class="sm:col-span-2 text-xs text-slate-400">{{ t('adminServers.port') }}
              <input v-model.number="transport.port" type="number" min="1" max="65535" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white" />
            </label>
            <label class="sm:col-span-2 text-xs text-slate-400">{{ t('adminServers.priority') }}
              <input v-model.number="transport.priority" type="number" min="0" max="1000" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white" />
            </label>
            <div class="sm:col-span-2 flex gap-2 items-center pb-1">
              <label class="text-xs text-slate-300 flex items-center gap-1.5"><input v-model="transport.enabled" type="checkbox" class="rounded bg-slate-900 border-slate-700 text-midori-500" /> {{ t('adminServers.activeToggle') }}</label>
              <button type="button" class="ml-auto text-xs text-rose-400 hover:text-rose-300" @click="removeTransport(index)">{{ t('adminServers.removeTransport') }}</button>
            </div>
            <label class="sm:col-span-12 text-xs text-slate-400">{{ t('adminServers.metadata') }}
              <textarea v-model="transport.metadataText" rows="2" spellcheck="false" placeholder="{}" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-xs text-white"></textarea>
            </label>
            <p v-if="formErrors[`transport_${index}`]" class="sm:col-span-12 text-xs text-rose-400">{{ formErrors[`transport_${index}`] }}</p>
          </div>
        </div>
        <div class="md:col-span-2 pt-2">
          <button type="submit" :disabled="saving" :aria-busy="saving" class="bg-midori-600 hover:bg-midori-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer disabled:opacity-50">
            {{ editingId ? t('adminServers.saveEdit') : t('adminServers.saveNew') }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="feedback" :role="feedback.kind === 'error' ? 'alert' : 'status'" class="rounded-2xl border p-4 text-sm" :class="feedback.kind === 'error' ? 'border-rose-800/50 bg-rose-950/40 text-rose-300' : 'border-midori-800/50 bg-midori-950/40 text-midori-300'">
      {{ feedback.message }}
    </div>

    <ResourceSkeleton v-if="serversState === 'idle' || serversState === 'loading'" :title="t('adminServers.loading')" item-class="h-20" />
    <AsyncState v-else-if="serversState === 'error' && servers.length === 0" kind="error" :title="t('adminServers.loadError')" :retry-label="t('common.retry')" @retry="loadServers()" />
    <AsyncState v-else-if="serversState === 'empty'" kind="empty" :title="t('adminServers.empty')" />

    <div v-else class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
      <p v-if="serversState === 'refreshing'" role="status" class="border-b border-slate-800 px-6 py-3 text-xs text-slate-400">{{ t('common.refreshing') }}</p>
      <p v-else-if="serversState === 'error'" role="alert" class="border-b border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300">{{ t('common.refreshFailed') }}</p>
      <p v-if="pingState === 'loading' || pingState === 'refreshing'" role="status" class="border-b border-slate-800 px-6 py-2 text-xs text-slate-400">{{ t('common.refreshing') }}</p>
      <p v-else-if="pingState === 'error'" role="status" class="border-b border-amber-900/40 bg-amber-950/20 px-6 py-2 text-xs text-amber-300">{{ t('common.refreshFailed') }}</p>
      <table class="w-full text-sm">
        <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="px-6 py-4">{{ t('common.name') }}</th>
            <th class="px-6 py-4">{{ t('adminServers.host') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('adminServers.location') }}</th>
            <th class="px-6 py-4">{{ t('common.peers') }}</th>
            <th class="px-6 py-4 hidden lg:table-cell">{{ t('adminServers.capabilities') }}</th>
            <th class="px-6 py-4">{{ t('common.status') }}</th>
            <th class="px-6 py-4 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-for="s in servers" :key="s.id" class="hover:bg-slate-800/50 transition-colors">
            <td class="px-6 py-4 font-semibold text-white">{{ s.name }}</td>
            <td class="px-6 py-4 font-mono text-xs text-midori-300">{{ s.host }}:{{ s.port }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-slate-300">{{ s.location }} {{ s.country_code ? `(${s.country_code})` : '' }}</td>
            <td class="px-6 py-4 font-mono text-slate-300">{{ s.current_peers }} / {{ s.max_peers }}</td>
            <td class="px-6 py-4 hidden lg:table-cell">
              <div class="flex flex-wrap gap-1.5">
				<span v-for="transport in serverTransports(s)" :key="transport.protocol" :class="transport.enabled && transport.health_status === 'healthy' ? 'bg-midori-950/60 border-midori-800/40 text-midori-300' : 'bg-slate-800 border-slate-700 text-slate-400'" class="text-xs border font-semibold px-2 py-0.5 rounded-md">{{ transport.protocol }}:{{ transport.port }}</span>
                <span v-if="s.supports_mesh_exit" class="text-xs bg-midori-950/60 border border-midori-800/40 text-midori-300 font-semibold px-2 py-0.5 rounded-md">Mesh</span>
				<span v-if="serverTransports(s).length === 0 && !s.supports_wireguard && !s.supports_proxy && !s.supports_mesh_exit" class="text-xs text-slate-500">—</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="serverStatus(s) === 'online' ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : serverStatus(s) === 'offline' ? 'bg-rose-950/60 border-rose-700/50 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-300'" class="text-xs font-semibold px-2.5 py-1 rounded-full border">
                {{ t(`adminServers.${serverStatus(s)}`) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button type="button" class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-midori-400 hover:text-white transition cursor-pointer" @click="startEdit(s)">{{ t('common.edit') }}</button>
              <button type="button" class="px-2.5 py-1 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs font-medium text-rose-400 hover:bg-rose-900/40 transition cursor-pointer" @click="promptDeleteServer(s.id)">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
