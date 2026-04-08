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

const groupInput = ref('')

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

async function createUser() {
  try {
    if (groupInput.value) {
      form.value.groups = groupInput.value.split(',').map(g => g.trim()).filter(Boolean)
    }
    await api.post('/api/v1/admin/users', form.value)
    showCreate.value = false
    form.value = { authentik_uid: '', email: '', display_name: '', groups: [] }
    groupInput.value = ''
    await loadUsers()
  } catch (e: any) {
    alert(e.message)
  }
}

async function banUser(id: string) {
  const reason = prompt(t('adminUsers.banReasonPrompt'))
  if (reason === null) return
  try {
    await api.post(`/api/v1/admin/users/${id}/ban`, { reason })
    await loadUsers()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteUser(id: string) {
  if (!confirm(t('adminUsers.deleteConfirm'))) return
  try {
    await api.delete(`/api/v1/admin/users/${id}`)
    await loadUsers()
  } catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
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
      <form @submit.prevent="createUser" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input v-model="form.authentik_uid" placeholder="Authentik UID" required class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.email" placeholder="Email" required class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
        <input v-model="form.display_name" :placeholder="t('adminUsers.namePlaceholder')" class="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200" />
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
              <button v-if="!u.is_banned" @click="banUser(u.id)" class="text-xs text-yellow-600 hover:text-yellow-700">{{ t('adminUsers.ban') }}</button>
              <button @click="deleteUser(u.id)" class="text-xs text-red-500 hover:text-red-700">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
