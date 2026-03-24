import { QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { getNextMonaCheckIso } from '@shared/const'
import type { UserStatsRecord } from '@shared/ddbRecord'

import { ddb } from './ddb'
import { getBalanceSat } from './monacoin'

export async function queryDueMonaCheckUsers(params: { table: string; nowIso: string; limit: number }): Promise<UserStatsRecord[]> {
  const ddbRes = await ddb.send(
    new QueryCommand({
      TableName: params.table,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :now',
      ScanIndexForward: true,
      Limit: params.limit,
      ExpressionAttributeValues: {
        ':pk': { S: 'MONA_CHECK' },
        ':now': { S: `USER_STATS#${params.nowIso}` },
      },
    }),
  )

  return (ddbRes.Items || [])
    .map((item) => unmarshall(item) as UserStatsRecord)
    .filter((item) => item.type === 'USER_STATS' && item.sk === 'STATS' && item.pk.startsWith('USER#'))
}

export async function refreshUserMonaBalance(params: { table: string; userId: string; checkedAtIso?: string }): Promise<UserStatsRecord> {
  const checkedAtIso = params.checkedAtIso || new Date().toISOString()
  const balanceSat = await getBalanceSat(params.userId)
  const nextCheckIso = getNextMonaCheckIso()

  const ddbRes = await ddb.send(
    new UpdateItemCommand({
      TableName: params.table,
      Key: marshall({ pk: `USER#${params.userId}`, sk: 'STATS' }),
      UpdateExpression: 'SET balanceSat = :balanceSat, monaCheckedAt = :checkedAt, monaNextChkAt = :nextChkAt, GSI1SK = :gsi1sk',
      ExpressionAttributeValues: marshall({
        ':balanceSat': balanceSat,
        ':checkedAt': checkedAtIso,
        ':nextChkAt': nextCheckIso,
        ':gsi1sk': `USER_STATS#${nextCheckIso}`,
        ':userStatsType': 'USER_STATS',
      }),
      ConditionExpression: '#type = :userStatsType',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ReturnValues: 'ALL_NEW',
    }),
  )

  if (!ddbRes.Attributes) throw new Error('user_stats_update_no_attributes')
  return unmarshall(ddbRes.Attributes) as UserStatsRecord
}
