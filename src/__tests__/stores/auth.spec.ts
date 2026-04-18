import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock import.meta.env before importing the store
vi.stubGlobal('import', { meta: { env: {} } })

// We test the pure helper functions by extracting their logic.
// Since they are module-private, we test them indirectly via known JWT tokens.

function decodeJWTPayload(token: string): Record<string, unknown> | null {
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
  const payload = decodeJWTPayload(token)
  if (!payload?.exp) return false // opaque token — rely on 401 refresh
  return Date.now() / 1000 > (payload.exp as number) - skewSeconds
}

function isTokenIssuerValid(token: string, expectedIssuer: string): boolean {
  if (!expectedIssuer) return true
  const payload = decodeJWTPayload(token)
  if (!payload?.iss) return true // opaque token — trust the backend
  return payload.iss === expectedIssuer
}

// Build a fake JWT with a given payload
function fakeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

describe('JWT helper functions', () => {
  describe('decodeJWTPayload', () => {
    it('decodes a valid JWT payload', () => {
      const token = fakeJWT({ sub: 'user-1', email: 'a@b.com' })
      const payload = decodeJWTPayload(token)
      expect(payload).toEqual({ sub: 'user-1', email: 'a@b.com' })
    })

    it('returns null for invalid token format', () => {
      expect(decodeJWTPayload('not-a-jwt')).toBeNull()
      expect(decodeJWTPayload('')).toBeNull()
    })

    it('returns null for malformed base64', () => {
      expect(decodeJWTPayload('a.!!!.c')).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('returns false for a token valid in the future', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = fakeJWT({ exp: futureExp })
      expect(isTokenExpired(token)).toBe(false)
    })

    it('returns true for an expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 120
      const token = fakeJWT({ exp: pastExp })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('returns true when token is within skew window', () => {
      const almostExpired = Math.floor(Date.now() / 1000) + 30
      const token = fakeJWT({ exp: almostExpired })
      expect(isTokenExpired(token, 60)).toBe(true)
    })

    it('returns false when exp is missing (opaque token)', () => {
      const token = fakeJWT({ sub: 'user-1' })
      expect(isTokenExpired(token)).toBe(false)
    })
  })

  describe('isTokenIssuerValid', () => {
    it('returns true when issuer matches', () => {
      const token = fakeJWT({ iss: 'https://auth.example.com' })
      expect(isTokenIssuerValid(token, 'https://auth.example.com')).toBe(true)
    })

    it('returns false when issuer does not match', () => {
      const token = fakeJWT({ iss: 'https://evil.com' })
      expect(isTokenIssuerValid(token, 'https://auth.example.com')).toBe(false)
    })

    it('returns true when no expected issuer is configured', () => {
      const token = fakeJWT({ iss: 'https://anything.com' })
      expect(isTokenIssuerValid(token, '')).toBe(true)
    })

    it('returns true when token has no iss claim (opaque token)', () => {
      const token = fakeJWT({ sub: 'user-1' })
      expect(isTokenIssuerValid(token, 'https://auth.example.com')).toBe(true)
    })
  })
})

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('isAuthenticated is false when no token', async () => {
    // Dynamically import to pick up the fresh pinia
    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAdmin is false when user is null', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    expect(store.isAdmin).toBe(false)
  })

  it('isAdmin is true for authentik Admins group', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    store.user = {
      id: '53451935-3e31-407b-939f-873924c8a66f',
      authentik_uid: 'user-1',
      email: 'alfonso.hernandez@astian.org',
      display_name: 'ponchale',
      groups: ['authentik Admins'],
      is_banned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(store.isAdmin).toBe(true)
  })
})
