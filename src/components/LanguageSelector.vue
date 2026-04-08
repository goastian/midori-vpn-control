<script setup lang="ts">
import { computed } from 'vue'
import { useLocale, type LocaleCode } from '../lib/i18n'

const props = withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), {
  tone: 'light',
})

const { locale, supportedLocales, setLocale, t } = useLocale()

const model = computed({
  get: () => locale.value,
  set: (value) => setLocale(value as LocaleCode),
})
</script>

<template>
  <label
    class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
    :class="props.tone === 'dark'
      ? 'border-gray-700 bg-gray-900/80 text-gray-200'
      : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'"
  >
    <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm5.48 7h-2.01a12.82 12.82 0 00-1.08-4.03A6.53 6.53 0 0115.48 9zM10 3.54c.74 0 1.86 1.52 2.37 5.46H7.63C8.14 5.06 9.26 3.54 10 3.54zM4.52 11h2.01c.15 1.45.53 2.82 1.08 4.03A6.53 6.53 0 014.52 11zm2.01-2H4.52a6.53 6.53 0 013.09-4.03A12.82 12.82 0 006.53 9zm3.47 7.46c-.74 0-1.86-1.52-2.37-5.46h4.74c-.51 3.94-1.63 5.46-2.37 5.46zM11.31 15.03c.55-1.21.93-2.58 1.08-4.03h2.01a6.53 6.53 0 01-3.09 4.03z" />
    </svg>
    <span class="sr-only">{{ t('language.label') }}</span>
    <select
      v-model="model"
      class="bg-transparent outline-none"
      :aria-label="t('language.switcherAria')"
    >
      <option v-for="item in supportedLocales" :key="item.code" :value="item.code">
        {{ item.nativeLabel }}
      </option>
    </select>
  </label>
</template>