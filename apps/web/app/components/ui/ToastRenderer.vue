<!-- ToastRenderer Component -->
<!-- Place once in app.vue: <UiToastRenderer /> -->

<template>
  <div ref="containerRef" popover="manual" class="lc-container">
    <TransitionGroup name="lc-toast">
      <div v-for="toast in toastQueue" :key="toast.id" :class="['lc-toast', `lc-toast--${toast.type}`]">
        <div class="lc-icon">
          <component :is="getIcon(toast.type)" :size="20" />
        </div>
        <div class="lc-message">{{ toast.message }}</div>
        <button v-if="toast.type !== 'loading'" class="lc-close" @click.stop="handleRemove(toast.id)" aria-label="Close toast">
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { X, CheckCircle, Info, AlertCircle, AlertTriangle, Loader } from 'lucide-vue-next'
import type { ToastType } from '@/composables/useToast'

const { toastQueue, remove } = useToast()
const containerRef = ref<HTMLElement | null>(null)

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'info':
      return Info
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'loading':
      return Loader
    default:
      return Info
  }
}

const handleRemove = (id: string) => {
  remove(id)
}

const ensurePopoverOnTop = () => {
  if (containerRef.value && 'showPopover' in containerRef.value) {
    // Hide and show popover to place it at the top of the top layer stack (above <dialog>)
    if (containerRef.value.matches(':popover-open')) {
      containerRef.value.hidePopover()
    }
    containerRef.value.showPopover()
  }
}

onMounted(() => {
  ensurePopoverOnTop()

  // Watch for dialog elements being opened using MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
        const target = mutation.target as HTMLDialogElement
        if (target.tagName === 'DIALOG' && target.open) {
          // Dialog was opened, re-show popover to ensure toast stays on top
          ensurePopoverOnTop()
        }
      }
    }
  })

  // Observe all dialog elements in the document
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['open'],
    subtree: true,
  })

  // Cleanup observer on unmount
  onUnmounted(() => {
    observer.disconnect()
  })
})
</script>

<style scoped lang="scss">
@use '@/assets/css/mixins.scss' as mixins;

.lc-container {
  position: fixed;
  top: unset;
  left: unset;
  bottom: var(--space-4);
  right: var(--space-4);
  width: min(400px, calc(100vw - var(--space-4) * 2));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  pointer-events: none;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  overflow: visible;
}

.lc-toast {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface2);
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  transition: transform var(--duration-fast) ease-out;

  &--success {
    border-left: 3px solid var(--color-success);
    .lc-icon {
      color: var(--color-success);
    }
  }

  &--info {
    .lc-icon {
      color: var(--color-fg);
    }
  }

  &--error {
    border-left: 3px solid var(--color-danger);
    .lc-icon {
      color: var(--color-danger);
    }
  }

  &--warning {
    border-left: 3px solid var(--color-warning);
    .lc-icon {
      color: var(--color-warning);
    }
  }

  &--loading {
    .lc-icon {
      color: var(--color-fg);
      animation: spin 1.6s linear infinite;
    }
  }
}

.lc-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lc-message {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-fg);
  word-break: break-word;
}

.lc-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  cursor: pointer;
  transition: all var(--duration-fast) ease-out;

  @include mixins.responsive-hover {
    background: var(--color-surface);
    color: var(--color-fg);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// TransitionGroup animations
.lc-toast {
  &-enter-active,
  &-leave-active {
    transition:
      opacity var(--duration-normal) ease-out,
      transform var(--duration-normal) ease-out;
  }

  &-enter-from {
    opacity: 0;
    transform: translateX(100%);
  }

  &-leave-to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }

  &-move {
    transition: transform var(--duration-normal) ease-out;
  }
}
</style>
