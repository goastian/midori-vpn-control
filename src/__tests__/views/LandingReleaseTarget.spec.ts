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

  it('advertises only the supported Linux x86_64 RPM package', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const wrapper = mount(LandingView)
    const releaseLinks = wrapper.findAll('a').filter((link) =>
      link.attributes('href')?.includes('/midori-vpn-desktop/releases/latest'),
    )

    expect(releaseLinks).toHaveLength(1)
    expect(releaseLinks[0]?.text()).toContain('Linux x86_64')
    expect(releaseLinks[0]?.text()).toContain('.rpm')
    expect(wrapper.html()).not.toMatch(/\.(?:deb|AppImage|msi|exe|dmg)/)

    wrapper.unmount()
  })
})
