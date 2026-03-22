<!-- Checkbox Component -->
<!--
Usage:
<UiCheckbox v-model="isChecked" label="利用規約に同意する" />
<UiCheckbox v-model="isChecked" :disabled="isLoading" />
-->

<template>
  <label class="lc-checkbox" :class="{ 'lc-checkbox--disabled': disabled }">
    <input
      type="checkbox"
      class="lc-input"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label || ariaLabel"
      @change="handleChange"
    />
    <span class="lc-box" aria-hidden="true">
      <svg class="lc-check" viewBox="0 0 16 16" focusable="false">
        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
      </svg>
    </span>
    <span v-if="label" class="lc-label">{{ label }}</span>
    <slot v-else />
  </label>
</template>

<script setup lang="ts">
type Props = {
  modelValue: boolean
  disabled?: boolean
  label?: string
  ariaLabel?: string
}

type Emits = {
  'update:modelValue': [value: boolean]
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
  ariaLabel: '',
})

const emit = defineEmits<Emits>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<style lang="scss" scoped>
@use '@/assets/css/mixins' as mixins;

.lc-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  transition: opacity var(--duration-fast) var(--ease-out);

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.lc-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;

  &:focus-visible + .lc-box {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:checked + .lc-box {
    background: var(--color-primary-surface);
    border-color: var(--color-primary);

    .lc-check {
      opacity: 1;
      transform: scale(1);
    }
  }

  &:disabled + .lc-box {
    cursor: not-allowed;
  }
}

.lc-box {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-inputborder);
  border-radius: var(--radius-sm);
  background: var(--color-surface2);
  transition:
    background-color var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out),
    filter var(--duration-fast) var(--ease-out);

  @include mixins.responsive-hover {
    .lc-checkbox:not(.lc-checkbox--disabled) & {
      filter: var(--filter-hover);
    }
  }
}

.lc-check {
  width: 12px;
  height: 12px;
  color: var(--color-primary-fg);
  opacity: 0;
  transform: scale(0.85);
  transition:
    opacity var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);

  path {
    fill: none;
    stroke: currentcolor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.lc-label {
  font-size: var(--font-size-md);
  color: var(--color-fg);
}
</style>
