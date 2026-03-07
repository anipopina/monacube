import { GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from './lib/ddb'
import { apiHandler, HttpError, mustGetEnv, responseJson } from './lib/util'

import type { GetUserOk } from '@shared/api'
import type { UserRecord, WorkRecord } from '@shared/ddbRecord'

export const handler = apiHandler(async (event) => {
  const table = mustGetEnv('APP_TABLE')

  const userId = (event.pathParameters?.userId || '').trim()
  if (!userId) throw new HttpError(400, { error: 'missing_user_id' })

  const [ddbResUser, ddbResWorks] = await Promise.all([
    ddb.send(
      new GetItemCommand({
        TableName: table,
        Key: marshall({ pk: `USER#${userId}`, sk: 'PROFILE' }),
        ConsistentRead: true,
      }),
    ),
    ddb.send(
      new QueryCommand({
        TableName: table,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :workPrefix)',
        ExpressionAttributeValues: {
          ':gsi1pk': { S: `USER#${userId}` },
          ':workPrefix': { S: 'WORK#' },
        },
        ScanIndexForward: false,
      }),
    ),
  ])

  if (!ddbResUser.Item) throw new HttpError(404, { error: 'user_not_found' })

  const user = unmarshall(ddbResUser.Item) as UserRecord
  const userWorks = (ddbResWorks.Items || [])
    .map((item) => unmarshall(item) as WorkRecord)
    .filter((item) => item.type === 'WORK' && item.sk === 'META')

  const response: GetUserOk = {
    user,
    userWorks,
  }
  return responseJson(200, response)
})
