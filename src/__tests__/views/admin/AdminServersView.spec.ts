import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminServersView from '@/views/admin/AdminServersView.vue'

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
  onAccessTokenRefreshed: vi.fn(),
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
    core_token: 'tok',
    location: 'New York',
    country_code: 'US',
    max_peers: 250,
    current_peers: 10,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockPings = [{ server_id: 's1', latency_ms: 42, available: true }]

describe('AdminServersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading spinner while fetching', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
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

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
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

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('connection refused'))

    const wrapper = shallowMount(AdminServersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
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
  })
})
