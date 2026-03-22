export type LegalDocKey = 'terms' | 'privacy'

export type LegalBlock =
  | {
      type: 'paragraph'
      text: string
    }
  | {
      type: 'list'
      items: string[]
    }

export type LegalSection = {
  title: string
  blocks: LegalBlock[]
}

export type LegalDocument = {
  key: LegalDocKey
  version: string
  title: string
  effectiveAt: string
  sections: LegalSection[]
}
