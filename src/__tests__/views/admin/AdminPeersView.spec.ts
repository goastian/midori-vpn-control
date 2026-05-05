import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminPeersView from '@/views/admin/AdminPeersView.vue'

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

const mockPeers = [
  {
    id: 'p1',
    user_id: 'u1',
    server_id: 's1',
    device_name: 'laptop',
    public_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    assigned_ip: '10.8.0.2',
    bytes_received: 1024 * 1024,
    bytes_sent: 2048 * 1024,
    last_handshake: '2024-06-01T12:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    server_name: 'US East',
    user_email: 'alice@example.com',
  },
]

describe('AdminPeersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    if (!window.confirm) {
      Object.defineProperty(window, 'confirm', {
        value: vi.fn(),
        configurable: true,
      })
    }
  })

  it('shows loading spinner while fetching', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('renders peer rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockPeers)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
    expect(wrapper.text()).toContain('laptop')
    expect(wrapper.text()).toContain('10.8.0.2')
    expect(wrapper.text()).toContain('alice@example.com')
  })

  it('shows empty-state message when no peers', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
    // table should NOT be present (no peers)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('calls DELETE when forceDisconnect is confirmed', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockPeers)
    vi.mocked(api.delete).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const vm = wrapper.vm as any
    await vm.forceDisconnect('p1')
    await flushPromises()

    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/api/v1/admin/peers/p1')
  })

  it('does not call DELETE when forceDisconnect is cancelled', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockPeers)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const vm = wrapper.vm as any
    await vm.forceDisconnect('p1')

    expect(vi.mocked(api.delete)).not.toHaveBeenCalled()
  })
})
