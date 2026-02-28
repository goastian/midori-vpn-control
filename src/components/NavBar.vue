<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const navItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Servidores', path: '/servers' },
  { name: 'Conexiones', path: '/peers' },
  { name: 'Auditoría', path: '/audit' },
]
</script>

<template>
  <nav class="bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-xl font-bold text-midori-600">
            MidoriVPN
          </router-link>
          <div class="hidden sm:flex space-x-4">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-midori-600 hover:bg-midori-50 transition-colors"
              active-class="text-midori-700 bg-midori-50"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-500">{{ auth.user?.email }}</span>
          <button
            @click="auth.logout()"
            class="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
