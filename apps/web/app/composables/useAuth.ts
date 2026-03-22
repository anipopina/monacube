// apps/web/app/composables/useAuth.ts

import type { AuthChallengeReqBody, AuthChallengeOk, AuthVerifyReqBody, AuthVerifyOk } from '@shared/apiInterface'
import type { UserRecord, UserStatsRecord } from '@shared/ddbRecord'

const STOREKEY_AUTH_USER = 'auth_user'
const STOREKEY_AUTH_ISNEW = 'auth_isnew'

interface AuthUser {
  address: string
  accessToken: string
  expiresAt: number // Unix timestamp (seconds)
  userRecord: UserRecord
  userStatsRecord: UserStatsRecord
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const user = useState<AuthUser | null>('auth:user', () => null)
  const isNew = useState<boolean>('auth:isNew', () => true)
  const initialized = useState<boolean>('auth:initialized', () => false)

  /**
   * チャレンジを取得（署名用のメッセージとnonceを取得）
   * @param address Monacoinアドレス
   * @returns チャレンジ情報
   */
  const getChallenge = async (address: string): Promise<AuthChallengeOk> => {
    const body: AuthChallengeReqBody = { address }
    const response = await $fetch<AuthChallengeOk>(`${apiBase}/auth/challenge`, { method: 'POST', body })
    if (typeof response !== 'object') throw new Error('Invalid response')
    return response
  }

  /**
   * ログイン実行
   * @param address Monacoinアドレス
   * @param message 署名対象のメッセージ（challengeから取得）
   * @param signature メッセージの署名
   * @param nonce チャレンジのnonce
   */
  const login = async (address: string, message: string, signature: string, nonce: string) => {
    const body: AuthVerifyReqBody = { address, message, signature, nonce }
    const response = await $fetch<AuthVerifyOk>(`${apiBase}/auth/verify`, { method: 'POST', body })
    if (typeof response !== 'object') throw new Error('Invalid response')

    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + response.expiresIn

    user.value = {
      address,
      accessToken: response.accessToken,
      expiresAt,
      userRecord: response.user,
      userStatsRecord: response.userStats,
    }
    isNew.value = false
    // トークンをlocalStorageに保存
    localStorage.setItem(STOREKEY_AUTH_USER, JSON.stringify(user.value))
    localStorage.setItem(STOREKEY_AUTH_ISNEW, 'false')
  }

  /**
   * ログアウト
   */
  const logout = () => {
    user.value = null
    localStorage.removeItem(STOREKEY_AUTH_USER)
  }

  const updateUserRecords = (records: { userRecord?: UserRecord; userStatsRecord?: UserStatsRecord }) => {
    if (!user.value) return
    // compute()の再計算をトリガーするためにuser.valueごと更新する
    user.value = {
      ...user.value,
      userRecord: records.userRecord ?? user.value.userRecord,
      userStatsRecord: records.userStatsRecord ?? user.value.userStatsRecord,
    }
    // 更新後のユーザーデータをlocalStorageに保存
    localStorage.setItem(STOREKEY_AUTH_USER, JSON.stringify(user.value))
  }

  const init = () => {
    // skip if already initialized
    if (initialized.value) return
    initialized.value = true

    const stored = localStorage.getItem(STOREKEY_AUTH_USER)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser
        // 有効期限チェック
        const now = Math.floor(Date.now() / 1000)
        if (parsed.expiresAt > now) {
          user.value = parsed
        } else {
          // 期限切れなら削除
          localStorage.removeItem(STOREKEY_AUTH_USER)
        }
      } catch {
        localStorage.removeItem(STOREKEY_AUTH_USER)
      }
    }

    isNew.value = localStorage.getItem(STOREKEY_AUTH_ISNEW) !== 'false'
  }

  init()

  return {
    user: readonly(user),
    isNew: readonly(isNew),

    getChallenge,
    login,
    logout,
    updateUserRecords,
  }
}

/* Usage:

const auth = useAuth()

// 1. チャレンジ取得
const { nonce, message } = await auth.getChallenge(address)

// 2. メッセージに署名
const signature = signMessage(message)

// 3. ログイン
await auth.login(address, message, signature, nonce)

*/
