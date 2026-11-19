import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { api } from '@/lib/api'
import { setLocale } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth'
import PeersView from '@/views/PeersView.vue'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') },
}))
vi.mock('@/lib/crypto', () => ({
  generateClientKeypair: vi.fn().mockResolvedValue({
    publicKey: 'client-public-key',
    privateKey: 'client-private-key',
  }),
}))
vi.mock('@/lib/api', () => ({
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  onAccessTokenChanged: vi.fn(),
  initFromStoredRefreshToken: vi.fn().mockResolvedValue(null),
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    fetchRaw: vi.fn(),
    validated: vi.fn(),
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/connections', component: { template: '<div />' } }],
  })
}

const quota = {
  connected_devices: 1,
  max_devices: 5,
  available_devices: 4,
  plan_slug: 'pro',
  plan_name: 'Pro',
  devices_by_type: { desktop: 1, extension: 0, wireguard: 0 },
}

const server = {
  id: 'server-1',
  name: 'Main',
  host: 'vpn.example',
  endpoint: '',
  port: 443,
  wg_port: 51820,
  public_key: 'public',
  location: 'Santo Domingo',
  country_code: 'DO',
  max_peers: 100,
  current_peers: 1,
  is_active: true,
  supports_wireguard: true,
  supports_proxy: false,
  supports_mesh_exit: false,
  transports: [],
}

const candidate = {
  id: 'server-1',
  name: 'Main',
  location: 'Santo Domingo',
  country_code: 'DO',
  protocol: 'wireguard',
  probe_url: 'https://vpn.example/.well-known/midorivpn/edge-health',
  endpoint: 'vpn.example',
  port: 51820,
  priority: 100,
}

const device = {
  id: 'device-1',
  client_instance_id: 'client-1',
  reported_name: 'Laptop',
  alias: '',
  display_name: 'Laptop',
  device_type: 'desktop',
  adapter_reference: '',
  adapter_label: '',
  first_seen_at: '2026-09-02T00:00:00Z',
  last_seen_at: '2026-09-02T00:00:00Z',
  revoked_at: null,
  status: 'connected',
  active_connection: {
    id: 'peer-1',
    device_id: 'device-1',
    server_id: 'server-1',
    protocol: 'wireguard',
    public_key: 'peer-public',
    assigned_ip: '10.0.0.2/32',
    is_active: true,
    bytes_sent: 10,
    bytes_received: 20,
    last_handshake: null,
    created_at: '2026-09-02T00:00:00Z',
    expires_at: null,
  },
}

async function mountConnections() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  await router.push('/connections')
  await router.isReady()
  const wrapper = mount(PeersView, {
    global: { plugins: [pinia, router], stubs: { Teleport: true } },
  })
  return { wrapper, auth: useAuthStore() }
}

describe('connection resource states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    setLocale('es')
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
  })

  it('shows stable quota, server, and device loading states while requests are delayed', async () => {
    const pendingServers = deferred<unknown>()
    const pendingCandidates = deferred<unknown>()
    const pendingDevices = deferred<unknown>()
    const pendingQuota = deferred<unknown>()
    vi.mocked(api.validated).mockImplementation((path: string) => {
      if (path.endsWith('/quota')) return pendingQuota.promise as never
      if (path.includes('/servers/candidates')) return pendingCandidates.promise as never
      if (path.endsWith('/servers')) return pendingServers.promise as never
      if (path.endsWith('/devices')) return pendingDevices.promise as never
      throw new Error(`Unexpected request: ${path}`)
    })

    const { wrapper } = await mountConnections()
    await flushPromises()

    const loadingStates = wrapper.findAll('[role="status"]').map((node) => node.text())
    expect(loadingStates).toContain('Cargando el uso del plan…')
    expect(loadingStates).toContain('Cargando servidores…')
    expect(loadingStates).toContain('Cargando...')
    expect(wrapper.text()).not.toMatch(/\b(?:undefined|null|NaN)\b/)
    expect(wrapper.text()).not.toContain('0 B')

    pendingServers.resolve([server])
    pendingCandidates.resolve([candidate])
    pendingDevices.resolve([])
    pendingQuota.resolve(quota)
    await flushPromises()
    expect(wrapper.text()).toContain('No tienes dispositivos registrados')
  })

  it('shows quota unavailability without inventing zero capacity', async () => {
    vi.mocked(api.validated).mockImplementation((path: string) => {
      if (path.endsWith('/quota')) return Promise.reject(new Error('offline')) as never
      if (path.includes('/servers/candidates')) return Promise.resolve([candidate]) as never
      if (path.endsWith('/servers')) return Promise.resolve([server]) as never
      if (path.endsWith('/devices')) return Promise.resolve([]) as never
      throw new Error(`Unexpected request: ${path}`)
    })

    const { wrapper } = await mountConnections()
    await flushPromises()

    expect(
      wrapper
        .findAll('[role="alert"]')
        .some((node) => node.text().includes('No se pudo consultar el uso del plan')),
    ).toBe(true)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('0%')
    expect(wrapper.text()).not.toMatch(/\b(?:undefined|null|NaN)\b/)
  })

  it('keeps create, disconnect, and delete actions visibly pending and incompatible actions disabled', async () => {
    const pendingCreate = deferred<unknown>()
    const pendingDisconnect = deferred<unknown>()
    const pendingDelete = deferred<unknown>()
    vi.mocked(api.validated).mockImplementation(
      (path: string, _schema: unknown, options?: RequestInit) => {
        if (path.endsWith('/quota')) return Promise.resolve(quota) as never
        if (path.includes('/servers/candidates')) return Promise.resolve([candidate]) as never
        if (path.endsWith('/servers')) return Promise.resolve([server]) as never
        if (path.endsWith('/devices')) return Promise.resolve([device]) as never
        if (path === '/api/v1/control/connections' && options?.method === 'POST')
          return pendingCreate.promise as never
        if (path.endsWith('/connections/peer-1') && options?.method === 'DELETE')
          return pendingDisconnect.promise as never
        if (path.endsWith('/devices/device-1') && options?.method === 'DELETE')
          return pendingDelete.promise as never
        throw new Error(`Unexpected request: ${path}`)
      },
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = {
      id: 'user-1',
      authentik_uid: 'auth-user-1',
      email: 'user@example.com',
      display_name: 'User',
      groups: ['users'],
      is_banned: false,
      ban_reason: '',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    }
    const router = makeRouter()
    await router.push('/connections')
    await router.isReady()
    const wrapper = mount(PeersView, {
      global: { plugins: [pinia, router], stubs: { Teleport: true } },
    })
    await flushPromises()

    await wrapper.get('#connection-device-name').setValue('Phone')
    await wrapper.get('form').trigger('submit')
    const create = wrapper.get('button[type="submit"]')
    expect(create.text()).toContain('Creando')
    expect(create.attributes('aria-busy')).toBe('true')
    expect(create.attributes('disabled')).toBeDefined()
    pendingCreate.reject(new Error('controlled test failure'))
    await flushPromises()

    const row = wrapper.get('article')
    const disconnect = row.findAll('button').find((button) => button.text() === 'Desconectar')
    expect(disconnect).toBeDefined()
    await disconnect!.trigger('click')
    expect(row.text()).toContain('Desconectando')
    expect(
      row.findAll('button').every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
    pendingDisconnect.resolve({ status: 'disconnected' })
    await flushPromises()

    const deleteAction = row
      .findAll('button')
      .find((button) => button.text() === 'Eliminar dispositivo')
    expect(deleteAction).toBeDefined()
    await deleteAction!.trigger('click')
    expect(row.text()).toContain('Limpieza pendiente')
    expect(
      row.findAll('button').every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
    pendingDelete.resolve({ status: 'device_cleanup_pending' })
    await flushPromises()
  })
})
