import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationControls from '@/components/PaginationControls.vue'

describe('PaginationControls', () => {
  it('reports the validated page range and emits only available pages', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 2, pageSize: 20, total: 45 },
    })

    expect(wrapper.text()).toContain('Página 2 de 3 · 45 resultados')
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('change')).toEqual([[1], [3]])
  })

  it('disables navigation at the only page', () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 1, pageSize: 20, total: 1 },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })

  it('does not render for an empty result set', () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 1, pageSize: 20, total: 0 },
    })
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
