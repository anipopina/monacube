<template>
  <div>
    <section v-if="work" class="gc-section-noframe">
      <div class="lc-media-wrap">
        <picture>
          <source v-if="workLargeImageUrl && !isUnder1MB" :srcset="workLargeImageUrl" type="image/webp" />
          <img class="lc-image" :src="workOriginalImageUrl" :alt="work.title" loading="eager" />
        </picture>
      </div>
    </section>

    <section v-if="work" class="gc-section-noframe lc-work-info">
      <h3 class="lc-title">{{ work.title }}</h3>
      <p v-if="work.description" class="lc-description">{{ work.description }}</p>
    </section>

    <section v-if="work" class="gc-section-noframe lc-work-meta">
      <dl class="lc-meta-list">
        <div class="lc-meta-row">
          <dt>Artwork ID</dt>
          <dd>{{ work.workId }}</dd>
        </div>
        <div class="lc-meta-row">
          <dt>Owner</dt>
          <dd>
            <NuxtLink :to="`/users/${work.ownerId}`">{{ work.ownerId }}</NuxtLink>
          </dd>
        </div>
        <div class="lc-meta-row">
          <dt>Created</dt>
          <dd>{{ formatIsoDate(work.createdAt) }}</dd>
        </div>
        <div class="lc-meta-row">
          <dt>Updated</dt>
          <dd>{{ formatIsoDate(work.updatedAt) }}</dd>
        </div>
        <div class="lc-meta-row">
          <dt>Dimensions</dt>
          <dd>{{ work.width }} x {{ work.height }} px</dd>
        </div>
        <div class="lc-meta-row">
          <dt>Original Size</dt>
          <dd>{{ formatBytes(work.bytes) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="work" class="gc-section-noframe lc-work-actions">
      <div class="gc-actions gc-actions--left">
        <UiButton variant="secondary" :iconRight="ExternalLink" @click="openOriginalImage"> View Original </UiButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { formatBytes, formatIsoDate, getHttpErrorStatusCode, workImageUrl } from '@/lib/util'

const route = useRoute()
const api = useApi()
const runtimeConfig = useRuntimeConfig()
const workId = computed(() => String(route.params.workId || '').trim())

const { data, error } = await useAsyncData(
  () => `work-${workId.value}`,
  async () => {
    if (!workId.value) {
      throw createError({ statusCode: 404, statusMessage: 'Artwork not found' })
    }
    return api.getWork(workId.value)
  },
  { watch: [workId] },
)

const work = computed(() => {
  console.log('work:', data.value?.work)
  return data.value?.work
})
const workOriginalImageUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'original')
})
const workLargeImageUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'large')
})
const isUnder1MB = computed(() => {
  if (!work.value) return false
  return work.value.bytes <= 1024 * 1024
})

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value))
  },
  { immediate: true },
)

const toNuxtError = (error: unknown) => {
  const statusCode = getHttpErrorStatusCode(error)
  if (statusCode === 404) {
    return createError({ statusCode: 404, statusMessage: 'Artwork not found' })
  }
  if (statusCode) {
    return createError({ statusCode, statusMessage: 'Failed to load artwork detail' })
  }
  if (error instanceof Error) {
    return createError({ statusCode: 500, statusMessage: error.message })
  }
  return createError({ statusCode: 500, statusMessage: 'Unknown error' })
}

const openOriginalImage = () => {
  if (!workOriginalImageUrl.value) return
  window.open(workOriginalImageUrl.value, '_blank')
}
</script>

<style lang="scss" scoped>
@use '@/assets/css/tokens' as tokens;

.lc-work-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lc-work-meta {
  padding-top: var(--space-5);
}

.lc-work-actions {
}

.lc-media-wrap {
  display: flex;
  justify-content: center;
  padding: var(--space-6) 0;
}

.lc-image {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.lc-title {
  margin: 0;
}

.lc-description {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
}

.lc-meta-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lc-meta-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--space-2);

  dt {
    font-weight: var(--font-weight-medium);
    color: var(--color-muted);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

@media (max-width: tokens.$pagewidth-phone) {
  .lc-meta-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
