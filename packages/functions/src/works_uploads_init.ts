import { HttpError, mustGetEnv, privateApiHandler, responseJson, parseEventBody } from './lib/util'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ulid } from 'ulid'

import type { WorksUploadsInitOk, WorksUploadsInitReqBody } from '@shared/api'
import type { UploadRecord } from '@shared/ddbRecord'
import { WORK_IMAGE_ALLOWEDCONTENTTYPES, WORK_IMAGE_MAX_BYTES } from '@shared/const'

import { ddb } from './lib/ddb'

const UPLOAD_EXPIRES_IN_SEC = 15 * 60

const s3 = new S3Client({})

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const bucket = mustGetEnv('IMG_BUCKET')
  const userId = auth.subject

  const request = parseEventBody<WorksUploadsInitReqBody>(event)
  const contentType = (request.contentType || '').trim().toLowerCase()
  const declaredBytes = Number(request.declaredBytes)

  if (!contentType || !Number.isFinite(declaredBytes)) {
    throw new HttpError(400, { error: 'missing_fields' })
  }
  if (!WORK_IMAGE_ALLOWEDCONTENTTYPES.includes(contentType)) {
    throw new HttpError(400, { error: 'invalid_content_type' })
  }
  if (!Number.isInteger(declaredBytes) || declaredBytes <= 0) {
    throw new HttpError(400, { error: 'invalid_declared_bytes' })
  }
  if (declaredBytes > WORK_IMAGE_MAX_BYTES) {
    // TODO: MONA高による制限を実装した後は動的な値で制限する
    throw new HttpError(400, { error: 'too_large_declared_bytes' })
  }

  const uploadId = ulid()
  const s3Key = `works/uploads/${uploadId}/tmp`

  const now = Math.floor(Date.now() / 1000)
  const ttl = now + UPLOAD_EXPIRES_IN_SEC

  const uploadRecord: UploadRecord = {
    pk: `UPLOAD#${uploadId}`,
    sk: 'META',
    type: 'UPLOAD',
    ttl,
    userId: userId,
    kind: 'WORK_IMAGE',
    s3Key,
    contentType,
    declaredBytes,
  }

  await ddb.send(
    new PutItemCommand({
      TableName: table,
      Item: marshall(uploadRecord),
    }),
  )

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRES_IN_SEC })

  const response: WorksUploadsInitOk = {
    uploadId,
    uploadUrl,
    method: 'PUT',
    headers: {
      'content-type': contentType,
    },
    s3Key,
    expiresIn: UPLOAD_EXPIRES_IN_SEC,
  }
  return responseJson(200, response)
})
