import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { setLocale } from '../lib/i18n'
import { useAuthStore } from '../stores/auth'

const Landing = { template: '<div data-testid="landing">landing content</div>' }
const Protected = { template: '<div data-testid="protected">protected content</div>' }
const Callback = { template: '<div data-testid="callback">callback content</div>' }

async function render(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'landing', component: Landing, meta: { public: true, fullPage: true } },
      { path: '/dashboard', name: 'dashboard', component: Protected },
      {
        path: '/auth/callback',
        name: 'callback',
        component: Callback,
        meta: { public: true, fullPage: true, bootstrapBypass: true },
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: { NavBar: { template: '<nav data-testid="nav">private navigation</nav>' } },
    },
  })
  return { wrapper, auth: useAuthStore() }
}

describe('application bootstrap boundary', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setLocale('es')
  })

  it('masks even public routes while the stored session is unresolved', async () => {
    const { wrapper } = await render('/')

    expect(wrapper.text()).toContain('Preparando tu sesión')
    expect(wrapper.find('[data-testid="landing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="nav"]').exists()).toBe(false)
  })

  it('shows a recoverable error without mounting route or navigation content', async () => {
    const { wrapper, auth } = await render('/dashboard')
    auth.bootstrapState = 'error'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No se pudo restaurar la sesión')
    expect(wrapper.text()).toContain('Reintentar')
    expect(wrapper.find('[data-testid="protected"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="nav"]').exists()).toBe(false)
  })

  it('mounts authenticated content only with a token and validated profile', async () => {
    const { wrapper, auth } = await render('/dashboard')
    auth.accessToken = 'access-token'
    auth.user = {
      id: 'user-id',
      authentik_uid: 'uid',
      email: 'user@example.com',
      display_name: 'User',
      groups: ['users'],
      is_banned: false,
      ban_reason: '',
      created_at: '2026-09-03T00:00:00Z',
    }
    auth.bootstrapState = 'ready'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="protected"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav"]').exists()).toBe(true)
  })

  it('allows an isolated OAuth callback before bootstrap', async () => {
    const { wrapper } = await render('/auth/callback')

    expect(wrapper.find('[data-testid="callback"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Preparando tu sesión')
  })
})
