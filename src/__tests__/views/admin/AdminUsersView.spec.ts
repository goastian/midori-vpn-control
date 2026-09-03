import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'
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
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
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

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('loading')
  })

  it('renders user rows after successful load', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockUsers)

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).exists()).toBe(false)
    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('bob@example.com')
  })

  it('shows an explicit empty state', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('empty')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('does not crash when api throws', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })

    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(AsyncState).props('kind')).toBe('error')
    expect(wrapper.findComponent(AsyncState).props('title')).toContain('No se pudieron cargar')
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
    expect(wrapper.text()).toContain('El usuario fue eliminado.')
  })

  it('keeps a failed suspension dialog open with localized feedback', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockUsers)
    vi.mocked(api.validated).mockRejectedValue(new Error('Internal detail'))

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })
    await flushPromises()

    const suspend = wrapper.findAll('button').find(button => button.text() === 'Suspender')
    await suspend?.trigger('click')
    await wrapper.find('#ban-reason').setValue('Policy violation')
    const confirm = wrapper.findAll('[role="dialog"] button').find(button => button.text() === 'Suspender')
    await confirm?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('#ban-error').text()).toContain('No se pudo suspender')
    expect(wrapper.text()).not.toContain('Internal detail')
  })

  it('reports pending cleanup after suspending access', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue(mockUsers)
    vi.mocked(api.validated).mockResolvedValue({ status: 'ban_cleanup_pending' })

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })
    await flushPromises()

    const suspend = wrapper.findAll('button').find(button => button.text() === 'Suspender')
    await suspend?.trigger('click')
    await wrapper.find('#ban-reason').setValue('Policy violation')
    const confirm = wrapper.findAll('[role="dialog"] button').find(button => button.text() === 'Suspender')
    await confirm?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('retirada de sus sesiones sigue pendiente')
    expect(wrapper.text()).not.toContain('El usuario fue suspendido.')
  })

  it('creates a user from labelled fields and announces success', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([])
    vi.mocked(api.post).mockResolvedValue({})

    const wrapper = shallowMount(AdminUsersView, {
      global: { plugins: [createPinia(), makeRouter()] },
    })
    await flushPromises()

    const create = wrapper.findAll('button').find(button => button.text() === 'Crear usuario')
    await create?.trigger('click')
    await wrapper.find('#user-authentik-uid').setValue('authentik-new')
    await wrapper.find('#user-email').setValue('new@example.com')
    await wrapper.find('#user-groups').setValue('vpn-users, operators')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/api/v1/admin/users', expect.objectContaining({
      authentik_uid: 'authentik-new',
      email: 'new@example.com',
      groups: ['vpn-users', 'operators'],
    }))
    expect(wrapper.text()).toContain('El usuario fue creado.')
  })
})
