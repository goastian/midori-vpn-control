<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ViewErrorBoundary from './components/ViewErrorBoundary.vue'
import { useAuthStore } from './stores/auth'
import { useLocale } from './lib/i18n'
import { computed, watch } from 'vue'
import { useBrandCopy } from './lib/brand-copy'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useLocale()
const copy = useBrandCopy()

const isFullPage = computed(() => route.meta?.fullPage === true)
const bypassesBootstrap = computed(() => route.meta?.bootstrapBypass === true)

async function retryBootstrap() {
  await auth.retryBootstrap()
  if (auth.bootstrapState !== 'ready') return

  if (auth.isAuthenticated && (route.name === 'landing' || route.name === 'login')) {
    await router.replace({ name: 'dashboard' })
  } else if (!auth.isAuthenticated && !route.meta.public) {
    await router.replace({ name: 'landing' })
  }
}

watch(
  () => auth.isAuthenticated,
  (authenticated, wasAuthenticated) => {
    if (wasAuthenticated && !authenticated && !route.meta.public) {
      void router.replace({ name: 'landing' })
    }
  },
)
</script>

<template>
  <!-- Static public information and OAuth callbacks never expose the shell. -->
  <RouterView v-if="bypassesBootstrap" v-slot="{ Component, route: viewRoute }">
    <ViewErrorBoundary v-slot="{ retryKey }" :reset-key="viewRoute.fullPath">
      <component :is="Component" :key="`${viewRoute.fullPath}:${retryKey}`" />
    </ViewErrorBoundary>
  </RouterView>

  <!-- No route or authenticated chrome mounts before token and profile validation. -->
  <div
    v-else-if="auth.bootstrapState === 'idle' || auth.bootstrapState === 'loading'"
    class="min-h-screen app-shell-bg flex items-center justify-center p-6 text-slate-900 dark:text-slate-100"
    role="status"
    aria-live="polite"
  >
    <div class="max-w-md text-center">
      <div
        class="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-midori-600 dark:border-slate-700 dark:border-t-midori-400"
        aria-hidden="true"
      ></div>
      <h1 class="mt-5 text-lg font-semibold">{{ t('bootstrap.loadingTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {{ t('bootstrap.loadingDetail') }}
      </p>
    </div>
  </div>

  <div
    v-else-if="auth.bootstrapState === 'error'"
    class="min-h-screen app-shell-bg flex items-center justify-center p-6 text-slate-900 dark:text-slate-100"
    role="alert"
  >
    <div
      class="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl dark:border-rose-900/70 dark:bg-slate-900"
    >
      <h1 class="text-xl font-semibold">{{ t('bootstrap.errorTitle') }}</h1>
      <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">
        {{ t('bootstrap.errorDetail') }}
      </p>
      <button
        type="button"
        class="mt-6 rounded-xl bg-midori-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-midori-500 disabled:cursor-wait disabled:opacity-60"
        :disabled="auth.loading"
        @click="retryBootstrap"
      >
        {{ t('bootstrap.retry') }}
      </button>
    </div>
  </div>

  <!-- Full-page public routes render only after bootstrap resolves. -->
  <RouterView v-else-if="isFullPage" v-slot="{ Component, route: viewRoute }">
    <ViewErrorBoundary v-slot="{ retryKey }" :reset-key="viewRoute.fullPath">
      <component :is="Component" :key="`${viewRoute.fullPath}:${retryKey}`" />
    </ViewErrorBoundary>
  </RouterView>

  <!-- Authenticated routes mount only with a validated profile. -->
  <div
    v-else-if="auth.isAuthenticated"
    class="min-h-screen app-shell-bg text-slate-900 dark:text-slate-100"
  >
    <a href="#main-content" class="skip-link">{{ copy.skipContent }}</a>
    <NavBar />
    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <ViewErrorBoundary v-slot="{ retryKey }" :reset-key="viewRoute.fullPath">
          <component :is="Component" :key="`${viewRoute.fullPath}:${retryKey}`" />
        </ViewErrorBoundary>
      </RouterView>
    </main>
  </div>

  <!-- The router normally redirects this transition immediately. -->
  <div v-else class="min-h-screen app-shell-bg" aria-hidden="true"></div>
</template>
