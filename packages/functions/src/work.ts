import { GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { ddb } from './lib/ddb'
import { apiHandler, HttpError, mustGetEnv, responseJson } from './lib/util'

import type { GetWorkOk } from '@shared/api'
import type { WorkRecord } from '@shared/ddbRecord'

export const get = apiHandler(async (event) => {
  const table = mustGetEnv('APP_TABLE')

  const workId = (event.pathParameters?.workId || '').trim()
  if (!workId) throw new HttpError(400, { error: 'missing_work_id' })

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

  const response: GetWorkOk = {
    work,
  }
  return responseJson(200, response)
})
