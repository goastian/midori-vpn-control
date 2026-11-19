<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDarkMode } from '../composables/useDarkMode'
import LanguageSelector from './LanguageSelector.vue'
import { useLocale } from '../lib/i18n'
import BrandLogo from './BrandLogo.vue'
import { useBrandCopy } from '../lib/brand-copy'
import AppIcon from './AppIcon.vue'

const auth = useAuthStore()
const route = useRoute()
const { isDark, toggle: toggleDark } = useDarkMode()
const { t } = useLocale()
const copy = useBrandCopy()
const mobileOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const drawer = ref<HTMLElement | null>(null)
const previousOverflow = ref('')
let desktopMedia: MediaQueryList | undefined

function closeOnDesktop(event: MediaQueryListEvent) {
  if (event.matches) closeMobile()
}

onMounted(() => {
  desktopMedia = window.matchMedia('(min-width: 1024px)')
  document.addEventListener('keydown', handleEscape)
  desktopMedia.addEventListener('change', closeOnDesktop)
})

watch(
  mobileOpen,
  async (open) => {
    if (open) {
      previousOverflow.value = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeButton.value?.focus({ preventScroll: true })
    } else {
      document.body.style.overflow = previousOverflow.value
      menuButton.value?.focus({ preventScroll: true })
    }
  },
  { flush: 'post' },
)
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  desktopMedia?.removeEventListener('change', closeOnDesktop)
  if (mobileOpen.value) document.body.style.overflow = previousOverflow.value
})

function focusDrawer() {
  if (mobileOpen.value) closeButton.value?.focus({ preventScroll: true })
}

function trapFocus(event: KeyboardEvent) {
  if (!mobileOpen.value || event.key !== 'Tab') return
  const elements = drawer.value?.querySelectorAll<HTMLElement>('a[href], button, select')
  if (!elements?.length) return
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const navGroups = computed(() => {
  const groups = [
    {
      title: t('nav.general'),
      items: [
        { name: t('nav.dashboard'), path: '/dashboard', icon: 'home' },
        { name: t('nav.servers'), path: '/servers', icon: 'server' },
        { name: t('nav.connections'), path: '/connections', icon: 'link' },
        { name: t('nav.proxy'), path: '/proxy', icon: 'extension' },
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
        { name: t('nav.adminClusters'), path: '/admin/clusters', icon: 'cluster' },
        { name: t('nav.adminHealth'), path: '/admin/health', icon: 'health' },
        { name: t('nav.adminExtensions'), path: '/admin/extensions', icon: 'extension' },
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
    case 'cluster':
      return 'M4 3.5A1.5 1.5 0 015.5 2h9A1.5 1.5 0 0116 3.5v3A1.5 1.5 0 0114.5 8h-9A1.5 1.5 0 014 6.5v-3zm1.5 7h9A1.5 1.5 0 0116 12v4.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 16.5V12a1.5 1.5 0 011.5-1.5zM7 4.25a.75.75 0 100 1.5.75.75 0 000-1.5zm0 9a.75.75 0 100 1.5.75.75 0 000-1.5z'
    case 'extension':
      return 'M7.5 2a1 1 0 00-1 1v2.5H4a2 2 0 00-2 2v2a1 1 0 001 1h1a1.5 1.5 0 010 3H3a1 1 0 00-1 1v2a2 2 0 002 2h4a1 1 0 001-1v-1a1.5 1.5 0 013 0v1a1 1 0 001 1h3a2 2 0 002-2v-3a1 1 0 00-1-1h-1a1.5 1.5 0 010-3h1a1 1 0 001-1v-1a2 2 0 00-2-2h-3.5V3a1 1 0 00-1-1h-3z'
    case 'health':
      return 'M2.5 10a1 1 0 011-1h2.2l1.4-3.5a1 1 0 011.87.05l1.6 4.8 1.1-2.2a1 1 0 01.9-.55h3.95a1 1 0 110 2h-3.33l-1.78 3.56a1 1 0 01-1.84-.1l-1.52-4.56-.8 2A1 1 0 015 11H3.5a1 1 0 01-1-1z'
    default:
      return 'M10 2a8 8 0 100 16 8 8 0 000-16z'
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && mobileOpen.value) closeMobile()
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <header class="app-mobile-header">
    <router-link to="/dashboard" aria-label="MidoriVPN"><BrandLogo /></router-link>
    <button
      ref="menuButton"
      class="mobile-menu-toggle"
      :aria-label="t('nav.openMenu')"
      :aria-expanded="mobileOpen"
      aria-controls="mobile-navigation"
      @click="mobileOpen = true"
    >
      <AppIcon name="menu" />
    </button>
  </header>

  <button
    v-if="mobileOpen"
    class="absolute inset-0 sidebar-backdrop lg:hidden"
    :aria-label="t('nav.closeMenu')"
    tabindex="-1"
    @click="closeMobile"
  ></button>
  <aside
    id="mobile-navigation"
    ref="drawer"
    class="app-sidebar"
    :class="{ 'is-open': mobileOpen }"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen || undefined"
    :aria-label="t('nav.general')"
    @transitionend.self="focusDrawer"
    @keydown.esc="closeMobile"
    @keydown="trapFocus"
  >
    <div class="sidebar-brand">
      <div>
        <router-link to="/dashboard" @click="closeMobile"><BrandLogo /></router-link>
        <p class="sidebar-brand-caption">{{ copy.controlPanel }} · Astian</p>
      </div>
      <button
        ref="closeButton"
        class="sidebar-close"
        :aria-label="t('nav.closeMenu')"
        @click="closeMobile"
      >
        <AppIcon name="close" />
      </button>
    </div>
    <nav class="sidebar-navigation" :aria-label="t('nav.general')">
      <section v-for="group in navGroups" :key="group.title" class="sidebar-group">
        <h2 class="sidebar-group-title">{{ group.title }}</h2>
        <router-link
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="sidebar-item"
          :aria-current="isItemActive(item.path) ? 'page' : undefined"
          @click="closeMobile"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path :d="iconPath(item.icon)" />
          </svg>
          <span>{{ item.name }}</span>
        </router-link>
      </section>
    </nav>
    <div class="sidebar-settings">
      <div class="sidebar-preferences">
        <LanguageSelector />
        <button
          class="theme-toggle"
          :aria-label="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
          @click="toggleDark"
        >
          <AppIcon :name="isDark ? 'sun' : 'moon'" />
        </button>
      </div>
      <div class="sidebar-account">
        <span class="account-avatar" aria-hidden="true">{{
          (auth.user?.display_name || auth.user?.email || 'M').slice(0, 1).toUpperCase()
        }}</span>
        <div class="account-details">
          <p :title="auth.user?.email">{{ auth.user?.email || t('common.unavailable') }}</p>
          <span>{{ auth.isAdmin ? t('common.roleAdmin') : t('common.roleUser') }}</span>
        </div>
      </div>
      <p v-if="auth.profileState === 'refreshing'" class="sidebar-profile-state" role="status">
        {{ t('common.refreshing') }}
      </p>
      <p v-else-if="auth.profileState === 'error'" class="sidebar-profile-state" role="alert">
        {{ t('common.refreshFailed') }}
      </p>
      <button class="sidebar-logout" @click="auth.logout()">
        <AppIcon name="logout" />{{ t('common.signOut') }}
      </button>
    </div>
  </aside>
</template>
