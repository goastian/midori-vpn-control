import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import AsyncState from '@/components/AsyncState.vue'
import ProxyManagementView from '@/views/ProxyManagementView.vue'
import AdminClusterHealthView from '@/views/admin/AdminClusterHealthView.vue'
import { api } from '@/lib/api'
import { setLocale } from '@/lib/i18n'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    validated: vi.fn(),
    fetchRaw: vi.fn(),
  },
}))

describe('operational view states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLocale('es')
  })

  it('announces errors and exposes their retry action', async () => {
    const wrapper = mount(AsyncState, {
      props: {
        kind: 'error',
        title: 'No se pudo cargar',
        retryLabel: 'Reintentar',
      },
    })

    expect(wrapper.attributes('role')).toBe('alert')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('generates proxy credentials only after an explicit authenticated action', async () => {
    vi.mocked(api.validated)
      .mockResolvedValueOnce([{ id: 'server-id', name: 'Main', location: 'Santo Domingo', transports: [{ protocol: 'proxy', enabled: true, health_status: 'healthy' }] }])
      .mockResolvedValueOnce({
      proxy_token: 'scoped-secret',
      expires_in: 900,
      device_id: 'device-id',
      proxy_endpoint: { server_id: 'server-id', host: 'proxy.example', port: 443, country_code: 'DO', location: 'Santo Domingo' },
    })
    const wrapper = mount(ProxyManagementView)
    await flushPromises()

    expect(api.validated).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('No hay una credencial activa')

    await wrapper.get('.btn-primary').trigger('click')
    await flushPromises()

    expect(api.validated).toHaveBeenLastCalledWith(
      '/api/v1/control/proxy-credentials',
      expect.anything(),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"server_id":"server-id"') }),
    )
    expect(wrapper.get('#proxy-token').attributes('value')).toBe('scoped-secret')
    expect(wrapper.text()).toContain('proxy.example:443')
  })

  it('renders degraded dependency data returned with a readiness response', async () => {
    vi.mocked(api.fetchRaw).mockResolvedValue({
      status: 503,
      json: async () => ({
        ok: true,
        data: {
          status: 'degraded',
          checks: {
            postgres: { status: 'ok', latency_ms: 4 },
            wireguard: { status: 'ok', interface: 'wg0' },
            redis: { status: 'error' },
          },
        },
      }),
    } as Response)

    const wrapper = mount(AdminClusterHealthView)
    await flushPromises()

    expect(api.fetchRaw).toHaveBeenCalledWith('/api/v1/admin/health')
    expect(wrapper.text()).toContain('Estado global: Degradado')
    const redisCard = wrapper.findAll('.glass-card')[2]
    expect(redisCard.text()).toContain('Redis')
    expect(redisCard.text()).toContain('Error')
  })
})
