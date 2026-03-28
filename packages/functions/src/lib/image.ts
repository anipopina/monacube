import sharp from 'sharp'
import type { Metadata } from 'sharp'
import { rgbaToThumbHash } from 'thumbhash'

export const WORK_IMAGE_LARGE_MAX_EDGE = 1920
export const WORK_IMAGE_MEDIUM_MAX_EDGE = 960
export const WORK_IMAGE_THUMB_SIZE = 320

export type ProcessedWorkImage = {
  width: number
  height: number
  original: {
    body: Buffer
    contentType: string
    bytes: number
    normalized: boolean
  }
  largeWebp: Buffer
  mediumWebp: Buffer
  thumbWebp: Buffer
}

export class ImageProcessError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export async function processWorkImage(params: {
  source: Buffer
  maxWidth: number
  maxHeight: number
  minWidth: number
  minHeight: number
}): Promise<ProcessedWorkImage> {
  const metadata = await sharp(params.source, { failOn: 'error' }).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (!width || !height) {
    throw new ImageProcessError('invalid_image_dimensions', 'Image dimensions could not be read')
  }
  if (width > params.maxWidth || height > params.maxHeight) {
    throw new ImageProcessError('image_dimensions_too_large', 'Image dimensions exceed max limit')
  }
  if (width < params.minWidth || height < params.minHeight) {
    throw new ImageProcessError('image_dimensions_too_small', 'Image dimensions are below min limit')
  }

  const normalizeDecision = decideNormalizeOriginal(metadata)
  const sourceFormat = metadata.format ?? null
  const sourceContentType = formatToContentType(sourceFormat)

  let originalBody = params.source
  let originalContentType = sourceContentType
  if (normalizeDecision.shouldNormalize) {
    try {
      const normalized = await normalizeOriginalImage(params.source, sourceFormat)
      originalBody = normalized.body
      originalContentType = normalized.contentType
    } catch (error) {
      if (error instanceof ImageProcessError) throw error
      throw new ImageProcessError('image_normalization_failed', 'Failed to normalize image')
    }
  }
  if (!originalContentType) throw new ImageProcessError('unsupported_output_format', 'Unsupported processed image format')

  const renderedMeta = await sharp(originalBody, { failOn: 'error' }).metadata()
  const renderedWidth = renderedMeta.width ?? width
  const renderedHeight = renderedMeta.height ?? height

  const largeWebp = await sharp(originalBody)
    .resize({ width: WORK_IMAGE_LARGE_MAX_EDGE, height: WORK_IMAGE_LARGE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const mediumWebp = await sharp(originalBody)
    .resize({ width: WORK_IMAGE_MEDIUM_MAX_EDGE, height: WORK_IMAGE_MEDIUM_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const thumbWebp = await sharp(originalBody)
    .resize({ width: WORK_IMAGE_THUMB_SIZE, height: WORK_IMAGE_THUMB_SIZE, fit: 'cover', position: 'attention' })
    .webp({ quality: 78 })
    .toBuffer()

  return {
    width: renderedWidth,
    height: renderedHeight,
    original: {
      body: originalBody,
      contentType: originalContentType,
      bytes: originalBody.byteLength,
      normalized: normalizeDecision.shouldNormalize,
    },
    largeWebp,
    mediumWebp,
    thumbWebp,
  }
}

export async function generateBlurHash(imageBuffer: Buffer): Promise<string> {
  const preview = await sharp(imageBuffer)
    .resize({ width: 32, height: 32, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const blurHashBytes = rgbaToThumbHash(preview.info.width, preview.info.height, new Uint8Array(preview.data))
  return Buffer.from(blurHashBytes).toString('base64')
}

function formatToContentType(format: string): string | null {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return null
  }
}

type NormalizeDecision = {
  shouldNormalize: boolean
  reasons: string[]
}

function decideNormalizeOriginal(meta: Metadata): NormalizeDecision {
  const reasons: string[] = []

  // 1) 特定フォーマット以外は正規化対象
  if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) {
    reasons.push(`unsupported_or_unknown_format:${meta.format ?? 'unknown'}`)
  }

  // 2) EXIF orientation がある/1以外なら正規化
  if (typeof meta.orientation === 'number' && meta.orientation !== 1) {
    reasons.push(`has_orientation:${meta.orientation}`)
  }

  // 3) EXIF / IPTC / XMP があるなら privacy のため正規化
  if (meta.exif) reasons.push('has_exif')
  if (meta.iptc) reasons.push('has_iptc')
  if ((meta as { xmp?: Buffer }).xmp) reasons.push('has_xmp')

  // 4) 色空間が sRGB でなさそうなら正規化
  if (meta.space && meta.space !== 'srgb') {
    reasons.push(`non_srgb_space:${meta.space}`)
  }

  return {
    shouldNormalize: reasons.length > 0,
    reasons,
  }
}

/**
 * Normalize original image and encode as WebP.
 *
 * Call this only when decideNormalizeOriginal() returned true.
 * Output metadata will be stripped by default.
 */

type OriginalEncodeResult = {
  body: Buffer
  contentType: 'image/webp'
}

async function normalizeOriginalImage(source: Buffer, sourceFormat: string | null): Promise<OriginalEncodeResult> {
  const base = sharp(source).rotate().toColorspace('srgb')

  if (sourceFormat === 'png') {
    // PNG is often illustration/line art with alpha.
    // Prefer lossless to preserve original pixels as much as possible.
    const { data } = await base
      .webp({
        lossless: true,
        effort: 6,
      })
      .toBuffer({ resolveWithObject: true })
    return { body: data, contentType: 'image/webp' }
  }

  if (sourceFormat === 'jpeg') {
    // JPEG has already been lossy once, so use high-quality lossy WebP.
    const { data } = await base
      .webp({
        quality: 85,
        smartSubsample: true,
        effort: 6,
      })
      .toBuffer({ resolveWithObject: true })
    return { body: data, contentType: 'image/webp' }
  }

  if (sourceFormat === 'webp') {
    const { data } = await base
      .webp({
        quality: 85,
        smartSubsample: true,
        effort: 6,
      })
      .toBuffer({ resolveWithObject: true })
    return { body: data, contentType: 'image/webp' }
  }

  throw new ImageProcessError('unsupported_format_for_normalization', `Unsupported format for normalization: ${sourceFormat ?? 'unknown'}`)
}
