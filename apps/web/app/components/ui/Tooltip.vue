<!-- Tooltip Component -->
<!-- usage
  <UiTooltip position="top|bottom|left|right">
    <YourTriggerElement />
    <template #tip>
      Tooltip content goes here.
    </template>
  </UiTooltip>
-->

<template>
  <div ref="wrapperRef" class="lc-wrapper" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <div class="lc-trigger" @click="handleClick">
      <slot></slot>
    </div>
    <Transition name="lc-tooltip-fade">
      <div v-if="isVisible" :class="['lc-tooltip', `lc-tooltip--${position}`]" role="tooltip">
        <slot name="tip"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { CSS_TOKENS } from '@/lib/util'

interface Props {
  position?: 'top' | 'bottom' | 'left' | 'right'
}

withDefaults(defineProps<Props>(), {
  position: 'top',
})

const wrapperRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
const hideTimer = ref<number | null>(null) // Timer for auto-hide on mobile
const isMobile = ref(false)

const handleMouseEnter = () => {
  if (isMobile.value) return
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
  isVisible.value = true
}

const handleMouseLeave = () => {
  if (isMobile.value) return
  isVisible.value = false
}

const handleClick = () => {
  if (!isMobile.value) return
  isVisible.value = !isVisible.value

  // Auto-hide after 3 seconds on mobile
  if (isVisible.value) {
    if (hideTimer.value) clearTimeout(hideTimer.value)
    hideTimer.value = window.setTimeout(() => {
      isVisible.value = false
    }, CSS_TOKENS['--duration-tooltip'])
  }
}

// Click outside to close on mobile
const handleClickOutside = (event: MouseEvent) => {
  if (!isMobile.value || !isVisible.value) return
  const target = event.target as HTMLElement
  if (wrapperRef.value && !wrapperRef.value.contains(target)) {
    isVisible.value = false
  }
}

onMounted(() => {
  // Simple mobile detection
  isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (hideTimer.value) clearTimeout(hideTimer.value)
})
</script>

<style scoped lang="scss">
.lc-wrapper {
  position: relative;
  display: inline-block;
  z-index: var(--z-base);
}

.lc-trigger {
  display: inline-flex;
  cursor: help;
}

.lc-tooltip {
  position: absolute;
  padding: var(--space-2) var(--space-3);
  background: rgb(from var(--color-surface2) r g b / 90%);
  color: var(--color-fg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);

  &--top {
    bottom: calc(100% + var(--space-2));
    left: 50%;
    transform: translateX(-50%);
  }

  &--bottom {
    top: calc(100% + var(--space-2));
    left: 50%;
    transform: translateX(-50%);
  }

  &--left {
    right: calc(100% + var(--space-2));
    top: 50%;
    transform: translateY(-50%);
  }

  &--right {
    left: calc(100% + var(--space-2));
    top: 50%;
    transform: translateY(-50%);
  }
}

// Vue Transition Styles
.lc-tooltip-fade-enter-active,
.lc-tooltip-fade-leave-active {
  transition:
    opacity var(--duration-fast) ease-out,
    transform var(--duration-fast) ease-out;
}

.lc-tooltip-fade-enter-from,
.lc-tooltip-fade-leave-to {
  opacity: 0;

  .lc-tooltip--top &,
  .lc-tooltip--bottom & {
    transform: translateX(-50%) scale(0.95);
  }

  .lc-tooltip--left &,
  .lc-tooltip--right & {
    transform: translateY(-50%) scale(0.95);
  }
}
</style>
