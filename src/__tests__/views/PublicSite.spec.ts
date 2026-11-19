import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import appRouter, { installAuthGuard } from '../../router'
import LandingView from '../../views/LandingView.vue'
import { setLocale } from '../../lib/i18n'
import { publicSiteCopy } from '../../lib/public-site'
import { supportedLocales } from '../../lib/i18n'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setLocale('es'); localStorage.clear() })

it('provides complete launch notices for all ten supported locales', () => {
  expect(Object.keys(publicSiteCopy).sort()).toEqual(supportedLocales.map(item => item.code).sort())
  for (const item of supportedLocales) {
    const copy = publicSiteCopy[item.code]
    expect(Object.keys(copy).sort()).toEqual(Object.keys(publicSiteCopy.en).sort())
    Object.values(copy).forEach(message => expect(message.trim().length).toBeGreaterThan(0))
    expect(copy.privacyPending).not.toEqual(copy.termsPending)
  }
})

it('presents launch status without fabricated live data or placeholder links', () => {
  setActivePinia(createPinia())
  setLocale('en')
  const random = vi.spyOn(Math, 'random')
  const wrapper = mount(LandingView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  expect(wrapper.text()).toContain('not yet available')
  expect(wrapper.find('a[href="/privacy"]').exists()).toBe(true)
  expect(wrapper.find('a[href="/terms"]').exists()).toBe(true)
  expect(wrapper.find('a[href="#"]').exists()).toBe(false)
  expect(random).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('keeps public information reachable without restoring an expired account session', async () => {
  setActivePinia(createPinia())
  localStorage.setItem('refresh_token', 'unavailable-session')
  const fetch = vi.fn().mockRejectedValue(new Error('offline'))
  vi.stubGlobal('fetch', fetch)
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes })
  installAuthGuard(router)
  for (const path of ['/privacy', '/terms', '/download']) {
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(path)
    expect(router.currentRoute.value.meta.public).toBe(true)
    expect(router.currentRoute.value.meta.bootstrapBypass).toBe(true)
  }
  expect(fetch).not.toHaveBeenCalled()
})
