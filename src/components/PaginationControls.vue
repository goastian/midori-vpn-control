<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../lib/i18n'

const props = defineProps<{
  page: number
  pageSize: number
  total: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const { t } = useLocale()
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function change(page: number) {
  if (!props.disabled && page >= 1 && page <= pageCount.value && page !== props.page) {
    emit('change', page)
  }
}
</script>

<template>
  <nav
    v-if="total > 0"
    class="flex items-center justify-between gap-4 border-t border-slate-800 px-6 py-4"
    :aria-label="t('pagination.label')"
  >
    <p class="text-xs text-slate-400">
      {{ t('pagination.summary', { page, pages: pageCount, total }) }}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled || page <= 1"
        @click="change(page - 1)"
      >
        {{ t('pagination.previous') }}
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled || page >= pageCount"
        @click="change(page + 1)"
      >
        {{ t('pagination.next') }}
      </button>
    </div>
  </nav>
</template>
