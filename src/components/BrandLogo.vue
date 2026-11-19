<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <span class="brand-logo" :class="{ 'brand-logo-compact': compact }">
    <img v-if="compact" src="/brand/midorivpn-mark.png" width="128" height="128" alt="MidoriVPN" />
    <img v-else src="/brand/midorivpn-logo.png" width="1090" height="100" alt="MidoriVPN" />
  </span>
</template>
