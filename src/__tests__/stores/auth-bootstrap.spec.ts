import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { clearAccessToken, getAccessToken } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const profile = {
  id: '53451935-3e31-407b-939f-873924c8a66f',
  authentik_uid: 'user-1',
  email: 'user@example.com',
  display_name: 'User',
  groups: ['users'],
  is_banned: false,
  created_at: '2026-09-03T00:00:00Z',
  updated_at: '2026-09-03T00:00:00Z',
}

function success(data: unknown): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function failure(status: number): Response {
  return new Response(JSON.stringify({ ok: false, code: 'request_failed', error: 'unavailable' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('authentication bootstrap', () => {
  beforeEach(() => {
    clearAccessToken()
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('becomes ready and anonymous when there is no stored session', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('ready')
    expect(auth.isAuthenticated).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not authenticate until refresh and profile validation both finish', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    let releaseProfile!: () => void
    const profilePending = new Promise<void>((resolve) => { releaseProfile = resolve })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/auth/refresh')) {
        return success({ access_token: 'access-token' })
      }
      await profilePending
      return success(profile)
    }))
    const auth = useAuthStore()

    const restoration = auth.restoreSession()
    await vi.waitFor(() => expect(auth.bootstrapState).toBe('loading'))
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()

    releaseProfile()
    await restoration

    expect(auth.bootstrapState).toBe('ready')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.email).toBe('user@example.com')
    auth.stopSessionCheck()
  })

  it('clears an invalid refresh token and resolves as anonymous', async () => {
    localStorage.setItem('refresh_token', 'expired-refresh')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure(401)))
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('ready')
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('resolves as anonymous when the refreshed session cannot load a profile', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(success({ access_token: 'first-access' }))
      .mockResolvedValueOnce(failure(401))
      .mockResolvedValueOnce(success({ access_token: 'second-access' }))
      .mockResolvedValueOnce(failure(401)))
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('ready')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(getAccessToken()).toBe('')
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('preserves a session on transient failure and authenticates after retry', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(503))
      .mockResolvedValueOnce(success({ access_token: 'retried-access' }))
      .mockResolvedValueOnce(success(profile))
    vi.stubGlobal('fetch', fetchMock)
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('error')
    expect(auth.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBe('')
    expect(localStorage.getItem('refresh_token')).toBe('stored-refresh')

    await auth.retryBootstrap()

    expect(auth.bootstrapState).toBe('ready')
    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('refresh_token')).toBe('stored-refresh')
    auth.stopSessionCheck()
  })

  it('preserves the session when profile reauthentication is temporarily unavailable', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(success({ access_token: 'initial-access' }))
      .mockResolvedValueOnce(failure(401))
      .mockResolvedValueOnce(failure(503)))
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('error')
    expect(auth.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBe('')
    expect(localStorage.getItem('refresh_token')).toBe('stored-refresh')
  })

  it('rejects an incomplete profile without exposing an authenticated state', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(success({ access_token: 'access-token' }))
      .mockResolvedValueOnce(success({ id: profile.id, email: profile.email })))
    const auth = useAuthStore()

    await auth.restoreSession()

    expect(auth.bootstrapState).toBe('error')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(getAccessToken()).toBe('')
    expect(localStorage.getItem('refresh_token')).toBe('stored-refresh')
  })
})
