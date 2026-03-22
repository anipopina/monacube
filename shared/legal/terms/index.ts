import type { LegalDocument } from '../types'
import { termsV0_1 } from './v0_1'

export const TERMS_DOCUMENTS: Record<string, LegalDocument> = {
  [termsV0_1.version]: termsV0_1,
}

export const CURRENT_TERMS_VERSION = termsV0_1.version

export const getCurrentTerms = () => TERMS_DOCUMENTS[CURRENT_TERMS_VERSION]

export const getTermsByVersion = (version: string) => TERMS_DOCUMENTS[version] ?? null
