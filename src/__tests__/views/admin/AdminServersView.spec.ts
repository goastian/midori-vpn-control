import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminServersView from '@/views/admin/AdminServersView.vue'
import AsyncState from '@/components/AsyncState.vue'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    validated: vi.fn(),
  },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  onAccessTokenChanged: vi.fn(),
  initFromStoredRefreshToken: vi.fn().mockResolvedValue(null),
  exchangeCode: vi.fn(),
}))

const mockServers = [
  {
    id: 's1',
    name: 'US East',
    host: 'us-east.vpn.example.com',
    endpoint: 'us-east.vpn.example.com',
    port: 8080,
    wg_port: 51820,
    public_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    location: 'New York',
    country_code: 'US',
    max_peers: 250,
    current_peers: 10,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    transports: [
      {
        protocol: 'wireguard',
        host: 'us-east.vpn.example.com',
        port: 51820,
        enabled: true,
        priority: 100,
        metadata: {},
        health_status: 'healthy',
      },
    ],
  },
]

const mockPings = [{ server_id: 's1', latency_ms: 42, available: true }]

describe('AdminServersView', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    consoleError.mockRestore()
  })

  it('shows loading spinner while fetching', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('loading')
  })

  it('renders server names after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/ping')) return Promise.resolve(mockPings)
      return Promise.resolve(mockServers)
    })

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).exists()).toBe(false)
    expect(wrapper.text()).toContain('US East')
    expect(wrapper.text()).toContain('New York')
  })

  it('handles empty server list', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('empty')
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('connection refused'))

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('error')
  })

  it('does not auto-refresh when ping api fails', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/ping')) return Promise.reject(new Error('ping failed'))
      return Promise.resolve(mockServers)
    })

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('US East')
    expect(wrapper.text()).toContain('Sin comprobar')
  })

  it('keeps deletion errors visible in the confirmation dialog', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/ping')) return Promise.resolve(mockPings)
      return Promise.resolve(mockServers)
    })
    vi.mocked(api.delete).mockRejectedValue(new Error('Internal detail'))

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()

    const remove = wrapper.findAll('button').find(button => button.text() === 'Eliminar')
    await remove?.trigger('click')
    const confirm = wrapper.findAll('[role="alertdialog"] button').find(button => button.text() === 'Eliminar')
    await confirm?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.find('[role="alertdialog"] [role="alert"]').text()).toContain('No se pudo eliminar')
    expect(wrapper.text()).not.toContain('Internal detail')
  })

  it('explains that a server must finish draining before deletion', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/ping')) return Promise.resolve(mockPings)
      return Promise.resolve(mockServers)
    })
    vi.mocked(api.delete).mockRejectedValue({ code: 'server_not_drained' })

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()

    const remove = wrapper.findAll('button').find(button => button.text() === 'Eliminar')
    await remove?.trigger('click')
    const confirm = wrapper.findAll('[role="alertdialog"] button').find(button => button.text() === 'Eliminar')
    await confirm?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alertdialog"] [role="alert"]').text()).toContain('está drenando')
  })

  it('associates the primary server fields with their labels', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()
    const add = wrapper.findAll('button').find(button => button.text() === 'Agregar servidor')
    await add?.trigger('click')

    expect(wrapper.find('label[for="server-name"]').exists()).toBe(true)
    expect(wrapper.find('label[for="server-host"]').exists()).toBe(true)
    expect(wrapper.find('label[for="server-public-key"]').exists()).toBe(true)
  })

  it('updates a server with the normalized transport payload and announces success', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/ping')) return Promise.resolve(mockPings)
      return Promise.resolve(mockServers)
    })
    vi.mocked(api.put).mockResolvedValue({})

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()

    const edit = wrapper.findAll('button').find(button => button.text() === 'Editar')
    await edit?.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/api/v1/admin/servers/s1', expect.objectContaining({
      endpoint: 'us-east.vpn.example.com',
      wg_port: 51820,
      transports: [expect.objectContaining({
        protocol: 'wireguard',
        metadata: {},
      })],
    }))
    const payload = vi.mocked(api.put).mock.calls[0][1] as Record<string, unknown>
    expect(JSON.stringify(payload)).not.toContain('metadataText')
    expect(wrapper.text()).toContain('El servidor fue actualizado.')
  })
})
