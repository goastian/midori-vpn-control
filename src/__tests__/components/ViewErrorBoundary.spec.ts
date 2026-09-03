import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

import ViewErrorBoundary from '@/components/ViewErrorBoundary.vue'

describe('ViewErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replaces a failed view with a localized retry and remounts it', async () => {
    let shouldThrow = true
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const FragileView = defineComponent({
      render() {
        if (shouldThrow) {
          shouldThrow = false
          throw new Error('remote payload reached render')
        }
        return h('p', { 'data-testid': 'recovered' }, 'Recovered view')
      },
    })

    const wrapper = mount(ViewErrorBoundary, {
      props: { resetKey: '/dashboard' },
      slots: {
        default: ({ retryKey }: { retryKey: number }) => h(FragileView, { key: retryKey }),
      },
    })
    await flushPromises()

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('No se pudo mostrar esta vista')
    expect(wrapper.text()).not.toContain('remote payload reached render')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="recovered"]').text()).toBe('Recovered view')
  })
})
