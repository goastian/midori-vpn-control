<script setup lang="ts">
import { computed } from 'vue'
import type { UserQuota } from '../lib/schemas'
import { useLocale } from '../lib/i18n'

const props = defineProps<{ quota: UserQuota }>()
const { t } = useLocale()

const usagePercent = computed(() => {
  if (props.quota.max_devices <= 0) return 0
  return Math.min(Math.round((props.quota.connected_devices / props.quota.max_devices) * 100), 100)
})
</script>

<template>
  <section class="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl md:flex-row md:items-center" :aria-label="t('quota.summary')">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-midori-400">{{ t('quota.plan', { name: quota.plan_name }) }}</span>
        <span v-if="quota.available_devices > 0" class="badge-active">
          {{ t('quota.available', { count: quota.available_devices }) }}
        </span>
        <span v-else class="badge-danger">{{ t('quota.limitReached') }}</span>
      </div>
      <p class="text-xl font-extrabold text-white">
        {{ t('quota.usage', { connected: quota.connected_devices, maximum: quota.max_devices }) }}
      </p>
      <p class="text-xs text-slate-400">
        {{ t('quota.breakdown', {
          desktop: quota.devices_by_type.desktop,
          extension: quota.devices_by_type.extension,
          wireguard: quota.devices_by_type.wireguard,
        }) }}
      </p>
    </div>

    <div class="w-full space-y-1.5 md:w-64">
      <div class="flex justify-between text-xs font-medium text-slate-400">
        <span>{{ t('quota.availability') }}</span>
        <span class="text-slate-200">{{ usagePercent }}%</span>
      </div>
      <div
        role="progressbar"
        :aria-label="t('quota.progressLabel')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="usagePercent"
        class="h-2.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950/80"
      >
        <div
          class="h-full rounded-full bg-gradient-to-r transition-all duration-500"
          :class="quota.connected_devices >= quota.max_devices ? 'from-rose-600 to-rose-400' : 'from-midori-500 to-cyan-400'"
          :style="{ width: `${usagePercent}%` }"
        ></div>
      </div>
    </div>
  </section>
</template>
