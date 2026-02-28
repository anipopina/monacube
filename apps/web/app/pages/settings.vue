<template>
  <div>
    <h2 class="gc-page-title"><Settings class="gc-icon gc-icon--title" /> Settings</h2>
    <section class="gc-section-framed">
      <h3>Appearance</h3>
      <div class="lc-settings-group">
        <div class="lc-setting-item">
          <div class="lc-setting-info">
            <div class="lc-setting-label">Dark Mode</div>
            <div class="lc-setting-description">Toggle between light and dark theme</div>
          </div>
          <UiSwitch :modelValue="isDark" @update:modelValue="toggleDarkMode" />
        </div>
        <div class="lc-setting-item">
          <div class="lc-setting-info">
            <div class="lc-setting-label">Auto (Follow System)</div>
            <div class="lc-setting-description">Automatically match your system preference</div>
          </div>
          <UiSwitch :modelValue="isAuto" @update:modelValue="toggleAutoMode" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'

const { colorMode, isDark, setColorMode } = useColorMode()

const isAuto = computed(() => colorMode.value === 'auto')

const toggleDarkMode = (value: boolean) => {
  setColorMode(value ? 'dark' : 'light')
}

const toggleAutoMode = (value: boolean) => {
  if (value) {
    setColorMode('auto')
  } else {
    // When turning off auto, set to current actual state
    setColorMode(isDark.value ? 'dark' : 'light')
  }
}
</script>

<style lang="scss" scoped>
.lc-settings-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-block: var(--space-4);
}

.lc-setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.lc-setting-info {
  flex: 1;
}

.lc-setting-label {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  margin-bottom: var(--space-1);
}

.lc-setting-description {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
</style>
