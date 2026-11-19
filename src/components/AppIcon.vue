<script setup lang="ts">
defineProps<{ name: string }>()

const paths: Record<string, string> = {
  wireguard: 'M13 2 4 14h7l-1 8 10-13h-7l1-7Z',
  chart: 'M4 4v16h16M8 15l4-5 4 3 4-7',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  devices: 'M3 4h14v11H3zM7 19h6M10 15v4M17 10h4v10h-6v-5',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  mesh: 'M7 5h10M5 7v10M19 7v10M7 19h10M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4z',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
  check: 'm5 12 4 4L19 6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  logout: 'M9 4H4v16h5m5-12 4 4-4 4m-6-4h13',
}
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.globe" />
  </svg>
</template>
