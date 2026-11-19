<script setup lang="ts">
import { computed } from 'vue'
import BrandLogo from '../components/BrandLogo.vue'
import AppIcon from '../components/AppIcon.vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import { useLocale } from '../lib/i18n'
import { useBrandCopy } from '../lib/brand-copy'
import { publicSiteCopy } from '../lib/public-site'

const { t, locale } = useLocale()
const copy = useBrandCopy()
const release = computed(() => publicSiteCopy[locale.value])
</script>

<template>
  <div class="vpn-landing">
    <a href="#main-content" class="skip-link">{{ copy.skipContent }}</a>
    <header class="site-header">
      <nav class="site-nav" aria-label="MidoriVPN">
        <div class="site-brands">
          <a class="astian-brand" href="https://astian.org" aria-label="Astian">
            <img src="/brand/astian-logo.webp" width="246" height="54" alt="Astian" />
          </a>
          <span class="brand-divider" aria-hidden="true"></span>
          <RouterLink to="/" aria-label="MidoriVPN"><BrandLogo /></RouterLink>
        </div>
        <div class="desktop-links">
          <RouterLink to="/download">{{ t('landing.footerDownload') }}</RouterLink>
          <RouterLink to="/privacy">{{ t('landing.footerPrivacy') }}</RouterLink>
          <RouterLink to="/terms">{{ t('landing.footerTerms') }}</RouterLink>
        </div>
        <div class="landing-account-actions">
          <LanguageSelector />
          <RouterLink to="/login" class="vpn-button vpn-button-small">{{
            t('landing.login')
          }}</RouterLink>
        </div>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      <section class="vpn-hero grain-surface">
        <div class="hero-copy vpn-wrap">
          <p class="eyebrow hero-eyebrow">
            <span class="eyebrow-rule"></span>MidoriVPN · {{ release.status }}
          </p>
          <h1>
            {{ copy.heroTitle }}<br /><strong>{{ copy.heroAccent }}</strong>
          </h1>
          <p class="hero-description">{{ release.summary }}</p>
          <div class="hero-actions">
            <RouterLink to="/login" class="vpn-button">{{ t('landing.login') }}</RouterLink>
            <RouterLink to="/download" class="vpn-button vpn-button-outline"
              ><AppIcon name="download" />{{ t('landing.footerDownload') }}</RouterLink
            >
          </div>
          <p class="hero-note" role="status">{{ release.unavailable }}</p>
        </div>
        <div class="product-showcase vpn-wrap">
          <div class="product-story">
            <p class="eyebrow">MidoriVPN</p>
            <h2>{{ copy.extensionTitle }}</h2>
            <p class="product-story-description">{{ copy.extensionDescription }}</p>
            <RouterLink to="/download" class="vpn-text-link">{{
              t('landing.footerDownload')
            }}</RouterLink>
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
                  alt="MidoriVPN"
                  decoding="async"
                  fetchpriority="high"
                />
              </div>
            </div>
            <figcaption>{{ copy.previewCaption }}</figcaption>
          </figure>
        </div>
      </section>
      <section class="vpn-section vpn-wrap release-information">
        <div class="section-heading">
          <p class="eyebrow">{{ release.status }}</p>
          <h2>{{ t('landing.footerDownload') }}</h2>
          <p>{{ release.downloadDetail }}</p>
        </div>
        <div class="hero-actions">
          <RouterLink to="/download" class="vpn-button vpn-button-outline">{{
            t('landing.footerDownload')
          }}</RouterLink>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="vpn-wrap footer-main">
        <div class="footer-brand">
          <RouterLink to="/" aria-label="MidoriVPN"><BrandLogo /></RouterLink>
          <p>{{ release.summary }}</p>
        </div>
        <nav :aria-label="t('landing.footerProduct')">
          <RouterLink to="/download">{{ t('landing.footerDownload') }}</RouterLink
          ><RouterLink to="/login">{{ t('landing.login') }}</RouterLink
          ><a
            href="https://github.com/goastian/midori-vpn-core"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub</a
          >
        </nav>
        <nav :aria-label="t('landing.footerLegal')">
          <RouterLink to="/privacy">{{ t('landing.footerPrivacy') }}</RouterLink
          ><RouterLink to="/terms">{{ t('landing.footerTerms') }}</RouterLink
          ><a href="mailto:support@astian.org">{{ t('landing.footerContact') }}</a>
        </nav>
      </div>
    </footer>
  </div>
</template>
