import { MonaWallet, MonaWalletRo } from '@/lib/monawallet'
import { createPasskey, hashWithPasskey } from '@/lib/passkey'

const WEBAUTHN_MESSAGETOHASH = 'wallet-seed:v1' // シード生成用の固定メッセージ

/**
 * ウォレットと残留セッションのミスマッチエラー
 */
export class AddressMismatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AddressMismatchError'
  }
}

export const useWalletAuth = () => {
  const config = useRuntimeConfig()
  const rpId = location.hostname.split('.').slice(-2).join('.') // ドメインのroot部分（例: example.com, localhost）
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
   * ログイン実行 or ロック解除
   */
  const login = async () => {
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
        logout()
        throw new AddressMismatchError('You tried to open a different wallet than the one associated with the current session.')
      }

      if (isNeedSessionUpdate()) {
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

  /**
   * ウォレットをロック（walletをwalletRoに変換してwalletはnullにする）
   */
  const lockWallet = () => {
    if (wallet.value) walletRo.value = wallet.value.toReadOnly()
    wallet.value = null
  }

  const isNeedSessionUpdate = () => {
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
  }
}

const dateStr = (): string => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
