// useConfirm composable
export const useConfirm = () => {
  const confirmResolve = useState<((value: boolean) => void) | null>('confirm-resolve', () => null)
  const confirmMessage = useState<string>('confirm-message', () => '')
  const isConfirmOpen = useState<boolean>('confirm-open', () => false)

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmMessage.value = message
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
  }

  return {
    confirm,
    confirmMessage: readonly(confirmMessage),
    isConfirmOpen: readonly(isConfirmOpen),
    handleConfirmResponse,
  }
}
