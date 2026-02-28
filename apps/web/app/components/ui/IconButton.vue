<!-- IconButton Component -->
<!--
アイコンはコンポーネントで渡す
lucideを使う例:
import { Settings } from 'lucide-vue-next' → <UiIconButton :icon="Settings" aria-label="Settings" />
-->

<template>
  <button
    class="lc-iconbutton"
    :class="[`lc-iconbutton--variant-${variant}`, `lc-iconbutton--size-${size}`]"
    :disabled="disabled"
    :type="type"
    :aria-label="ariaLabel"
  >
    <component :is="icon" class="lc-icon" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
type IconButtonVariant = 'secondary' | 'primary' | 'text' | 'danger'
type IconButtonSize = 'small' | 'medium' | 'large'

type Props = {
  icon: Component
  ariaLabel: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'medium',
  disabled: false,
  type: 'button',
})
</script>

<style lang="scss" scoped>
@use '@/assets/css/mixins' as mixins;

.lc-iconbutton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 100px; // pill shape
  border: 1px solid transparent;
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  user-select: none;
  cursor: pointer;
  transition:
    background-color var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out),
    color var(--duration-normal) var(--ease-out),
    filter var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);

  // states
  @include mixins.responsive-hover {
    &:not(:disabled) {
      filter: var(--filter-hover);
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.92);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // variations
  &--size {
    &-small {
      width: 32px;
      height: 32px;
      font-size: var(--font-size-sm);
    }
    &-medium {
      width: 36px;
      height: 36px;
      font-size: var(--font-size-lg);
    }
    &-large {
      width: 42px;
      height: 42px;
      font-size: var(--font-size-2xl);
    }
  }

  &--variant {
    &-primary {
      background: var(--color-primary);
      color: var(--color-primary-fg);
      border-color: var(--color-border);
      @include mixins.responsive-hover {
        &:not(:disabled) {
          filter: var(--filter-hover-backlight);
        }
      }
    }
    &-secondary {
      background: var(--color-surface2);
      color: var(--color-fg);
      border-color: var(--color-border);
    }
    &-text {
      background: transparent;
      color: var(--color-fg);
      border-color: transparent;
      @include mixins.responsive-hover {
        &:not(:disabled) {
          filter: var(--filter-hover-opacity);
        }
      }
    }
    &-danger {
      background: var(--color-surface);
      color: var(--color-danger);
      border-color: var(--color-danger);
      @include mixins.responsive-hover {
        &:not(:disabled) {
          background: var(--color-danger);
          color: var(--color-danger-fg);
        }
      }
    }
  }
}

// elements
.lc-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
