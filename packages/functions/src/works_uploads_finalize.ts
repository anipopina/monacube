import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { DeleteItemCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { ulid } from 'ulid'

import { ddb } from './lib/ddb'
import { HttpError, mustGetEnv, privateApiHandler, responseJson, parseEventBody } from './lib/util'

import type { WorksUploadsFinalizeOk, WorksUploadsFinalizeReqBody } from '@shared/api'
import type { UploadRecord, WorkRecord } from '@shared/ddbRecord'
import {
  WORK_DESCRIPTION_MAX_LENGTH,
  WORK_IMAGE_MAX_HEIGHT,
  WORK_IMAGE_MAX_WIDTH,
  WORK_TAG_MAX_COUNT,
  WORK_TAG_MAX_LENGTH,
  WORK_TITLE_MAX_LENGTH,
  workId2imageKey,
} from '@shared/const'
import { downloadS3ObjectAsBuffer, ImageProcessError, processWorkImage, putS3Buffer } from './lib/image'

const s3 = new S3Client({})

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const bucket = mustGetEnv('IMG_BUCKET')
  const imageOrigin = mustGetEnv('IMG_ORIGIN')
  const userId = auth.subject

  // MARK: parse and validate request body
  const request = parseEventBody<WorksUploadsFinalizeReqBody>(event)
  const uploadId = (request.uploadId || '').trim()
  const title = (request.title || '').trim()
  const description = (request.description || '').trim()
  const tags = normalizeTags(request.tags)

  if (!uploadId || !title || !description) throw new HttpError(400, { error: 'missing_fields' })
  if (title.length > WORK_TITLE_MAX_LENGTH) throw new HttpError(400, { error: 'title_too_long' })
  if (description.length > WORK_DESCRIPTION_MAX_LENGTH) throw new HttpError(400, { error: 'description_too_long' })
  if (tags.length > WORK_TAG_MAX_COUNT) throw new HttpError(400, { error: 'too_many_tags' })

  // MARK: validate upload session
  const ddbResUpload = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `UPLOAD#${uploadId}`, sk: 'META' }),
      ConsistentRead: true,
    }),
  )
  if (!ddbResUpload.Item) throw new HttpError(404, { error: 'uploadsession_not_found' })

  const upload = unmarshall(ddbResUpload.Item) as UploadRecord
  const nowUnix = Math.floor(Date.now() / 1000)
  if (upload.type !== 'UPLOAD' || upload.kind !== 'WORK_IMAGE') throw new HttpError(400, { error: 'invalid_upload_kind' })
  if (upload.userId !== userId) throw new HttpError(403, { error: 'forbidden_upload_owner' })
  if (upload.ttl <= nowUnix) throw new HttpError(410, { error: 'upload_expired' })

  // MARK: uploaded object validation + processing
  let uploadedObject: Buffer
  try {
    uploadedObject = await downloadS3ObjectAsBuffer(s3, bucket, upload.s3Key)
  } catch {
    throw new HttpError(400, { error: 'upload_object_not_found' })
  }

  const objectBytes = uploadedObject.byteLength
  if (!objectBytes || objectBytes > upload.declaredBytes) throw new HttpError(400, { error: 'invalid_object_size' })

  let processed
  try {
    processed = await processWorkImage({
      source: uploadedObject,
      maxWidth: WORK_IMAGE_MAX_WIDTH,
      maxHeight: WORK_IMAGE_MAX_HEIGHT,
    })
  } catch (error) {
    if (error instanceof ImageProcessError) throw new HttpError(400, { error: error.code })
    throw error
  }
  // TODO: blurHashやパレットの生成

  // MARK: write processed images
  const workId = ulid()
  const imageKey = workId2imageKey(workId, 'original')
  const largeWebpKey = workId2imageKey(workId, 'large')
  const mediumWebpKey = workId2imageKey(workId, 'medium')
  const thumbWebpKey = workId2imageKey(workId, 'thumb')

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
    width: processed.width,
    height: processed.height,
    bytes: processed.original.bytes,
    tags,
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

  const response: WorksUploadsFinalizeOk = {
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
