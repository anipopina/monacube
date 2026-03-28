<template>
  <div class="gc-works-grid">
    <slot name="prepend" />
    <NuxtLink v-for="work in works" :key="work.workId" :to="`/works/${work.workId}`" class="gc-work-tile" :title="work.title">
      <div class="lc-thumb-stack">
        <img
          v-if="placeholderDataUrlMap[thumbImageKey(work)] && !isThumbLoaded(work)"
          class="lc-thumb-image lc-thumb-image--placeholder"
          :src="placeholderDataUrlMap[thumbImageKey(work)]"
          alt=""
          aria-hidden="true"
        />
        <img
          class="lc-thumb-image lc-thumb-image--main"
          :class="{ 'is-loaded': isThumbLoaded(work) }"
          :src="toThumbUrl(work.workId, work.updatedAt)"
          :alt="work.title"
          loading="lazy"
          @load="onThumbLoad(work)"
        />
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { workImageUrl } from '@/lib/util'
import type { WorkRecord } from '@shared/ddbRecord'

const props = defineProps<{
  works: WorkRecord[]
}>()

const runtimeConfig = useRuntimeConfig()
const { thumbHashBase64ToDataUrl } = useBlurHash()
const loadedThumbKeys = ref<Set<string>>(new Set())

const toThumbUrl = (workId: string, cacheBuster: string): string => {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb', cacheBuster)
}

const thumbImageKey = (work: WorkRecord): string => {
  return `${work.workId}:${work.updatedAt}`
}

const isThumbLoaded = (work: WorkRecord): boolean => {
  return loadedThumbKeys.value.has(thumbImageKey(work))
}

const onThumbLoad = (work: WorkRecord): void => {
  const key = thumbImageKey(work)
  if (loadedThumbKeys.value.has(key)) return
  const next = new Set(loadedThumbKeys.value)
  next.add(key)
  loadedThumbKeys.value = next
}

const placeholderDataUrlMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const work of props.works) {
    map[thumbImageKey(work)] = thumbHashBase64ToDataUrl(work.thumbBHash ?? '')
  }
  return map
})
</script>

<style lang="scss" scoped>
.lc-thumb-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.lc-thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lc-thumb-image--placeholder {
  position: absolute;
  inset: 0;
}

.lc-thumb-image--main {
  position: relative;
  visibility: hidden;

  &.is-loaded {
    visibility: visible;
  }
}
</style>
