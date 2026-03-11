export const WORK_TITLE_MAX_LENGTH = 100
export const WORK_DESCRIPTION_MAX_LENGTH = 1000
export const WORK_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const WORK_IMAGE_MAX_WIDTH = 6000
export const WORK_IMAGE_MAX_HEIGHT = 6000
export const WORK_IMAGE_ALLOWEDCONTENTTYPES = ['image/jpeg', 'image/png', 'image/webp'] // includes()の型エラーが面倒なので as const は使用しない

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
