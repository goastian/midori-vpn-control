<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  kind: 'loading' | 'empty' | 'error'
  title: string
  detail?: string
  retryLabel?: string
}>()

defineEmits<{ retry: [] }>()

const role = computed(() => props.kind === 'error' ? 'alert' : 'status')
</script>

<template>
  <div
    :role="role"
    :aria-live="kind === 'error' ? 'assertive' : 'polite'"
    class="rounded-3xl border p-10 text-center"
    :class="kind === 'error'
      ? 'border-rose-800/60 bg-rose-950/30 text-rose-200'
      : 'border-slate-800 bg-slate-900/60 text-slate-300'"
  >
    <span
      v-if="kind === 'loading'"
      class="mx-auto mb-4 block h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-midori-400"
      aria-hidden="true"
    ></span>
    <p class="font-semibold">{{ title }}</p>
    <p v-if="detail" class="mx-auto mt-2 max-w-xl text-sm text-slate-400">{{ detail }}</p>
    <button
      v-if="kind === 'error' && retryLabel"
      type="button"
      class="btn-secondary mt-5"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>
