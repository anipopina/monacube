<!-- Switch Component -->
<!--
Usage:
<UiSwitch v-model="isSwitchOn" label="Switch for something" />
<UiSwitch v-model="isSwitchOn" @update:modelValue="handleSwitchUpdate" />
-->

<template>
  <label class="lc-switch" :class="{ 'lc-switch--disabled': disabled }">
    <input
      type="checkbox"
      class="lc-input"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label || ariaLabel"
    />
    <span class="lc-track">
      <span class="lc-thumb" />
    </span>
    <span v-if="label" class="lc-label">{{ label }}</span>
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

.lc-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
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

  &:focus-visible + .lc-track {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:checked + .lc-track {
    background: var(--color-primary-surface);

    .lc-thumb {
      transform: translateX(20px);
    }
  }

  &:disabled + .lc-track {
    cursor: not-allowed;
  }
}

.lc-track {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 100px;
  transition:
    background-color var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out);

  @include mixins.responsive-hover {
    .lc-switch:not(.lc-switch--disabled) & {
      filter: var(--filter-hover);
    }
  }
}

.lc-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--color-fg-surface);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-normal) var(--ease-out);
}

.lc-label {
  font-size: var(--font-size-md);
  color: var(--color-fg);
}
</style>
