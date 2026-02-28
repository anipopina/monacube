<template>
  <div class="lc-wrapper">
    <header ref="headerRef" class="lc-header" :class="{ 'lc-header--hidden': isHidden }">
      <div class="lc-container">
        <div class="lc-logo">
          <slot name="logo" />
        </div>
        <nav class="lc-nav">
          <slot name="nav" />
        </nav>
        <div class="lc-actions">
          <slot name="actions" />
        </div>
      </div>
    </header>
    <div ref="spacerRef" class="lc-spacer" />
  </div>
</template>

<script setup lang="ts">
type Props = {
  fixed?: boolean
  transparent?: boolean
}

withDefaults(defineProps<Props>(), {
  fixed: false,
  transparent: false,
})

const headerRef = ref<HTMLElement | null>(null)
const spacerRef = ref<HTMLElement | null>(null)
const isHidden = ref(false)
let lastScrollY = 0
const scrollThreshold = 20 // スクロール方向判定の閾値

const updateSpacerHeight = () => {
  if (headerRef.value && spacerRef.value) {
    const height = headerRef.value.offsetHeight
    spacerRef.value.style.height = `${height}px`
  }
}

const handleScroll = () => {
  const currentScrollY = window.scrollY
  // スクロール量が閾値以下の場合は処理しない
  if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
    return
  }
  // 下スクロール時はヘッダーを隠す、上スクロール時は表示
  isHidden.value = currentScrollY > lastScrollY && currentScrollY > 100
  lastScrollY = currentScrollY
}

onMounted(() => {
  lastScrollY = window.scrollY
  window.addEventListener('scroll', handleScroll, { passive: true })

  // 初回のスペーサー高さ設定
  updateSpacerHeight()

  // ヘッダーの高さが変わった時に対応
  if (headerRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateSpacerHeight()
    })
    resizeObserver.observe(headerRef.value)

    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="scss" scoped>
.lc-header {
  position: fixed;
  top: 0;
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  z-index: var(--z-header);
  transition: transform var(--duration-normal) ease-out;

  &--hidden {
    transform: translateY(-100%);
  }
}

.lc-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  max-width: var(--pagewidth-max);
  margin: 0 auto;
  padding: var(--space-4) var(--space-5);
}

.lc-logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-medium);
}

.lc-nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--color-muted);
  // justify-content: center; // 中央寄せ
}

.lc-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.lc-wrapper {
  position: relative;
}

.lc-spacer {
  // Height is set dynamically via JavaScript
  height: calc(var(--space-4) * 2);
}
</style>
