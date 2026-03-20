import { S3Client } from '@aws-sdk/client-s3'
import { DeleteItemCommand, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from '../lib/ddb'
import { deleteS3Objects } from '../lib/s3'
import { HttpError, mustGetEnv, privateApiHandler, responseJson } from '../lib/util'

import type { WorkRecord } from '@shared/ddbRecord'
import { workId2imageKey } from '@shared/const'

const s3 = new S3Client({})

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const bucket = mustGetEnv('IMG_BUCKET')
  const userId = auth.subject

  const workId = (event.pathParameters?.workId || '').trim()
  if (!workId) throw new HttpError(400, { error: 'missing_work_id' })

  // Fetch work to verify ownership
  const ddbRes = await ddb.send(
    new GetItemCommand({
      TableName: table,
      Key: marshall({ pk: `WORK#${workId}`, sk: 'META' }),
      ConsistentRead: true,
    }),
  )
  if (!ddbRes.Item) throw new HttpError(404, { error: 'work_not_found' })

  const work = unmarshall(ddbRes.Item) as WorkRecord
  if (work.type !== 'WORK' || work.sk !== 'META') {
    throw new HttpError(404, { error: 'work_not_found' })
  }

  // Verify ownership
  if (work.ownerId !== userId) {
    throw new HttpError(403, { error: 'forbidden' })
  }

  // WorkRecordのstatusをDELETINGに変更
  const nowIso = new Date().toISOString()
  await ddb.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName: table,
            Key: marshall({ pk: work.pk, sk: work.sk }),
            UpdateExpression: 'SET #status = :deleting, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk', // GSI3を追加
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk) AND #status = :ok',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: marshall({
              ':deleting': 'DELETING',
              ':gsi3pk': `WORK_STATUS#DELETING`,
              ':gsi3sk': `WORK#${nowIso}#${work.workId}`,
              ':ok': 'OK',
            }),
          },
        },
        {
          Update: {
            TableName: table,
            Key: marshall({ pk: `USER#${userId}`, sk: 'STATS' }),
            UpdateExpression: 'SET totalBytes = totalBytes - :bytesDec, workCount = workCount - :workCountDec',
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
            ExpressionAttributeValues: marshall({
              ':bytesDec': work.bytes,
              ':workCountDec': 1,
            }),
          },
        },
      ],
    }),
  )

  // S3から画像を削除
  const imageKey = workId2imageKey(workId, 'original')
  const largeWebpKey = workId2imageKey(workId, 'large')
  const mediumWebpKey = workId2imageKey(workId, 'medium')
  const thumbWebpKey = workId2imageKey(workId, 'thumb')
  await deleteS3Objects({
    s3,
    bucket,
    keys: [imageKey, largeWebpKey, mediumWebpKey, thumbWebpKey],
  })

  // WorkRecordを削除
  await ddb.send(
    new DeleteItemCommand({
      TableName: table,
      Key: marshall({ pk: `WORK#${workId}`, sk: 'META' }),
    }),
  )

  return responseJson(204, null)
})
