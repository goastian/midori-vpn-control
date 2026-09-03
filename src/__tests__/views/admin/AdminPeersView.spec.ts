import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminPeersView from '@/views/admin/AdminPeersView.vue'
import AsyncState from '@/components/AsyncState.vue'
import ResourceSkeleton from '@/components/ResourceSkeleton.vue'
import AdminListFilters from '@/components/AdminListFilters.vue'

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

const page = <T>(items: T[]) => ({ items, page: 1, page_size: 50, total: items.length })

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
    vi.mocked(api.validated).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.findComponent(ResourceSkeleton).props('title')).toBe('Cargando sesiones VPN…')
  })

  it('renders peer rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(page(mockPeers))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).exists()).toBe(false)
    expect(wrapper.text()).toContain('laptop')
    expect(wrapper.text()).toContain('10.8.0.2')
    expect(wrapper.text()).toContain('alice@example.com')
  })

  it('shows empty-state message when no peers', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(page([]))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('empty')
    // table should NOT be present (no peers)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('calls DELETE when forceDisconnect is confirmed', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockImplementation(async (path: string) =>
      path.startsWith('/api/v1/admin/peers?') ? page(mockPeers) : { status: 'disconnected' },
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const vm = wrapper.vm as any
    await vm.forceDisconnect('p1')
    await flushPromises()

    expect(vi.mocked(api.validated)).toHaveBeenCalledWith(
      '/api/v1/admin/peers/p1',
      expect.anything(),
      { method: 'DELETE' },
    )
    expect(wrapper.text()).toContain('La sesión VPN se desconectó correctamente.')
  })

  it('does not call DELETE when forceDisconnect is cancelled', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(page(mockPeers))
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const vm = wrapper.vm as any
    await vm.forceDisconnect('p1')

    expect(vi.mocked(api.validated)).not.toHaveBeenCalledWith(
      '/api/v1/admin/peers/p1',
      expect.anything(),
      { method: 'DELETE' },
    )
  })

  it('reports a scheduled disconnection without claiming convergence', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockImplementation(async (path: string) =>
      path.startsWith('/api/v1/admin/peers?')
        ? page(mockPeers)
        : { status: 'disconnect_pending', operation_id: 'operation-1' },
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()
    await (wrapper.vm as any).forceDisconnect('p1')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('sigue pendiente en Core')
    expect(wrapper.text()).not.toContain('se desconectó correctamente')
  })

  it('shows localized inline feedback when disconnection fails', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/admin/peers?')) return page(mockPeers)
      throw new Error('Internal detail')
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()
    await (wrapper.vm as any).forceDisconnect('p1')

    expect(wrapper.find('[role="alert"]').text()).toContain('No se pudo desconectar')
    expect(wrapper.text()).not.toContain('Internal detail')
  })

  it('requests the first page with explicitly selected filters and ordering', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(page(mockPeers))
    const wrapper = shallowMount(AdminPeersView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()

    wrapper.findComponent(AdminListFilters).vm.$emit('apply', {
      search: 'laptop',
      status: 'active',
      sort: 'traffic',
      order: 'asc',
    })
    await flushPromises()

    expect(api.validated).toHaveBeenLastCalledWith(
      expect.stringMatching(
        /\/api\/v1\/admin\/peers\?.*page=1.*page_size=50.*status=active.*sort=traffic.*order=asc.*search=laptop/,
      ),
      expect.anything(),
    )
  })
})
