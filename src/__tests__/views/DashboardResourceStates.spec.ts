import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const state = vi.hoisted(() => ({
  websocket: null as FakeWebSocket | null,
  auth: {
    user: { email: 'admin@example.com' } as { email: string; quota?: Record<string, unknown> },
    userQuota: null as Record<string, unknown> | null,
    quotaState: 'idle',
    isAdmin: true,
    accessToken: 'access-token',
    fetchQuota: vi.fn(),
  },
}))

class FakeWebSocket {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(_url: string) {
    state.websocket = this
  }

  send = vi.fn()
  close = vi.fn()
}

vi.mock('@/stores/auth', () => ({
  AUTH_LOGOUT_EVENT: 'auth:logout',
  useAuthStore: () => state.auth,
}))

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

vi.mock('@/lib/platform', () => ({
  detectDesktopEnvironment: vi.fn().mockResolvedValue({
    platform: 'unknown', architecture: 'unknown', linuxPackageFormat: 'unknown', confidence: 'mobile',
  }),
}))

import { api } from '@/lib/api'
import DashboardView from '@/views/DashboardView.vue'

const connection = {
  id: 'peer-1', user_id: 'user-1', server_id: 'server-1', device_name: 'Laptop',
  public_key: 'public-key', assigned_ip: '10.8.0.2', bytes_received: 1024,
  bytes_sent: 2048, last_handshake: null, is_active: true,
  created_at: '2026-09-03T00:00:00Z', updated_at: '2026-09-03T00:00:00Z',
}

const adminStats = {
  total_users: 7, total_servers: 3, active_servers: 2, total_peers: 5,
  active_peers: 1, total_bytes_sent: 4096, total_bytes_received: 8192,
}

describe('dashboard resource states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.websocket = null
    state.auth.user = { email: 'admin@example.com' }
    state.auth.userQuota = null
    state.auth.quotaState = 'idle'
    state.auth.fetchQuota.mockImplementation(async () => {
      state.auth.quotaState = 'error'
      return null
    })
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })

  it('renders unavailable values instead of zero when initial resources fail', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline'))

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Parte del Dashboard no está disponible')
    expect(wrapper.text()).toContain('No disponible')
    expect(wrapper.text()).not.toContain('0 B')
    expect(wrapper.text()).not.toContain('0%')
  })

  it('keeps quota and administrative statistics as separate resources', async () => {
    const quota = {
      connected_devices: 1, max_devices: 5, available_devices: 4,
      plan_slug: 'pro', plan_name: 'Pro', devices_by_type: { desktop: 1, extension: 0, wireguard: 0 },
    }
    state.auth.fetchQuota.mockImplementation(async () => {
      state.auth.userQuota = quota
      state.auth.quotaState = 'ready'
      return quota
    })
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path.includes('/admin/dashboard/stats') ? adminStats : [connection]
    )

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('1 / 5')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('2/3')
    expect(wrapper.text()).toContain('1/5')
  })

  it('keeps HTTP statistics when real-time transport is lost', async () => {
    state.auth.fetchQuota.mockImplementation(async () => {
      state.auth.userQuota = {
        connected_devices: 1, max_devices: 5, available_devices: 4,
        plan_slug: 'pro', plan_name: 'Pro', devices_by_type: { desktop: 1, extension: 0, wireguard: 0 },
      }
      state.auth.quotaState = 'ready'
      return state.auth.userQuota
    })
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path.includes('/admin/dashboard/stats') ? adminStats : [connection]
    )
    const wrapper = mount(DashboardView)
    await flushPromises()

    state.websocket?.onopen?.()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('En vivo')

    state.websocket?.onerror?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sin tiempo real')
    expect(wrapper.text()).toContain('2/3')
    expect(wrapper.text()).toContain('1/5')
  })
})
