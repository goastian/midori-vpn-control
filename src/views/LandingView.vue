<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import { useLocale } from '../lib/i18n'

import BrandLogo from '../components/BrandLogo.vue'
import AppIcon from '../components/AppIcon.vue'

const { t } = useLocale()
const pageRoot = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | undefined

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        revealObserver?.unobserve(entry.target)
      })
    },
    { threshold: 0.12 },
  )
  pageRoot.value?.querySelectorAll('[data-reveal]').forEach((el) => revealObserver?.observe(el))
})
onUnmounted(() => revealObserver?.disconnect())

// Mobile nav
const mobileMenuOpen = ref(false)

// Pricing toggle
const annual = ref(true)

const plans = computed(() => [
  {
    id: 'free',
    name: t('landing.plans.free.name'),
    desc: t('landing.plans.free.desc'),
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      t('landing.plans.free.features.a'),
      t('landing.plans.free.features.b'),
      t('landing.plans.free.features.c'),
      t('landing.plans.free.features.d'),
      t('landing.plans.free.features.e'),
    ],
    cta: t('landing.plans.free.cta'),
    highlighted: false,
  },
  {
    id: 'pro',
    name: t('landing.plans.pro.name'),
    desc: t('landing.plans.pro.desc'),
    monthlyPrice: 5.99,
    annualPrice: 3.99,
    features: [
      t('landing.plans.pro.features.a'),
      t('landing.plans.pro.features.b'),
      t('landing.plans.pro.features.c'),
      t('landing.plans.pro.features.d'),
      t('landing.plans.pro.features.e'),
      t('landing.plans.pro.features.f'),
    ],
    cta: t('landing.plans.pro.cta'),
    highlighted: true,
  },
  {
    id: 'business',
    name: t('landing.plans.business.name'),
    desc: t('landing.plans.business.desc'),
    monthlyPrice: 12.99,
    annualPrice: 9.99,
    features: [
      t('landing.plans.business.features.a'),
      t('landing.plans.business.features.b'),
      t('landing.plans.business.features.c'),
      t('landing.plans.business.features.d'),
      t('landing.plans.business.features.e'),
      t('landing.plans.business.features.f'),
      t('landing.plans.business.features.g'),
    ],
    cta: t('landing.plans.business.cta'),
    highlighted: false,
  },
])

const features = computed(() => [
  {
    title: t('landing.featureCards.wireguard.title'),
    desc: t('landing.featureCards.wireguard.desc'),
    icon: 'wireguard',
  },
  {
    title: t('landing.featureCards.analytics.title'),
    desc: t('landing.featureCards.analytics.desc'),
    icon: 'chart',
  },
  {
    title: t('landing.featureCards.global.title'),
    desc: t('landing.featureCards.global.desc'),
    icon: 'globe',
  },
  {
    title: t('landing.featureCards.devices.title'),
    desc: t('landing.featureCards.devices.desc'),
    icon: 'devices',
  },
  {
    title: t('landing.featureCards.noLogs.title'),
    desc: t('landing.featureCards.noLogs.desc'),
    icon: 'lock',
  },
  {
    title: t('landing.featureCards.mesh.title'),
    desc: t('landing.featureCards.mesh.desc'),
    icon: 'mesh',
  },
])

const trustCards = computed(() => [
  {
    key: 'openSource',
    title: t('landing.trustCards.openSource.title'),
    desc: t('landing.trustCards.openSource.desc'),
  },
  {
    key: 'zeroLog',
    title: t('landing.trustCards.zeroLog.title'),
    desc: t('landing.trustCards.zeroLog.desc'),
  },
  {
    key: 'wireguard',
    title: t('landing.trustCards.wireguard.title'),
    desc: t('landing.trustCards.wireguard.desc'),
  },
  {
    key: 'gdpr',
    title: t('landing.trustCards.gdpr.title'),
    desc: t('landing.trustCards.gdpr.desc'),
  },
])

// Desktop client download: OS tabs with auto-detection
type DesktopOS = 'linux' | 'windows' | 'macos'

function detectOS(): DesktopOS {
  if (typeof navigator === 'undefined') return 'linux'
  const ua = (navigator.userAgent || '').toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  if (ua.includes('win') || platform.includes('win')) return 'windows'
  if (ua.includes('mac') || platform.includes('mac') || ua.includes('darwin')) return 'macos'
  return 'linux'
}

const selectedOS = ref<DesktopOS>(detectOS())

const DESKTOP_RELEASES_URL = 'https://github.com/goastian/midori-vpn-desktop/releases/latest'

const desktopDownloads = computed<Record<DesktopOS, { label: string; ext: string; url: string }[]>>(
  () => ({
    linux: [
      { label: 'AppImage', ext: '.AppImage', url: DESKTOP_RELEASES_URL },
      { label: 'Debian / Ubuntu', ext: '.deb', url: DESKTOP_RELEASES_URL },
      { label: 'Fedora / RHEL', ext: '.rpm', url: DESKTOP_RELEASES_URL },
      { label: 'openSUSE / SUSE', ext: '.rpm', url: DESKTOP_RELEASES_URL },
    ],
    windows: [
      { label: 'Installer', ext: '.msi', url: DESKTOP_RELEASES_URL },
      { label: 'Setup', ext: '.exe', url: DESKTOP_RELEASES_URL },
    ],
    macos: [{ label: 'macOS', ext: '.dmg', url: DESKTOP_RELEASES_URL }],
  }),
)

const osTabs = computed<{ key: DesktopOS; label: string }[]>(() => [
  { key: 'linux', label: t('landing.osLinux') },
  { key: 'windows', label: t('landing.osWindows') },
  { key: 'macos', label: t('landing.osMacOS') },
])
</script>

<template>
  <div ref="pageRoot" class="vpn-landing" @keydown.esc="mobileMenuOpen = false">
    <a href="#main-content" class="skip-link">{{ t('landing.skipContent') }}</a>
    <header class="site-header">
      <nav class="site-nav" :aria-label="t('nav.general')">
        <div class="site-brands">
          <a class="astian-brand" href="https://astian.org" aria-label="Astian">
            <img src="/brand/astian-logo.webp" width="246" height="54" alt="Astian" />
          </a>
          <span class="brand-divider" aria-hidden="true"></span>
          <router-link to="/" aria-label="MidoriVPN"><BrandLogo /></router-link>
        </div>
        <div class="desktop-links">
          <a href="#features">{{ t('landing.featuresNav') }}</a>
          <a href="#pricing">{{ t('landing.pricingNav') }}</a>
          <a href="#trust">{{ t('landing.securityNav') }}</a>
          <a href="#downloads">{{ t('landing.footerDownload') }}</a>
        </div>
        <div class="desktop-actions">
          <LanguageSelector />
          <router-link to="/login" class="nav-login">{{ t('landing.login') }}</router-link>
          <router-link to="/login" class="vpn-button vpn-button-small">{{
            t('landing.getStarted')
          }}</router-link>
        </div>
        <button
          class="mobile-menu-toggle"
          :aria-label="mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
          :aria-expanded="mobileMenuOpen"
          aria-controls="landing-menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <AppIcon :name="mobileMenuOpen ? 'close' : 'menu'" />
        </button>
      </nav>
      <div v-if="mobileMenuOpen" id="landing-menu" class="mobile-site-menu">
        <a href="#features" @click="mobileMenuOpen = false">{{ t('landing.featuresNav') }}</a>
        <a href="#pricing" @click="mobileMenuOpen = false">{{ t('landing.pricingNav') }}</a>
        <a href="#trust" @click="mobileMenuOpen = false">{{ t('landing.securityNav') }}</a>
        <a href="#downloads" @click="mobileMenuOpen = false">{{ t('landing.footerDownload') }}</a>
        <LanguageSelector />
        <router-link to="/login" class="vpn-button">{{ t('landing.login') }}</router-link>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <section class="vpn-hero grain-surface">
        <div class="hero-copy vpn-wrap">
          <p class="eyebrow hero-eyebrow">
            <span class="eyebrow-rule"></span>{{ t('landing.heroEyebrow') }}
          </p>
          <h1>
            {{ t('landing.newHeroTitle') }}<br /><strong>{{ t('landing.newHeroAccent') }}</strong>
          </h1>
          <p class="hero-description">{{ t('landing.newHeroDescription') }}</p>
          <div class="hero-actions">
            <router-link to="/login" class="vpn-button">{{ t('landing.heroPrimary') }}</router-link>
            <a href="#downloads" class="vpn-button vpn-button-outline"
              ><AppIcon name="download" />{{ t('landing.downloadApp') }}</a
            >
          </div>
          <p class="hero-note">{{ t('landing.heroNote') }}</p>
        </div>

        <div class="product-showcase vpn-wrap" data-reveal>
          <div class="product-story">
            <p class="eyebrow">{{ t('landing.extensionEyebrow') }}</p>
            <h2>{{ t('landing.extensionTitle') }}</h2>
            <p class="product-story-description">{{ t('landing.extensionDescription') }}</p>
            <ul class="product-benefits">
              <li>
                <AppIcon name="globe" /><span>{{ t('landing.extensionLocation') }}</span>
              </li>
              <li>
                <AppIcon name="lock" /><span>{{ t('landing.extensionConnect') }}</span>
              </li>
              <li>
                <AppIcon name="devices" /><span>{{ t('landing.extensionDesktop') }}</span>
              </li>
            </ul>
            <a href="#downloads" class="vpn-text-link">{{ t('landing.extensionDownload') }}</a>
          </div>
          <figure class="extension-preview">
            <div class="extension-preview-stage">
              <div class="extension-preview-window">
                <div class="extension-window-toolbar" aria-hidden="true">
                  <span></span><span></span><span></span><span>MidoriVPN</span>
                </div>
                <img
                  src="/product/midorivpn-extension.png"
                  width="660"
                  height="920"
                  :alt="t('landing.extensionCaptureAlt')"
                  decoding="async"
                  fetchpriority="high"
                />
              </div>
            </div>
            <figcaption>{{ t('landing.extensionCaptureCaption') }}</figcaption>
          </figure>
        </div>
        <div class="hero-principles vpn-wrap">
          <span><AppIcon name="code" />{{ t('landing.principleSource') }}</span>
          <span><AppIcon name="wireguard" />{{ t('landing.principleProtocol') }}</span>
          <span><AppIcon name="devices" />{{ t('landing.principleDevices') }}</span>
        </div>
      </section>

      <section id="features" class="vpn-section vpn-wrap">
        <div class="section-heading" data-reveal>
          <p class="eyebrow">{{ t('landing.featuresNav') }}</p>
          <h2>{{ t('landing.newFeaturesTitle') }}</h2>
          <p>{{ t('landing.newFeaturesDescription') }}</p>
        </div>
        <div class="feature-grid">
          <article
            v-for="(feature, index) in features"
            :key="feature.icon"
            class="feature-tile"
            :class="`feature-tile-${index}`"
            data-reveal
          >
            <div class="feature-art" aria-hidden="true">
              <span class="feature-art-ring"></span><AppIcon :name="feature.icon" />
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
          </article>
        </div>
      </section>

      <section id="trust" class="trust-section vpn-section">
        <div class="vpn-wrap trust-layout">
          <div class="trust-story" data-reveal>
            <p class="eyebrow">{{ t('landing.securityNav') }}</p>
            <h2>{{ t('landing.newTrustTitle') }}</h2>
            <p>{{ t('landing.newTrustDescription') }}</p>
            <a
              class="vpn-text-link"
              href="https://github.com/goastian/midori-vpn-core"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t('landing.inspectCode') }}</a
            >
            <div class="trust-visual grain-surface" aria-hidden="true">
              <AppIcon name="code" />
              <span class="trust-visual-label">OPEN SOURCE / WIREGUARD</span>
            </div>
          </div>
          <div class="trust-list">
            <article v-for="(card, index) in trustCards" :key="card.key" data-reveal>
              <AppIcon :name="['code', 'lock', 'wireguard', 'globe'][index]" />
              <div>
                <h3>{{ card.title }}</h3>
                <p>{{ card.desc }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="pricing" class="vpn-section vpn-wrap">
        <div class="section-heading" data-reveal>
          <p class="eyebrow">{{ t('landing.pricingNav') }}</p>
          <h2>{{ t('landing.pricingTitle') }}</h2>
          <p>{{ t('landing.pricingSubtitle') }}</p>
          <div class="billing-toggle" role="group" :aria-label="t('landing.billingPeriod')">
            <button :aria-pressed="!annual" @click="annual = false">
              {{ t('landing.monthly') }}
            </button>
            <button :aria-pressed="annual" @click="annual = true">
              {{ t('landing.annual') }}<span>{{ t('landing.annualSaving') }}</span>
            </button>
          </div>
        </div>
        <div class="pricing-grid">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="price-card"
            :class="{ 'price-card-featured': plan.highlighted }"
            data-reveal
          >
            <div class="price-card-heading">
              <h3>{{ plan.name }}</h3>
              <span v-if="plan.highlighted" class="price-recommended">{{
                t('landing.mostPopular')
              }}</span>
            </div>
            <p class="plan-description">{{ plan.desc }}</p>
            <div class="plan-price">
              <strong
                >${{
                  (annual ? plan.annualPrice : plan.monthlyPrice).toFixed(
                    plan.monthlyPrice > 0 ? 2 : 0,
                  )
                }}</strong
              ><span>{{
                plan.monthlyPrice > 0 ? t('landing.perMonth') : t('landing.forever')
              }}</span>
            </div>
            <p class="billing-note">
              {{
                plan.monthlyPrice > 0
                  ? annual
                    ? t('landing.billedAnnually', { total: (plan.annualPrice * 12).toFixed(2) })
                    : t('landing.billedMonthly')
                  : t('landing.freePlanNote')
              }}
            </p>
            <router-link
              v-if="plan.id !== 'business'"
              to="/login"
              class="vpn-button"
              :class="{ 'vpn-button-outline': !plan.highlighted }"
              >{{ plan.cta }}</router-link
            >
            <a v-else href="https://astian.org/contact/" class="vpn-button vpn-button-outline">{{
              plan.cta
            }}</a>
            <ul>
              <li v-for="feature in plan.features" :key="feature">
                <AppIcon name="check" />{{ feature }}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section id="downloads" class="downloads-section vpn-wrap" data-reveal>
        <div class="download-copy">
          <p class="eyebrow">{{ t('landing.yourDevices') }}</p>
          <h2>{{ t('landing.downloadTitle') }}</h2>
          <p>{{ t('landing.downloadSubtitle') }}</p>
          <a
            href="https://github.com/goastian/midori-vpn-desktop/releases"
            target="_blank"
            rel="noopener noreferrer"
            class="vpn-text-link"
            >{{ t('landing.allReleases') }}</a
          >
        </div>
        <div class="download-options">
          <div class="os-tabs" role="group" :aria-label="t('landing.operatingSystem')">
            <button
              v-for="tab in osTabs"
              :key="tab.key"
              :aria-pressed="selectedOS === tab.key"
              @click="selectedOS = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="download-files" aria-live="polite">
            <a
              v-for="option in desktopDownloads[selectedOS]"
              :key="option.label"
              :href="option.url"
              target="_blank"
              rel="noopener noreferrer"
              ><span
                ><strong>{{ option.label }}</strong
                ><span>{{ option.ext }}</span></span
              ><AppIcon name="download"
            /></a>
          </div>
          <p class="download-note">{{ t('landing.downloadReleaseNote') }}</p>
        </div>
      </section>

      <section class="final-section vpn-section grain-surface" data-reveal>
        <AppIcon name="wireguard" class="final-symbol" />
        <h2>{{ t('landing.newCtaTitle') }}</h2>
        <p>{{ t('landing.newCtaDescription') }}</p>
        <router-link to="/login" class="vpn-button">{{ t('landing.ctaPrimary') }}</router-link>
      </section>
    </main>

    <footer class="site-footer">
      <div class="vpn-wrap footer-main">
        <div class="footer-brand">
          <router-link to="/" aria-label="MidoriVPN"><BrandLogo /></router-link>
          <p>{{ t('landing.footerDescription') }}</p>
        </div>
        <nav :aria-label="t('landing.footerProduct')">
          <a href="#features">{{ t('landing.featuresNav') }}</a
          ><a href="#downloads">{{ t('landing.footerDownload') }}</a
          ><a
            href="https://github.com/goastian/midori-vpn-core"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub</a
          >
        </nav>
        <nav :aria-label="t('landing.footerLegal')">
          <a href="https://astian.org/astian-privacy-policies/">{{ t('landing.footerPrivacy') }}</a
          ><a href="https://astian.org/terms-conditions/">{{ t('landing.footerTerms') }}</a
          ><a href="https://astian.org/contact/">{{ t('landing.footerContact') }}</a>
        </nav>
      </div>
      <div class="vpn-wrap footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} Astian. {{ t('landing.footerRights') }}</p>
        <LanguageSelector />
      </div>
    </footer>
  </div>
</template>
