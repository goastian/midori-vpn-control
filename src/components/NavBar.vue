<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useDarkMode } from '../composables/useDarkMode'

const auth = useAuthStore()
const { isDark, toggle: toggleDark } = useDarkMode()

const userNav = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Servidores', path: '/servers' },
  { name: 'Conexiones', path: '/connections' },
  { name: 'Auditoría', path: '/audit' },
]

const adminNav = [
  { name: 'Usuarios', path: '/admin/users' },
  { name: 'Admin Servers', path: '/admin/servers' },
  { name: 'Admin Peers', path: '/admin/peers' },
  { name: 'Admin Logs', path: '/admin/audit' },
]

const navItems = computed(() => {
  const items = [...userNav]
  if (auth.isAdmin) items.push(...adminNav)
  return items
})
</script>

<template>
  <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/dashboard" class="text-xl font-bold text-midori-600">
            MidoriVPN
          </router-link>
          <div class="hidden sm:flex space-x-1">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-midori-600 hover:bg-midori-50 dark:hover:bg-gray-700 transition-colors"
              active-class="text-midori-700 bg-midori-50 dark:bg-gray-700"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="toggleDark"
            class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="isDark ? 'Modo claro' : 'Modo oscuro'"
          >
            <svg v-if="isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>
          <div class="text-right">
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ auth.user?.email }}</p>
          </div>
          <button
            @click="auth.logout()"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
