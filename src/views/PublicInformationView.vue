<script setup lang="ts">
import { computed } from 'vue'
import PublicPage from '../components/PublicPage.vue'
import { useLocale } from '../lib/i18n'
import { publicSiteCopy } from '../lib/public-site'
const props = defineProps<{ kind: 'download' | 'privacy' | 'terms' }>()
const { t, locale } = useLocale()
const copy = computed(() => publicSiteCopy[locale.value])
const title = computed(() => t(props.kind === 'download' ? 'landing.footerDownload' : props.kind === 'privacy' ? 'landing.footerPrivacy' : 'landing.footerTerms'))
const notice = computed(() => props.kind === 'download' ? copy.value.unavailable : props.kind === 'privacy' ? copy.value.privacyPending : copy.value.termsPending)
</script>

<template>
  <PublicPage>
    <p class="text-sm font-semibold uppercase tracking-widest text-cyan-300">{{ copy.status }}</p>
    <h1 class="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">{{ title }}</h1>
    <p class="mt-8 max-w-3xl rounded-xl border border-amber-300/40 bg-gray-800 p-6 text-lg leading-relaxed" role="status">{{ notice }}</p>
    <p v-if="kind === 'download'" class="mt-6 max-w-3xl leading-relaxed text-gray-200">{{ copy.downloadDetail }}</p>
  </PublicPage>
</template>
