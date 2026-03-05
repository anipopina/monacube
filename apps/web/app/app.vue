<template>
  <NuxtLoadingIndicator color="linear-gradient(90deg, #53989cff, #53989c44)" :height="4" />
  <UiHeader>
    <template #logo>
      <h1 class="gc-span-nized"><NuxtLink to="/">MonaCube</NuxtLink></h1>
    </template>

    <template #nav>
      <NuxtLink to="/items/__ID__" class="gc-only-desktop">Items</NuxtLink>
      <NuxtLink to="/works/__WORK_ID__" class="gc-only-desktop">WorkItem</NuxtLink>
      <NuxtLink to="/users/M8KAtuA3xWGLhsjim81uPv1uBQMyatJMW5" class="gc-only-desktop">User1</NuxtLink>
      <NuxtLink to="/users/MET11NjMLWS6qrf6bV4gscWW2B1WSV4QVp" class="gc-only-desktop">User2</NuxtLink>
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
import { managedCreatePasskeyKey, managedLoginKey, managedLogoutKey, managedLockWalletKey, openWalletModalKey } from '@/lib/injectionKeys'

useColorMode()
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

const managedLogin = async () => {
  toast.loading('ログイン中', isLoading)
  try {
    await login()
    toast.success(`${user.value?.address || ''} でログインしました`)
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
      toast.error(`ログインに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`, 10_000)
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
provide(openWalletModalKey, openWalletModal)
</script>
