<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import type { AdminMeshNetwork } from '../../lib/schemas'

const meshNetworks = ref<AdminMeshNetwork[]>([])
const loading = ref(true)
const error = ref('')
const expanded = ref<Set<string>>(new Set())
const { t } = useLocale()

onMounted(() => load())

async function load() {
  loading.value = true
  error.value = ''
  try {
    meshNetworks.value = (await api.get<AdminMeshNetwork[]>('/api/v1/admin/mesh')) || []
  } catch (e: any) {
    error.value = e.message || 'Failed to load mesh networks'
  } finally {
    loading.value = false
  }
}

function toggle(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}

function connectedCount(net: AdminMeshNetwork) {
  return net.members.filter(m => m.connected).length
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('adminMesh.title') }}</h1>
      <button
        @click="load"
        class="text-sm text-midori-600 hover:text-midori-700 font-medium transition-colors"
      >
        {{ t('adminMesh.refresh') }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-midori-600"></div>
    </div>

    <div v-else-if="error" class="text-center py-12 text-red-500 dark:text-red-400">
      {{ error }}
    </div>

    <div v-else-if="meshNetworks.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      {{ t('adminMesh.empty') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="net in meshNetworks"
        :key="net.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <!-- Network header row -->
        <button
          type="button"
          class="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
          @click="toggle(net.id)"
        >
          <!-- Status dot -->
          <span
            :class="net.is_active ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'"
            class="h-2.5 w-2.5 rounded-full flex-shrink-0"
          ></span>

          <!-- Name + subnet -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ net.name }}</p>
            <p class="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">{{ net.subnet }}</p>
          </div>

          <!-- Connected badge -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('adminMesh.connected') }}: <span class="font-semibold text-midori-600">{{ connectedCount(net) }}</span>/{{ net.member_count }}
            </span>
          </div>

          <!-- Chevron -->
          <svg
            class="h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
            :class="expanded.has(net.id) ? 'rotate-180' : ''"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Members table (expanded) -->
        <div v-if="expanded.has(net.id)">
          <div class="border-t border-gray-100 dark:border-gray-700">
            <div v-if="net.members.length === 0" class="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
              {{ t('adminMesh.noMembers') }}
            </div>
            <table v-else class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-700/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                <tr>
                  <th class="px-5 py-2.5">{{ t('adminMesh.colIp') }}</th>
                  <th class="px-5 py-2.5">{{ t('adminMesh.colPublicIp') }}</th>
                  <th class="px-5 py-2.5 hidden sm:table-cell">{{ t('common.email') }}</th>
                  <th class="px-5 py-2.5">{{ t('common.status') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
                <tr
                  v-for="member in net.members"
                  :key="member.user_id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <!-- Mesh IP -->
                  <td class="px-5 py-3">
                    <span class="inline-flex items-center gap-1.5 font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded px-2 py-0.5">
                      <!-- shield icon -->
                      <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                      </svg>
                      {{ member.mesh_ip }}
                    </span>
                  </td>

                  <!-- Public IP (VPN tunnel IP) -->
                  <td class="px-5 py-3">
                    <span v-if="member.public_ip" class="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {{ member.public_ip }}
                    </span>
                    <span v-else class="text-gray-400">—</span>
                  </td>

                  <!-- Email -->
                  <td class="px-5 py-3 hidden sm:table-cell text-gray-500 dark:text-gray-400 text-xs">
                    {{ member.email }}
                  </td>

                  <!-- Connected status -->
                  <td class="px-5 py-3">
                    <span
                      :class="member.connected
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      <span
                        :class="member.connected ? 'bg-green-500' : 'bg-gray-400'"
                        class="h-1.5 w-1.5 rounded-full"
                      ></span>
                      {{ member.connected ? t('adminMesh.statusConnected') : t('adminMesh.statusOffline') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
