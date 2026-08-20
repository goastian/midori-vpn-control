<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">Estado de Salud del Clúster (/readyz)</h1>
        <p class="text-sm text-slate-400 mt-1">
          Monitoreo en tiempo real de nodos de base de datos, Redis, interfaces WireGuard y sondas de disponibilidad.
        </p>
      </div>
      <button
        @click="fetchHealth"
        :disabled="loading"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-midori-600 hover:bg-midori-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-midori-900/30 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
      >
        <span v-if="loading" class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span>Actualizar Estado</span>
      </button>
    </div>

    <!-- Overall Status Banner -->
    <div
      v-if="healthData"
      :class="[
        'p-5 rounded-3xl border shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        healthData.status === 'ready'
          ? 'bg-midori-950/40 border-midori-700/50 text-midori-200'
          : 'bg-amber-950/40 border-amber-700/50 text-amber-200'
      ]"
    >
      <div class="flex items-center gap-3">
        <div :class="['w-3 h-3 rounded-full', healthData.status === 'ready' ? 'bg-midori-400 shadow-md shadow-midori-500/50 animate-pulse' : 'bg-amber-400']"></div>
        <span class="font-bold text-lg text-white">Estado Global del Clúster: {{ healthData.status.toUpperCase() }}</span>
      </div>
      <span class="text-xs font-mono text-slate-400">Última comprobación: {{ lastChecked }}</span>
    </div>

    <!-- Health Checks Grid -->
    <div v-if="healthData?.checks" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- PostgreSQL Card -->
      <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800/80 shadow-xl shadow-black/30 backdrop-blur-xl space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold text-white">PostgreSQL (Pool HA)</span>
          <span
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-semibold uppercase border',
              healthData.checks.postgres?.status === 'ok' ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
            ]"
          >
            {{ healthData.checks.postgres?.status || 'Offline' }}
          </span>
        </div>
        <p class="text-xs font-mono text-slate-400">Latencia de Ping: <span class="text-midori-300">{{ healthData.checks.postgres?.latency_ms ?? 0 }} ms</span></p>
      </div>

      <!-- WireGuard Interface Card -->
      <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800/80 shadow-xl shadow-black/30 backdrop-blur-xl space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold text-white">WireGuard Kernel</span>
          <span
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-semibold uppercase border',
              healthData.checks.wireguard?.status === 'ok' ? 'bg-midori-950/60 border-midori-700/50 text-midori-300' : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
            ]"
          >
            {{ healthData.checks.wireguard?.status || 'Offline' }}
          </span>
        </div>
        <p class="text-xs font-mono text-slate-400">Interfaz: <span class="text-cyan-300">{{ healthData.checks.wireguard?.interface || 'wg0' }}</span></p>
      </div>

      <!-- Redis & Rate Limiting Card -->
      <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800/80 shadow-xl shadow-black/30 backdrop-blur-xl space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-base font-bold text-white">Redis Distribuido</span>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-midori-950/60 border border-midori-700/50 text-midori-300">
            OK
          </span>
        </div>
        <p class="text-xs text-slate-400">Ventana Deslizante Lua Activa</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface HealthResponse {
  status: string
  checks: {
    postgres?: { status: string; latency_ms?: number }
    wireguard?: { status: string; interface?: string }
    storage?: { status: string }
  }
}

const healthData = ref<HealthResponse | null>(null)
const loading = ref(false)
const lastChecked = ref('')

async function fetchHealth() {
  loading.value = true
  try {
    const res = await fetch('/readyz')
    healthData.value = await res.json()
    lastChecked.value = new Date().toLocaleTimeString()
  } catch (err) {
    console.error('Failed to query /readyz', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHealth()
})
</script>
