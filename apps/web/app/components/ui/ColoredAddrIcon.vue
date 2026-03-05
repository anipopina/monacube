<template>
  <div
    :class="['lc-coloredaddr', { 'lc-coloredaddr--clickable': clickable }]"
    :style="{ width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px` }"
  >
    <span v-for="(color, i) in colors" :key="i" :style="{ backgroundColor: color }" />
  </div>
</template>

<script setup lang="ts">
type Props = {
  address: string
  size?: number
  radius?: number
  clickable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  address: 'MMMMMM',
  size: 32,
  radius: 3.2,
  clickable: false,
})

const mod = (n: number, m: number) => ((n % m) + m) % m
const hash = (addr: string): number => {
  let hash = 0
  for (let i = 0; i < addr.length; i++) {
    hash = addr.charCodeAt(i) + ((hash << 5) - hash)
  }
  return hash
}
const colorFrom = (seed: string) => {
  const h = hash(seed)

  const hue = mod(h, 360)
  // 0..1 の擬似乱数を2つ作る（hを少し崩す）
  const r1 = mod(h >>> 0, 1000) / 1000
  const r2 = mod((h * 1103515245 + 12345) >>> 0, 1000) / 1000

  const sat = Math.round(60 + r1 * 30) // 60..90
  const light = Math.round(30 + r2 * 30) // 30..60

  return `hsl(${hue} ${sat}% ${light}%)`
}

const addr = props.address
const colors = [
  colorFrom(addr.slice(0, 2)),
  colorFrom(addr.slice(2, 4)),
  colorFrom(addr.slice(4, 6)),
  colorFrom(addr.slice(6, 8)),
  colorFrom(addr.slice(8, 10)),
  colorFrom(addr.slice(10, 12)),
  colorFrom(addr.slice(12, 14)),
  colorFrom(addr.slice(14, 16)),
]
</script>

<style lang="scss" scoped>
@use '@/assets/css/mixins' as mixins;

.lc-coloredaddr {
  display: inline-flex;
  overflow: hidden;
  flex-shrink: 0;
  vertical-align: middle;

  span {
    flex: 1;
    height: 100%;
  }

  &--clickable {
    cursor: pointer;
    transition:
      filter var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);

    @include mixins.responsive-hover {
      filter: var(--filter-hover-backlight);
    }
    &:active {
      transform: translateY(1px);
    }
  }
}

// light mode adjustments
[data-color-mode='light'] {
  .lc-coloredaddr {
    filter: contrast(50%) saturate(300%);
    &--clickable {
      @include mixins.responsive-hover {
        filter: var(--filter-hover);
      }
    }
  }
}
</style>
