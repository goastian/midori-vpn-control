import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce'
import { exchangeCode, api } from '../lib/api'

const ISSUER = import.meta.env.VITE_AUTHENTIK_ISSUER
const CLIENT_ID = import.meta.env.VITE_AUTHENTIK_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_AUTHENTIK_REDIRECT_URI

interface User {
  id: string
  authentik_uid: string
  email: string
  display_name: string
  groups: string[]
  is_banned: boolean
  created_at: string
  updated_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('access_token') || '')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() =>
    user.value?.groups?.some((g) => g === 'vpn-admins' || g === 'admins') ?? false
  )

  async function startLogin() {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)

    sessionStorage.setItem('pkce_verifier', verifier)

    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'openid email profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    })

    window.location.href = `${ISSUER}/authorize/?${params.toString()}`
  }

  async function handleCallback(code: string) {
    loading.value = true
    error.value = ''

    try {
      const verifier = sessionStorage.getItem('pkce_verifier') || ''
      sessionStorage.removeItem('pkce_verifier')

      const tokens = await exchangeCode(code, REDIRECT_URI, verifier)

      accessToken.value = tokens.access_token
      localStorage.setItem('access_token', tokens.access_token)

      if (tokens.refresh_token) {
        refreshToken.value = tokens.refresh_token
        localStorage.setItem('refresh_token', tokens.refresh_token)
      }

      await fetchProfile()
    } catch (e: any) {
      error.value = e.message || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      user.value = await api.get<User>('/api/v1/control/me')
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        logout()
      }
    }
  }

  function logout() {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')

    const logoutUrl = `${ISSUER}/end-session/?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/login')}`
    window.location.href = logoutUrl
  }

  // Auto-fetch profile on init if token exists
  if (accessToken.value) {
    fetchProfile()
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    startLogin,
    handleCallback,
    fetchProfile,
    logout,
  }
})
