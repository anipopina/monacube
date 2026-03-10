import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export async function downloadS3ObjectAsBuffer(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  if (!result.Body) {
    throw new Error('S3 object has no body')
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

export async function deleteS3Objects(params: { s3: S3Client; bucket: string; keys: string[] }): Promise<void> {
  if (params.keys.length === 0) return

  await params.s3.send(
    new DeleteObjectsCommand({
      Bucket: params.bucket,
      Delete: {
        Objects: params.keys.map((key) => ({ Key: key })),
      },
    }),
  )
}
