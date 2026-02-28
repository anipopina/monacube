<!-- WalletModal Component -->

<template>
  <dialog ref="dialogRef" class="lcm-modal" :class="{ 'lcm-modal--open': isOpen }" @click="onDialogClick">
    <Transition :name="panelTransitionName" mode="out-in">
      <!-- Main Panel -->
      <div v-if="activePanel === 'root'" class="lcm-panel">
        <section class="lc-topheader">
          <p class="lc-address">{{ walletAddress }}</p>
          <div class="lc-balance-frame">
            <p class="lc-balance">
              <span class="gc-spacer-6"></span>
              <span>{{ balanceStr }} <span class="lc-balance-unit">MONA</span></span>
              <UiIconButton
                :icon="RefreshCw"
                ariaLabel="Update balance"
                size="small"
                @click="refreshBalance"
                :disabled="!walletInstance || isLoading"
              />
            </p>
            <p v-if="unconfStr" class="lc-balance-unconf">incl {{ unconfStr }} unconf</p>
          </div>
        </section>

        <section class="lcm-actions-stack">
          <UiButton size="large" :disabled="isLoading" :iconRight="QrCode" @click="openChildPanel('show_qr')"> QR コード </UiButton>
          <UiButton size="large" :disabled="isLoading" @click="openChildPanel('send_mona')"> モナコインを送る </UiButton>
        </section>

        <section class="lcm-footer-actions">
          <UiButton v-if="wallet" :iconRight="LockKeyhole" @click="managedLockWallet" :disabled="isLoading || !walletInstance">
            Lock
          </UiButton>
          <UiButton v-else :iconRight="LockKeyholeOpen" variant="primary" @click="handleUnlock" :disabled="isLoading || !walletInstance">
            Unlock
          </UiButton>
          <UiButton @click="handleLogout" :disabled="isLoading" :iconRight="LogOut"> Logout </UiButton>
        </section>
      </div>

      <!-- Show QR Panel -->
      <div v-else-if="activePanel === 'show_qr'" class="lcm-panel">
        <header class="lcm-panel-header">
          <UiIconButton :icon="ArrowLeft" ariaLabel="Back to previous panel" variant="text" size="medium" @click="openParentPanel()" />
          <h3 class="lcm-panel-title">QR コード</h3>
          <span class="gc-spacer-6"></span>
        </header>
        <section class="lcm-panel-content">
          <div class="lc-qrcode">
            <UiQrCode :value="walletAddress" :size="320" :color="qrFgColor" :backgroundColor="qrBgColor" />
          </div>
          <p class="lc-address">{{ walletAddress }}</p>
          <div class="lcm-actions-center">
            <UiButton @click="copyAddress" :iconRight="Copy"> Copy </UiButton>
          </div>
        </section>
      </div>

      <!-- Send Monacoin Panel -->
      <div v-else-if="activePanel === 'send_mona'" class="lcm-panel">
        <header class="lcm-panel-header">
          <UiIconButton :icon="ArrowLeft" ariaLabel="Back to previous panel" variant="text" size="medium" @click="openParentPanel()" />
          <h3 class="lcm-panel-title">モナコインを送る</h3>
          <span class="gc-spacer-6"></span>
        </header>
        <section class="lc-balance-frame">
          <p class="lc-balance">
            <span class="gc-spacer-6"></span>
            <span>{{ balanceStr }} <span class="lc-balance-unit">MONA</span></span>
            <UiIconButton
              :icon="RefreshCw"
              ariaLabel="Update balance"
              size="small"
              @click="refreshBalance"
              :disabled="!walletInstance || isLoading"
            />
          </p>
          <p v-if="unconfStr" class="lc-balance-unconf">incl {{ unconfStr }} unconf</p>
        </section>
        <section class="lcm-panel-content">
          <div class="lcm-field">
            <label class="lcm-label" for="send-to">宛先アドレス</label>
            <input
              id="send-to"
              v-model="sendTo"
              class="lcm-input"
              type="text"
              name="send-to"
              placeholder="Mona address"
              autocomplete="off"
            />
          </div>
          <div class="lcm-field">
            <label class="lcm-label" for="send-amount">数量 (MONA)</label>
            <input
              id="send-amount"
              v-model="sendAmount"
              class="lcm-input"
              type="number"
              name="send-amount"
              step="any"
              min="0"
              inputmode="decimal"
              placeholder="0"
              autocomplete="off"
            />
          </div>
          <div class="lcm-actions">
            <UiButton variant="primary" @click="handleSend" :disabled="!wallet || isLoading"> Send MONA </UiButton>
          </div>
          <div v-if="!wallet" class="lcm-overlay">ウォレットがロックされています</div>
        </section>
      </div>
    </Transition>
    <div class="lcm-close">
      <UiIconButton :icon="X" ariaLabel="Close dialog" variant="text" size="medium" @click="closeModal" />
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { X, ArrowLeft, RefreshCw, LockKeyhole, LockKeyholeOpen, LogOut, QrCode, Copy } from 'lucide-vue-next'
import { validateAddress } from '@/lib/monawallet'
import { CSS_TOKENS, formatBalance } from '@/lib/util'
import { managedLoginKey, managedLogoutKey, managedLockWalletKey } from '@/lib/injectionKeys'
const managedLogin = inject(managedLoginKey)
const managedLogout = inject(managedLogoutKey)
const managedLockWallet = inject(managedLockWalletKey)
type PanelName = 'root' | 'show_qr' | 'send_mona'

const { confirm } = useConfirm()
const toast = useToast()
const { wallet, walletRo, isLoading: isAuthLoading } = useWalletAuth()

const dialogRef = ref<HTMLDialogElement | null>(null)
const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const isOpen = ref(false)

const sendTo = ref('')
const sendAmount = ref('')
const activePanel = ref<PanelName>('root')
const panelTransitionName = ref<'lcm-parent2child' | 'lcm-child2parent'>('lcm-parent2child')
const qrFgColor = ref('')
const qrBgColor = ref('')

// NOTE: MonaWallet extends MonaWalletRo, so `MonaWallet | MonaWalletRo` collapses to `MonaWalletRo`.
// For read-only UI state, treating it as MonaWalletRo is fine. For sending, use `wallet.value` directly.
const walletInstance = computed(() => wallet.value || walletRo.value || null)
const walletAddress = computed(() => walletInstance.value?.address || '')
const balanceStr = computed(() => {
  if (!walletInstance.value || walletInstance.value.lastBalanceUpdate === 0) return '--'
  else return formatBalance(walletInstance.value.balance + walletInstance.value.unconfBalance)
})
const unconfStr = computed(() => {
  if (!walletInstance.value || walletInstance.value.unconfBalance <= 0) return ''
  return formatBalance(walletInstance.value.unconfBalance)
})

const refreshBalance = async () => {
  if (!walletInstance.value) {
    toast.error('ウォレットが開かれていません')
    return
  }
  isActionLoading.value = true
  toast.loading('残高を更新中', isActionLoading)
  try {
    await walletInstance.value.updateBalance()
  } catch (error) {
    console.error('Failed to refresh balance', error)
    toast.error(error instanceof Error ? error.message : '残高の取得に失敗しました')
  } finally {
    isActionLoading.value = false
  }
}

const handleSend = async () => {
  const walletValue = wallet.value
  // check
  if (!walletValue) {
    toast.error('ウォレットがロックされています')
    return
  }
  const destination = sendTo.value.trim()
  const amountNum = Number(sendAmount.value)
  if (!validateAddress(destination)) {
    toast.error('宛先アドレスが不正です')
    return
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    toast.error('0より大きい数量を入力してください')
    return
  }
  if (!(await confirm(`${destination} に ${amountNum} MONA を送ります`))) return
  // send
  isActionLoading.value = true
  toast.loading('モナコインを送信中', isActionLoading)
  try {
    const txId = await walletValue.sendMona(destination, amountNum)
    toast.success(`${amountNum} MONA を送りました`)
    console.info(`txid: ${txId}`)
    sendTo.value = ''
    sendAmount.value = ''
  } catch (error) {
    console.error('Failed to send MONA', error)
    toast.error(error instanceof Error ? error.message : '送信に失敗しました')
  } finally {
    isActionLoading.value = false
  }
}

const handleUnlock = async () => {
  if (managedLogin) await managedLogin()
  if (!walletInstance.value) {
    closeModal()
    return
  }
  await refreshBalance()
}

const handleLogout = () => {
  if (managedLogout) managedLogout()
  closeModal()
}

const copyAddress = async () => {
  if (!walletAddress.value) return
  try {
    await navigator.clipboard.writeText(walletAddress.value)
    toast.success('アドレスをコピーしました')
  } catch (error) {
    console.error('Failed to copy address', error)
    toast.error('アドレスのコピーに失敗しました')
  }
}

// MARK: Modal common functions

const openModal = async () => {
  if (!dialogRef.value) return
  dialogRef.value.showModal()
  isOpen.value = true
  await refreshBalance()
}

const closeModal = () => {
  isOpen.value = false
  setTimeout(() => {
    dialogRef.value?.close()
    sendTo.value = ''
    sendAmount.value = ''
    activePanel.value = 'root'
  }, CSS_TOKENS['--duration-normal'])
}

const onDialogClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) closeModal()
}

const openChildPanel = (panelName: PanelName) => {
  panelTransitionName.value = 'lcm-parent2child'
  activePanel.value = panelName
  initPanel(panelName)
}

const openParentPanel = (panelName: PanelName = 'root') => {
  panelTransitionName.value = 'lcm-child2parent'
  activePanel.value = panelName
  initPanel(panelName)
}

const initPanel = (panelName: PanelName) => {
  switch (panelName) {
    case 'show_qr':
      qrFgColor.value = window.getComputedStyle(document.documentElement).getPropertyValue('--color-fg')
      qrBgColor.value = window.getComputedStyle(document.documentElement).getPropertyValue('--color-bg') + '88' // add opacity
      break
  }
}

defineExpose({ openModal })
</script>

<style scoped lang="scss">
@use '@/assets/css/modal' as modal;
@include modal.styles; // Modal共通スタイル読み込み

.lc-topheader {
  padding: var(--space-6) 0 var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lc-address {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
  text-align: center;
  word-break: break-all;
}

.lc-balance-frame {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.lc-balance {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.lc-balance-unit {
  display: inline-block;
  font-size: 0.8em;
  padding-top: 0.2em;
}

.lc-balance-unconf {
  font-size: var(--font-size-md);
  color: var(--color-muted);
  text-align: center;
}

.lc-qrcode {
  margin: 0 auto;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  overflow: hidden;
}
</style>
