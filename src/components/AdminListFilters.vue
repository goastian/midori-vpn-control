<script setup lang="ts">
import { ref } from 'vue'
import { useLocale } from '../lib/i18n'

const props = defineProps<{
  search: string
  status: string
  sort: string
  order: string
  statuses: string[]
  sorts: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  apply: [filters: { search: string; status: string; sort: string; order: string }]
}>()

const { t } = useLocale()
const searchValue = ref(props.search)
const statusValue = ref(props.status)
const sortValue = ref(props.sort)
const orderValue = ref(props.order)

function optionLabel(value: string): string {
  const key = `pagination.options.${value}`
  const translated = t(key)
  return translated === key ? value.split('_').join(' ') : translated
}

function apply() {
  emit('apply', {
    search: searchValue.value.trim(),
    status: statusValue.value,
    sort: sortValue.value,
    order: orderValue.value,
  })
}
</script>

<template>
  <form
    class="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_auto]"
    role="search"
    @submit.prevent="apply"
  >
    <label class="sr-only" for="admin-list-search">{{ t('pagination.search') }}</label>
    <input
      id="admin-list-search"
      v-model="searchValue"
      type="search"
      maxlength="128"
      :placeholder="t('pagination.search')"
      class="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-midori-500"
    />
    <label class="sr-only" for="admin-list-status">{{ t('common.status') }}</label>
    <select
      id="admin-list-status"
      v-model="statusValue"
      class="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
    >
      <option v-for="value in statuses" :key="value" :value="value">
        {{ optionLabel(value) }}
      </option>
    </select>
    <label class="sr-only" for="admin-list-sort">{{ t('pagination.sort') }}</label>
    <select
      id="admin-list-sort"
      v-model="sortValue"
      class="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
    >
      <option v-for="value in sorts" :key="value" :value="value">
        {{ optionLabel(value) }}
      </option>
    </select>
    <label class="sr-only" for="admin-list-order">{{ t('pagination.order') }}</label>
    <select
      id="admin-list-order"
      v-model="orderValue"
      class="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
    >
      <option value="desc">{{ t('pagination.descending') }}</option>
      <option value="asc">{{ t('pagination.ascending') }}</option>
    </select>
    <button
      type="submit"
      :disabled="disabled"
      class="rounded-xl bg-midori-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-midori-500 disabled:opacity-50"
    >
      {{ t('pagination.apply') }}
    </button>
  </form>
</template>
