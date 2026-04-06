import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import NavBar from '@/components/NavBar.vue'

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/servers', component: { template: '<div />' } },
      { path: '/connections', component: { template: '<div />' } },
      { path: '/audit', component: { template: '<div />' } },
      { path: '/admin/users', component: { template: '<div />' } },
      { path: '/admin/servers', component: { template: '<div />' } },
      { path: '/admin/peers', component: { template: '<div />' } },
      { path: '/admin/audit', component: { template: '<div />' } },
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

    expect(wrapper.text()).toContain('MidoriVPN')
    expect(wrapper.text()).toContain('Dashboard')
    expect(wrapper.text()).toContain('Servidores')
    expect(wrapper.text()).toContain('Conexiones')
    expect(wrapper.text()).toContain('Auditoría')
    // Admin items should NOT be visible for non-admin users
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
    expect(wrapper.text()).toContain('Usuarios')
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
