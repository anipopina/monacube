import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { DeleteItemCommand, GetItemCommand, PutItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { ulid } from 'ulid'

import { ddb } from '../lib/ddb'
import { HttpError, mustGetEnv, privateApiHandler, responseJson, parseEventBody } from '../lib/util'

import type { WorksUploadsFinalizeOk, WorksUploadsFinalizeReqBody } from '@shared/apiInterface'
import type { UploadRecord, WorkRecord } from '@shared/ddbRecord'
import {
  WORK_DESCRIPTION_MAX_LENGTH,
  WORK_IMAGE_MAX_WIDTH,
  WORK_IMAGE_MAX_HEIGHT,
  WORK_IMAGE_MIN_WIDTH,
  WORK_IMAGE_MIN_HEIGHT,
  WORK_TITLE_MAX_LENGTH,
  workId2imageKey,
} from '@shared/const'
import { ImageProcessError, processWorkImage, generateBlurHash } from '../lib/image'
import { downloadS3ObjectAsBuffer, putS3Buffer } from '../lib/s3'

const s3 = new S3Client({})

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const bucket = mustGetEnv('IMG_BUCKET')
  const userId = auth.subject

  // MARK: parse and validate request body
  const request = parseEventBody<WorksUploadsFinalizeReqBody>(event)
  const uploadId = (request.uploadId || '').trim()
  const title = (request.title || '').trim()
  const description = (request.description || '').trim()

  if (!uploadId || !title) throw new HttpError(400, { error: 'missing_fields' })
  if (title.length > WORK_TITLE_MAX_LENGTH) throw new HttpError(400, { error: 'title_too_long' })
  if (description.length > WORK_DESCRIPTION_MAX_LENGTH) throw new HttpError(400, { error: 'description_too_long' })

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
  let uploadedCType = ''
  try {
    const downloaded = await downloadS3ObjectAsBuffer(s3, bucket, upload.s3Key)
    uploadedObject = downloaded.body
    uploadedCType = (downloaded.contentType || '').split(';')[0].trim().toLowerCase()
  } catch {
    throw new HttpError(400, { error: 'upload_object_not_found' })
  }

  const objectBytes = uploadedObject.byteLength
  if (!objectBytes || objectBytes > upload.declaredBytes) throw new HttpError(400, { error: 'invalid_object_size' })
  if (!uploadedCType || uploadedCType !== upload.contentType) throw new HttpError(400, { error: 'invalid_object_content_type' })

  let processed
  try {
    processed = await processWorkImage({
      source: uploadedObject,
      maxWidth: WORK_IMAGE_MAX_WIDTH,
      maxHeight: WORK_IMAGE_MAX_HEIGHT,
      minWidth: WORK_IMAGE_MIN_WIDTH,
      minHeight: WORK_IMAGE_MIN_HEIGHT,
    })
  } catch (error) {
    if (error instanceof ImageProcessError) throw new HttpError(400, { error: error.code })
    throw error
  }

  // blurHash生成
  const blurHash = await generateBlurHash(processed.mediumWebp)
  const thumbBHash = await generateBlurHash(processed.thumbWebp)

  const workId = ulid()
  const imageKey = workId2imageKey(workId, 'original')
  const largeWebpKey = workId2imageKey(workId, 'large')
  const mediumWebpKey = workId2imageKey(workId, 'medium')
  const thumbWebpKey = workId2imageKey(workId, 'thumb')

  // MARK: create work record
  const createIso = new Date().toISOString()
  const workRecord: WorkRecord = {
    pk: `WORK#${workId}`,
    sk: 'META',
    type: 'WORK',
    workId,
    ownerId: userId,
    status: 'SAVING', // SAVINGステータスでレコードを作成して処理完了後にOKに更新する
    title,
    description,
    createdAt: createIso,
    updatedAt: createIso,
    width: processed.width,
    height: processed.height,
    bytes: processed.original.bytes,
    uploadCType: uploadedCType,
    normalized: processed.original.normalized,
    blurHash,
    thumbBHash,
    GSI1PK: `USER#${userId}`,
    GSI1SK: `WORK#${createIso}#${workId}`,
    GSI2PK: 'FEED',
    GSI2SK: `WORK#${createIso}#${workId}`,
    GSI3PK: `WORK_STATUS#SAVING`, // 保存完了後に属性ごと削除
    GSI3SK: `WORK#${createIso}#${workId}`, // 保存完了後に属性ごと削除
  }
  await ddb.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall(workRecord),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
    }),
  )

  // MARK: write processed images
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

  // MARK: set work record status to OK
  const okIso = new Date().toISOString()
  await ddb.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName: table,
            Key: marshall({ pk: workRecord.pk, sk: workRecord.sk }),
            UpdateExpression: 'SET #status = :ok, updatedAt = :updatedAt REMOVE GSI3PK, GSI3SK', // GSI3は削除
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk) AND #status = :saving',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: marshall({
              ':ok': 'OK',
              ':updatedAt': okIso,
              ':saving': 'SAVING',
            }),
          },
        },
        {
          Update: {
            TableName: table,
            Key: marshall({ pk: `USER#${userId}`, sk: 'STATS' }),
            UpdateExpression: 'SET totalBytes = totalBytes + :bytesInc, workCount = workCount + :workCountInc',
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
            ExpressionAttributeValues: marshall({
              ':bytesInc': processed.original.bytes,
              ':workCountInc': 1,
            }),
          },
        },
      ],
    }),
  )

  // レスポンス用にworkRecordも更新
  workRecord.status = 'OK'
  workRecord.updatedAt = okIso
  delete workRecord.GSI3PK
  delete workRecord.GSI3SK

  // アップロードセッション削除
  await ddb.send(
    new DeleteItemCommand({
      TableName: table,
      Key: marshall({ pk: upload.pk, sk: upload.sk }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
    }),
  )

  const response: WorksUploadsFinalizeOk = {
    work: workRecord,
  }
  return responseJson(200, response)
})
