<template>
  <div>
    <h2 class="gc-page-title">テンプレートへようこそ！</h2>
    <section class="gc-section-framed">
      <h3>1. Passkey を登録</h3>
      <p>ブラウザやデバイスに新しい Passkey を登録します</p>
      <div class="gc-actions gc-actions--left">
        <UiButton @click="managedCreatePasskey" :disabled="isLoading" variant="primary" size="large" :iconRight="KeyRound">
          Create Passkey
        </UiButton>
      </div>
    </section>
    <section class="gc-section-framed">
      <h3>2. ウォレットを開いてログイン</h3>
      <p>Passkey から生成したウォレットでログインします</p>
      <div class="gc-actions gc-actions--left">
        <UiButton v-if="!user" @click="managedLogin" :disabled="isLoading" variant="primary" size="large" :iconRight="KeyRound">
          Open Wallet & Login
        </UiButton>
        <UiButton v-else @click="managedLogout" :disabled="isLoading" size="large" :iconRight="LogOut">Logout</UiButton>
      </div>
    </section>
    <section class="gc-section-framed">
      <h3>3. 認証付き API を呼び出す</h3>
      <p>サーバで発行したアクセスキーを使って認証付き API を呼び出します</p>
      <div class="gc-actions gc-actions--left">
        <UiButton @click="tryApi" :disabled="!user || isLoading" size="large">Try API</UiButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { LogOut, KeyRound } from 'lucide-vue-next'
import { managedCreatePasskeyKey, managedLoginKey, managedLogoutKey } from '@/lib/injectionKeys'
const toast = useToast()
const { user, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()
const managedCreatePasskey = inject(managedCreatePasskeyKey)
const managedLogin = inject(managedLoginKey)
const managedLogout = inject(managedLogoutKey)

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)

const tryApi = async () => {
  isActionLoading.value = true
  toast.loading('サーバと通信中', isActionLoading)
  try {
    const response = await api.postPrivateApiSample()
    toast.success(`API Response: ${JSON.stringify(response)}`)
  } catch (error) {
    console.error('API call failed:', error)
    toast.error('API call failed. Check console for details.')
  } finally {
    isActionLoading.value = false
  }
}
</script>
