import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { installAuthGuard } from '../router'
import { clearAccessToken } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const View = { template: '<div />' }
const profile = {
  id: '53451935-3e31-407b-939f-873924c8a66f',
  authentik_uid: 'user-1',
  email: 'user@example.com',
  display_name: 'User',
  groups: ['users'],
  is_banned: false,
  created_at: '2026-09-03T00:00:00Z',
}

function testRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'landing', component: View, meta: { public: true, fullPage: true } },
      { path: '/dashboard', name: 'dashboard', component: View },
      { path: '/auth/callback', name: 'callback', component: View, meta: { public: true, fullPage: true, bootstrapBypass: true } },
    ],
  })
  installAuthGuard(router)
  return router
}

function success(data: unknown): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('authentication router guard', () => {
  beforeEach(() => {
    clearAccessToken()
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('redirects an anonymous protected navigation only after bootstrap', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const router = testRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('landing')
    expect(useAuthStore().bootstrapState).toBe('ready')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('waits for a validated profile before entering a protected route', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    let releaseProfile!: () => void
    const profilePending = new Promise<void>((resolve) => { releaseProfile = resolve })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/auth/refresh')) return success({ access_token: 'access-token' })
      await profilePending
      return success(profile)
    }))
    const router = testRouter()
    const navigation = router.push('/dashboard')

    await vi.waitFor(() => expect(useAuthStore().bootstrapState).toBe('loading'))
    expect(router.currentRoute.value.name).not.toBe('dashboard')

    releaseProfile()
    await navigation

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(useAuthStore().isAuthenticated).toBe(true)
    useAuthStore().stopSessionCheck()
  })

  it('retains the requested route behind a recoverable bootstrap error', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    const router = testRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(useAuthStore().bootstrapState).toBe('error')
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(localStorage.getItem('refresh_token')).toBe('stored-refresh')
  })

  it('does not start web-session restoration on an OAuth callback route', async () => {
    localStorage.setItem('refresh_token', 'stored-refresh')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const router = testRouter()

    await router.push('/auth/callback?code=code&state=state')

    expect(router.currentRoute.value.name).toBe('callback')
    expect(useAuthStore().bootstrapState).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
