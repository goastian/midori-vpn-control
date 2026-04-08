import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce'
import { exchangeCode, api } from '../lib/api'
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

function isTokenIssuerValid(token: string): boolean {
  if (!issuerUrls.expectedTokenIssuer) return true
  const payload = decodeJWTPayload(token)
  // Opaque tokens (non-JWT) or JWTs without iss — trust the backend
  if (!payload?.iss) return true
  return payload.iss.replace(/\/+$/, '') === issuerUrls.expectedTokenIssuer.replace(/\/+$/, '')
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
    console.log('[AUTH] startLogin() called')
    console.log('[AUTH] ISSUER config:', issuerUrls)
    console.log('[AUTH] CLIENT_ID:', CLIENT_ID)
    console.log('[AUTH] REDIRECT_URI:', REDIRECT_URI)

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

    const loginUrl = `${issuerUrls.authorizationUrl}?${params.toString()}`
    console.log('[AUTH] Redirecting to Authentik:', loginUrl)
    window.location.href = loginUrl
  }

  async function handleCallback(code: string) {
    console.log('[AUTH] handleCallback() called with code length:', code.length)
    loading.value = true
    error.value = ''

    try {
      const verifier = sessionStorage.getItem('pkce_verifier') || ''
      sessionStorage.removeItem('pkce_verifier')
      console.log('[AUTH] PKCE verifier present:', !!verifier, 'length:', verifier.length)
      console.log('[AUTH] REDIRECT_URI for exchange:', REDIRECT_URI)

      const tokens = await exchangeCode(code, REDIRECT_URI, verifier)
      console.log('[AUTH] Token exchange SUCCESS')

      // Validate issuer from id_token (JWT) — access_token may be opaque
      const accessPayload = decodeJWTPayload(tokens.access_token)
      const idPayload = tokens.id_token ? decodeJWTPayload(tokens.id_token) : null
      console.log('[AUTH] Access token issuer:', accessPayload?.iss ?? '(opaque token)')
      console.log('[AUTH] ID token issuer:', idPayload?.iss ?? '(no id_token)')
      console.log('[AUTH] Expected issuer:', issuerUrls.expectedTokenIssuer)

      // Validate issuer: prefer id_token (guaranteed JWT per OIDC), fall back to access_token
      const issuerPayload = idPayload ?? accessPayload
      if (issuerPayload?.iss) {
        const tokenIss = issuerPayload.iss.replace(/\/+$/, '')
        const expectedIss = issuerUrls.expectedTokenIssuer.replace(/\/+$/, '')
        if (tokenIss !== expectedIss) {
          console.error('[AUTH] Token issuer mismatch!', issuerPayload.iss, '!==', issuerUrls.expectedTokenIssuer)
          throw new Error('Token issuer mismatch')
        }
      }
      console.log('[AUTH] Issuer validation OK')

      // Store expires_at from expires_in for reliable expiry checks (works with opaque tokens)
      if (tokens.expires_in) {
        const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in
        localStorage.setItem('token_expires_at', String(expiresAt))
        console.log('[AUTH] Token expires_at stored:', expiresAt, '(in', tokens.expires_in, 'seconds)')
      }

      console.log('[AUTH] Token validated, storing...')
      accessToken.value = tokens.access_token
      localStorage.setItem('access_token', tokens.access_token)

      if (tokens.refresh_token) {
        refreshToken.value = tokens.refresh_token
        localStorage.setItem('refresh_token', tokens.refresh_token)
      }

      console.log('[AUTH] Fetching user profile...')
      await fetchProfile()
      console.log('[AUTH] Login flow COMPLETE, user:', user.value?.email)
    } catch (e: any) {
      console.error('[AUTH] handleCallback FAILED:', e.message, e)
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
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')

    const logoutUrl = `${issuerUrls.endSessionUrl}?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/')}`
    window.location.href = logoutUrl
  }

  // Auto-fetch profile on init if token exists and is valid
  if (accessToken.value) {
    if (isTokenExpired(accessToken.value) || !isTokenIssuerValid(accessToken.value)) {
      logout()
    } else {
      fetchProfile()
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
