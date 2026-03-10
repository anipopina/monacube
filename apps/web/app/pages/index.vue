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
</script>
