import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: false, startLogin: vi.fn() }),
}))

import LandingView from '@/views/LandingView.vue'

describe('landing release target', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('routes downloads through release status without inventing a published artifact', () => {
    const wrapper = mount(LandingView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
    const releaseLinks = wrapper.findAll('a').filter((link) =>
      link.attributes('href')?.includes('/midori-vpn-desktop/releases/latest'),
    )

    expect(releaseLinks).toHaveLength(0)
    expect(wrapper.find('a[href="/download"]').exists()).toBe(true)
    expect(wrapper.html()).not.toMatch(/\.(?:deb|AppImage|msi|exe|dmg)/)

    wrapper.unmount()
  })
})
