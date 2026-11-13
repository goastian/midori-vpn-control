<script setup lang="ts">
import { computed } from 'vue'
import PublicPage from '../components/PublicPage.vue'
import { useLocale } from '../lib/i18n'
import { publicSiteCopy } from '../lib/public-site'
const { t, locale } = useLocale()
const copy = computed(() => publicSiteCopy[locale.value])
</script>

<template>
  <PublicPage>
    <p class="text-sm font-semibold uppercase tracking-widest text-cyan-300">{{ copy.status }}</p>
    <h1 class="mt-5 text-5xl font-semibold tracking-tight sm:text-7xl">MidoriVPN</h1>
    <p class="mt-6 max-w-2xl text-xl leading-relaxed text-gray-200">{{ copy.summary }}</p>
    <p class="mt-8 max-w-2xl rounded-xl border border-gray-700 bg-gray-800 p-5 leading-relaxed" role="status">{{ copy.unavailable }}</p>
    <div class="mt-8 flex flex-wrap gap-4">
      <RouterLink to="/download" class="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-gray-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4">{{ t('landing.footerDownload') }}</RouterLink>
      <RouterLink to="/login" class="rounded-lg border border-gray-500 px-5 py-3 font-semibold hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-4">{{ t('landing.login') }}</RouterLink>
    </div>
  </PublicPage>
</template>
