<template>
  <UiHeader>
    <template #logo>
      <h1 class="gc-span-nized"><NuxtLink to="/">AppName</NuxtLink></h1>
    </template>

    <template #nav>
      <NuxtLink to="/items/__ID__" class="gc-only-desktop">Items</NuxtLink>
      <NuxtLink to="/about" class="gc-only-desktop">About</NuxtLink>
      <NuxtLink to="/settings" class="gc-only-desktop">
        <Settings class="gc-icon" aria-label="Settings" />
      </NuxtLink>
    </template>

    <template #actions>
      <span v-if="user"><UiColoredAddr :address="user?.address || ''" clickable @click="openWalletModal" /></span>
      <UiButton v-if="!user" @click="managedLogin" :disabled="isLoading" variant="primary" :iconRight="KeyRound">Login</UiButton>

      <UiHamburger class="gc-only-mobile">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/items/__ID__">Items</NuxtLink>
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
  <UiConfirm />
  <UiToastRenderer />
</template>

<script setup lang="ts">
import { LogOut, KeyRound, Settings } from 'lucide-vue-next'
import { PrfNotSupportedError } from '@/lib/passkey'
import { managedCreatePasskeyKey, managedLoginKey, managedLogoutKey, managedLockWalletKey } from '@/lib/injectionKeys'

useColorMode()
const { confirm } = useConfirm()
const { user, isLoading, createPasskey, login, logout, lockWallet } = useWalletAuth()
const walletModalRef = ref<{ openModal: () => Promise<void> } | null>(null)

const toast = useToast()
const openWalletModal = () => walletModalRef.value?.openModal()

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

const managedLogin = async ({ ignoreAddressMismatch = false } = {}) => {
  toast.loading('ログイン中', isLoading)
  try {
    await login({ ignoreAddressMismatch })
    toast.success(`${user.value?.address || ''} でログインしました`)
  } catch (error) {
    if (error instanceof PrfNotSupportedError) {
      toast.error('お使いのブラウザ/デバイスは本サービスに必要な WebAuthn PRF をサポートしていません。別の環境でお試しください')
      return
    } else if (error instanceof AddressMismatchError) {
      if (await confirm('前回とは異なるウォレットでログインしようとしています。ウォレットを切り替えますか？')) {
        managedLogin({ ignoreAddressMismatch: true }) // オプション付きで再試行
        return
      } else {
        managedLogout()
        return
      }
    } else {
      console.error('Login failed:', error)
      toast.error(`ログインに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

provide(managedCreatePasskeyKey, managedCreatePasskey)
provide(managedLoginKey, managedLogin)
provide(managedLogoutKey, managedLogout)
provide(managedLockWalletKey, managedLockWallet)
</script>
