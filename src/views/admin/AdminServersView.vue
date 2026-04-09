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
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

const emptyForm = {
  name: '', host: '', port: 8080, wg_port: 51820,
  public_key: '', core_token: '', location: '', country_code: '', max_peers: 250,
  is_active: true,
}
const form = ref({ ...emptyForm })

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
  form.value = {
    name: s.name, host: s.host, port: s.port, wg_port: s.wg_port,
    public_key: s.public_key, core_token: s.core_token || '',
    location: s.location, country_code: s.country_code, max_peers: s.max_peers,
    is_active: s.is_active,
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

async function saveServer() {
  try {
    if (editingId.value) {
      await api.put(`/api/v1/admin/servers/${editingId.value}`, form.value)
    } else {
      await api.post('/api/v1/admin/servers', form.value)
    }
    cancelForm()
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteServer(id: string) {
  if (!confirm(t('adminServers.deleteConfirm'))) return
  try {
    await api.delete(`/api/v1/admin/servers/${id}`)
    await loadServers()
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
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
      <form @submit.prevent="saveServer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input v-model="form.name" :placeholder="t('common.name')" required class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.host" placeholder="Host" required class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model.number="form.port" type="number" :placeholder="t('adminServers.apiPort')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model.number="form.wg_port" type="number" :placeholder="t('adminServers.wgPort')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.public_key" :placeholder="t('adminServers.wgPublicKey')" required class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.core_token" placeholder="Core Token" :required="!editingId" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.location" :placeholder="t('adminServers.location')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.country_code" :placeholder="t('adminServers.country')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model.number="form.max_peers" type="number" :placeholder="t('adminServers.maxPeers')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
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
            <td class="px-6 py-4">
              <span :class="isServerOnline(s) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'" class="text-xs font-medium px-2 py-1 rounded-full">
                {{ isServerOnline(s) ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="px-6 py-4 space-x-2">
              <button @click="startEdit(s)" class="text-xs text-midori-600 hover:text-midori-700">{{ t('common.edit') }}</button>
              <button @click="deleteServer(s.id)" class="text-xs text-red-500 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
