import { thumbHashToDataURL } from 'thumbhash'
import { base64ToBytes } from '@/lib/util'

const thumbHashDataUrlCache = new Map<string, string>()

export const useBlurHash = () => {
  const thumbHashBase64ToDataUrl = (thumbHashRaw: string): string => {
    const thumbHash = thumbHashRaw.trim()
    if (!thumbHash) return ''

    const cached = thumbHashDataUrlCache.get(thumbHash)
    if (cached !== undefined) return cached

    try {
      const dataUrl = thumbHashToDataURL(base64ToBytes(thumbHash))
      thumbHashDataUrlCache.set(thumbHash, dataUrl)
      return dataUrl
    } catch (error) {
      console.warn('Failed to decode thumb hash:', error)
      thumbHashDataUrlCache.set(thumbHash, '')
      return ''
    }
  }

  return {
    thumbHashBase64ToDataUrl,
  }
}
