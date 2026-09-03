<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import { AdminMeshNetworkPageSchema, type AdminMeshNetwork } from '../../lib/schemas'
import AsyncState from '../../components/AsyncState.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import PaginationControls from '../../components/PaginationControls.vue'
import AdminListFilters from '../../components/AdminListFilters.vue'
import {
  beginResourceLoad,
  completeResourceLoad,
  type ResourceState,
} from '../../lib/resource-state'

const meshNetworks = ref<AdminMeshNetwork[]>([])
const meshState = ref<ResourceState>('idle')
const page = ref(1)
const total = ref(0)
const PAGE_SIZE = 20
const search = ref('')
const status = ref('all')
const sort = ref('created_at')
const order = ref('desc')
const expanded = ref<Set<string>>(new Set())
const { t } = useLocale()
let refreshTimer: number | undefined

onMounted(() => {
  load()
  refreshTimer = window.setInterval(() => {
    load()
  }, 15000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})

async function load(requestedPage?: number) {
  meshState.value = beginResourceLoad(meshNetworks.value.length > 0 || meshState.value === 'empty')
  try {
    const targetPage = typeof requestedPage === 'number' ? requestedPage : page.value
    const params = new URLSearchParams({
      page: String(targetPage),
      page_size: String(PAGE_SIZE),
      status: status.value,
      sort: sort.value,
      order: order.value,
    })
    if (search.value) params.set('search', search.value)
    const response = await api.validated(`/api/v1/admin/mesh?${params}`, AdminMeshNetworkPageSchema)
    meshNetworks.value = response.items
    page.value = response.page
    total.value = response.total
    meshState.value = completeResourceLoad(meshNetworks.value.length > 0)
  } catch {
    meshState.value = 'error'
  }
}

function applyFilters(filters: { search: string; status: string; sort: string; order: string }) {
  search.value = filters.search
  status.value = filters.status
  sort.value = filters.sort
  order.value = filters.order
  void load(1)
}

function toggle(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}

function connectedCount(net: AdminMeshNetwork) {
  return net.members.filter((m) => m.connected).length
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminMesh.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ t('adminMesh.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer self-start sm:self-auto"
        :disabled="meshState === 'loading' || meshState === 'refreshing'"
        :aria-busy="meshState === 'loading' || meshState === 'refreshing'"
        @click="load()"
      >
        <svg
          class="w-4 h-4 text-midori-400"
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{{ t('adminMesh.refresh') }}</span>
      </button>
    </div>

    <AdminListFilters
      :search="search"
      :status="status"
      :sort="sort"
      :order="order"
      :statuses="['all', 'active', 'inactive']"
      :sorts="['created_at', 'name', 'member_count']"
      :disabled="meshState === 'loading' || meshState === 'refreshing'"
      @apply="applyFilters"
    />

    <ResourceSkeleton
      v-if="meshState === 'idle' || meshState === 'loading'"
      :title="t('adminMesh.loading')"
      item-class="h-24"
    />
    <AsyncState
      v-else-if="meshState === 'error' && meshNetworks.length === 0"
      kind="error"
      :title="t('adminMesh.loadError')"
      :retry-label="t('common.retry')"
      @retry="load()"
    />
    <AsyncState v-else-if="meshState === 'empty'" kind="empty" :title="t('adminMesh.empty')" />

    <div v-else class="space-y-4">
      <p v-if="meshState === 'refreshing'" role="status" class="text-sm text-slate-400">
        {{ t('common.refreshing') }}
      </p>
      <p
        v-else-if="meshState === 'error'"
        role="alert"
        class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <div
        v-for="net in meshNetworks"
        :key="net.id"
        class="bg-slate-900/80 rounded-3xl shadow-xl shadow-black/30 border border-slate-800/80 overflow-hidden backdrop-blur-xl transition-all"
      >
        <!-- Network header row -->
        <button
          type="button"
          :aria-expanded="expanded.has(net.id)"
          :aria-controls="`mesh-members-${net.id}`"
          :aria-label="
            t('adminMesh.toggleMembers', {
              action: t(expanded.has(net.id) ? 'adminMesh.collapse' : 'adminMesh.expand'),
              name: net.name,
            })
          "
          class="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
          @click="toggle(net.id)"
        >
          <!-- Status dot -->
          <span
            :class="
              net.is_active
                ? 'bg-midori-400 shadow-md shadow-midori-500/50 animate-pulse'
                : 'bg-slate-600'
            "
            class="h-3 w-3 rounded-full flex-shrink-0"
            aria-hidden="true"
          ></span>

          <!-- Name + subnet -->
          <div class="flex-1 min-w-0">
            <p class="font-bold text-base text-white truncate">{{ net.name }}</p>
            <p class="text-xs font-mono text-midori-400 mt-0.5">{{ net.subnet }}</p>
          </div>

          <!-- Connected badge -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              class="text-xs text-slate-300 font-medium px-3 py-1 bg-slate-800 border border-slate-700 rounded-full"
            >
              {{ t('adminMesh.connected') }}:
              <span class="font-bold text-midori-400">{{ connectedCount(net) }}</span> /
              {{ net.member_count }}
            </span>
          </div>

          <!-- Chevron -->
          <svg
            class="h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200"
            :class="expanded.has(net.id) ? 'rotate-180 text-white' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Members table (expanded) -->
        <div v-if="expanded.has(net.id)" :id="`mesh-members-${net.id}`">
          <div class="border-t border-slate-800">
            <div v-if="net.members.length === 0" class="px-6 py-6 text-sm text-slate-400">
              {{ t('adminMesh.noMembers') }}
            </div>
            <table v-else class="w-full text-sm">
              <thead
                class="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left border-b border-slate-800"
              >
                <tr>
                  <th class="px-6 py-3.5">{{ t('adminMesh.colIp') }}</th>
                  <th class="px-6 py-3.5">{{ t('adminMesh.colPublicIp') }}</th>
                  <th class="px-6 py-3.5 hidden sm:table-cell">{{ t('common.email') }}</th>
                  <th class="px-6 py-3.5 text-right">{{ t('common.status') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr
                  v-for="member in net.members"
                  :key="member.user_id"
                  class="hover:bg-slate-800/40 transition-colors"
                >
                  <!-- Mesh IP -->
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-1.5 font-mono text-xs bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 rounded-lg px-2.5 py-1"
                    >
                      <svg
                        class="h-3 w-3"
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      {{ member.mesh_ip }}
                    </span>
                  </td>

                  <!-- Public IP (VPN tunnel IP) -->
                  <td class="px-6 py-4">
                    <span v-if="member.public_ip" class="font-mono text-xs text-slate-300">
                      {{ member.public_ip }}
                    </span>
                    <span v-else class="text-slate-500">{{ t('common.unavailable') }}</span>
                  </td>

                  <!-- Email -->
                  <td class="px-6 py-4 hidden sm:table-cell text-slate-300 text-xs font-medium">
                    {{ member.email }}
                  </td>

                  <!-- Connected status -->
                  <td class="px-6 py-4 text-right">
                    <span
                      :class="
                        member.connected
                          ? 'bg-midori-950/60 border-midori-700/50 text-midori-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      "
                      class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
                    >
                      <span
                        :class="member.connected ? 'bg-midori-400 animate-pulse' : 'bg-slate-500'"
                        class="h-1.5 w-1.5 rounded-full"
                        aria-hidden="true"
                      ></span>
                      {{
                        member.connected
                          ? t('adminMesh.statusConnected')
                          : t('adminMesh.statusOffline')
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <PaginationControls
        :page="page"
        :page-size="PAGE_SIZE"
        :total="total"
        :disabled="meshState === 'refreshing'"
        @change="load"
      />
    </div>
  </div>
</template>
