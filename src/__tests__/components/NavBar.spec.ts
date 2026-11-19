import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/servers', component: { template: '<div />' } },
      { path: '/connections', component: { template: '<div />' } },
      { path: '/proxy', component: { template: '<div />' } },
      { path: '/audit', component: { template: '<div />' } },
      { path: '/admin/users', component: { template: '<div />' } },
      { path: '/admin/servers', component: { template: '<div />' } },
      { path: '/admin/clusters', component: { template: '<div />' } },
      { path: '/admin/peers', component: { template: '<div />' } },
      { path: '/admin/audit', component: { template: '<div />' } },
      { path: '/admin/mesh', component: { template: '<div />' } },
      { path: '/admin/health', component: { template: '<div />' } },
      { path: '/admin/extensions', component: { template: '<div />' } },
    ],
  })
}

describe('NavBar', () => {
  it('renders user nav items', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/dashboard')
    await router.isReady()

    const wrapper = mount(NavBar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.find('img[alt="MidoriVPN"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('Servidores')
    expect(wrapper.text()).toContain('Conexiones')
    expect(wrapper.text()).toContain('Proxy de navegador')
    // Admin items should NOT be visible for non-admin users
    expect(wrapper.text()).not.toContain('Auditoría')
    expect(wrapper.text()).not.toContain('Admin Servers')
  })

  it('renders admin nav items when user is admin', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/dashboard')
    await router.isReady()

    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    // Simulate admin user
    store.user = {
      id: '1',
      authentik_uid: 'uid-1',
      email: 'admin@test.com',
      display_name: 'Admin',
      groups: ['vpn-admins'],
      is_banned: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as any

    const wrapper = mount(NavBar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('Admin Servers')
    expect(wrapper.text()).toContain('Clústeres')
    expect(wrapper.text()).toContain('Usuarios')
    expect(wrapper.text()).toContain('Salud del clúster')
    expect(wrapper.text()).toContain('Extensiones')
  })

  it.each([
    { groups: ['admins'], expected: false },
    { groups: ['authentik Admins'], expected: false },
    { groups: ['vpn-users', 'admins', 'authentik Admins'], expected: false },
    { groups: ['vpn-users', 'vpn-admins'], expected: true },
  ])('admin links for $groups are visible: $expected', async ({ groups, expected }) => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/dashboard')
    await router.isReady()

    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    store.user = {
      id: '53451935-3e31-407b-939f-873924c8a66f',
      authentik_uid: 'navigation-role-fixture',
      email: 'roles@test.invalid',
      display_name: 'Role fixture',
      groups,
      is_banned: false,
      ban_reason: '',
      created_at: '2026-11-18T00:00:00Z',
      updated_at: '2026-11-18T00:00:00Z',
    }
    const wrapper = mount(NavBar, { global: { plugins: [pinia, router] } })
    try {
      expect(wrapper.findAll('a[href^="/admin/"]').length > 0).toBe(expected)
      expect(wrapper.text()).toContain('Dashboard')
      await wrapper.get('[aria-controls="mobile-navigation"]').trigger('click')
      const mobile = wrapper.get('#mobile-navigation')
      expect(mobile.findAll('a[href^="/admin/"]').length > 0).toBe(expected)
    } finally {
      wrapper.unmount()
    }
  })

  it('exposes and closes the mobile navigation predictably', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/dashboard')
    await router.isReady()

    const wrapper = mount(NavBar, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    })
    const trigger = wrapper.get('[aria-controls="mobile-navigation"]')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#mobile-navigation').exists()).toBe(true)
    expect(wrapper.get('button.absolute.inset-0').attributes('aria-label')).toBe('Cerrar menú')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    await router.push('/servers')
    await wrapper.vm.$nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')

    wrapper.unmount()
  })

  it('shows user email', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    await router.push('/dashboard')
    await router.isReady()

    const { useAuthStore } = await import('@/stores/auth')
    const store = useAuthStore()
    store.user = {
      id: '1',
      authentik_uid: 'uid-1',
      email: 'user@example.com',
      display_name: 'User',
      groups: [],
      is_banned: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as any

    const wrapper = mount(NavBar, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('user@example.com')
  })
})
