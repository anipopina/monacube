<template>
  <div class="lc-hamburgermenu">
    <!-- ハンバーガーボタン -->
    <button
      class="lc-hamburger"
      :class="{ 'lc-hamburger-active': isOpen }"
      :aria-label="isOpen ? 'Close menu' : 'Open menu'"
      :aria-expanded="isOpen"
      aria-controls="hamburger-menupanel"
      type="button"
      @click="toggleMenu"
    >
      <span class="lc-hamburger-box">
        <span class="lc-hamburger-inner"></span>
      </span>
    </button>

    <!-- オーバーレイ -->
    <Transition name="lc-overlay">
      <div v-if="isOpen" class="lc-overlay" @click="closeMenu"></div>
    </Transition>

    <!-- メニューパネル -->
    <Transition name="lc-slide">
      <nav v-if="isOpen" id="hamburger-menupanel" class="lc-panel" @click="onMenuClick">
        <slot />
      </nav>
    </Transition>
  </div>
</template>

<script setup lang="ts">
type Props = {
  modelValue?: boolean
  closeOnClick?: boolean // メニュー内のクリックで閉じるか
}

type Emits = {
  'update:modelValue': [value: boolean]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  closeOnClick: true,
})

const emit = defineEmits<Emits>()

const isOpen = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    isOpen.value = newVal
  },
)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
  emit('update:modelValue', isOpen.value)
}

const closeMenu = () => {
  isOpen.value = false
  emit('update:modelValue', false)
}

const onMenuClick = (event: MouseEvent) => {
  if (props.closeOnClick) {
    if (event.target === event.currentTarget) return
    closeMenu()
  }
}

// Escキーで閉じる
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style lang="scss" scoped>
@use '@/assets/css/mixins.scss' as mixins;

.lc-hamburgermenu {
  position: relative;
}
// オーバーレイ（背景）
.lc-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 50%);
  backdrop-filter: blur(2px);
  z-index: var(--z-overlay);
}

// メニューパネル
.lc-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(300px, 80vw);
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-modal);
  overflow-y: auto;
  // 内容のスタイル調整
  padding: 72px var(--space-5) 0 var(--space-5);
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-relaxed);
  flex-direction: column;
  color: var(--color-muted);
}

.lc-hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: var(--space-2);
  background: var(--color-surface2);
  color: var(--color-fg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  z-index: calc(var(--z-modal) + 1); // メニューより前面に
  transition:
    background-color var(--duration-normal) var(--ease-out),
    border-color var(--duration-normal) var(--ease-out),
    color var(--duration-normal) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out),
    filter var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out);

  @include mixins.responsive-hover {
    filter: var(--filter-hover);
  }
  &:active {
    transform: scale(0.95);
  }

  &-box {
    width: 24px;
    height: 24px;
    display: inline-block;
    position: relative;
  }

  // inner本体とbefore/afterで3本線を表現
  &-inner {
    display: block;
    top: 50%;
    margin-top: -1px;

    &,
    &::before,
    &::after {
      width: 24px;
      height: 2px;
      background-color: var(--color-fg);
      border-radius: 2px;
      position: absolute;
      transition:
        transform var(--duration-normal) var(--ease-out),
        opacity var(--duration-normal) var(--ease-out);
    }

    &::before,
    &::after {
      content: '';
      display: block;
    }

    &::before {
      top: -8px;
    }

    &::after {
      bottom: -8px;
    }
  }

  // active state (×マークに変形)
  &-active {
    .lc-hamburger-inner {
      transform: rotate(45deg);

      &::before {
        top: 0;
        opacity: 0;
      }

      &::after {
        bottom: 0;
        transform: rotate(-90deg);
      }
    }
  }
}

// Vue transition styles
.lc-slide {
  &-enter-active,
  &-leave-active {
    transition: transform var(--duration-normal) ease-out;
  }
  &-enter-from {
    transform: translateX(100%);
  }
  &-leave-to {
    transform: translateX(100%);
  }
}

.lc-overlay {
  &-enter-active,
  &-leave-active {
    transition: opacity var(--duration-normal) ease-out;
  }
  &-enter-from,
  &-leave-to {
    opacity: 0;
  }
}
</style>
