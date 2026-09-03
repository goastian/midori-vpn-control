<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import { LifecycleStatusSchema, UserListSchema, type User } from '../../lib/schemas'
import AsyncState from '../../components/AsyncState.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import {
  beginResourceLoad,
  completeResourceLoad,
  type ResourceState,
} from '../../lib/resource-state'

const users = ref<User[]>([])
const usersState = ref<ResourceState>('idle')
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
const saving = ref(false)
const acting = ref(false)
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)

// Modal state
const confirmBan = ref<{ id: string } | null>(null)
const banReason = ref('')
const confirmDelete = ref<string | null>(null)
const actionError = ref('')

onMounted(async () => {
  await loadUsers()
})

async function loadUsers(append = false) {
  usersState.value = beginResourceLoad(users.value.length > 0 || usersState.value === 'empty')
  try {
    const offset = append ? currentOffset.value : 0
    const page = await api.validated(
      `/api/v1/admin/users?limit=${PAGE_SIZE}&offset=${offset}`,
      UserListSchema,
    )
    if (append) {
      users.value = [...users.value, ...page]
    } else {
      users.value = page
      currentOffset.value = 0
    }
    hasMore.value = page.length >= PAGE_SIZE
    currentOffset.value = (append ? currentOffset.value : 0) + page.length
    usersState.value = completeResourceLoad(users.value.length > 0)
  } catch {
    usersState.value = 'error'
    if (append && users.value.length > 0) {
      feedback.value = { kind: 'error', message: t('adminUsers.loadError') }
    }
  }
}

async function loadMoreUsers() {
  await loadUsers(true)
}

function validateCreateForm(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.authentik_uid.trim()) errors.authentik_uid = t('adminUsers.uidRequired')
  if (!form.value.email.trim()) {
    errors.email = t('adminUsers.emailRequired')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    errors.email = t('adminUsers.emailInvalid')
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function createUser() {
  if (!validateCreateForm()) return
  saving.value = true
  feedback.value = null
  try {
    const groups = groupInput.value
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)
    await api.post('/api/v1/admin/users', { ...form.value, groups })
    showCreate.value = false
    form.value = { authentik_uid: '', email: '', display_name: '', groups: [] }
    groupInput.value = ''
    formErrors.value = {}
    await loadUsers()
    feedback.value = { kind: 'success', message: t('adminUsers.createSuccess') }
  } catch {
    formErrors.value.general = t('adminUsers.createError')
  } finally {
    saving.value = false
  }
}

function promptBanUser(id: string) {
  banReason.value = ''
  actionError.value = ''
  confirmBan.value = { id }
}

async function executeBanUser() {
  if (!confirmBan.value) return
  if (!banReason.value.trim()) {
    actionError.value = t('adminUsers.banReasonRequired')
    return
  }
  const { id } = confirmBan.value
  acting.value = true
  feedback.value = null
  try {
    const outcome = await api.validated(`/api/v1/admin/users/${id}/ban`, LifecycleStatusSchema, {
      method: 'POST',
      body: JSON.stringify({ reason: banReason.value.trim() }),
    })
    confirmBan.value = null
    await loadUsers()
    feedback.value =
      outcome.status === 'ban_cleanup_pending'
        ? { kind: 'error', message: t('adminUsers.banCleanupPending') }
        : { kind: 'success', message: t('adminUsers.banSuccess') }
  } catch {
    actionError.value = t('adminUsers.banError')
  } finally {
    acting.value = false
  }
}

function promptDeleteUser(id: string) {
  actionError.value = ''
  feedback.value = null
  confirmDelete.value = id
}

async function executeDeleteUser() {
  if (!confirmDelete.value) return
  const id = confirmDelete.value
  acting.value = true
  actionError.value = ''
  try {
    await api.delete(`/api/v1/admin/users/${id}`)
    confirmDelete.value = null
    await loadUsers()
    feedback.value = { kind: 'success', message: t('adminUsers.deleteSuccess') }
  } catch (error) {
    actionError.value =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'active_devices_must_be_disconnected'
        ? t('adminUsers.activeDevices')
        : t('adminUsers.deleteError')
  } finally {
    acting.value = false
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
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        :aria-label="t('adminUsers.closeDialog')"
        @click="confirmBan = null"
      ></button>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ban-user-title"
        class="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-4 space-y-4"
      >
        <h3 id="ban-user-title" class="text-xl font-bold text-white">{{ t('adminUsers.ban') }}</h3>
        <div>
          <label
            for="ban-reason"
            class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >{{ t('adminUsers.banReasonPrompt') }}</label
          >
          <input
            id="ban-reason"
            v-model="banReason"
            type="text"
            maxlength="255"
            :placeholder="t('adminUsers.banReasonPlaceholder')"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-amber-500 transition-colors"
            :class="actionError ? 'border-rose-500' : ''"
            :aria-invalid="Boolean(actionError)"
            :aria-describedby="actionError ? 'ban-error' : undefined"
            @keyup.enter="executeBanUser"
          />
          <p v-if="actionError" id="ban-error" role="alert" class="text-xs text-rose-400 mt-1">
            {{ actionError }}
          </p>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            :disabled="acting"
            class="px-4 py-2.5 text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            @click="confirmBan = null"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="acting"
            :aria-busy="acting"
            class="px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-900/30 transition cursor-pointer disabled:opacity-50"
            @click="executeBanUser"
          >
            {{ t('adminUsers.ban') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        :aria-label="t('adminUsers.closeDialog')"
        @click="confirmDelete = null"
      ></button>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        aria-describedby="delete-user-detail"
        class="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full mx-4 space-y-4"
      >
        <h3 id="delete-user-title" class="text-xl font-bold text-white">
          {{ t('adminUsers.deleteConfirm') }}
        </h3>
        <p id="delete-user-detail" class="text-sm text-slate-400">
          {{ t('adminUsers.deleteDetail') }}
        </p>
        <p v-if="actionError" role="alert" class="text-sm text-rose-300">{{ actionError }}</p>
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            :disabled="acting"
            class="px-4 py-2.5 text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            @click="confirmDelete = null"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="acting"
            :aria-busy="acting"
            class="px-4 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-900/30 transition cursor-pointer disabled:opacity-50"
            @click="executeDeleteUser"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminUsers.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ t('adminUsers.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-midori-600 hover:bg-midori-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer self-start sm:self-auto"
        @click="showCreate = !showCreate"
      >
        {{ showCreate ? t('common.cancel') : t('adminUsers.createUser') }}
      </button>
    </div>

    <!-- Create User Form -->
    <div
      v-if="showCreate"
      class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl space-y-6"
    >
      <div
        v-if="formErrors.general"
        role="alert"
        class="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-sm text-rose-300"
      >
        {{ formErrors.general }}
      </div>
      <form class="grid grid-cols-1 md:grid-cols-2 gap-5" @submit.prevent="createUser">
        <div>
          <label
            for="user-authentik-uid"
            class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >{{ t('adminUsers.authentikUid') }}</label
          >
          <input
            id="user-authentik-uid"
            v-model="form.authentik_uid"
            :placeholder="t('adminUsers.authentikUid')"
            required
            :aria-invalid="Boolean(formErrors.authentik_uid)"
            :aria-describedby="formErrors.authentik_uid ? 'user-authentik-uid-error' : undefined"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors"
            :class="formErrors.authentik_uid ? 'border-rose-500' : ''"
          />
          <p
            v-if="formErrors.authentik_uid"
            id="user-authentik-uid-error"
            class="text-xs text-rose-400 mt-1"
          >
            {{ formErrors.authentik_uid }}
          </p>
        </div>
        <div>
          <label
            for="user-email"
            class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >{{ t('common.email') }}</label
          >
          <input
            id="user-email"
            v-model="form.email"
            type="email"
            :placeholder="t('common.email')"
            required
            :aria-invalid="Boolean(formErrors.email)"
            :aria-describedby="formErrors.email ? 'user-email-error' : undefined"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors"
            :class="formErrors.email ? 'border-rose-500' : ''"
          />
          <p v-if="formErrors.email" id="user-email-error" class="text-xs text-rose-400 mt-1">
            {{ formErrors.email }}
          </p>
        </div>
        <div>
          <label
            for="user-display-name"
            class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >{{ t('adminUsers.namePlaceholder') }}</label
          >
          <input
            id="user-display-name"
            v-model="form.display_name"
            :placeholder="t('adminUsers.namePlaceholder')"
            maxlength="128"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors"
          />
        </div>
        <div>
          <label
            for="user-groups"
            class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
            >{{ t('adminUsers.groupsPlaceholder') }}</label
          >
          <input
            id="user-groups"
            v-model="groupInput"
            :placeholder="t('adminUsers.groupsPlaceholder')"
            class="w-full border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 text-white outline-none focus:border-midori-500 transition-colors"
          />
        </div>
        <div class="md:col-span-2 pt-2">
          <button
            type="submit"
            :disabled="saving"
            :aria-busy="saving"
            class="bg-midori-600 hover:bg-midori-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {{ t('adminUsers.createSubmit') }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="feedback"
      :role="feedback.kind === 'error' ? 'alert' : 'status'"
      class="rounded-2xl border p-4 text-sm"
      :class="
        feedback.kind === 'error'
          ? 'border-rose-800/50 bg-rose-950/40 text-rose-300'
          : 'border-midori-800/50 bg-midori-950/40 text-midori-300'
      "
    >
      {{ feedback.message }}
    </div>

    <ResourceSkeleton
      v-if="usersState === 'idle' || usersState === 'loading'"
      :title="t('adminUsers.loading')"
      item-class="h-20"
    />
    <AsyncState
      v-else-if="usersState === 'error' && users.length === 0"
      kind="error"
      :title="t('adminUsers.loadError')"
      :retry-label="t('common.retry')"
      @retry="loadUsers()"
    />
    <AsyncState v-else-if="usersState === 'empty'" kind="empty" :title="t('adminUsers.empty')" />

    <div
      v-else
      class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl"
    >
      <p
        v-if="usersState === 'refreshing'"
        role="status"
        class="border-b border-slate-800 px-6 py-3 text-xs text-slate-400"
      >
        {{ t('common.refreshing') }}
      </p>
      <p
        v-else-if="usersState === 'error'"
        role="alert"
        class="border-b border-rose-900/50 bg-rose-950/30 px-6 py-3 text-xs text-rose-300"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <table class="w-full text-sm">
        <thead
          class="bg-slate-950/60 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800"
        >
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
            <td class="px-6 py-4 text-slate-300">
              {{ u.display_name || t('common.unavailable') }}
            </td>
            <td class="px-6 py-4 hidden md:table-cell">
              <span
                v-for="g in u.groups"
                :key="g"
                class="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-md mr-1.5 font-medium"
              >
                {{ g }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span
                v-if="u.is_banned"
                class="text-xs bg-rose-950/60 border border-rose-700/50 text-rose-300 font-semibold px-2.5 py-1 rounded-full border"
                >{{ t('adminUsers.banned') }}</span
              >
              <span
                v-else
                class="text-xs bg-midori-950/60 border border-midori-700/50 text-midori-300 font-semibold px-2.5 py-1 rounded-full border"
                >{{ t('common.active') }}</span
              >
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <router-link
                :to="`/admin/users/${u.id}`"
                class="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-midori-400 hover:text-white transition"
                >{{ t('common.view') }}</router-link
              >
              <button
                v-if="!u.is_banned"
                type="button"
                class="px-2.5 py-1 rounded-lg border border-amber-900/40 bg-amber-950/20 text-xs font-medium text-amber-400 hover:bg-amber-900/40 transition cursor-pointer"
                @click="promptBanUser(u.id)"
              >
                {{ t('adminUsers.ban') }}
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs font-medium text-rose-400 hover:bg-rose-900/40 transition cursor-pointer"
                @click="promptDeleteUser(u.id)"
              >
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="hasMore" class="px-6 py-4 border-t border-slate-800 text-center">
        <button
          type="button"
          :disabled="usersState === 'refreshing'"
          :aria-busy="usersState === 'refreshing'"
          class="text-sm font-semibold text-midori-400 hover:text-midori-300 disabled:opacity-50 cursor-pointer"
          @click="loadMoreUsers"
        >
          {{ usersState === 'refreshing' ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>
