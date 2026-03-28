export const WORK_TITLE_MAX_LENGTH = 100
export const WORK_DESCRIPTION_MAX_LENGTH = 1000
export const WORK_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const WORK_IMAGE_MAX_WIDTH = 6000
export const WORK_IMAGE_MAX_HEIGHT = 6000
export const WORK_IMAGE_MIN_WIDTH = 200
export const WORK_IMAGE_MIN_HEIGHT = 200
export const WORK_IMAGE_ALLOWEDCONTENTTYPES = ['image/jpeg', 'image/png', 'image/webp'] // includes()の型エラーが面倒なので as const は使用しない
export const WORK_IMAGE_SHOWORIGINAL_MAX_BYTES = 2 * 1024 * 1024

export const workId2imageKey = (workId: string, size: 'original' | 'large' | 'medium' | 'thumb'): string => {
  switch (size) {
    case 'original':
      return `works/${workId}/original`
    case 'large':
      return `works/${workId}/large.webp`
    case 'medium':
      return `works/${workId}/medium.webp`
    case 'thumb':
      return `works/${workId}/thumb.webp`
    default:
      throw new Error('Invalid image size')
  }
}

// BASE_DAYS日後に0-1日ランダム加算した日時を返す
export const getNextMonaCheckIso = () => {
  const BASE_DAYS = 10
  // TODO: ユーザのアクティブ度にあわせて調整
  const nextCheckUnix = Math.floor(Date.now() / 1000) + Math.floor(BASE_DAYS + Math.random()) * 24 * 60 * 60
  return new Date(nextCheckUnix * 1000).toISOString()
}

export const QUOTA_UNIT_SAT = 10_000_000 // 0.1MONAあたり1枚、1MBのクォータを与える
export const QUOTA_UNIT_COUNTS = 1
export const QUOTA_UNIT_BYTES = 1024 * 1024
export const getQuota = (monaSat: number): { bytes: number; count: number } => {
  const count = Math.floor(monaSat / QUOTA_UNIT_SAT) * QUOTA_UNIT_COUNTS
  const bytes = count * QUOTA_UNIT_BYTES
  return { bytes, count }
}

export const getLegalAcceptanceMessage = (userId: string, termsVersion: string, privacyVersion: string, acceptedAt: string) => {
  return `MonaCube Legal Agreement

User: ${userId}
Terms: ${termsVersion}
Privacy: ${privacyVersion}
Date: ${acceptedAt}

I agree to the MonaCube Terms of Service and Privacy Policy.
`
}
