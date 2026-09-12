import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import ResourceSkeleton from '@/components/ResourceSkeleton.vue'
import { setLocale } from '@/lib/i18n'
import AdminClustersView from '@/views/admin/AdminClustersView.vue'

vi.mock('@/lib/api', () => ({
  api: { validated: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const clusterID = '9c5740cf-73c7-4eb2-a659-8d074d94705b'
const nodeID = '96e4f25a-a915-46c2-8b2d-1250c592ffbd'
const token = 'A'.repeat(43)
const cluster = {
  id: clusterID,
  name: 'Caribbean',
  region: 'do-sdq',
  state: 'inactive',
  policy_labels: { tier: 'regional' },
  is_principal: false,
  node_count: 1,
  active_node_count: 0,
  healthy_node_count: 0,
  created_at: '2026-09-03T12:00:00Z',
  updated_at: '2026-09-03T12:00:00Z',
}
const node = {
  id: nodeID,
  cluster_id: clusterID,
  name: 'regional-01',
  management_host: 'regional-01.internal.test',
  state: 'enrolling',
  core_version: '',
  enrolled: false,
  enrolled_at: null,
  last_seen_at: null,
  desired_revision: null,
  desired_expires_at: null,
  minimum_core_version: '',
  applied_revision: null,
  health_status: '',
  version_compatible: null,
  current_peers: null,
  max_peers: null,
  transport_states: {},
  last_error_code: '',
  observed_at: null,
  server_id: null,
  server_name: '',
  placement_ready: false,
  placement_reason: 'cluster_not_active',
  identity_public_key: 'forbidden-public-key',
  token_hash: 'forbidden-token-hash',
  signature: 'forbidden-signature',
  created_at: '2026-09-03T12:00:00Z',
  updated_at: '2026-09-03T12:00:00Z',
}

const clusterPage = { items: [cluster], page: 1, page_size: 20, total: 1 }
const nodePage = { items: [node], page: 1, page_size: 50, total: 1 }
let wrappers: VueWrapper[] = []

async function configureValidatedAPI() {
  const { api } = await import('@/lib/api')
  vi.mocked(api.validated).mockImplementation(async (path, schema) => {
    if (String(path).includes('/enrollment-token')) {
      return schema.parse({ node_id: nodeID, token, expires_at: '2026-09-03T12:15:00Z' })
    }
    return schema.parse(String(path).includes('/nodes?') ? nodePage : clusterPage)
  })
  return api
}

function mountView() {
  const wrapper = mount(AdminClustersView, {
    attachTo: document.body,
    global: { stubs: { Teleport: true } },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('AdminClustersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLocale('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers = []
    document.body.innerHTML = ''
  })

  it('shows a stable skeleton until the first validated cluster snapshot arrives', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockReturnValue(new Promise(() => undefined))

    const wrapper = mountView()

    expect(wrapper.findComponent(ResourceSkeleton).exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading clusters')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('renders desired and observed metadata without secret-bearing fields', async () => {
    await configureValidatedAPI()
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Caribbean')
    expect(wrapper.text()).toContain('regional-01')
    expect(wrapper.text()).toContain('The cluster is not active.')
    expect(wrapper.text()).toContain('Desired revision')
    expect(wrapper.text()).toContain('Observed revision')
    expect(wrapper.text()).not.toContain('forbidden-public-key')
    expect(wrapper.text()).not.toContain('forbidden-token-hash')
    expect(wrapper.text()).not.toContain('forbidden-signature')
  })

  it('explains disabled lifecycle actions as visible text', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockImplementation(async (path, schema) => {
      if (String(path).includes('/nodes?')) {
        return schema.parse({
          ...nodePage,
          items: [
            {
              ...node,
              state: 'inactive',
              enrolled: true,
              enrolled_at: '2026-09-03T11:00:00Z',
            },
          ],
        })
      }
      return schema.parse({ ...clusterPage, items: [{ ...cluster, state: 'retired' }] })
    })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Revoked or retired clusters cannot accept new nodes.')
    expect(wrapper.text()).toContain('This node is already enrolled.')
    expect(wrapper.get('[data-test="add-node"]').attributes('disabled')).toBeDefined()
  })

  it('preserves the last valid snapshot while refreshing', async () => {
    const api = await configureValidatedAPI()
    const wrapper = mountView()
    await flushPromises()

    let resolveRefresh: ((value: unknown) => void) | undefined
    vi.mocked(api.validated).mockImplementationOnce(
      (_path, schema) =>
        new Promise((resolve) => {
          resolveRefresh = (value) => resolve(schema.parse(value))
        }),
    )
    await wrapper.get('[data-test="refresh-clusters"]').trigger('click')

    expect(wrapper.text()).toContain('Caribbean')
    expect(wrapper.text()).toContain('Refreshing')

    resolveRefresh?.(clusterPage)
    await flushPromises()
    expect(wrapper.text()).toContain('regional-01')
  })

  it('keeps the last valid cluster snapshot visible after a refresh error', async () => {
    const api = await configureValidatedAPI()
    const wrapper = mountView()
    await flushPromises()

    vi.mocked(api.validated).mockRejectedValueOnce(new Error('gateway detail'))
    await wrapper.get('[data-test="refresh-clusters"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Caribbean')
    expect(wrapper.get('[role="alert"]').text()).toContain('last valid data is still shown')
    expect(wrapper.text()).not.toContain('gateway detail')
  })

  it('shows and then forgets the one-use enrollment token', async () => {
    const api = await configureValidatedAPI()
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    const wrapper = mountView()
    await flushPromises()

    const issueButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Issue enrollment token'))
    expect(issueButton).toBeDefined()
    await issueButton!.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain(token)
    expect(localStorage.getItem('enrollment_token')).toBeNull()
    expect(api.validated).toHaveBeenCalledWith(
      `/api/v1/admin/nodes/${nodeID}/enrollment-token`,
      expect.anything(),
      { method: 'POST', body: JSON.stringify({ ttl_minutes: 15 }) },
    )

    const closeButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Close')
    await closeButton!.trigger('click')
    expect(document.body.textContent).not.toContain(token)
  })

  it('updates the management host only before enrollment and reloads validated inventory', async () => {
    const api = await configureValidatedAPI()
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="edit-management-host"]').trigger('click')
    await wrapper.get('[data-test="management-host-input"]').setValue('10.254.240.2:8443')
    await wrapper.get('[data-test="save-management-host"]').trigger('submit')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith(`/api/v1/admin/nodes/${nodeID}`, {
      management_host: '10.254.240.2:8443',
    })
    expect(api.validated).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/admin/clusters/${clusterID}/nodes?`),
      expect.anything(),
    )
    expect(wrapper.text()).toContain('The management host was updated.')
  })

  it('fails closed on an invalid cluster payload', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.validated).mockImplementation(async (_path, schema) =>
      schema.parse({ items: [{ id: 'partial' }], page: 1, page_size: 20, total: 1 }),
    )
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Clusters could not be loaded')
    expect(wrapper.text()).not.toContain('partial')
  })
})
