<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LanguageSelector from './LanguageSelector.vue'
import { useLocale } from '../lib/i18n'

const auth = useAuthStore()
const route = useRoute()
const { t } = useLocale()
const mobileOpen = ref(false)

const navGroups = computed(() => {
  const groups = [
    {
      title: t('nav.general'),
      items: [
        { name: t('nav.dashboard'), path: '/dashboard', icon: 'home' },
        { name: t('nav.servers'), path: '/servers', icon: 'server' },
        { name: t('nav.connections'), path: '/connections', icon: 'link' },
      ],
    },
  ]

  if (auth.isAdmin) {
    groups.push({
      title: t('nav.administration'),
      items: [
        { name: t('nav.adminUsers'), path: '/admin/users', icon: 'users' },
        { name: t('nav.adminServers'), path: '/admin/servers', icon: 'shield' },
        { name: t('nav.adminPeers'), path: '/admin/peers', icon: 'pulse' },
        { name: t('nav.adminMesh'), path: '/admin/mesh', icon: 'mesh' },
        { name: t('nav.adminLogs'), path: '/admin/audit', icon: 'log' },
      ],
    })
  }

  return groups
})

function isItemActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function iconPath(icon: string) {
  switch (icon) {
    case 'home':
      return 'M10.75 2.04a1 1 0 00-1.5 0l-7 8A1 1 0 003 12h1v5a1 1 0 001 1h3.5a1 1 0 001-1V14h1v3a1 1 0 001 1H15a1 1 0 001-1v-5h1a1 1 0 00.75-1.66l-7-8z'
    case 'server':
      return 'M3 4.5A2.5 2.5 0 015.5 2h9A2.5 2.5 0 0117 4.5v2A2.5 2.5 0 0114.5 9h-9A2.5 2.5 0 013 6.5v-2zm0 9A2.5 2.5 0 015.5 11h9a2.5 2.5 0 012.5 2.5v2a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 013 15.5v-2zM6.5 5.5a1 1 0 100 2 1 1 0 000-2zm0 9a1 1 0 100 2 1 1 0 000-2z'
    case 'link':
      return 'M7.4 7.4a1 1 0 011.4 0 .75.75 0 010 1.06L6.76 10.5a2.5 2.5 0 103.54 3.54l2.04-2.04a.75.75 0 111.06 1.06l-2.04 2.04a4 4 0 11-5.66-5.66L7.4 7.4zm5.2-1.44a4 4 0 015.66 5.66L16.2 13.7a1 1 0 01-1.4 0 .75.75 0 010-1.06l2.04-2.04a2.5 2.5 0 10-3.54-3.54l-2.04 2.04a.75.75 0 11-1.06-1.06L12.6 5.96z'
    case 'users':
      return 'M10 3.5a3 3 0 110 6 3 3 0 010-6zM4.5 14A3.5 3.5 0 018 10.5h4a3.5 3.5 0 013.5 3.5v.5a1 1 0 01-1 1h-9a1 1 0 01-1-1V14z'
    case 'shield':
      return 'M10 2l6 2.5V9c0 4-2.63 6.94-6 8-3.37-1.06-6-4-6-8V4.5L10 2zm0 3a1 1 0 00-1 1v3.59l-1.3 1.3a1 1 0 101.4 1.42L11 10.4V6a1 1 0 00-1-1z'
    case 'pulse':
      return 'M2.5 10a1 1 0 011-1h2.2l1.4-3.5a1 1 0 011.87.05l1.6 4.8 1.1-2.2a1 1 0 01.9-.55h3.95a1 1 0 110 2h-3.33l-1.78 3.56a1 1 0 01-1.84-.1l-1.52-4.56-.8 2A1 1 0 015 11H3.5a1 1 0 01-1-1z'
    case 'log':
      return 'M5 2.5A1.5 1.5 0 003.5 4v12A1.5 1.5 0 005 17.5h10a1.5 1.5 0 001.5-1.5V4A1.5 1.5 0 0015 2.5H5zm2.25 4a.75.75 0 000 1.5h5.5a.75.75 0 100-1.5h-5.5zm0 3a.75.75 0 000 1.5h5.5a.75.75 0 100-1.5h-5.5zm0 3a.75.75 0 000 1.5H11a.75.75 0 100-1.5H7.25z'
    case 'mesh':
      return 'M5 3a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM3 10a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0zM5 14.5a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM7 5h6M7 12h6M5 8v4m10-4v4M7 16.5h6'
    default:
      return 'M10 2a8 8 0 100 16 8 8 0 000-16z'
  }
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur lg:hidden text-slate-100">
    <div class="flex items-center justify-between">
      <router-link to="/dashboard" class="text-xl font-bold tracking-tight text-midori-400">
        MidoriVPN
      </router-link>
      <button
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
        :aria-label="t('nav.openMenu')"
        @click="mobileOpen = true"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.5zm0 4.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm.75 3.75a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
        </svg>
      </button>
    </div>
  </header>

  <aside class="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-900/95 p-5 backdrop-blur-xl lg:flex lg:flex-col text-slate-100 shadow-2xl">
    <!-- Brand Title & Language Selector with Clean Separation -->
    <div class="px-2 pb-5 mb-4 border-b border-slate-800/80 space-y-4">
      <router-link to="/dashboard" class="block text-2xl font-bold tracking-tight text-midori-400 hover:text-midori-300 transition-colors">
        {{ t('common.appName') }}
      </router-link>
      <div class="pt-1">
        <LanguageSelector tone="dark" />
      </div>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto pr-1">
      <section v-for="group in navGroups" :key="group.title">
        <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {{ group.title }}
        </p>
        <div class="space-y-1">
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            :class="isItemActive(item.path)
              ? 'bg-midori-600 text-white shadow-lg shadow-midori-900/30 font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"
          >
            <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path :d="iconPath(item.icon)" />
            </svg>
            <span>{{ item.name }}</span>
          </router-link>
        </div>
      </section>

      <div class="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-4 shadow-sm">
        <p class="truncate text-sm font-semibold text-slate-100">{{ auth.user?.email }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ auth.isAdmin ? t('common.roleAdmin') : t('common.roleUser') }}</p>
        <button
          class="mt-3 w-full rounded-xl border border-rose-700/60 bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-900/40"
          @click="auth.logout()"
        >
          {{ t('common.signOut') }}
        </button>
      </div>
    </nav>
  </aside>

  <transition name="fade">
    <div v-if="mobileOpen" class="fixed inset-0 z-50 lg:hidden">
      <button class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-label="Cerrar menu" @click="closeMobile"></button>
      <aside class="absolute inset-y-0 left-0 w-72 border-r border-slate-800 bg-slate-900 p-5 text-slate-100 shadow-2xl">
        <div class="flex items-center justify-between px-2 pb-4 border-b border-slate-800">
          <router-link to="/dashboard" class="text-2xl font-bold text-midori-400" @click="closeMobile">
            {{ t('common.appName') }}
          </router-link>
          <button class="rounded-xl p-2 text-slate-400 hover:text-white" :aria-label="t('nav.closeMenu')" @click="closeMobile">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.22 5.22a.75.75 0 011.06 0L10 8.94l3.72-3.72a.75.75 0 111.06 1.06L11.06 10l3.72 3.72a.75.75 0 11-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 11-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div class="space-y-5 pt-4">
          <LanguageSelector tone="dark" />

          <section v-for="group in navGroups" :key="group.title">
            <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ group.title }}</p>
            <div class="space-y-1">
              <router-link
                v-for="item in group.items"
                :key="item.path"
                :to="item.path"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
                :class="isItemActive(item.path)
                  ? 'bg-midori-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'"
                @click="closeMobile"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path :d="iconPath(item.icon)" /></svg>
                {{ item.name }}
              </router-link>
            </div>
          </section>

          <button
            class="w-full rounded-xl border border-rose-700/60 bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-300"
            @click="auth.logout()"
          >
            {{ t('common.signOut') }}
          </button>
        </div>
      </aside>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
