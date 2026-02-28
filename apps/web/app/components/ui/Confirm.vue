<!-- Confirm Component -->

<template>
  <dialog ref="dialogRef" class="lcm-modal" :class="{ 'lcm-modal--open': isOpen }" @click="onDialogClick">
    <div class="lcm-panel">
      <p class="lc-message">{{ message }}</p>
      <div class="lc-actions">
        <div class="lc-button">
          <UiButton @click="handleCancel" variant="secondary"> キャンセル </UiButton>
        </div>
        <div class="lc-button">
          <UiButton @click="handleConfirm" variant="primary"> OK </UiButton>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { CSS_TOKENS } from '@/lib/util'

const { confirmMessage, isConfirmOpen, handleConfirmResponse } = useConfirm()

const dialogRef = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
const message = ref('')

// Watch for confirm requests
watch(isConfirmOpen, (newValue) => {
  if (newValue) {
    message.value = confirmMessage.value
    openModal()
  }
})

const openModal = () => {
  if (!dialogRef.value) return
  dialogRef.value.showModal()
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  setTimeout(() => {
    dialogRef.value?.close()
    message.value = ''
  }, CSS_TOKENS['--duration-normal'])
}

const handleConfirm = () => {
  handleConfirmResponse(true)
  closeModal()
}

const handleCancel = () => {
  handleConfirmResponse(false)
  closeModal()
}

const onDialogClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) handleCancel()
}
</script>

<style scoped lang="scss">
@use '@/assets/css/modal' as modal;
@include modal.styles; // Modal共通スタイル読み込み

.lc-message {
  font-size: var(--font-size-lg);
  text-align: center;
  padding: var(--space-4) 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.lc-actions {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  gap: var(--space-3);
}

.lc-button {
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
