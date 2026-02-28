import { MonaWallet, MonaWalletRo } from '@/lib/monawallet'
import { createPasskey, hashWithPasskey } from '@/lib/passkey'

const WEBAUTHN_MESSAGETOHASH = 'wallet-seed:v1' // シード生成用の固定メッセージ

/**
 * ウォレットと残留セッションのミスマッチエラー
 * ignoreAddressMismatch=trueでログイン再実行 or ログアウトが必要
 */
export class AddressMismatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AddressMismatchError'
  }
}

export const useWalletAuth = () => {
  const config = useRuntimeConfig()
  const rpId = location.hostname
  const rpName = config.public.webAuthnRpName as string
  const userName = config.public.webAuthnUserName as string
  const auth = useAuth()
  // 誤用防止で wallet と walletRo は同時に存在しないようにする
  const wallet = useState<MonaWallet | null>('walletAuth:wallet', () => null)
  const walletRo = useState<MonaWalletRo | null>('walletAuth:walletRo', () => {
    if (auth.user.value?.address) return new MonaWalletRo(auth.user.value.address)
    return null
  })
  const isLoading = useState<boolean>('walletAuth:isLoading', () => false)

  /**
   * ブラウザやデバイスにPasskeyを登録
   */
  const _createPasskey = async () => {
    isLoading.value = true
    try {
      await createPasskey(rpId, rpName, `${userName} ${dateStr()}`)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ログイン実行
   * @param ignoreAddressMismatch 別アドレスでログイン中の場合に強制的に上書きするかどうか
   * @param forceUpdate 既にログイン中でも強制的にアクセストークンを更新するかどうか
   */
  const login = async ({ ignoreAddressMismatch = false } = {}) => {
    isLoading.value = true
    try {
      if (!wallet.value) {
        const { prfOutput } = await hashWithPasskey(rpId, WEBAUTHN_MESSAGETOHASH)
        wallet.value = new MonaWallet(prfOutput, 'P2PKH')
        walletRo.value = null
      }
      const address = wallet.value.address

      // 別アドレスでログイン中の場合
      if (auth.user.value && auth.user.value.address !== address) {
        if (ignoreAddressMismatch) auth.logout()
        else throw new AddressMismatchError('Logged in address does not match wallet address')
      }

      if (isNeedUpdate()) {
        const { message, nonce } = await auth.getChallenge(address)
        const signature = wallet.value.signMessage(message)
        await auth.login(address, message, signature, nonce)
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * ログアウト実行
   */
  const logout = () => {
    wallet.value = null
    walletRo.value = null
    auth.logout()
  }

  const lockWallet = () => {
    if (wallet.value) walletRo.value = wallet.value.toReadOnly()
    wallet.value = null
  }

  /**
   * 認証が必要なAPIを呼び出す
   * @param apiPath APIのパス（例: '/some/protected/endpoint'）
   * @param options Fetchのオプション
   * @returns APIのレスポンス
   */
  const _fetchAuthorizedApi = async <T = unknown>(
    apiPath: string, // e.g. '/some/protected/endpoint'
    options?: FetchOptions,
  ): Promise<T> => {
    if (!auth.user.value) throw new Error('User not logged in')

    await login() // ウォレットのロックとセッション切れに対応

    try {
      isLoading.value = true
      return auth.fetchAuthorizedApi<T>(apiPath, options)
    } catch (error) {
      // 401エラー時はウォレットもクリア
      if (error instanceof AuthenticationError) {
        wallet.value = null
        walletRo.value = null
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const isNeedUpdate = () => {
    if (!auth.user.value) return true
    const now = Math.floor(Date.now() / 1000)
    return auth.user.value.expiresAt <= now + 15 // 15秒以内にセッション切れる
  }

  return {
    user: auth.user,
    wallet,
    walletRo,
    isLoading: readonly(isLoading),
    createPasskey: _createPasskey,
    login,
    logout,
    lockWallet,
    fetchAuthorizedApi: _fetchAuthorizedApi,
  }
}

const dateStr = (): string => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
