// ユーザのモナコイン残高を更新するバッチ
// GSIを使ってUserStatsRecordをnextMonaChkAtの古い方から数件取得し、ブロックチェーンの残高をチェックして更新する
// これを定期的に実行することで、ユーザの残高をある程度最新に保つことができる

import { mustGetEnv } from '../lib/util'
import { queryDueMonaCheckUsers, refreshUserMonaBalance } from '../lib/monaBalance'

const NUM_USERS_TO_UPDATE = 10 // 1回のバッチでチェックするユーザ数

export const handler = async () => {
  const table = mustGetEnv('APP_TABLE')
  const nowIso = new Date().toISOString()

  const dueUsers = await queryDueMonaCheckUsers({ table, nowIso, limit: NUM_USERS_TO_UPDATE })

  let updated = 0
  let failed = 0

  for (const userStats of dueUsers) {
    const userId = userStats.pk.slice('USER#'.length)
    if (!userId) continue

    try {
      await refreshUserMonaBalance({ table, userId, checkedAtIso: nowIso })

      updated += 1
    } catch (err) {
      failed += 1
      console.error('update_mona_balance_failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const result = {
    fetched: dueUsers.length,
    updated,
    failed,
  }

  console.log('update_mona_balance_done', result)
  return result
}
