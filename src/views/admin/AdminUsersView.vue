<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { User } from '../../lib/schemas'

const users = ref<User[]>([])
const loading = ref(true)
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

async function loadUsers() {
  loading.value = true
  try {
    users.value = (await api.get<User[]>('/api/v1/admin/users')) || []
  } catch (e) {
    console.error('Failed to load users', e)
  } finally {
    loading.value = false
  }
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
</script>

<template>
  <div>
    <!-- Ban user modal -->
    <div v-if="confirmBan" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ t('adminUsers.ban') }}</h3>
        <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">{{ t('adminUsers.banReasonPrompt') }}</label>
        <input
          v-model="banReason"
          type="text"
          maxlength="255"
          class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 mb-2"
          :class="actionError ? 'border-red-400' : ''"
          @keyup.enter="executeBanUser"
        />
        <p v-if="actionError" class="text-xs text-red-500 mb-3">{{ actionError }}</p>
        <div class="flex justify-end space-x-3">
          <button @click="confirmBan = null" class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900">{{ t('common.cancel') }}</button>
          <button @click="executeBanUser" class="px-4 py-2 text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg">{{ t('adminUsers.ban') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('adminUsers.deleteConfirm') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button @click="confirmDelete = null" class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900">{{ t('common.cancel') }}</button>
          <button @click="executeDeleteUser" class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('adminUsers.title') }}</h1>
      <button
        @click="showCreate = !showCreate"
        class="bg-midori-600 hover:bg-midori-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {{ showCreate ? t('common.cancel') : t('adminUsers.createUser') }}
      </button>
    </div>

    <div v-if="showCreate" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
      <div v-if="formErrors.general" class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
        {{ formErrors.general }}
      </div>
      <form @submit.prevent="createUser" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input v-model="form.authentik_uid" placeholder="Authentik UID" required class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.authentik_uid ? 'border-red-400' : ''" />
          <p v-if="formErrors.authentik_uid" class="text-xs text-red-500 mt-1">{{ formErrors.authentik_uid }}</p>
        </div>
        <div>
          <input v-model="form.email" type="email" placeholder="Email" required class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" :class="formErrors.email ? 'border-red-400' : ''" />
          <p v-if="formErrors.email" class="text-xs text-red-500 mt-1">{{ formErrors.email }}</p>
        </div>
        <input v-model="form.display_name" :placeholder="t('adminUsers.namePlaceholder')" maxlength="128" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="groupInput" :placeholder="t('adminUsers.groupsPlaceholder')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <div class="md:col-span-2">
          <button type="submit" class="bg-midori-600 hover:bg-midori-700 text-white font-medium px-6 py-2 rounded-lg">
            {{ t('adminUsers.createSubmit') }}
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
            <th class="px-6 py-3">{{ t('common.email') }}</th>
            <th class="px-6 py-3">{{ t('common.name') }}</th>
            <th class="px-6 py-3 hidden md:table-cell">{{ t('common.groups') }}</th>
            <th class="px-6 py-3">{{ t('common.status') }}</th>
            <th class="px-6 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
          <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 text-gray-900 dark:text-gray-100">{{ u.email }}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-400">{{ u.display_name || '—' }}</td>
            <td class="px-6 py-4 hidden md:table-cell">
              <span v-for="g in u.groups" :key="g" class="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded mr-1">
                {{ g }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span v-if="u.is_banned" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{{ t('adminUsers.banned') }}</span>
              <span v-else class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{{ t('common.active') }}</span>
            </td>
            <td class="px-6 py-4 space-x-2">
              <router-link :to="`/admin/users/${u.id}`" class="text-xs text-midori-600 hover:text-midori-700">{{ t('common.view') }}</router-link>
              <button v-if="!u.is_banned" @click="promptBanUser(u.id)" class="text-xs text-yellow-600 hover:text-yellow-700">{{ t('adminUsers.ban') }}</button>
              <button @click="promptDeleteUser(u.id)" class="text-xs text-red-500 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
