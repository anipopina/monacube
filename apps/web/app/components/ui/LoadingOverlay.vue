<template>
  <Transition name="lc-overlay">
    <div v-if="show" class="lc-overlay" role="status" aria-label="Loading">
      <div class="lc-spinner" aria-hidden="true" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ show: boolean }>(), {
  show: false,
})
</script>

<style lang="scss" scoped>
.lc-overlay {
  position: absolute;
  inset: 0;
  // z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(from var(--color-bg) r g b / 50%);
  backdrop-filter: blur(5px);
}

.lc-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgb(from var(--color-fg) r g b / 20%);
  border-top-color: var(--color-fg);
  animation: lc-spin 0.7s linear infinite;
}

@keyframes lc-spin {
  to {
    transform: rotate(360deg);
  }
}

// Transition
.lc-overlay-enter-active,
.lc-overlay-leave-active {
  // transition: opacity var(--duration-normal) var(--ease-out);
  transition: opacity 10s var(--ease-out);
}

.lc-overlay-enter-from,
.lc-overlay-leave-to {
  opacity: 0;
}
</style>
