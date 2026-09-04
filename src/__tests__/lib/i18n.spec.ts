import { describe, expect, it } from 'vitest'

import { setLocale, supportedLocales, useLocale } from '@/lib/i18n'
import { localeMessages, type LocaleCode, type TranslationTree } from '@/lib/locales'

type FlatCatalog = Map<string, string>

const viewSources = import.meta.glob('../../**/*.vue', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function flattenCatalog(tree: TranslationTree, prefix = '', result: FlatCatalog = new Map()) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') result.set(path, value)
    else flattenCatalog(value, path, result)
  }
  return result
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

function staticallyReferencedKeys(): string[] {
  const keys = new Set<string>()
  const translationCall = /\bt\(\s*['"]([A-Za-z][A-Za-z0-9_.-]*)['"]/g
  for (const source of Object.values(viewSources)) {
    for (const match of source.matchAll(translationCall)) keys.add(match[1])
  }
  return [...keys].sort()
}

describe('locale catalogs', () => {
  const canonical = flattenCatalog(localeMessages.en)
  const canonicalKeys = [...canonical.keys()].sort()

  it('contains the same 671 non-empty messages in every language', () => {
    expect(canonicalKeys).toHaveLength(671)
    expect(Object.keys(localeMessages).sort()).toEqual(
      supportedLocales.map(({ code }) => code).sort(),
    )

    for (const { code } of supportedLocales) {
      const catalog = flattenCatalog(localeMessages[code])
      expect([...catalog.keys()].sort(), code).toEqual(canonicalKeys)
      for (const [path, message] of catalog) {
        expect(message.trim(), `${code}:${path}`).not.toBe('')
        expect(message, `${code}:${path}`).not.toContain('MIDORI_PH')
      }
    }
  })

  it('preserves the exact placeholder contract in every language', () => {
    for (const { code } of supportedLocales) {
      const catalog = flattenCatalog(localeMessages[code])
      for (const [path, canonicalMessage] of canonical) {
        expect(placeholders(catalog.get(path) ?? ''), `${code}:${path}`).toEqual(
          placeholders(canonicalMessage),
        )
      }
    }
  })

  it('contains every statically referenced view key', () => {
    const referenced = staticallyReferencedKeys()
    expect(referenced.length).toBeGreaterThan(400)
    for (const path of referenced) expect(canonical.has(path), path).toBe(true)
  })

  it('does not disguise an English fallback as a completed catalog', () => {
    for (const { code } of supportedLocales) {
      if (code === 'en') continue
      const catalog = flattenCatalog(localeMessages[code])
      const localized = canonicalKeys.filter((path) => catalog.get(path) !== canonical.get(path))
      expect(localized.length / canonicalKeys.length, code).toBeGreaterThan(0.7)
    }
  })

  it('uses a valid and distinct Intl locale for every language', () => {
    const { localeForIntl, formatDateTime, t } = useLocale()
    const resolved = new Set<string>()

    for (const metadata of supportedLocales) {
      setLocale(metadata.code as LocaleCode)
      expect(localeForIntl.value).toBe(metadata.intl)
      const resolvedLocale = new Intl.DateTimeFormat(metadata.intl).resolvedOptions().locale
      expect(resolvedLocale).toBeTruthy()
      resolved.add(resolvedLocale)
      expect(formatDateTime(new Date('2026-09-03T12:34:00Z'))).not.toContain('Invalid')
    }

    expect(resolved.size).toBe(supportedLocales.length)
    expect(t('missing.translation.key')).toBe('missing.translation.key')
  })
})
