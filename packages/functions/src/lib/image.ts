import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

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

export async function downloadS3ObjectAsBuffer(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  if (!result.Body) {
    throw new ImageProcessError('s3_object_missing_body', 'S3 object has no body')
  }

  const bytes = await result.Body.transformToByteArray()
  return Buffer.from(bytes)
}

export async function putS3Buffer(params: { s3: S3Client; bucket: string; key: string; body: Buffer; contentType: string }): Promise<void> {
  await params.s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  )
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
