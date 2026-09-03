import { computed, ref } from 'vue'

import {
  localeMessages,
  type LocaleCode,
  type TranslationTree,
  type TranslationValue,
} from './locales'

export type { LocaleCode } from './locales'

type InterpolationParams = Record<string, string | number>

type SupportedLocale = {
  code: LocaleCode
  nativeLabel: string
  intl: string
}

const STORAGE_KEY = 'midori-locale'

export const supportedLocales: SupportedLocale[] = [
  { code: 'pt', nativeLabel: 'Português', intl: 'pt-PT' },
  { code: 'es', nativeLabel: 'Español', intl: 'es-ES' },
  { code: 'de', nativeLabel: 'Deutsch', intl: 'de-DE' },
  { code: 'en', nativeLabel: 'English', intl: 'en-US' },
  { code: 'tr', nativeLabel: 'Türkçe', intl: 'tr-TR' },
  { code: 'fr', nativeLabel: 'Français', intl: 'fr-FR' },
  { code: 'ru', nativeLabel: 'Русский', intl: 'ru-RU' },
  { code: 'uk', nativeLabel: 'Українська', intl: 'uk-UA' },
  { code: 'ca', nativeLabel: 'Català', intl: 'ca-ES' },
  { code: 'gl', nativeLabel: 'Galego', intl: 'gl-ES' },
]

const localeSet = new Set<LocaleCode>(supportedLocales.map((item) => item.code))

function normalizeLocale(value?: string | null): LocaleCode {
  if (!value) return 'es'
  const shortCode = value.toLowerCase().split('-')[0] as LocaleCode
  return localeSet.has(shortCode) ? shortCode : 'es'
}

function detectInitialLocale(): LocaleCode {
  if (typeof window === 'undefined') return 'es'
  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
}

const locale = ref<LocaleCode>(detectInitialLocale())

function resolvePath(tree: TranslationTree, path: string): string | undefined {
  const result = path.split('.').reduce<TranslationValue | undefined>((value, segment) => {
    if (!value || typeof value === 'string') return undefined
    return value[segment]
  }, tree)
  return typeof result === 'string' ? result : undefined
}

function interpolate(text: string, params?: InterpolationParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? '{' + key + '}'))
}

function applyLocaleToDocument(code: LocaleCode) {
  if (typeof document !== 'undefined') document.documentElement.lang = code
}

applyLocaleToDocument(locale.value)

export function setLocale(code: LocaleCode) {
  const normalized = normalizeLocale(code)
  locale.value = normalized
  applyLocaleToDocument(normalized)
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, normalized)
}

export function useLocale() {
  const localeForIntl = computed(
    () => supportedLocales.find((item) => item.code === locale.value)?.intl ?? 'es-ES',
  )

  function t(path: string, params?: InterpolationParams): string {
    const localized = resolvePath(localeMessages[locale.value], path)
    const defensiveFallback = resolvePath(localeMessages.en, path)
    return interpolate(localized ?? defensiveFallback ?? path, params)
  }

  function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(localeForIntl.value, options).format(new Date(value))
  }

  function formatDateTime(
    value: string | number | Date,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    return formatDate(value, { dateStyle: 'medium', timeStyle: 'short', ...options })
  }

  function formatWeekdayShort(value: string | number | Date): string {
    return formatDate(value, { weekday: 'short' }).replace('.', '')
  }

  return {
    locale,
    localeForIntl,
    supportedLocales,
    setLocale,
    t,
    formatDate,
    formatDateTime,
    formatWeekdayShort,
  }
}
