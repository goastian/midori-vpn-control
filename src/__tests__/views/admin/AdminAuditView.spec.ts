import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminAuditView from '@/views/admin/AdminAuditView.vue'

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

const mockLogs = [
  {
    id: 'log1',
    user_id: 'u1',
    user_email: 'alice@example.com',
    action: 'peer.connect',
    meta: { device: 'laptop', server: 'US East' },
    created_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'log2',
    user_id: 'u2',
    user_email: 'bob@example.com',
    action: 'admin.user.ban',
    meta: { reason: 'abuse' },
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
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('renders audit log rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockLogs)

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('bob@example.com')
  })

  it('shows empty state when there are no logs', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('includes action filter in query when actionFilter is set', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockLogs)

    const wrapper = shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Set an action filter and reload
    const vm = wrapper.vm as any
    vm.actionFilter = 'peer.connect'
    await vm.loadLogs()
    await flushPromises()

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      expect.stringContaining('action=peer.connect'),
    )
  })

  it('calls api with no action filter when actionFilter is empty', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    shallowMount(AdminAuditView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // The initial call should not have an action query parameter
    const calls = vi.mocked(api.get).mock.calls
    expect(calls[0][0]).toBe('/api/v1/admin/audit-logs')
  })
})
