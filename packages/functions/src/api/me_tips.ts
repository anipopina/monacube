import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from '../lib/ddb'
import { mustGetEnv, privateApiHandler, responseJson } from '../lib/util'

import type { GetMeTipsOk } from '@shared/apiInterface'
import type { TipRecord } from '@shared/ddbRecord'

const LIMIT = 50

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const userId = auth.subject

  const ddbRes = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :tipPrefix)',
      ScanIndexForward: false,
      Limit: LIMIT,
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':tipPrefix': { S: 'TIP#' },
      },
    }),
  )

  const tips = (ddbRes.Items || [])
    .map((item) => unmarshall(item) as TipRecord)
    .filter((item) => item.type === 'TIP' && item.pk === `USER#${userId}` && item.sk.startsWith('TIP#'))

  const response: GetMeTipsOk = { tips }
  return responseJson(200, response)
})
