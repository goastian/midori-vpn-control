import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const state = vi.hoisted(() => ({
  websocket: null as FakeWebSocket | null,
  auth: {
    user: { email: 'admin@example.com' },
    isAdmin: true,
    accessToken: 'access-token',
  },
  desktopEnvironment: {
    platform: 'unknown',
    architecture: 'unknown',
    linuxPackageFormat: 'unknown',
    confidence: 'mobile',
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

vi.mock('@/lib/api', () => ({ api: { validated: vi.fn() } }))

vi.mock('@/lib/platform', () => ({
  detectDesktopEnvironment: vi.fn(() => Promise.resolve(state.desktopEnvironment)),
}))

import { api } from '@/lib/api'
import DashboardView from '@/views/DashboardView.vue'

const adminStats = {
  total_users: 7,
  total_servers: 3,
  active_servers: 2,
  total_peers: 5,
  active_peers: 1,
  total_bytes_sent: 4096,
  total_bytes_received: 8192,
}

const dashboardSummary = {
  registered_devices: 1,
  connected_devices: 1,
  max_devices: 5,
  available_devices: 4,
  plan_slug: 'pro',
  plan_name: 'Pro',
  traffic: {
    bytes_sent: 2048,
    bytes_received: 1024,
  },
  recent_sessions: [
    {
      id: '6c5575e8-c212-4df5-b44f-e12ea5b1ec8e',
      device_id: 'bd2c610d-5e38-4eeb-a460-30eddb4f20c5',
      server_id: 'd1a60c46-9294-407a-90a4-7c0f29bda831',
      server_name: 'Santo Domingo',
      device_name: 'Work laptop',
      protocol: 'wireguard',
      assigned_ip: '10.8.0.2',
      bytes_received: 1024,
      bytes_sent: 2048,
      last_handshake: null,
      is_active: true,
      created_at: '2026-09-03T00:00:00Z',
    },
  ],
  infrastructure: adminStats,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('dashboard resource states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.websocket = null
    state.auth.user = { email: 'admin@example.com' }
    state.auth.isAdmin = true
    state.desktopEnvironment = {
      platform: 'unknown',
      architecture: 'unknown',
      linuxPackageFormat: 'unknown',
      confidence: 'mobile',
    }
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })

  it('offers only the supported Linux x86_64 RPM artifact', async () => {
    state.auth.isAdmin = false
    state.desktopEnvironment = {
      platform: 'linux',
      architecture: 'x64',
      linuxPackageFormat: 'rpm',
      confidence: 'detected',
    }
    const { infrastructure: _infrastructure, ...userSummary } = dashboardSummary
    vi.mocked(api.validated).mockResolvedValue(userSummary)

    const wrapper = mount(DashboardView)
    await flushPromises()

    const artifactLinks = wrapper
      .findAll('a')
      .filter((link) => link.attributes('href')?.includes('/releases/latest/download/'))
    expect(artifactLinks).toHaveLength(2)
    expect(
      artifactLinks.every((link) =>
        link.attributes('href')?.endsWith('/midori-vpn-2.0.0-1.x86_64.rpm'),
      ),
    ).toBe(true)
    expect(wrapper.html()).not.toMatch(/\.(?:deb|AppImage|msi|exe|dmg)/)
  })

  it('renders unavailable values instead of zero when initial resources fail', async () => {
    vi.mocked(api.validated).mockRejectedValue(new Error('offline'))

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Parte del Dashboard no está disponible')
    expect(wrapper.text()).not.toContain('0 B')
    expect(wrapper.text()).not.toContain('0%')
  })

  it('renders only a stable skeleton while the initial summary is pending', async () => {
    const pendingSummary = deferred<typeof dashboardSummary>()
    vi.mocked(api.validated).mockReturnValue(pendingSummary.promise)

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Cargando...')
    expect(wrapper.text()).not.toMatch(/\b(?:undefined|null|NaN)\b/)
    expect(wrapper.text()).not.toContain('0 B')
    expect(wrapper.text()).not.toContain('0%')

    pendingSummary.resolve(dashboardSummary)
    await flushPromises()
    expect(wrapper.text()).toContain('Work laptop')
  })

  it('renders the coherent HTTP summary without counting sessions as devices', async () => {
    vi.mocked(api.validated).mockResolvedValue(dashboardSummary)

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(api.validated).toHaveBeenCalledTimes(1)
    expect(api.validated).toHaveBeenCalledWith(
      '/api/v1/control/dashboard/summary',
      expect.anything(),
    )
    expect(wrapper.text()).toContain('Dispositivos registrados')
    expect(wrapper.text()).toContain('Dispositivos conectados')
    expect(wrapper.text()).toContain('4 / 5')
    expect(wrapper.text()).toContain('Work laptop')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('2/3')
    expect(wrapper.text()).toContain('1/5')
  })

  it('accepts a user summary without administrator infrastructure or WebSocket', async () => {
    state.auth.isAdmin = false
    const { infrastructure: _infrastructure, ...userSummary } = dashboardSummary
    vi.mocked(api.validated).mockResolvedValue(userSummary)

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Dispositivos registrados')
    expect(wrapper.text()).toContain('Work laptop')
    expect(wrapper.text()).not.toContain('Métricas de plataforma')
    expect(state.websocket).toBeNull()
  })

  it('keeps HTTP statistics when real-time transport is lost', async () => {
    vi.mocked(api.validated).mockResolvedValue(dashboardSummary)
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

  it('keeps the last validated summary when a manual refresh fails', async () => {
    vi.mocked(api.validated)
      .mockResolvedValueOnce(dashboardSummary)
      .mockRejectedValueOnce(new Error('offline'))

    const wrapper = mount(DashboardView)
    await flushPromises()

    const refresh = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Actualizar resumen'))
    await refresh?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Parte del Dashboard no está disponible')
    expect(wrapper.text()).toContain('Work laptop')
    expect(wrapper.text()).toContain('4 / 5')
  })

  it('rejects incomplete WebSocket statistics and retains the HTTP snapshot', async () => {
    vi.mocked(api.validated).mockResolvedValue(dashboardSummary)
    const wrapper = mount(DashboardView)
    await flushPromises()

    state.websocket?.onopen?.()
    state.websocket?.onmessage?.({
      data: JSON.stringify({ type: 'stats', data: { total_users: 999 } }),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sin tiempo real')
    expect(wrapper.text()).toContain('2/3')
    expect(wrapper.text()).toContain('1/5')
    expect(wrapper.text()).not.toContain('999')
  })
})
