<template>
  <div :class="['lc-coloredaddr', { 'lc-coloredaddr--clickable': clickable }]">
    <span :style="{ color: colors[0] }">{{ address.charAt(0) }}</span
    ><span :style="{ color: colors[1] }">{{ address.charAt(1) }}</span
    ><span :style="{ color: colors[2] }">{{ address.charAt(2) }}</span
    ><span :style="{ color: colors[3] }">{{ address.charAt(3) }}</span
    ><span :style="{ color: colors[4] }">{{ address.charAt(4) }}</span
    ><span :style="{ color: colors[5] }">{{ address.charAt(5) }}</span>
  </div>
</template>

<script setup lang="ts">
type Props = {
  address: string
  clickable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  address: 'MMMMMM',
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

  const sat = Math.round(65 + r1 * 30) // 65..95
  const light = Math.round(60 + r2 * 20) // 60..80

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
]
</script>

<style lang="scss" scoped>
@use '@/assets/css/mixins' as mixins;

.lc-coloredaddr {
  display: inline-block;
  padding: 0 6px;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-normal);
  text-shadow: 0 0 1px rgb(0 0 0 / 100%);

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
    text-shadow: 0 0 1px rgb(255 255 255 / 100%);
    filter: contrast(50%) saturate(300%);
    &--clickable {
      @include mixins.responsive-hover {
        filter: var(--filter-hover);
      }
    }
  }
}
</style>
