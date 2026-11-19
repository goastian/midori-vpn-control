import { ca } from './ca'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { gl } from './gl'
import { pt } from './pt'
import { ru } from './ru'
import { tr } from './tr'
import { uk } from './uk'
import type { TranslationTree } from './types'

export type LocaleCode = 'pt' | 'es' | 'de' | 'en' | 'tr' | 'fr' | 'ru' | 'uk' | 'ca' | 'gl'

export const localeMessages: Record<LocaleCode, TranslationTree> = {
  pt,
  es,
  de,
  en,
  tr,
  fr,
  ru,
  uk,
  ca,
  gl,
}

export type { TranslationTree, TranslationValue } from './types'
