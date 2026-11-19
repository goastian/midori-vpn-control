<script setup lang="ts">
import LanguageSelector from './LanguageSelector.vue'
import BrandLogo from './BrandLogo.vue'
import { useLocale } from '../lib/i18n'
const { t } = useLocale()
</script>

<template>
  <div class="vpn-landing flex min-h-screen flex-col">
    <header class="site-header">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <RouterLink
          to="/"
          class="rounded text-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label="MidoriVPN"
          ><BrandLogo
        /></RouterLink>
        <nav class="flex flex-wrap items-center gap-3" aria-label="MidoriVPN">
          <RouterLink
            to="/download"
            class="rounded px-2 py-2 hover:underline focus-visible:outline-2"
            >{{ t('landing.footerDownload') }}</RouterLink
          >
          <RouterLink
            to="/privacy"
            class="rounded px-2 py-2 hover:underline focus-visible:outline-2"
            >{{ t('landing.footerPrivacy') }}</RouterLink
          >
          <RouterLink
            to="/terms"
            class="rounded px-2 py-2 hover:underline focus-visible:outline-2"
            >{{ t('landing.footerTerms') }}</RouterLink
          >
          <div class="w-full rounded-xl focus-within:ring-2 focus-within:ring-cyan-200 sm:w-40">
            <LanguageSelector />
          </div>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:py-24"><slot /></main>
    <footer
      class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-6 py-6 text-sm text-gray-600"
    >
      <span>Astian, Inc.</span>
      <a
        href="mailto:support@astian.org"
        class="rounded px-2 py-2 hover:underline focus-visible:outline-2"
        >{{ t('landing.footerContact') }}</a
      >
    </footer>
  </div>
</template>
