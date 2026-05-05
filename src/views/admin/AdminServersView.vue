<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { Server } from '../../lib/schemas'

type ServerPingResult = {
  server_id: string
  latency_ms: number
  available: boolean
}

const servers = ref<Server[]>([])
const serverPing = ref<Record<string, ServerPingResult>>({})
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const showToken = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

const emptyForm = {
  name: '', host: '', endpoint: '', port: 8080, wg_port: 51820,
  public_key: '', core_token: '', location: '', country_code: '', max_peers: 250,
  proxy_port: 8888,
  is_active: true,
}
const form = ref({ ...emptyForm })
const formErrors = ref<Record<string, string>>({})

onMounted(async () => {
  await loadServers()
  refreshTimer = setInterval(() => {
    loadServers({ silent: true })
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

async function loadServers(options: { silent?: boolean } = {}) {
  if (!options.silent) loading.value = true
  try {
    const [serverList, pings] = await Promise.all([
      api.get<Server[]>('/api/v1/admin/servers'),
      api.get<ServerPingResult[]>('/api/v1/admin/servers/ping').then((data) => data || null).catch(() => null),
    ])
    servers.value = serverList || []
    if (pings) {
      serverPing.value = Object.fromEntries((pings || []).map((item) => [item.server_id, item]))
    }
  } catch (e) {
    console.error('Failed to load servers', e)
  } finally {
    if (!options.silent) loading.value = false
  }
}

function isServerOnline(server: Server): boolean {
  return serverPing.value[server.id]?.available === true
}

function startEdit(s: Server) {
  editingId.value = s.id
  showToken.value = false
  form.value = {
    name: s.name, host: s.host, endpoint: s.endpoint ?? '', port: s.port, wg_port: s.wg_port,
    public_key: s.public_key, core_token: s.core_token || '',
    location: s.location, country_code: s.country_code, max_peers: s.max_peers,
    proxy_port: s.proxy_port ?? 0,
    is_active: s.is_active,
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  showToken.value = false
  form.value = { ...emptyForm }
  formErrors.value = {}
}

function validateForm(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.name.trim()) errors.name = 'Name is required'
  if (!form.value.host.trim()) errors.host = 'Host is required'
  if (form.value.port < 1 || form.value.port > 65535) errors.port = 'Port must be 1–65535'
  if (form.value.wg_port < 1 || form.value.wg_port > 65535) errors.wg_port = 'WireGuard port must be 1–65535'
  if (form.value.proxy_port < 0 || form.value.proxy_port > 65535) errors.proxy_port = 'Proxy port must be 0 or 1–65535'
  if (!form.value.public_key.trim()) errors.public_key = 'Public key is required'
  if (!editingId.value && !form.value.core_token.trim()) errors.core_token = 'Core token is required for new servers'
  if (form.value.max_peers < 1) errors.max_peers = 'Max peers must be at least 1'
  if (form.value.country_code && !/^[A-Z]{2}$/.test(form.value.country_code))
    errors.country_code = 'Country code must be 2 uppercase letters'
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function saveServer() {
  if (!validateForm()) return
  try {
    if (editingId.value) {
      await api.put(`/api/v1/admin/servers/${editingId.value}`, form.value)
    } else {
      await api.post('/api/v1/admin/servers', form.value)
    }
    cancelForm()
    await loadServers()
  } catch (e: any) {
    formErrors.value.general = e.message ?? 'An unexpected error occurred'
  }
}

const confirmDelete = ref<string | null>(null)

function promptDeleteServer(id: string) {
  confirmDelete.value = id
}

async function executeDeleteServer() {
  if (!confirmDelete.value) return
  const id = confirmDelete.value
  confirmDelete.value = null
  try {
    await api.delete(`/api/v1/admin/servers/${id}`)
    await loadServers()
  } catch (e: any) {
    formErrors.value.general = e.message ?? 'Failed to delete server'
  }
}
</script>

<template>
  <div>
    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('adminServers.deleteConfirm') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button @click="confirmDelete = null" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900">
            {{ t('common.cancel') }}
          </button>
          <button @click="executeDeleteServer" class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('adminServers.title') }}</h1>
      <button
        @click="showForm ? cancelForm() : (showForm = true)"
        class="bg-midori-600 hover:bg-midori-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        {{ showForm ? t('common.cancel') : t('adminServers.addServer') }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 dark:text-gray-100">{{ editingId ? t('adminServers.editServer') : t('adminServers.newServer') }}</h2>
      <div v-if="formErrors.general" class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
        {{ formErrors.general }}
      </div>
      <form @submit.prevent="saveServer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input v-model="form.name" :placeholder="t('common.name')" required class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.name ? 'border-red-400' : ''" />
          <p v-if="formErrors.name" class="text-xs text-red-500 mt-1">{{ formErrors.name }}</p>
        </div>
        <div>
          <input v-model="form.host" placeholder="Host (core API)" required class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.host ? 'border-red-400' : ''" />
          <p v-if="formErrors.host" class="text-xs text-red-500 mt-1">{{ formErrors.host }}</p>
        </div>
        <input v-model="form.endpoint" :placeholder="t('adminServers.endpoint')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <div>
          <input v-model.number="form.port" type="number" min="1" max="65535" :placeholder="t('adminServers.apiPort')" class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.port ? 'border-red-400' : ''" />
          <p v-if="formErrors.port" class="text-xs text-red-500 mt-1">{{ formErrors.port }}</p>
        </div>
        <div>
          <input v-model.number="form.wg_port" type="number" min="1" max="65535" :placeholder="t('adminServers.wgPort')" class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.wg_port ? 'border-red-400' : ''" />
          <p v-if="formErrors.wg_port" class="text-xs text-red-500 mt-1">{{ formErrors.wg_port }}</p>
        </div>
        <div>
          <input v-model.number="form.proxy_port" type="number" min="0" max="65535" placeholder="Proxy port (0 = disabled)" class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.proxy_port ? 'border-red-400' : ''" />
          <p v-if="formErrors.proxy_port" class="text-xs text-red-500 mt-1">{{ formErrors.proxy_port }}</p>
        </div>
        <div>
          <input v-model="form.public_key" :placeholder="t('adminServers.wgPublicKey')" required class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.public_key ? 'border-red-400' : ''" />
          <p v-if="formErrors.public_key" class="text-xs text-red-500 mt-1">{{ formErrors.public_key }}</p>
        </div>
        <!-- Core token — masked by default to prevent shoulder-surfing/screen recording exposure -->
        <div>
          <div class="relative">
            <input
              v-model="form.core_token"
              :type="showToken ? 'text' : 'password'"
              placeholder="Core Token"
              :required="!editingId"
              autocomplete="new-password"
              class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 pr-20 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
              :class="formErrors.core_token ? 'border-red-400' : ''"
            />
            <button
              type="button"
              @click="showToken = !showToken"
              class="absolute inset-y-0 right-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1"
            >{{ showToken ? 'Hide' : 'Show' }}</button>
          </div>
          <p v-if="formErrors.core_token" class="text-xs text-red-500 mt-1">{{ formErrors.core_token }}</p>
        </div>
        <input v-model="form.location" :placeholder="t('adminServers.location')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <div>
          <input v-model="form.country_code" :placeholder="t('adminServers.country')" maxlength="2" class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 uppercase" :class="formErrors.country_code ? 'border-red-400' : ''" />
          <p v-if="formErrors.country_code" class="text-xs text-red-500 mt-1">{{ formErrors.country_code }}</p>
        </div>
        <div>
          <input v-model.number="form.max_peers" type="number" min="1" :placeholder="t('adminServers.maxPeers')" class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.max_peers ? 'border-red-400' : ''" />
          <p v-if="formErrors.max_peers" class="text-xs text-red-500 mt-1">{{ formErrors.max_peers }}</p>
        </div>
        <label class="flex items-center space-x-2">
          <input v-model="form.is_active" type="checkbox" class="rounded border-gray-300" />
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('adminServers.activeToggle') }}</span>
        </label>
        <div class="md:col-span-2">
          <button type="submit" class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg">
            {{ editingId ? t('adminServers.saveEdit') : t('adminServers.saveNew') }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <tr>
            <th class="px-6 py-3">{{ t('common.name') }}</th>
            <th class="px-6 py-3">Host</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('adminServers.location') }}</th>
            <th class="px-6 py-3">{{ t('common.peers') }}</th>
            <th class="px-6 py-3 hidden lg:table-cell">Capabilities</th>
            <th class="px-6 py-3">{{ t('common.status') }}</th>
            <th class="px-6 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
          <tr v-for="s in servers" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{{ s.name }}</td>
            <td class="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{{ s.host }}:{{ s.port }}</td>
            <td class="px-6 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400">{{ s.location }} {{ s.country_code ? `(${s.country_code})` : '' }}</td>
            <td class="px-6 py-4">{{ s.current_peers }}/{{ s.max_peers }}</td>
            <td class="px-6 py-4 hidden lg:table-cell">
              <div class="flex flex-wrap gap-1">
                <span v-if="s.supports_wireguard" class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">WG</span>
                <span v-if="s.supports_proxy" class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Proxy:{{ s.proxy_port }}</span>
                <span v-if="s.supports_mesh_exit" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Mesh exit</span>
                <span v-if="!s.supports_wireguard && !s.supports_proxy && !s.supports_mesh_exit" class="text-xs text-gray-400">—</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="isServerOnline(s) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ isServerOnline(s) ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 space-x-2">
              <button @click="startEdit(s)" class="text-xs text-midori-600 hover:text-midori-700">{{ t('common.edit') }}</button>
              <button @click="promptDeleteServer(s.id)" class="text-xs text-red-500 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
