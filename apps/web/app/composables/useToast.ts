import { CSS_TOKENS } from '@/lib/util'

export type ToastType = 'success' | 'info' | 'error' | 'warning' | 'loading'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
  isLoading?: boolean
}

const MAX_TOASTS = 4
const watchStops = new Map<string, () => void>()

export const useToast = () => {
  const toastQueue = useState<Toast[]>('toast:queue', () => [])
  const toastWaitQueue = useState<Toast[]>('toast:waitQueue', () => [])
  const idCounter = useState<number>('toast:idCounter', () => 0)

  const removeToast = (id: string) => {
    const waitIndex = toastWaitQueue.value.findIndex((t) => t.id === id)
    const index = toastQueue.value.findIndex((t) => t.id === id)
    if (waitIndex !== -1) toastWaitQueue.value.splice(waitIndex, 1)
    if (index !== -1) toastQueue.value.splice(index, 1)
    removeWatch(id)
  }

  const addWatch = (id: string, isLoading: Ref<boolean>) => {
    const stop = watch(isLoading, (value) => {
      if (!value) removeToast(id)
    })
    watchStops.set(id, stop)
  }

  const addToast = (message: string, type: ToastType, duration = CSS_TOKENS['--duration-toast'], isLoading?: Ref<boolean>) => {
    idCounter.value += 1
    const id = `toast-${idCounter.value}-${Date.now()}`
    const toast: Toast = { id, message, type, duration, isLoading: isLoading?.value }

    // Remove oldest toast if limit exceeded
    if (toastQueue.value.length >= MAX_TOASTS) {
      const removed = toastQueue.value.shift()
      if (removed) removeWatch(removed.id)
    }

    if (!isLoading) {
      toastQueue.value.push(toast)
      setTimeout(() => {
        removeToast(id)
      }, duration)
    } else {
      // loadingトーストは一瞬だけ表示されるのを防ぐためtoastWaitQueueに入れておいて500ms待機してから表示する
      toastWaitQueue.value.push(toast)
      setTimeout(() => {
        const index = toastWaitQueue.value.findIndex((t) => t.id === id)
        if (index !== -1) {
          toastWaitQueue.value.splice(index, 1)
          if (isLoading.value) toastQueue.value.push(toast)
          else removeToast(id)
        }
      }, 500)
      addWatch(id, isLoading)
    }

    return id
  }

  return {
    toastQueue: readonly(toastQueue),
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    loading: (message: string, isLoading?: Ref<boolean>) => addToast(message, 'loading', undefined, isLoading),
    remove: removeToast,
  }
}

const removeWatch = (id: string) => {
  const stop = watchStops.get(id)
  if (stop) {
    stop()
    watchStops.delete(id)
  }
}
