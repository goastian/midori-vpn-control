import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminListFilters from '@/components/AdminListFilters.vue'

describe('AdminListFilters', () => {
  it('emits only selected allowlist values and trims the search prefix', async () => {
    const wrapper = mount(AdminListFilters, {
      props: {
        search: '',
        status: 'all',
        sort: 'created_at',
        order: 'desc',
        statuses: ['all', 'active'],
        sorts: ['created_at', 'traffic'],
      },
    })

    await wrapper.find('#admin-list-search').setValue('  Alpha  ')
    await wrapper.find('#admin-list-status').setValue('active')
    await wrapper.find('#admin-list-sort').setValue('traffic')
    await wrapper.find('#admin-list-order').setValue('asc')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('apply')).toEqual([
      [{ search: 'Alpha', status: 'active', sort: 'traffic', order: 'asc' }],
    ])
  })
})
