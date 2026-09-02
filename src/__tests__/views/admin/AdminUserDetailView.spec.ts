import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminUserDetailView from '@/views/admin/AdminUserDetailView.vue'
import AsyncState from '@/components/AsyncState.vue'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const user = {
  id: 'u1',
  authentik_uid: 'authentik-u1',
  email: 'alice@example.com',
  display_name: 'Alice',
  groups: ['vpn-users'],
  is_banned: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

async function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/users', component: { template: '<div />' } },
      { path: '/admin/users/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/admin/users/u1')
  await router.isReady()
  return router
}

describe('AdminUserDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders localized account details after loading', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue({ user, peers: [] })

    const wrapper = shallowMount(AdminUserDetailView, {
      global: { plugins: [await makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('alice@example.com')
    expect(wrapper.text()).toContain('Detalles de la cuenta')
    expect(wrapper.findComponent(AsyncState).exists()).toBe(false)
  })

  it('shows a localized retryable error without logging backend details', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Internal detail'))

    const wrapper = shallowMount(AdminUserDetailView, {
      global: { plugins: [await makeRouter()] },
    })
    await flushPromises()

    const state = wrapper.findComponent(AsyncState)
    expect(state.props('kind')).toBe('error')
    expect(state.props('title')).toContain('No se pudieron cargar')
    expect(state.props('retryLabel')).toBe('Reintentar')
  })
})
