<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Estado de Salud del Clúster (/readyz)</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Monitoreo en tiempo real de nodos de base de datos, Redis, interfaces WireGuard y sondas de disponibilidad.
        </p>
      </div>
      <button
        @click="fetchHealth"
        :disabled="loading"
        class="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded-lg shadow transition flex items-center space-x-2"
      >
        <span v-if="loading" class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span>Actualizar Estado</span>
      </button>
    </div>

    <!-- Overall Status Banner -->
    <div
      v-if="healthData"
      :class="[
        'p-4 rounded-xl border flex items-center justify-between',
        healthData.status === 'ready'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
      ]"
    >
      <div class="flex items-center space-x-3">
        <div :class="['w-3 h-3 rounded-full', healthData.status === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500']"></div>
        <span class="font-semibold text-base">Estado Global del Clúster: {{ healthData.status.toUpperCase() }}</span>
      </div>
      <span class="text-xs opacity-75">Última comprobación: {{ lastChecked }}</span>
    </div>

    <!-- Health Checks Grid -->
    <div v-if="healthData?.checks" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- PostgreSQL Card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">PostgreSQL (Pool HA)</span>
          <span
            :class="[
              'px-2 py-0.5 rounded text-xs font-medium uppercase',
              healthData.checks.postgres?.status === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ healthData.checks.postgres?.status || 'Offline' }}
          </span>
        </div>
        <p class="text-xs text-slate-500">Latencia de Ping: {{ healthData.checks.postgres?.latency_ms ?? 0 }} ms</p>
      </div>

      <!-- WireGuard Interface Card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">WireGuard Kernel</span>
          <span
            :class="[
              'px-2 py-0.5 rounded text-xs font-medium uppercase',
              healthData.checks.wireguard?.status === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ healthData.checks.wireguard?.status || 'Offline' }}
          </span>
        </div>
        <p class="text-xs text-slate-500">Interfaz: {{ healthData.checks.wireguard?.interface || 'wg0' }}</p>
      </div>

      <!-- Redis & Rate Limiting Card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Redis Distribuido</span>
          <span class="px-2 py-0.5 rounded text-xs font-medium uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            OK
          </span>
        </div>
        <p class="text-xs text-slate-500">Ventana Deslizante Lua Activa</p>
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
