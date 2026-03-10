import sharp from 'sharp'
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

export async function processWorkImage(params: { source: Buffer; maxWidth: number; maxHeight: number }): Promise<ProcessedWorkImage> {
  const metadata = await sharp(params.source).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (!width || !height) {
    throw new ImageProcessError('invalid_image_dimensions', 'Image dimensions could not be read')
  }
  if (width > params.maxWidth || height > params.maxHeight) {
    throw new ImageProcessError('image_dimensions_too_large', 'Image dimensions exceed max limit')
  }

  // originalは EXIF削除, カラープロファイル変換 だけやる
  // rotate() applies EXIF orientation and output drops EXIF metadata by default.
  const normalized = sharp(params.source).rotate().toColorspace('srgb')
  const originalResult = await normalized.toBuffer({ resolveWithObject: true })
  const originalContentType = formatToContentType(originalResult.info.format)
  if (!originalContentType) {
    throw new ImageProcessError('unsupported_output_format', 'Unsupported processed image format')
  }

  const largeWebp = await sharp(originalResult.data)
    .resize({ width: WORK_IMAGE_LARGE_MAX_EDGE, height: WORK_IMAGE_LARGE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const mediumWebp = await sharp(originalResult.data)
    .resize({ width: WORK_IMAGE_MEDIUM_MAX_EDGE, height: WORK_IMAGE_MEDIUM_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const thumbWebp = await sharp(originalResult.data)
    .resize({ width: WORK_IMAGE_THUMB_SIZE, height: WORK_IMAGE_THUMB_SIZE, fit: 'cover', position: 'attention' })
    .webp({ quality: 78 })
    .toBuffer()

  const outMeta = await sharp(originalResult.data).metadata()
  const normalizedWidth = outMeta.width ?? width
  const normalizedHeight = outMeta.height ?? height

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    original: {
      body: originalResult.data,
      contentType: originalContentType,
      bytes: originalResult.info.size,
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
