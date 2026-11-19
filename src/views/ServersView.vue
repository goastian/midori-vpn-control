<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'
import { useLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'
import { ServerCandidateListSchema, type ServerCandidate } from '../lib/schemas'
import AsyncState from '../components/AsyncState.vue'
import QuotaSummary from '../components/QuotaSummary.vue'
import ResourceSkeleton from '../components/ResourceSkeleton.vue'
import { beginResourceLoad, completeResourceLoad, type ResourceState } from '../lib/resource-state'

const router = useRouter()
const auth = useAuthStore()
const servers = ref<ServerCandidate[]>([])
const serversState = ref<ResourceState>('idle')
let refreshTimer: ReturnType<typeof setInterval> | null = null
const { t } = useLocale()

const userQuota = computed(() => auth.userQuota)

onMounted(async () => {
  await Promise.all([loadServers(), auth.fetchQuota()])
  refreshTimer = setInterval(() => {
    loadServers()
    auth.fetchQuota()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

async function loadServers() {
  serversState.value = beginResourceLoad(servers.value.length > 0 || serversState.value === 'empty')
  try {
    servers.value = await api.validated(
      '/api/v1/control/servers/candidates?protocol=wireguard',
      ServerCandidateListSchema,
    )
    serversState.value = completeResourceLoad(servers.value.length > 0)
  } catch {
    serversState.value = 'error'
  }
}

async function retryLoad() {
  await Promise.all([loadServers(), auth.fetchQuota()])
}

function connectToServer(serverId: string) {
  router.push({ path: '/connections', query: { server_id: serverId } })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('serversView.title') }}</h1>
        <p class="text-sm text-slate-400 mt-1">
          {{
            t('serversView.subtitle', {
              count:
                serversState === 'loading' || serversState === 'idle'
                  ? t('common.unavailable')
                  : servers.length,
            })
          }}
        </p>
      </div>
    </div>

    <!-- Global User Quota Bar -->
    <ResourceSkeleton
      v-if="auth.quotaState === 'loading' && !userQuota"
      :title="t('quota.loading')"
      :count="1"
      item-class="h-28"
    />
    <QuotaSummary v-else-if="userQuota" :quota="userQuota" />
    <p
      v-if="auth.quotaState === 'error'"
      role="alert"
      class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
    >
      {{ userQuota ? t('common.refreshFailed') : t('quota.loadError') }}
    </p>

    <ResourceSkeleton
      v-if="serversState === 'idle' || serversState === 'loading'"
      :title="t('serversView.loading')"
    />

    <AsyncState
      v-else-if="serversState === 'error' && servers.length === 0"
      kind="error"
      :title="t('serversView.loadErrorTitle')"
      :detail="t('serversView.loadErrorDetail')"
      :retry-label="t('common.retry')"
      @retry="retryLoad"
    />

    <AsyncState v-else-if="serversState === 'empty'" kind="empty" :title="t('serversView.empty')" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <p
        v-if="serversState === 'refreshing'"
        class="col-span-full text-sm text-slate-400"
        role="status"
      >
        {{ t('common.refreshing') }}
      </p>
      <p
        v-else-if="serversState === 'error'"
        class="col-span-full rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
        role="alert"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <div
        v-for="server in servers"
        :key="server.id"
        class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/30 backdrop-blur-xl transition-all hover:border-slate-700 hover:-translate-y-1"
      >
        <div
          class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-midori-500/10 blur-xl group-hover:bg-midori-500/20 transition-all"
        ></div>

        <div>
          <!-- Header -->
          <div class="relative z-10 flex items-start justify-between gap-3 mb-4">
            <div>
              <h3
                class="text-lg font-bold text-white group-hover:text-midori-300 transition-colors"
              >
                {{ server.name }}
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ server.location }} {{ server.country_code ? `· ${server.country_code}` : '' }}
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-midori-700/50 bg-midori-950/60 px-2.5 py-1 text-xs font-semibold text-midori-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-midori-400"></span>
              {{ t('common.active') }}
            </span>
          </div>

          <!-- Security Badges -->
          <div class="flex flex-wrap gap-1.5 mb-5">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-midori-300"
            >
              <span class="w-1 h-1 rounded-full bg-midori-400"></span>
              WireGuard
            </span>
            <span
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-cyan-300"
            >
              <span class="w-1 h-1 rounded-full bg-cyan-400"></span>
              {{ t('serversView.dnsSecure') }}
            </span>
            <span
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-medium text-purple-300"
            >
              <span class="w-1 h-1 rounded-full bg-purple-400"></span>
              Post-Quantum
            </span>
          </div>
        </div>

        <!-- Action button -->
        <button
          type="button"
          :class="
            !userQuota || userQuota.available_devices === 0
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              : 'bg-slate-800 hover:bg-midori-600 border-slate-700/80 hover:border-midori-500 text-white'
          "
          class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2 group-hover:shadow-midori-950/40"
          :disabled="!userQuota || auth.quotaState === 'loading' || auth.quotaState === 'error'"
          @click="connectToServer(server.id)"
        >
          <svg
            class="w-4 h-4 text-midori-400 group-hover:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span v-if="userQuota && userQuota.available_devices === 0">{{
            t('serversView.manageLimit', {
              connected: userQuota.connected_devices,
              maximum: userQuota.max_devices,
            })
          }}</span>
          <span v-else-if="userQuota">{{ t('serversView.connectHere') }}</span>
          <span v-else>{{ t('common.unavailable') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
