<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useLocale } from '../lib/i18n'

const props = defineProps<{ resetKey: string }>()
const { t } = useLocale()
const failed = ref(false)
const retryKey = ref(0)

function reset() {
  failed.value = false
  retryKey.value += 1
}

watch(() => props.resetKey, reset)

onErrorCaptured(() => {
  failed.value = true
  return false
})
</script>

<template>
  <div
    v-if="failed"
    role="alert"
    class="mx-auto w-full max-w-xl rounded-3xl border border-rose-800/60 bg-slate-900/90 p-8 text-center shadow-xl"
  >
    <h1 class="text-xl font-semibold text-white">{{ t('viewError.title') }}</h1>
    <p class="mt-3 text-sm text-slate-400">{{ t('viewError.detail') }}</p>
    <button
      type="button"
      class="mt-6 rounded-xl bg-midori-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-midori-500"
      @click="reset"
    >
      {{ t('viewError.retry') }}
    </button>
  </div>
  <slot v-else :retry-key="retryKey"></slot>
</template>
