import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { DeleteItemCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import * as crypto from 'node:crypto'

import { ddb } from './lib/ddb'
import { mustGetEnv, privateApiHandler, responseJson } from './lib/util'

import type { WorksUploadFinalizeOk, WorksUploadFinalizeRequest } from '@shared/api'
import type { UploadRecord, WorkRecord } from '@shared/ddbRecord'
import {
  WORK_DESCRIPTION_MAX_LENGTH,
  WORK_IMAGE_MAX_HEIGHT,
  WORK_IMAGE_MAX_WIDTH,
  WORK_TAG_MAX_COUNT,
  WORK_TAG_MAX_LENGTH,
  WORK_TITLE_MAX_LENGTH,
} from '@shared/const'
import { downloadS3ObjectAsBuffer, ImageProcessError, processWorkImage, putS3Buffer } from './lib/image'

const s3 = new S3Client({})

export const handler = privateApiHandler(async (event, auth) => {
  // MARK: parse and validate request body

  let request: Partial<WorksUploadFinalizeRequest> = {}
  try {
    request = event?.body ? JSON.parse(event.body) : {}
  } catch {
    return responseJson(400, { error: 'invalid_json' })
  }

  const userId = auth.subject
  const uploadId = (request.uploadId || '').trim()
  const title = (request.title || '').trim()
  const description = (request.description || '').trim()
  const tags = normalizeTags(request.tags)

  if (!uploadId || !title || !description) {
    return responseJson(400, { error: 'missing_fields' })
  }
  if (title.length > WORK_TITLE_MAX_LENGTH) return responseJson(400, { error: 'title_too_long' })
  if (description.length > WORK_DESCRIPTION_MAX_LENGTH) return responseJson(400, { error: 'description_too_long' })
  if (tags.length > WORK_TAG_MAX_COUNT) return responseJson(400, { error: 'too_many_tags' })

  const table = mustGetEnv('APP_TABLE')
  const bucket = mustGetEnv('IMG_BUCKET')
  const imageOrigin = mustGetEnv('IMG_ORIGIN')

  // MARK: validate upload session
  const ddbResUpload = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `UPLOAD#${uploadId}`, sk: 'META' }),
      ConsistentRead: true,
    }),
  )
  if (!ddbResUpload.Item) return responseJson(404, { error: 'uploadsession_not_found' })

  const upload = unmarshall(ddbResUpload.Item) as UploadRecord
  const nowUnix = Math.floor(Date.now() / 1000)
  if (upload.type !== 'UPLOAD' || upload.kind !== 'WORK_IMAGE') {
    return responseJson(400, { error: 'invalid_upload_kind' })
  }
  if (upload.userId !== userId) {
    return responseJson(403, { error: 'forbidden_upload_owner' })
  }
  if (upload.ttl <= nowUnix) {
    return responseJson(410, { error: 'upload_expired' })
  }

  // MARK: uploaded object validation + processing
  let uploadedObject: Buffer
  try {
    uploadedObject = await downloadS3ObjectAsBuffer(s3, bucket, upload.s3Key)
  } catch {
    return responseJson(400, { error: 'upload_object_not_found' })
  }

  const objectBytes = uploadedObject.byteLength
  if (!objectBytes || objectBytes > upload.declaredBytes) {
    return responseJson(400, { error: 'invalid_object_size' })
  }

  let processed
  try {
    processed = await processWorkImage({
      source: uploadedObject,
      maxWidth: WORK_IMAGE_MAX_WIDTH,
      maxHeight: WORK_IMAGE_MAX_HEIGHT,
    })
  } catch (error) {
    if (error instanceof ImageProcessError) {
      return responseJson(400, { error: error.code })
    }
    throw error
  }
  // TODO: blurHashやパレットの生成

  // MARK: write processed images
  const workId = crypto.randomUUID() // TODO: ULIDに変更する
  const imageKey = `works/${workId}/original`
  const largeWebpKey = `works/${workId}/large.webp`
  const mediumWebpKey = `works/${workId}/medium.webp`
  const thumbWebpKey = `works/${workId}/thumb.webp`

  await Promise.all([
    putS3Buffer({
      s3,
      bucket,
      key: imageKey,
      body: processed.original.body,
      contentType: processed.original.contentType,
    }),
    putS3Buffer({
      s3,
      bucket,
      key: largeWebpKey,
      body: processed.largeWebp,
      contentType: 'image/webp',
    }),
    putS3Buffer({
      s3,
      bucket,
      key: mediumWebpKey,
      body: processed.mediumWebp,
      contentType: 'image/webp',
    }),
    putS3Buffer({
      s3,
      bucket,
      key: thumbWebpKey,
      body: processed.thumbWebp,
      contentType: 'image/webp',
    }),
  ])

  // 一時アップロードは確定後に削除
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: upload.s3Key,
    }),
  )

  // MARK: create work record
  const nowIso = new Date(nowUnix * 1000).toISOString()
  const workRecord: WorkRecord = {
    pk: `WORK#${workId}`,
    sk: 'META',
    type: 'WORK',
    workId,
    ownerId: userId,
    title,
    description,
    createdAt: nowIso,
    updatedAt: nowIso,
    imageKey,
    width: processed.width,
    height: processed.height,
    bytes: processed.original.bytes,
    tags: new Set(tags),
    blurHash: '',
    palette: [],
    GSI1PK: `USER#${userId}`,
    GSI1SK: `WORK#${nowIso}#${workId}`,
    GSI2PK: 'FEED',
  }

  await ddb.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall(workRecord),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }),
  )

  await ddb.send(
    new DeleteItemCommand({
      TableName: table,
      Key: marshall({ pk: upload.pk, sk: upload.sk }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
    }),
  )

  const response: WorksUploadFinalizeOk = {
    work: workRecord,
    imageUrl: `${imageOrigin}/${imageKey}`,
  }
  return responseJson(200, response)
})

function normalizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return []
  const unique = new Set<string>()
  for (const tag of tags) {
    const v = tag.trim()
    if (!v) continue
    if (v.length > WORK_TAG_MAX_LENGTH) continue
    unique.add(v)
  }
  return [...unique]
}
