<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { User } from '../../lib/schemas'

const users = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const currentOffset = ref(0)
const hasMore = ref(true)
const PAGE_SIZE = 50
const showCreate = ref(false)
const { t } = useLocale()

const form = ref({
  authentik_uid: '',
  email: '',
  display_name: '',
  groups: [] as string[],
})
const formErrors = ref<Record<string, string>>({})
const groupInput = ref('')

// Modal state
const confirmBan = ref<{ id: string; reason: string } | null>(null)
const banReason = ref('')
const confirmDelete = ref<string | null>(null)
const actionError = ref('')

onMounted(async () => {
  await loadUsers()
})

async function loadUsers(append = false) {
  loading.value = true
  loadError.value = ''
  try {
    const offset = append ? currentOffset.value : 0
    const page = (await api.get<User[]>(`/api/v1/admin/users?limit=${PAGE_SIZE}&offset=${offset}`)) || []
    if (append) {
      users.value = [...users.value, ...page]
    } else {
      users.value = page
      currentOffset.value = 0
    }
    hasMore.value = page.length >= PAGE_SIZE
    currentOffset.value = (append ? currentOffset.value : 0) + page.length
  } catch (e: any) {
    loadError.value = e.message ?? 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function loadMoreUsers() {
  await loadUsers(true)
}

function validateCreateForm(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.authentik_uid.trim()) errors.authentik_uid = 'Authentik UID is required'
  if (!form.value.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function createUser() {
  if (!validateCreateForm()) return
  try {
    if (groupInput.value) {
      form.value.groups = groupInput.value.split(',').map(g => g.trim()).filter(Boolean)
    }
    await api.post('/api/v1/admin/users', form.value)
    showCreate.value = false
    form.value = { authentik_uid: '', email: '', display_name: '', groups: [] }
    groupInput.value = ''
    formErrors.value = {}
    await loadUsers()
  } catch (e: any) {
    formErrors.value.general = e.message ?? 'Failed to create user'
  }
}

function promptBanUser(id: string) {
  banReason.value = ''
  actionError.value = ''
  confirmBan.value = { id, reason: '' }
}

async function executeBanUser() {
  if (!confirmBan.value) return
  if (!banReason.value.trim()) {
    actionError.value = 'A reason is required to ban a user'
    return
  }
  const { id } = confirmBan.value
  confirmBan.value = null
  try {
    await api.post(`/api/v1/admin/users/${id}/ban`, { reason: banReason.value.trim() })
    await loadUsers()
  } catch (e: any) {
    actionError.value = e.message ?? 'Failed to ban user'
  }
}

function promptDeleteUser(id: string) {
  actionError.value = ''
  confirmDelete.value = id
}

async function executeDeleteUser() {
  if (!confirmDelete.value) return
  const id = confirmDelete.value
  confirmDelete.value = null
  try {
    await api.delete(`/api/v1/admin/users/${id}`)
    await loadUsers()
  } catch (e: any) {
    actionError.value = e.message ?? 'Failed to delete user'
  }
}

async function deleteUser(id: string) {
  confirmDelete.value = id
  await executeDeleteUser()
}

defineExpose({ deleteUser })
</script>

<template>
  <div class="space-y-6">
    <!-- Ban user modal -->
    <div v-if="confirmBan" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" @click="confirmBan = null"></div>
      <div class="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-4 space-y-4">
        <h3 class="text-xl font-bold text-white">{{ t('adminUsers.ban') }}</h3>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminUsers.banReasonPrompt') }}</label>
          <input
            v-model="banReason"
            type="text"
            maxlength="255"
            placeholder="Motivo de suspensión"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-amber-500 transition-colors"
            :class="actionError ? 'border-rose-500' : ''"
            @keyup.enter="executeBanUser"
          />
          <p v-if="actionError" class="text-xs text-rose-400 mt-1">{{ actionError }}</p>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button class="px-4 py-2.5 text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer" @click="confirmBan = null">{{ t('common.cancel') }}</button>
          <button class="px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-900/30 transition cursor-pointer" @click="executeBanUser">{{ t('adminUsers.ban') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md" @click="confirmDelete = null"></div>
      <div class="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-4 space-y-4">
        <h3 class="text-xl font-bold text-white">{{ t('adminUsers.deleteConfirm') }}</h3>
        <p class="text-sm text-slate-400">Esta acción no se puede deshacer y eliminará los peers del usuario.</p>
        <div class="flex justify-end gap-3 pt-2">
          <button class="px-4 py-2.5 text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer" @click="confirmDelete = null">{{ t('common.cancel') }}</button>
          <button class="px-4 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/30 transition cursor-pointer" @click="executeDeleteUser">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminUsers.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">Directorio de cuentas sincronizadas con Authentik OIDC</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-midori-600 hover:bg-midori-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer self-start sm:self-auto"
        @click="showCreate = !showCreate"
      >
        {{ showCreate ? t('common.cancel') : t('adminUsers.createUser') }}
      </button>
    </div>

    <!-- Create User Form -->
    <div v-if="showCreate" class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl space-y-6">
      <div v-if="formErrors.general" class="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-sm text-rose-300">
        {{ formErrors.general }}
      </div>
      <form class="grid grid-cols-1 md:grid-cols-2 gap-5" @submit.prevent="createUser">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Authentik UID</label>
          <input v-model="form.authentik_uid" placeholder="Authentik UID" required class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.authentik_uid ? 'border-rose-500' : ''" />
          <p v-if="formErrors.authentik_uid" class="text-xs text-rose-400 mt-1">{{ formErrors.authentik_uid }}</p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
          <input v-model="form.email" type="email" placeholder="Email" required class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" :class="formErrors.email ? 'border-rose-500' : ''" />
          <p v-if="formErrors.email" class="text-xs text-rose-400 mt-1">{{ formErrors.email }}</p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminUsers.namePlaceholder') }}</label>
          <input v-model="form.display_name" :placeholder="t('adminUsers.namePlaceholder')" maxlength="128" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ t('adminUsers.groupsPlaceholder') }}</label>
          <input v-model="groupInput" :placeholder="t('adminUsers.groupsPlaceholder')" class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors" />
        </div>
        <div class="md:col-span-2 pt-2">
          <button type="submit" class="bg-midori-600 hover:bg-midori-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer">
            {{ t('adminUsers.createSubmit') }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="loadError" class="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-sm text-rose-300 flex items-center justify-between">
      <span>{{ loadError }}</span>
      <button class="text-xs underline ml-3 font-semibold" @click="loadUsers()">{{ t('common.retry') }}</button>
    </div>

    <div v-if="loading && users.length === 0" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-9 w-9 border-b-2 border-midori-500"></div>
    </div>

    <div v-else class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="px-6 py-4">{{ t('common.email') }}</th>
            <th class="px-6 py-4">{{ t('common.name') }}</th>
            <th class="px-6 py-4 hidden md:table-cell">{{ t('common.groups') }}</th>
            <th class="px-6 py-4">{{ t('common.status') }}</th>
            <th class="px-6 py-4 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-800/50 transition-colors">
            <td class="px-6 py-4 font-semibold text-white">{{ u.email }}</td>
            <td class="px-6 py-4 text-slate-300">{{ u.display_name || '—' }}</td>
            <td class="px-6 py-4 hidden md:table-cell">
              <span v-for="g in u.groups" :key="g" class="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-md mr-1.5 font-medium">
                {{ g }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span v-if="u.is_banned" class="text-xs bg-rose-950/60 border border-rose-700/50 text-rose-300 font-semibold px-2.5 py-1 rounded-full border">{{ t('adminUsers.banned') }}</span>
              <span v-else class="text-xs bg-midori-950/60 border border-midori-700/50 text-midori-300 font-semibold px-2.5 py-1 rounded-full border">{{ t('common.active') }}</span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <router-link :to="`/admin/users/${u.id}`" class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-midori-400 hover:text-white transition">{{ t('common.view') }}</router-link>
              <button v-if="!u.is_banned" class="px-2.5 py-1 rounded-lg border border-amber-900/40 bg-amber-950/20 text-xs font-medium text-amber-400 hover:bg-amber-900/40 transition cursor-pointer" @click="promptBanUser(u.id)">{{ t('adminUsers.ban') }}</button>
              <button class="px-2.5 py-1 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs font-medium text-rose-400 hover:bg-rose-900/40 transition cursor-pointer" @click="promptDeleteUser(u.id)">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="hasMore" class="px-6 py-4 border-t border-slate-800 text-center">
        <button
          :disabled="loading"
          class="text-sm font-semibold text-midori-400 hover:text-midori-300 disabled:opacity-50 cursor-pointer"
          @click="loadMoreUsers"
        >
          {{ loading ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>
