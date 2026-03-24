import { HttpError, mustGetEnv, privateApiHandler, responseJson } from '../lib/util'
import { refreshUserMonaBalance } from '../lib/monaBalance'

import type { MeBalanceRefreshOk } from '@shared/apiInterface'

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const userId = auth.subject

  try {
    const userStats = await refreshUserMonaBalance({ table, userId })
    const response: MeBalanceRefreshOk = { userStats }
    return responseJson(200, response)
  } catch (err) {
    if ((err as { name?: string } | undefined)?.name === 'ConditionalCheckFailedException') {
      throw new HttpError(404, { error: 'user_stats_not_found' })
    }
    throw err
  }
})
