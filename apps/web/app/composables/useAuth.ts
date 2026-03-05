// apps/web/app/composables/useAuth.ts

import type { AuthChallengeRequest, AuthChallengeOk, AuthVerifyRequest, AuthVerifyOk } from '@shared/api'

const STOREKEY_AUTH_USER = 'auth_user'

interface AuthUser {
  address: string
  accessToken: string
  expiresAt: number // Unix timestamp (seconds)
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const user = useState<AuthUser | null>('auth:user', () => null)

  const load = () => {
    if (user.value) return
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
  }

  /**
   * チャレンジを取得（署名用のメッセージとnonceを取得）
   * @param address Monacoinアドレス
   * @returns チャレンジ情報
   */
  const getChallenge = async (address: string): Promise<AuthChallengeOk> => {
    const body: AuthChallengeRequest = { address }
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
    const body: AuthVerifyRequest = { address, message, signature, nonce }
    const response = await $fetch<AuthVerifyOk>(`${apiBase}/auth/verify`, { method: 'POST', body })
    if (typeof response !== 'object') throw new Error('Invalid response')

    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + response.expiresIn

    user.value = {
      address,
      accessToken: response.accessToken,
      expiresAt,
    }
    // トークンをlocalStorageに保存
    localStorage.setItem(STOREKEY_AUTH_USER, JSON.stringify(user.value))
  }

  /**
   * ログアウト
   */
  const logout = () => {
    user.value = null
    localStorage.removeItem(STOREKEY_AUTH_USER)
  }

  load()

  return {
    user: readonly(user),
    getChallenge,
    login,
    logout,
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
