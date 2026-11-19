<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  count?: number
  itemClass?: string
}>(), {
  count: 3,
  itemClass: 'h-32',
})
</script>

<template>
  <div role="status" aria-live="polite">
    <span class="sr-only">{{ title }}</span>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      <div
        v-for="index in count"
        :key="index"
        :class="itemClass"
        class="animate-pulse rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
      >
        <div class="h-3 w-2/5 rounded-full bg-slate-700/80"></div>
        <div class="mt-5 h-7 w-3/5 rounded-lg bg-slate-800"></div>
        <div class="mt-3 h-3 w-4/5 rounded-full bg-slate-800/80"></div>
      </div>
    </div>
  </div>
</template>
