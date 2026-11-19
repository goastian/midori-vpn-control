export interface TranslationTree {
  readonly [key: string]: string | TranslationTree
}

export type TranslationValue = string | TranslationTree

export type LocaleCatalog<Canonical> = {
  readonly [Key in keyof Canonical]: Canonical[Key] extends string
    ? string
    : LocaleCatalog<Canonical[Key]>
}
