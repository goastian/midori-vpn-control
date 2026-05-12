<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import { useLocale } from '../lib/i18n'

// Animated counter for hero stats
function useAnimatedCounter(target: number, duration = 2000) {
  const current = ref(0)
  let frame: number
  let start: number

  function animate(timestamp: number) {
    if (!start) start = timestamp
    const progress = Math.min((timestamp - start) / duration, 1)
    current.value = Math.floor(progress * target)
    if (progress < 1) {
      frame = requestAnimationFrame(animate)
    }
  }

  onMounted(() => {
    frame = requestAnimationFrame(animate)
  })
  onUnmounted(() => cancelAnimationFrame(frame))

  return current
}

const usersCount = useAnimatedCounter(12480)
const serversCount = useAnimatedCounter(48)
const uptimeCount = useAnimatedCounter(99)
const dataPoints = useAnimatedCounter(1200000, 2500)
const { t } = useLocale()

// Simulated live chart data
const chartBars = ref<number[]>([])
let chartInterval: ReturnType<typeof setInterval>

function generateBars() {
  chartBars.value = Array.from({ length: 24 }, () => 20 + Math.random() * 80)
}

onMounted(() => {
  generateBars()
  chartInterval = setInterval(generateBars, 3000)
})
onUnmounted(() => clearInterval(chartInterval))

// Mobile nav
const mobileMenuOpen = ref(false)

// Pricing toggle
const annual = ref(true)

const plans = computed(() => [
  {
    name: t('landing.plans.free.name'),
    desc: t('landing.plans.free.desc'),
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      t('landing.plans.free.features.a'),
      t('landing.plans.free.features.b'),
      t('landing.plans.free.features.c'),
      t('landing.plans.free.features.d'),
      t('landing.plans.free.features.e'),
    ],
    cta: t('landing.plans.free.cta'),
    highlighted: false,
  },
  {
    name: t('landing.plans.pro.name'),
    desc: t('landing.plans.pro.desc'),
    monthlyPrice: 5.99,
    annualPrice: 3.99,
    features: [
      t('landing.plans.pro.features.a'),
      t('landing.plans.pro.features.b'),
      t('landing.plans.pro.features.c'),
      t('landing.plans.pro.features.d'),
      t('landing.plans.pro.features.e'),
      t('landing.plans.pro.features.f'),
    ],
    cta: t('landing.plans.pro.cta'),
    highlighted: true,
  },
  {
    name: t('landing.plans.business.name'),
    desc: t('landing.plans.business.desc'),
    monthlyPrice: 12.99,
    annualPrice: 9.99,
    features: [
      t('landing.plans.business.features.a'),
      t('landing.plans.business.features.b'),
      t('landing.plans.business.features.c'),
      t('landing.plans.business.features.d'),
      t('landing.plans.business.features.e'),
      t('landing.plans.business.features.f'),
      t('landing.plans.business.features.g'),
    ],
    cta: t('landing.plans.business.cta'),
    highlighted: false,
  },
])

const features = computed(() => [
  {
    title: t('landing.featureCards.wireguard.title'),
    desc: t('landing.featureCards.wireguard.desc'),
    icon: 'shield',
  },
  {
    title: t('landing.featureCards.analytics.title'),
    desc: t('landing.featureCards.analytics.desc'),
    icon: 'chart',
  },
  {
    title: t('landing.featureCards.global.title'),
    desc: t('landing.featureCards.global.desc'),
    icon: 'globe',
  },
  {
    title: t('landing.featureCards.devices.title'),
    desc: t('landing.featureCards.devices.desc'),
    icon: 'devices',
  },
  {
    title: t('landing.featureCards.noLogs.title'),
    desc: t('landing.featureCards.noLogs.desc'),
    icon: 'lock',
  },
  {
    title: t('landing.featureCards.mesh.title'),
    desc: t('landing.featureCards.mesh.desc'),
    icon: 'mesh',
  },
])

const trustCards = computed(() => [
  { key: 'openSource', title: t('landing.trustCards.openSource.title'), desc: t('landing.trustCards.openSource.desc') },
  { key: 'zeroLog', title: t('landing.trustCards.zeroLog.title'), desc: t('landing.trustCards.zeroLog.desc') },
  { key: 'wireguard', title: t('landing.trustCards.wireguard.title'), desc: t('landing.trustCards.wireguard.desc') },
  { key: 'gdpr', title: t('landing.trustCards.gdpr.title'), desc: t('landing.trustCards.gdpr.desc') },
])

// Desktop client download: OS tabs with auto-detection
type DesktopOS = 'linux' | 'windows' | 'macos'

function detectOS(): DesktopOS {
  if (typeof navigator === 'undefined') return 'linux'
  const ua = (navigator.userAgent || '').toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  if (ua.includes('win') || platform.includes('win')) return 'windows'
  if (ua.includes('mac') || platform.includes('mac') || ua.includes('darwin')) return 'macos'
  return 'linux'
}

const selectedOS = ref<DesktopOS>(detectOS())

const DESKTOP_RELEASES_URL = 'https://github.com/astian/midorivpn-desktop/releases/latest'

const desktopDownloads = computed<Record<DesktopOS, { label: string; ext: string; url: string }[]>>(() => ({
  linux: [
    { label: 'AppImage', ext: '.AppImage', url: DESKTOP_RELEASES_URL },
    { label: 'Debian / Ubuntu', ext: '.deb', url: DESKTOP_RELEASES_URL },
    { label: 'Fedora / RHEL', ext: '.rpm', url: DESKTOP_RELEASES_URL },
  ],
  windows: [
    { label: 'Installer', ext: '.msi', url: DESKTOP_RELEASES_URL },
    { label: 'Setup', ext: '.exe', url: DESKTOP_RELEASES_URL },
  ],
  macos: [
    { label: 'macOS', ext: '.dmg', url: DESKTOP_RELEASES_URL },
  ],
}))

const osTabs = computed<{ key: DesktopOS; label: string }[]>(() => [
  { key: 'linux', label: t('landing.osLinux') },
  { key: 'windows', label: t('landing.osWindows') },
  { key: 'macos', label: t('landing.osMacOS') },
])

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 overflow-x-hidden">

    <!-- ═══════════════════════ NAVBAR ═══════════════════════ -->
    <nav class="fixed top-0 inset-x-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-midori-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span class="text-xl font-bold tracking-tight">{{ t('common.appName') }}</span>
          </div>

          <!-- Desktop links -->
          <div class="hidden md:flex items-center gap-8">
            <button @click="scrollTo('features')" class="text-sm font-medium text-gray-400 hover:text-white transition-colors">{{ t('landing.featuresNav') }}</button>
            <button @click="scrollTo('pricing')" class="text-sm font-medium text-gray-400 hover:text-white transition-colors">{{ t('landing.pricingNav') }}</button>
            <button @click="scrollTo('trust')" class="text-sm font-medium text-gray-400 hover:text-white transition-colors">{{ t('landing.securityNav') }}</button>
            <LanguageSelector tone="dark" />
            <router-link to="/login" class="text-sm font-medium text-gray-400 hover:text-white transition-colors">{{ t('landing.login') }}</router-link>
            <router-link to="/login" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-midori-500 rounded-lg hover:bg-midori-600 transition-colors shadow-sm">
              {{ t('landing.getStarted') }}
            </router-link>
          </div>

          <!-- Mobile menu button -->
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileMenuOpen" class="md:hidden bg-gray-900 border-b border-gray-800 px-4 pb-4 space-y-2">
          <LanguageSelector tone="dark" />
          <button @click="scrollTo('features')" class="block w-full text-left px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800">{{ t('landing.featuresNav') }}</button>
          <button @click="scrollTo('pricing')" class="block w-full text-left px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800">{{ t('landing.pricingNav') }}</button>
          <button @click="scrollTo('trust')" class="block w-full text-left px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800">{{ t('landing.securityNav') }}</button>
          <router-link to="/login" class="block px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800">{{ t('landing.login') }}</router-link>
          <router-link to="/login" class="block text-center px-4 py-2 text-sm font-semibold text-white bg-midori-500 rounded-lg">{{ t('landing.getStarted') }}</router-link>
        </div>
      </Transition>
    </nav>

    <!-- ═══════════════════════ HERO ═══════════════════════ -->
    <section class="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-b from-midori-950/30 via-gray-900 to-gray-900 -z-10"></div>
      <div class="absolute top-20 -right-32 w-96 h-96 bg-midori-700/20 rounded-full blur-3xl -z-10"></div>
      <div class="absolute top-40 -left-32 w-80 h-80 bg-midori-800/15 rounded-full blur-3xl -z-10"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <!-- Left: Copy -->
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-midori-400 bg-midori-900/40 rounded-full mb-6">
              <span class="w-1.5 h-1.5 rounded-full bg-midori-500 animate-pulse"></span>
              {{ t('landing.heroBadge') }}
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              {{ t('landing.heroTitleB') }}
              <span class="text-midori-500">{{ t('landing.heroTitleAccent') }}</span>
              {{ t('landing.heroTitleA') }}
            </h1>

            <p class="mt-6 text-lg sm:text-xl text-gray-400 max-w-lg leading-relaxed">
              {{ t('landing.heroDescription') }}
            </p>

            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <router-link to="/login" class="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-midori-500 rounded-xl hover:bg-midori-600 transition-all shadow-lg shadow-midori-500/25 hover:shadow-midori-500/40">
                {{ t('landing.heroPrimary') }}
                <svg class="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </router-link>
              <button @click="scrollTo('features')" class="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-gray-300 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-all">
                {{ t('landing.heroSecondary') }}
              </button>
            </div>

            <!-- Stats row -->
            <div class="mt-12 grid grid-cols-3 gap-6">
              <div>
                <p class="text-2xl sm:text-3xl font-bold text-white">{{ formatNumber(usersCount) }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ t('landing.activeUsers') }}</p>
              </div>
              <div>
                <p class="text-2xl sm:text-3xl font-bold text-white">{{ serversCount }}+</p>
                <p class="text-sm text-gray-400 mt-1">{{ t('landing.servers') }}</p>
              </div>
              <div>
                <p class="text-2xl sm:text-3xl font-bold text-white">{{ uptimeCount }}.<span class="text-midori-500">9</span>%</p>
                <p class="text-sm text-gray-400 mt-1">{{ t('landing.uptime') }}</p>
              </div>
            </div>
          </div>

          <!-- Right: Dashboard mockup -->
          <div class="relative">
            <div class="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-gray-700/30 p-6 space-y-5">
              <!-- Mock header -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ t('landing.networkTraffic') }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ t('landing.last24h') }}</p>
                </div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 bg-midori-50 rounded-lg">
                  <span class="w-1.5 h-1.5 rounded-full bg-midori-500 animate-pulse"></span>
                  <span class="text-xs font-semibold text-midori-700">{{ t('landing.live') }}</span>
                </div>
              </div>

              <!-- Mock chart bars -->
              <div class="flex items-end gap-1 h-40">
                <div
                  v-for="(bar, i) in chartBars"
                  :key="i"
                  class="flex-1 rounded-t-sm transition-all duration-1000 ease-in-out"
                  :class="i >= 20 ? 'bg-midori-400' : 'bg-midori-200'"
                  :style="{ height: bar + '%' }"
                ></div>
              </div>

              <!-- Mock stats cards -->
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-gray-50 rounded-xl p-3">
                  <p class="text-xs text-gray-400 font-medium">{{ t('landing.bandwidth') }}</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">{{ formatNumber(dataPoints) }}</p>
                  <p class="text-xs text-midori-600 font-medium mt-0.5">+12.3%</p>
                </div>
                <div class="bg-gray-50 rounded-xl p-3">
                  <p class="text-xs text-gray-400 font-medium">{{ t('landing.latency') }}</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">14ms</p>
                  <p class="text-xs text-midori-600 font-medium mt-0.5">-8.1%</p>
                </div>
                <div class="bg-gray-50 rounded-xl p-3">
                  <p class="text-xs text-gray-400 font-medium">{{ t('common.peers') }}</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">2,481</p>
                  <p class="text-xs text-midori-600 font-medium mt-0.5">+5.7%</p>
                </div>
              </div>
            </div>

            <!-- Floating card -->
            <div class="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-700/30 p-3 flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-midori-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-midori-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-900">{{ t('landing.encrypted') }}</p>
                <p class="text-[10px] text-gray-400">WireGuard / AES-256</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ FEATURES ═══════════════════════ -->
    <section id="features" class="py-20 sm:py-28 bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-midori-600 uppercase tracking-wide">{{ t('landing.featuresNav') }}</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{{ t('landing.featuresTitle') }}</h2>
          <p class="mt-4 text-lg text-gray-400">{{ t('landing.featuresSubtitle') }}</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <div
            v-for="f in features"
            :key="f.title"
            class="group bg-gray-800 rounded-2xl border border-gray-700 p-6 hover:shadow-lg hover:shadow-black/30 hover:border-midori-700 transition-all duration-300"
          >
            <!-- Icon -->
            <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
              :class="'bg-midori-900/40 text-midori-400 group-hover:bg-midori-500 group-hover:text-white'"
            >
              <!-- Shield -->
              <svg v-if="f.icon === 'shield'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <!-- Chart -->
              <svg v-else-if="f.icon === 'chart'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <!-- Globe -->
              <svg v-else-if="f.icon === 'globe'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- Devices -->
              <svg v-else-if="f.icon === 'devices'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <!-- Lock -->
              <svg v-else-if="f.icon === 'lock'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <!-- Mesh -->
              <svg v-else-if="f.icon === 'mesh'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 114 0 2 2 0 01-4 0zm12 0a2 2 0 114 0 2 2 0 01-4 0zM4 18a2 2 0 114 0 2 2 0 01-4 0zm12 0a2 2 0 114 0 2 2 0 01-4 0zM6 8v8m12-8v8M8 6h8M8 18h8" />
              </svg>
            </div>

            <h3 class="text-base font-semibold text-white">{{ f.title }}</h3>
            <p class="mt-2 text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ PRICING ═══════════════════════ -->
    <section id="pricing" class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <p class="text-sm font-semibold text-midori-600 uppercase tracking-wide">{{ t('landing.pricingNav') }}</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{{ t('landing.pricingTitle') }}</h2>
          <p class="mt-4 text-lg text-gray-400">{{ t('landing.pricingSubtitle') }}</p>

          <!-- Annual/Monthly toggle -->
          <div class="mt-8 inline-flex items-center gap-3 bg-gray-800 rounded-full p-1">
            <button
              @click="annual = false"
              :class="!annual ? 'bg-gray-700 shadow-sm text-white' : 'text-gray-400'"
              class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            >{{ t('landing.monthly') }}</button>
            <button
              @click="annual = true"
              :class="annual ? 'bg-gray-700 shadow-sm text-white' : 'text-gray-400'"
              class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            >
              {{ t('landing.annual') }}
              <span class="ml-1 text-xs font-semibold text-midori-600">-33%</span>
            </button>
          </div>
        </div>

        <div class="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          <div
            v-for="plan in plans"
            :key="plan.name"
            class="relative rounded-2xl border p-6 lg:p-8 flex flex-col transition-all duration-300"
            :class="plan.highlighted
              ? 'border-midori-500 bg-gray-800 shadow-xl shadow-midori-900/30 scale-[1.02]'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:shadow-lg hover:shadow-black/20'"
          >
            <!-- Popular badge -->
            <div v-if="plan.highlighted" class="absolute -top-3 left-1/2 -translate-x-1/2">
              <span class="inline-flex items-center px-3 py-1 text-xs font-bold text-white bg-midori-500 rounded-full shadow-sm">
                {{ t('landing.mostPopular') }}
              </span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-white">{{ plan.name }}</h3>
              <p class="text-sm text-gray-400 mt-1">{{ plan.desc }}</p>
            </div>

            <div class="mt-6 flex items-baseline gap-1">
              <span class="text-4xl font-extrabold text-white">
                ${{ annual ? plan.annualPrice : plan.monthlyPrice }}
              </span>
              <span v-if="plan.monthlyPrice > 0" class="text-sm text-gray-400">{{ t('landing.perMonth') }}</span>
              <span v-else class="text-sm text-gray-400">{{ t('landing.forever') }}</span>
            </div>

            <ul class="mt-6 space-y-3 flex-1">
              <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2.5 text-sm text-gray-300">
                <svg class="w-4 h-4 text-midori-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ feat }}
              </li>
            </ul>

            <router-link
              to="/login"
              class="mt-8 block text-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              :class="plan.highlighted
                ? 'bg-midori-500 text-white hover:bg-midori-600 shadow-lg shadow-midori-500/25'
                : 'bg-gray-700 text-white hover:bg-gray-600'"
            >
              {{ plan.cta }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ TRUST / SECURITY ═══════════════════════ -->
    <section id="trust" class="py-20 sm:py-28 bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-midori-600 uppercase tracking-wide">{{ t('landing.securityNav') }}</p>
          <h2 class="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{{ t('landing.trustTitle') }}</h2>
          <p class="mt-4 text-lg text-gray-400">{{ t('landing.trustSubtitle') }}</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="card in trustCards" :key="card.key" class="bg-gray-800 rounded-2xl border border-gray-700 p-6 text-center hover:shadow-lg hover:shadow-black/20 transition-shadow">
            <div class="w-12 h-12 mx-auto rounded-xl bg-midori-900/40 flex items-center justify-center mb-4">
              <svg v-if="card.key === 'openSource'" class="w-6 h-6 text-midori-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <svg v-else-if="card.key === 'zeroLog'" class="w-6 h-6 text-midori-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <svg v-else-if="card.key === 'wireguard'" class="w-6 h-6 text-midori-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <svg v-else class="w-6 h-6 text-midori-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-sm font-bold text-white">{{ card.title }}</h3>
            <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">{{ card.desc }}</p>
          </div>
        </div>

        <!-- Desktop client download with OS tabs -->
        <div class="mt-16">
          <div class="text-center">
            <h3 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {{ t('landing.downloadTitle') }}
            </h3>
            <p class="mt-3 text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
              {{ t('landing.downloadSubtitle') }}
            </p>
          </div>

          <div class="mt-8 max-w-3xl mx-auto">
            <!-- Tabs -->
            <div role="tablist" class="flex items-center justify-center gap-2 p-1 bg-gray-800/60 border border-gray-700 rounded-xl w-fit mx-auto">
              <button
                v-for="tab in osTabs"
                :key="tab.key"
                role="tab"
                :aria-selected="selectedOS === tab.key"
                @click="selectedOS = tab.key"
                class="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                :class="selectedOS === tab.key
                  ? 'bg-midori-500 text-white shadow'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/60'"
              >
                <span class="inline-flex items-center gap-2">
                  <svg v-if="tab.key === 'linux'" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C8.5 2 7 5 7 8c0 1.5.4 2.8 1 3.7-.7.6-1.4 1.6-2.1 3-.7 1.6-2.5 2-2.7 3.4-.2 1.1.7 1.6 1.8 1.4 1.1-.2 1.3.4 2 1.3.6.8 2.1 1.2 4 1.2s3.4-.4 4-1.2c.7-.9.9-1.5 2-1.3 1.1.2 2-.3 1.8-1.4-.2-1.4-2-1.8-2.7-3.4-.7-1.4-1.4-2.4-2.1-3 .6-.9 1-2.2 1-3.7 0-3-1.5-6-5-6zm-1.5 4.5c.4 0 .7.4.7 1s-.3 1-.7 1-.7-.4-.7-1 .3-1 .7-1zm3 0c.4 0 .7.4.7 1s-.3 1-.7 1-.7-.4-.7-1 .3-1 .7-1z"/>
                  </svg>
                  <svg v-else-if="tab.key === 'windows'" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3 5.5L11 4.3v7.2H3V5.5zm0 13L11 19.7v-7.2H3v6zm9-14.4L22 3v9h-10V4.1zm0 9.4h10v9l-10-1.4v-7.6z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16.5 12.5c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.5 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1-.1-2.5-1-2.7-3.9zM14.2 5.4c.7-.8 1.1-2 1-3.2-1 .1-2.2.7-2.9 1.5-.7.7-1.2 1.9-1.1 3.1 1.1.1 2.3-.6 3-1.4z"/>
                  </svg>
                  {{ tab.label }}
                </span>
              </button>
            </div>

            <!-- Download options -->
            <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a
                v-for="option in desktopDownloads[selectedOS]"
                :key="option.ext"
                :href="option.url"
                target="_blank"
                rel="noopener noreferrer"
                class="group flex items-center justify-between gap-4 p-4 bg-gray-800/60 border border-gray-700 rounded-xl hover:bg-gray-800 hover:border-midori-500/60 transition-all"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-white truncate">{{ option.label }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ option.ext }}</p>
                </div>
                <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-midori-500/15 text-midori-400 group-hover:bg-midori-500 group-hover:text-white transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ CTA ═══════════════════════ -->
    <section class="py-20 sm:py-28">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {{ t('landing.ctaTitle') }}
        </h2>
        <p class="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
          {{ t('landing.ctaSubtitle') }}
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <router-link to="/login" class="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white bg-midori-500 rounded-xl hover:bg-midori-600 transition-all shadow-lg shadow-midori-500/25 hover:shadow-midori-500/40">
            {{ t('landing.ctaPrimary') }}
            <svg class="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </router-link>
          <a href="https://github.com/goastian/midori-vpn-core" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-6 py-3.5 text-base font-semibold text-gray-300 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-all">
            <svg class="mr-2 w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            {{ t('landing.ctaSecondary') }}
          </a>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
    <footer class="border-t border-gray-800 bg-gray-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="lg:col-span-1">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-midori-500 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span class="text-lg font-bold">Midori<span class="text-midori-500">VPN</span></span>
            </div>
            <p class="text-sm text-gray-500 leading-relaxed">{{ t('landing.footerDescription') }}</p>
          </div>

          <!-- Product -->
          <div>
            <h4 class="text-xs font-semibold text-gray-100 uppercase tracking-wider mb-4">{{ t('landing.footerProduct') }}</h4>
            <ul class="space-y-2.5">
              <li><button @click="scrollTo('features')" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.featuresNav') }}</button></li>
              <li><button @click="scrollTo('pricing')" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.pricingNav') }}</button></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerDownload') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerChangelog') }}</a></li>
            </ul>
          </div>

          <!-- Company -->
          <div>
            <h4 class="text-xs font-semibold text-gray-100 uppercase tracking-wider mb-4">{{ t('landing.footerCompany') }}</h4>
            <ul class="space-y-2.5">
              <li><a href="https://astian.org" target="_blank" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerAbout') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerBlog') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerCareers') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerContact') }}</a></li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4 class="text-xs font-semibold text-gray-100 uppercase tracking-wider mb-4">{{ t('landing.footerLegal') }}</h4>
            <ul class="space-y-2.5">
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerPrivacy') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">{{ t('landing.footerTerms') }}</a></li>
              <li><a href="#" class="text-sm text-gray-400 hover:text-white transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-gray-400">&copy; {{ new Date().getFullYear() }} Astian, Inc. {{ t('landing.footerRights') }}</p>
          <div class="flex items-center gap-4">
            <a href="https://github.com/goastian" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-gray-300 transition-colors">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="#" class="text-gray-500 hover:text-gray-300 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
