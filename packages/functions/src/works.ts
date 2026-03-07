import { QueryCommand, type AttributeValue } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from './lib/ddb'
import { apiHandler, HttpError, mustGetEnv, responseJson } from './lib/util'

import type { GetWorksOk, GetWorksReqQuery } from '@shared/api'
import type { WorkRecord } from '@shared/ddbRecord'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export const handler = apiHandler(async (event) => {
  const table = mustGetEnv('APP_TABLE')

  const query: GetWorksReqQuery = {
    limit: parseLimit(event.queryStringParameters?.limit),
    lastEvaluatedKey: normalizePageToken(event.queryStringParameters?.lastEvaluatedKey),
  }

  const ddbRes = await ddb.send(
    new QueryCommand({
      TableName: table,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :feed',
      ExpressionAttributeValues: {
        ':feed': { S: 'FEED' },
      },
      ScanIndexForward: false,
      Limit: query.limit ?? DEFAULT_LIMIT,
      ExclusiveStartKey: parsePageToken(query.lastEvaluatedKey),
    }),
  )

  const works = (ddbRes.Items || [])
    .map((item) => unmarshall(item) as WorkRecord)
    .filter((item) => item.type === 'WORK' && item.sk === 'META')

  const response: GetWorksOk = {
    works,
    lastEvaluatedKey: stringifyPageToken(ddbRes.LastEvaluatedKey),
  }

  return responseJson(200, response)
})

function parseLimit(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return DEFAULT_LIMIT
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
    throw new HttpError(400, { error: 'invalid_limit' })
  }
  return limit
}

function normalizePageToken(raw: string | undefined): string | undefined {
  const token = (raw || '').trim()
  return token || undefined
}

function parsePageToken(token: string | undefined): Record<string, AttributeValue> | undefined {
  if (!token) return undefined
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, { error: 'invalid_page_token' })
    }
    return parsed as Record<string, AttributeValue>
  } catch {
    throw new HttpError(400, { error: 'invalid_page_token' })
  }
}

function stringifyPageToken(key: Record<string, AttributeValue> | undefined): string | undefined {
  if (!key) return undefined
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url')
}
