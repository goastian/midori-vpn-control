import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce'
import { exchangeCode, api, setAccessToken, clearAccessToken, onAccessTokenRefreshed, initFromStoredRefreshToken } from '../lib/api'
import { UserSchema, type User } from '../lib/schemas'

function normalizeIssuer(value: string | undefined): string {
  return (value || '').replace(/\/+$/, '')
}

function parseIssuerUrls(value: string | undefined) {
  const appUrl = normalizeIssuer(value)

  try {
    const url = new URL(appUrl)
    const origin = url.origin
    return {
      appUrl,
      expectedTokenIssuer: `${origin}/`,
      authorizationUrl: `${origin}/application/o/authorize/`,
      endSessionUrl: `${appUrl}/end-session/`,
    }
  } catch {
    return {
      appUrl,
      expectedTokenIssuer: appUrl,
      authorizationUrl: `${appUrl}/authorize/`,
      endSessionUrl: `${appUrl}/end-session/`,
    }
  }
}

const issuerUrls = parseIssuerUrls(import.meta.env.VITE_AUTHENTIK_ISSUER)
const CLIENT_ID = import.meta.env.VITE_AUTHENTIK_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_AUTHENTIK_REDIRECT_URI

interface JWTPayload {
  sub?: string
  iss?: string
  exp?: number
  iat?: number
  email?: string
  groups?: string[]
  [key: string]: unknown
}

function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(token: string, skewSeconds = 60): boolean {
  // Check stored expires_at first (works for both opaque and JWT tokens)
  const expiresAt = localStorage.getItem('token_expires_at')
  if (expiresAt) {
    return Date.now() / 1000 > Number(expiresAt) - skewSeconds
  }
  // Fallback to JWT decode
  const payload = decodeJWTPayload(token)
  if (!payload?.exp) return false // opaque token — rely on 401 refresh
  return Date.now() / 1000 > payload.exp - skewSeconds
}

function _isTokenIssuerValid(token: string): boolean {
  if (!issuerUrls.expectedTokenIssuer) return true
  const payload = decodeJWTPayload(token)
  // Opaque tokens (non-JWT) or JWTs without iss — trust the backend
  if (!payload?.iss) return true
  return payload.iss.replace(/\/+$/, '') === issuerUrls.expectedTokenIssuer.replace(/\/+$/, '')
}

export const useAuthStore = defineStore('auth', () => {
  // access_token lives in memory only — never written to localStorage.
  const accessToken = ref('')
  const refreshToken = ref(localStorage.getItem('refresh_token') || '')
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() =>
    user.value?.groups?.some((g) =>
      g === 'vpn-admins' || g === 'admins' || g === 'authentik Admins'
    ) ?? false
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
      scope: 'openid email profile offline_access',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    })

    const loginUrl = `${issuerUrls.authorizationUrl}?${params.toString()}`
    window.location.href = loginUrl
  }

  async function handleCallback(code: string) {
    loading.value = true
    error.value = ''

    try {
      const verifier = sessionStorage.getItem('pkce_verifier') || ''
      sessionStorage.removeItem('pkce_verifier')

      const tokens = await exchangeCode(code, REDIRECT_URI, verifier)

      // Validate issuer: prefer id_token (guaranteed JWT per OIDC), fall back to access_token
      const accessPayload = decodeJWTPayload(tokens.access_token)
      const idPayload = tokens.id_token ? decodeJWTPayload(tokens.id_token) : null
      const issuerPayload = idPayload ?? accessPayload
      if (issuerPayload?.iss) {
        const tokenIss = issuerPayload.iss.replace(/\/+$/, '')
        const expectedIss = issuerUrls.expectedTokenIssuer.replace(/\/+$/, '')
        if (tokenIss !== expectedIss) {
          throw new Error('Token issuer mismatch')
        }
      }

      // Store expires_at from expires_in for reliable expiry checks (works with opaque tokens)
      if (tokens.expires_in) {
        const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in
        localStorage.setItem('token_expires_at', String(expiresAt))
      }

      accessToken.value = tokens.access_token
      setAccessToken(tokens.access_token) // sync in-memory token for api module

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
      user.value = await api.validated('/api/v1/control/me', UserSchema)
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
    clearAccessToken() // clear in-memory token from api module
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')

    const logoutUrl = `${issuerUrls.endSessionUrl}?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/')}`
    window.location.href = logoutUrl
  }

  // Keep accessToken ref in sync when api.ts silently refreshes the token.
  onAccessTokenRefreshed((token) => {
    accessToken.value = token
  })

  // On page load: if a refresh_token is stored, obtain a fresh access_token in
  // memory so the user doesn't have to log in again after a reload.
  {
    const savedRefresh = localStorage.getItem('refresh_token')
    if (savedRefresh) {
      refreshToken.value = savedRefresh
      loading.value = true
      initFromStoredRefreshToken()
        .then((token) => {
          if (token) {
            // accessToken.value already updated via onAccessTokenRefreshed
            fetchProfile()
          } else {
            refreshToken.value = ''
          }
        })
        .catch(() => {
          refreshToken.value = ''
        })
        .finally(() => {
          loading.value = false
        })
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isTokenExpired: () => isTokenExpired(accessToken.value),
    startLogin,
    handleCallback,
    fetchProfile,
    logout,
  }
})
