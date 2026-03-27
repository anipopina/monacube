import { GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from '../lib/ddb'
import { apiHandler, HttpError, mustGetEnv, responseJson } from '../lib/util'

import type { GetUserOk } from '@shared/apiInterface'
import type { UserRecord, UserStatsRecord, WorkRecord } from '@shared/ddbRecord'

const WORKS_LIMIT = 50

export const handler = apiHandler(async (event) => {
  const table = mustGetEnv('APP_TABLE')
  const includeUserStats = event.queryStringParameters?.includeUserStats === 'true'

  const userId = (event.pathParameters?.userId || '').trim()
  if (!userId) throw new HttpError(400, { error: 'missing_user_id' })

  const [ddbResUser, ddbResWorks, ddbResUserStats] = await Promise.all([
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
        ScanIndexForward: false,
        FilterExpression: '#status = :ok',
        Limit: WORKS_LIMIT,
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': { S: `USER#${userId}` },
          ':workPrefix': { S: 'WORK#' },
          ':ok': { S: 'OK' },
        },
      }),
    ),
    includeUserStats
      ? ddb.send(
          new GetItemCommand({
            TableName: table,
            Key: marshall({ pk: `USER#${userId}`, sk: 'STATS' }),
            ConsistentRead: true,
          }),
        )
      : Promise.resolve(undefined),
  ])

  if (!ddbResUser.Item) throw new HttpError(404, { error: 'user_not_found' })

  const user = unmarshall(ddbResUser.Item) as UserRecord
  const userWorks = (ddbResWorks.Items || [])
    .map((item) => unmarshall(item) as WorkRecord)
    .filter((item) => item.type === 'WORK' && item.sk === 'META')
  const userStats = ddbResUserStats?.Item ? (unmarshall(ddbResUserStats.Item) as UserStatsRecord) : undefined

  const response: GetUserOk = {
    user,
    userWorks,
    ...(userStats ? { userStats } : {}),
  }
  return responseJson(200, response)
})
