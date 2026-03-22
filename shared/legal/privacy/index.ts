import type { LegalDocument } from '../types'
import { privacyV0_1 } from './v0_1'

export const PRIVACY_DOCUMENTS: Record<string, LegalDocument> = {
  [privacyV0_1.version]: privacyV0_1,
}

export const CURRENT_PRIVACY_VERSION = privacyV0_1.version

export const getCurrentPrivacy = () => PRIVACY_DOCUMENTS[CURRENT_PRIVACY_VERSION]

export const getPrivacyByVersion = (version: string) => PRIVACY_DOCUMENTS[version] ?? null
