<template>
  <dialog ref="dialogRef" class="lcm-modal" :class="{ 'lcm-modal--open': isOpen }">
    <div class="lcm-panel">
      <header class="lcm-panel-header">
        <span class="gc-spacer-6"></span>
        <h3 class="lcm-panel-title">利用規約の確認</h3>
        <span class="gc-spacer-6"></span>
      </header>
      <section class="lcm-panel-content">
        <div class="lc-links">
          <NuxtLink to="/terms" target="_blank" class="lc-link"> 利用規約を表示する <ExternalLink class="gc-icon" /> </NuxtLink>
          <NuxtLink to="/privacy" target="_blank" class="lc-link">
            プライバシーポリシーを表示する <ExternalLink class="gc-icon" />
          </NuxtLink>
        </div>
        <div class="lcm-field">
          <label class="lcm-label">署名用メッセージ</label>
          <pre class="lc-acceptance-message">{{ acceptanceMessage }}</pre>
        </div>
        <div class="lc-checkboxs">
          <UiCheckbox v-model="termsAcceptChecked" label="利用規約に同意する" />
          <UiCheckbox v-model="privacyAcceptChecked" label="プライバシーポリシーに同意する" />
        </div>
        <div class="lcm-actions-center">
          <UiButton :disabled="!canSubmit" @click="handleAccept" variant="primary" :iconRight="Stamp">
            同意してウォレットで署名する
          </UiButton>
        </div>
      </section>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ExternalLink, Stamp } from 'lucide-vue-next'
import { CSS_TOKENS } from '@/lib/util'
import { getLegalAcceptanceMessage } from '@shared/const'
import { CURRENT_TERMS_VERSION } from '@shared/legal/terms'
import { CURRENT_PRIVACY_VERSION } from '@shared/legal/privacy'

const toast = useToast()
const api = useApi()
const { wallet, isLoading: isAuthLoading, updateUserRecords } = useWalletAuth()

const dialogRef = ref<HTMLDialogElement | null>(null)
const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const isOpen = ref(false)
const termsAcceptChecked = ref(false)
const privacyAcceptChecked = ref(false)
const canSubmit = computed(() => !isLoading.value && termsAcceptChecked.value && privacyAcceptChecked.value)

const acceptedAt = ref<string>('')
const acceptanceMessage = computed(() => {
  if (!wallet.value) return ''
  return getLegalAcceptanceMessage(wallet.value.address, CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION, acceptedAt.value)
})

const handleAccept = async () => {
  const walletValue = wallet.value
  // check
  if (!walletValue) {
    toast.error('ウォレットがロックされています')
    return
  }
  if (!termsAcceptChecked.value || !privacyAcceptChecked.value) {
    toast.error('利用規約・プライバシーポリシーに同意してください')
    return
  }
  if (!checkAcceptedAtIsValid()) {
    toast.error('署名用メッセージがタイムアウトしたためリトライしてください')
    acceptedAt.value = new Date().toISOString()
    return
  }
  // sign acceptance message
  isActionLoading.value = true
  toast.loading('同意メッセージに署名中', isActionLoading)
  try {
    const signature = walletValue.signMessage(acceptanceMessage.value)
    const response = await api.postMeLegalAccept({
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      signedAt: acceptedAt.value,
      signature,
    })
    updateUserRecords({ userStatsRecord: response.userStats })
    toast.success('利用規約・プライバシーポリシーに同意しました')
    closeModal()
  } catch (error) {
    console.error('Failed to save acceptance signature', error)
    toast.error('署名の保存に失敗しました')
  } finally {
    isActionLoading.value = false
  }
}

const checkAcceptedAtIsValid = () => {
  if (!acceptedAt.value) return false
  const nowUnix = Math.floor(Date.now() / 1000)
  const acceptedAtUnix = Math.floor(new Date(acceptedAt.value).getTime() / 1000)
  const oneDayInSeconds = 24 * 60 * 60
  if (Math.abs(nowUnix - acceptedAtUnix) > oneDayInSeconds) return false
  return true
}

// MARK: Modal common functions

const openModal = async () => {
  if (!dialogRef.value) return
  acceptedAt.value = new Date().toISOString()
  dialogRef.value.showModal()
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  setTimeout(() => {
    dialogRef.value?.close()
    termsAcceptChecked.value = false
    privacyAcceptChecked.value = false
  }, CSS_TOKENS['--duration-normal'])
}

defineExpose({ openModal })
</script>

<style scoped lang="scss">
@use '@/assets/css/modal' as modal;
@include modal.styles; // Modal共通スタイル読み込み

.lc-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-block: var(--space-4);
  align-items: center;
}

.lc-checkboxs {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-block: var(--space-4);
  align-items: center;
}

.lc-link {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  line-height: var(--line-height-relaxed);
}

.lc-acceptance-message {
  margin-block: 0;
  white-space: pre-wrap;
}
</style>
