import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'

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

const mockUsers = [
  {
    id: 'u1',
    authentik_uid: 'auid-1',
    email: 'alice@example.com',
    display_name: 'Alice',
    groups: ['vpn-users'],
    is_banned: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    authentik_uid: 'auid-2',
    email: 'bob@example.com',
    display_name: 'Bob',
    groups: [],
    is_banned: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/admin/users', component: { template: '<div />' } },
      { path: '/admin/users/:id', component: { template: '<div />' } },
    ],
  })
}

describe('AdminUsersView', () => {
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
    vi.mocked(api.get).mockReturnValue(new Promise(() => {})) // never resolves

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('renders user rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockUsers)

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('bob@example.com')
  })

  it('hides loading spinner and shows table on empty response', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.find('.animate-spin').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('calls DELETE endpoint when deleteUser is triggered', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockUsers)
    vi.mocked(api.delete).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    // Trigger delete on the first user
    // Find the delete button by checking if it calls delete
    const vm = wrapper.vm as any
    await vm.deleteUser('u1')
    await flushPromises()

    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/api/v1/admin/users/u1')
  })
})
