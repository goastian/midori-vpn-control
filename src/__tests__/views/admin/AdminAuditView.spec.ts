import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminAuditView from '@/views/admin/AdminAuditView.vue'
import AsyncState from '@/components/AsyncState.vue'
import ResourceSkeleton from '@/components/ResourceSkeleton.vue'

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

const mockLogs = [
  {
    id: 'log1',
    user_id: 'u1',
    user_email: 'alice@example.com',
    action: 'peer.connect',
    metadata: { device: 'laptop', server: 'US East' },
    ip_address: '192.0.2.10',
    created_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'log2',
    user_id: 'u2',
    user_email: 'bob@example.com',
    action: 'admin.user.ban',
    metadata: { reason: 'abuse' },
    ip_address: '',
    created_at: '2024-06-01T11:00:00Z',
  },
]

describe('AdminAuditView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.findComponent(ResourceSkeleton).props('title')).toBe(
      'Cargando el historial de auditoría…',
    )
  })

  it('renders audit log rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(mockLogs)

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).exists()).toBe(false)
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('bob@example.com')
  })

  it('shows empty state when there are no logs', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue([])

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('empty')
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('includes action filter in query when actionFilter is set', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue(mockLogs)

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Set an action filter and reload
    const vm = wrapper.vm as any
    vm.actionFilter = 'peer.connect'
    await vm.loadLogs()
    await flushPromises()

    expect(vi.mocked(api.validated)).toHaveBeenCalledWith(
      expect.stringContaining('action=peer.connect'),
      expect.anything(),
    )
  })

  it('calls api with no action filter when actionFilter is empty', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue([])

    shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // The initial call should not have an action query parameter
    const calls = vi.mocked(api.validated).mock.calls
    expect(calls[0][0]).toContain('/api/v1/admin/audit-logs')
    expect(calls[0][0]).not.toContain('action=')
  })

  it('associates an accessible label with the action filter', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockResolvedValue([])

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })
    await flushPromises()

    expect(wrapper.find('label[for="audit-action-filter"]').text()).toContain('Filtrar')
    expect(wrapper.find('#audit-action-filter').exists()).toBe(true)
  })
})
