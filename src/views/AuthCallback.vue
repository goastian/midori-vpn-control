<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const errorMsg = ref('')

onMounted(async () => {
  const code = route.query.code as string
  const error = route.query.error as string

  if (error) {
    errorMsg.value = route.query.error_description as string || error
    return
  }

  if (!code) {
    errorMsg.value = 'No se recibió código de autorización'
    return
  }

  try {
    await auth.handleCallback(code)
    router.replace({ name: 'dashboard' })
  } catch (e: any) {
    errorMsg.value = e.message || 'Error durante la autenticación'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div v-if="errorMsg" class="bg-red-50 text-red-700 rounded-lg p-6 max-w-md">
        <h2 class="text-lg font-semibold mb-2">Error de autenticación</h2>
        <p class="text-sm">{{ errorMsg }}</p>
        <router-link to="/login" class="mt-4 inline-block text-midori-600 hover:underline text-sm">
          Volver al login
        </router-link>
      </div>
      <div v-else class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-midori-600 mx-auto"></div>
        <p class="text-gray-500">Autenticando...</p>
      </div>
    </div>
  </div>
</template>
