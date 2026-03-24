<template>
  <NuxtLoadingIndicator color="linear-gradient(90deg, #53989cff, #53989c44)" :height="4" />
  <UiHeader>
    <template #logo>
      <h1 class="gc-span-nized"><NuxtLink to="/">MonaCube</NuxtLink></h1>
    </template>

    <template #nav>
      <NuxtLink to="/users/M8KAtuA3xWGLhsjim81uPv1uBQMyatJMW5" class="gc-only-desktop">User1</NuxtLink>
      <NuxtLink to="/users/MET11NjMLWS6qrf6bV4gscWW2B1WSV4QVp" class="gc-only-desktop">User2</NuxtLink>
      <NuxtLink to="/terms" class="gc-only-desktop">Terms</NuxtLink>
      <NuxtLink to="/privacy" class="gc-only-desktop">Privacy</NuxtLink>
      <NuxtLink to="/about" class="gc-only-desktop">About</NuxtLink>
      <NuxtLink to="/settings" class="gc-only-desktop">
        <Settings class="gc-icon" aria-label="Settings" />
      </NuxtLink>
    </template>

    <template #actions>
      <span v-if="user"
        ><UiColoredAddrIcon :address="user?.address || ''" :size="36" :radius="3" clickable @click="$router.push('/me')"
      /></span>
      <UiButton v-if="!user" @click="managedLogin" :disabled="isLoading" variant="primary" :iconRight="KeyRound">Login</UiButton>

      <UiHamburger class="gc-only-mobile">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/terms">Terms</NuxtLink>
        <NuxtLink to="/privacy">Privacy</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
        <NuxtLink to="/settings"><Settings class="gc-icon gc-icon--small" aria-label="Settings" /></NuxtLink>
        <span><!-- spacer --></span>
        <UiButton v-if="!user" @click="managedLogin" :disabled="isLoading" variant="primary" :iconRight="KeyRound">Login</UiButton>
        <UiButton v-if="user" @click="managedLogout" :disabled="isLoading" :iconRight="LogOut">Logout</UiButton>
      </UiHamburger>
    </template>
  </UiHeader>
  <div class="gc-page-container">
    <NuxtPage />
  </div>
  <UiWalletModal ref="walletModalRef" />
  <UiLegalAcceptModal ref="legalAcceptModalRef" />
  <UiConfirm />
  <UiToastRenderer />
</template>

<script setup lang="ts">
import { LogOut, KeyRound, Settings } from 'lucide-vue-next'
import { PrfNotSupportedError } from '@/lib/passkey'
import {
  managedCreatePasskeyKey,
  managedLoginKey,
  managedLogoutKey,
  managedLockWalletKey,
  openWalletModalKey,
  tipMonaKey,
} from '@/lib/injectionKeys'
import { CURRENT_TERMS_VERSION } from '@shared/legal/terms'
import { CURRENT_PRIVACY_VERSION } from '@shared/legal/privacy'

useColorMode()
const { user, wallet, isLoading, createPasskey, login, logout, lockWallet } = useWalletAuth()
const route = useRoute()
const toast = useToast()
const api = useApi()

const walletModalRef = ref<{ openModal: () => Promise<void> } | null>(null)
const legalAcceptModalRef = ref<{ openModal: () => Promise<void> } | null>(null)

const openWalletModal = () => walletModalRef.value?.openModal()
const openLegalAcceptModal = () => legalAcceptModalRef.value?.openModal()

const checkLegalAcceptance = () => {
  if (!user.value) return
  if (route.path === '/terms' || route.path === '/privacy') return
  if (user.value.userStatsRecord.termsVer !== CURRENT_TERMS_VERSION || user.value.userStatsRecord.privacyVer !== CURRENT_PRIVACY_VERSION) {
    if (!wallet.value) {
      // ログイン時に表示された同意モーダルを無視したまま操作している場合
      logout()
      toast.warning('利用規約・プライバシーポリシーが更新されました。再ログインしてご確認ください', 10_000)
      return
    }
    openLegalAcceptModal()
  }
}

const managedCreatePasskey = async () => {
  toast.loading('Passkey 登録中', isLoading)
  try {
    await createPasskey()
    toast.success('Passkey を登録しました。ウォレットを開いてログインしてください')
  } catch (error) {
    console.error('Passkey creation failed:', error)
    // ユーザによるキャンセルの可能性が高いのでUIには表示しなくていい
  }
}

const managedLogin = async () => {
  toast.loading('ログイン中', isLoading)
  try {
    await login()
    toast.success(`${user.value?.address || ''} でログインしました`)
    checkLegalAcceptance()
  } catch (error) {
    if (error instanceof PrfNotSupportedError) {
      toast.error('お使いのブラウザ/デバイスは本サービスに必要な WebAuthn PRF をサポートしていません。別の環境でお試しください', 10_000)
      return
    } else if (error instanceof AddressMismatchError) {
      toast.error(
        'ログイン中のアカウントとは異なるウォレットを開こうとしたため、セッションをリセットしました。もう一度ログインしてください',
        10_000,
      )
      return
    } else {
      console.error('Login failed:', error)
      toast.error(`ログインに失敗しました`, 10_000)
    }
  }
}

const managedLogout = () => {
  logout()
  toast.success('ログアウトしました')
}

const managedLockWallet = () => {
  lockWallet()
  toast.success('ウォレットをロックしました')
}

const tipMona = async (destination: string, amount: number): Promise<string> => {
  // sendMona() 相当の処理をAPI経由で行う
  // 複数の送金ユースケースがあるので入力値のバリデーションや例外処理は呼び出し元に任せる
  const walletValue = wallet.value
  if (!walletValue) throw new Error('Wallet not available')
  const { tx, feeSat } = await walletValue.constructSendMonaTx(destination, amount)
  const signedTxHex = walletValue.signTx(tx)
  const { tip } = await api.postTips({ signedTxHex, feeSat })
  const txId = tip.txId
  walletValue.updateLocalTxos(tx, txId)
  walletValue.mergeLocalTxos()
  walletValue.calcBalance()
  return txId
}

watch(
  () => route.path,
  () => {
    checkLegalAcceptance()
  },
)

onMounted(() => {
  checkLegalAcceptance()
})

provide(managedCreatePasskeyKey, managedCreatePasskey)
provide(managedLoginKey, managedLogin)
provide(managedLogoutKey, managedLogout)
provide(managedLockWalletKey, managedLockWallet)
provide(openWalletModalKey, openWalletModal)
provide(tipMonaKey, tipMona)
</script>
