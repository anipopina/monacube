// useConfirm composable
type ConfirmOptions = {
  okVariant?: 'primary' | 'danger'
}

export const useConfirm = () => {
  const confirmResolve = useState<((value: boolean) => void) | null>('confirm-resolve', () => null)
  const confirmMessage = useState<string>('confirm-message', () => '')
  const isConfirmOpen = useState<boolean>('confirm-open', () => false)
  const confirmOkVariant = useState<'primary' | 'danger'>('confirm-ok-variant', () => 'primary')

  const confirm = (message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmMessage.value = message
      confirmOkVariant.value = options.okVariant ?? 'primary'
      confirmResolve.value = resolve
      isConfirmOpen.value = true
    })
  }

  const handleConfirmResponse = (response: boolean) => {
    if (confirmResolve.value) {
      confirmResolve.value(response)
      confirmResolve.value = null
    }
    isConfirmOpen.value = false
    confirmMessage.value = ''
    confirmOkVariant.value = 'primary'
  }

  return {
    confirm,
    confirmMessage: readonly(confirmMessage),
    confirmOkVariant: readonly(confirmOkVariant),
    isConfirmOpen: readonly(isConfirmOpen),
    handleConfirmResponse,
  }
}
