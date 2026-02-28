<template>
  <button class="lc-button" :class="[`lc-button--variant-${variant}`, `lc-button--size-${size}`]" :disabled="disabled" :type="type">
    <!-- left icon -->
    <component v-if="iconLeft" :is="iconLeft" class="lc-icon lc-icon--left" aria-hidden="true" />

    <span class="lc-label">
      <slot />
    </span>

    <!-- right icon -->
    <component v-if="iconRight" :is="iconRight" class="lc-icon lc-icon--right" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
type ButtonVariant = 'secondary' | 'primary' | 'text' | 'danger'
type ButtonSize = 'small' | 'medium' | 'large'

type Props = {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  iconLeft?: Component
  iconRight?: Component
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

.lc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
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
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // variations

  &--size {
    &-small {
      padding: 6px 10px;
      font-size: var(--font-size-sm);
    }
    &-medium {
      padding: 8px 14px;
      font-size: var(--font-size-md);
    }
    &-large {
      padding: 10px 18px;
      font-size: var(--font-size-lg);
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

.lc-label {
  display: inline-block;
}

.lc-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  &--left {
    margin-left: -0.1em;
  }
  &--right {
    margin-right: -0.1em;
  }
}
</style>
