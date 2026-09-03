import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import QuotaSummary from '@/components/QuotaSummary.vue'
import ServersView from '@/views/ServersView.vue'
import PeersView from '@/views/PeersView.vue'
import { api } from '@/lib/api'
import { setLocale } from '@/lib/i18n'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') },
}))
vi.mock('@/lib/api', () => ({
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  onAccessTokenChanged: vi.fn(),
  initFromStoredRefreshToken: vi.fn().mockResolvedValue(null),
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    fetchRaw: vi.fn(),
    validated: vi.fn(),
  },
}))

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/servers', component: { template: '<div />' } },
      { path: '/connections', component: { template: '<div />' } },
    ],
  })
}

describe('localized user views', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    setLocale('es')
  })

  it('exposes plan usage as a named progress indicator', () => {
    const wrapper = mount(QuotaSummary, {
      props: {
        quota: {
          connected_devices: 2,
          max_devices: 5,
          available_devices: 3,
          plan_slug: 'pro',
          plan_name: 'Pro',
          devices_by_type: { desktop: 1, extension: 1, wireguard: 0 },
        },
      },
    })

    const progress = wrapper.get('[role="progressbar"]')
    expect(progress.attributes('aria-valuenow')).toBe('40')
    expect(progress.attributes('aria-label')).toBe('Porcentaje de dispositivos utilizados')
  })

  it('shows a retryable server loading failure', async () => {
    vi.mocked(api.validated).mockRejectedValue(new Error('offline'))
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/servers')
    await router.isReady()
    const wrapper = mount(ServersView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const serverError = wrapper
      .findAll('[role="alert"]')
      .find((alert) => alert.text().includes('No se pudieron cargar'))
    expect(serverError).toBeDefined()

    vi.mocked(api.validated).mockImplementation(async (path: string) => {
      if (path.endsWith('/quota')) return null
      return []
    })
    await serverError!.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('No hay servidores disponibles')
  })

  it('opens a named device dialog through an explicit configuration action', async () => {
    vi.mocked(api.validated).mockImplementation(async (path: string) => {
      if (path.endsWith('/quota')) return null as never
      if (path.endsWith('/servers'))
        return [
          {
            id: 'server-1',
            name: 'Main',
            host: 'vpn.example',
            endpoint: '',
            port: 443,
            wg_port: 51820,
            public_key: 'public',
            location: 'Santo Domingo',
            country_code: 'DO',
            max_peers: 100,
            current_peers: 1,
            is_active: true,
            supports_wireguard: true,
            supports_proxy: false,
            supports_mesh_exit: false,
            transports: [],
          },
        ] as never
      if (path.endsWith('/devices'))
        return [
          {
            id: 'device-1',
            client_instance_id: 'client-1',
            reported_name: 'Laptop',
            alias: '',
            display_name: 'Laptop',
            device_type: 'desktop',
            adapter_reference: '',
            adapter_label: '',
            first_seen_at: '2026-09-02T00:00:00Z',
            last_seen_at: '2026-09-02T00:00:00Z',
            revoked_at: null,
            status: 'connected',
            active_connection: {
              id: 'peer-1',
              device_id: 'device-1',
              server_id: 'server-1',
              protocol: 'wireguard',
              public_key: 'peer-public',
              assigned_ip: '10.0.0.2/32',
              is_active: true,
              bytes_sent: 10,
              bytes_received: 20,
              last_handshake: null,
              created_at: '2026-09-02T00:00:00Z',
              expires_at: null,
            },
          },
        ] as never
      if (path.includes('/sessions?'))
        return { items: [], page: 1, page_size: 10, total: 0 } as never
      return [] as never
    })
    vi.mocked(api.fetchRaw).mockResolvedValue({
      ok: true,
      text: async () => '[Interface]\nPrivateKey = <YOUR_PRIVATE_KEY>',
    } as Response)

    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/connections')
    await router.isReady()
    const wrapper = mount(PeersView, {
      global: { plugins: [pinia, router], stubs: { Teleport: true } },
    })
    await flushPromises()

    expect(wrapper.find('label[for="connection-server"]').exists()).toBe(true)
    expect(wrapper.find('label[for="connection-device-name"]').exists()).toBe(true)
    const viewAction = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Detalles'))
    expect(viewAction).toBeDefined()
    await viewAction!.trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.text()).toContain('Laptop')
    expect(dialog.find('button[aria-label="Cerrar"]').exists()).toBe(true)
    const historyAction = dialog
      .findAll('button')
      .find((button) => button.text().includes('Historial de sesiones'))
    expect(historyAction).toBeDefined()
    expect(historyAction!.attributes('aria-expanded')).toBe('false')
    await historyAction!.trigger('click')
    await flushPromises()
    expect(historyAction!.attributes('aria-expanded')).toBe('true')
    expect(api.validated).toHaveBeenCalledWith(
      '/api/v1/control/devices/device-1/sessions?page=1&page_size=10',
      expect.anything(),
    )
  })
})
