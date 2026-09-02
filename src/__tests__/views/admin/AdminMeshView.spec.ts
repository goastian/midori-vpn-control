import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import AdminMeshView from '@/views/admin/AdminMeshView.vue'
import AsyncState from '@/components/AsyncState.vue'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const network = {
  id: 'mesh-1',
  name: 'Private team',
  subnet: '10.44.0.0/24',
  is_active: true,
  member_count: 1,
  members: [
    {
      user_id: 'user-1',
      email: 'alice@example.com',
      mesh_ip: '10.44.0.2',
      public_ip: '10.8.0.2',
      connected: true,
    },
  ],
}

describe('AdminMeshView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a localized retryable error without exposing backend details', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Internal detail'))

    const wrapper = shallowMount(AdminMeshView)
    await flushPromises()

    const state = wrapper.findComponent(AsyncState)
    expect(state.props('kind')).toBe('error')
    expect(state.props('title')).toContain('No se pudieron cargar')
    expect(state.props('retryLabel')).toBe('Reintentar')
  })

  it('exposes expansion state and its controlled member region', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([network])

    const wrapper = shallowMount(AdminMeshView)
    await flushPromises()

    const toggle = wrapper.find('button[aria-controls="mesh-members-mesh-1"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-label')).toContain('Private team')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#mesh-members-mesh-1').exists()).toBe(true)
  })
})
