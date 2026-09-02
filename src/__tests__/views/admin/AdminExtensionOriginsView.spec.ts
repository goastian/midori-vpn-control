import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import AdminExtensionOriginsView from '@/views/admin/AdminExtensionOriginsView.vue'
import AsyncState from '@/components/AsyncState.vue'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}))

const registeredOrigin = {
  id: '832bdb18-53a1-44f6-9308-f4081e01a87d',
  origin: 'moz-extension://midori-test',
  revoked: false,
  created_at: '2026-08-28T10:00:00Z',
  updated_at: '2026-08-28T11:00:00Z',
}

describe('AdminExtensionOriginsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'confirm', { value: vi.fn(() => true), configurable: true })
  })

  it('lists registered extension origins and their browser family', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([{ ...registeredOrigin }])

    const wrapper = shallowMount(AdminExtensionOriginsView)
    await flushPromises()

    expect(wrapper.text()).toContain(registeredOrigin.origin)
    expect(wrapper.text()).toContain('Firefox / Midori')
    expect(wrapper.text()).toContain('Confiable')
  })

  it('revokes an origin after confirmation', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([{ ...registeredOrigin }])
    vi.mocked(api.put).mockResolvedValue({})

    const wrapper = shallowMount(AdminExtensionOriginsView)
    await flushPromises()
    await wrapper.find('tbody button').trigger('click')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith(
      `/api/v1/admin/trusted-extension-origins/${registeredOrigin.id}`,
      { revoked: true },
    )
    expect(wrapper.text()).toContain('Revocado')
    expect(wrapper.text()).toContain('El origen de la extensión fue revocado.')
  })

  it('does not update an origin when confirmation is cancelled', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([{ ...registeredOrigin }])
    vi.mocked(window.confirm).mockReturnValue(false)

    const wrapper = shallowMount(AdminExtensionOriginsView)
    await flushPromises()
    await wrapper.find('tbody button').trigger('click')

    expect(api.put).not.toHaveBeenCalled()
  })

  it('shows a recoverable loading error', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockRejectedValue(new Error('Network unavailable'))

    const wrapper = shallowMount(AdminExtensionOriginsView)
    await flushPromises()

    const state = wrapper.findComponent(AsyncState)
    expect(state.props('kind')).toBe('error')
    expect(state.props('title')).toContain('No se pudieron cargar')
    expect(state.props('retryLabel')).toBe('Reintentar')
  })

  it('shows localized inline feedback when an update fails', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.get).mockResolvedValue([{ ...registeredOrigin }])
    vi.mocked(api.put).mockRejectedValue(new Error('Internal detail'))

    const wrapper = shallowMount(AdminExtensionOriginsView)
    await flushPromises()
    await wrapper.find('tbody button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('No se pudo actualizar')
    expect(wrapper.text()).not.toContain('Internal detail')
  })
})
