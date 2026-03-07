<template>
  <div class="lc-work-detail">
    <h2 class="gc-page-title"><Image class="gc-icon gc-icon--title" /> Artwork Detail</h2>

    <section v-if="work" class="gc-section-framed">
      <div class="lc-media-wrap">
        <picture>
          <source v-if="workMediumWebpUrl" :srcset="workMediumWebpUrl" type="image/webp" />
          <img class="lc-image" :src="workOriginalImageUrl" :alt="work.title" loading="eager" />
        </picture>
      </div>

      <h3 class="lc-title">{{ work.title }}</h3>
      <p class="lc-description">{{ work.description }}</p>

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
          <dt>File Size</dt>
          <dd>{{ formatBytes(work.bytes) }}</dd>
        </div>
      </dl>

      <div v-if="tags.length" class="lc-tags">
        <span v-for="tag in tags" :key="tag" class="lc-tag">#{{ tag }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Image } from 'lucide-vue-next'
import { formatBytes, formatIsoDate, getHttpErrorStatusCode, normalizeStringArray, workImageUrl } from '@/lib/util'

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

const work = computed(() => data.value?.work)
const workOriginalImageUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'original')
})
const workMediumWebpUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'medium')
})
const tags = computed(() => normalizeStringArray(work.value?.tags))

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value))
  },
  { immediate: true },
)

function toNuxtError(error: unknown) {
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
</script>

<style lang="scss" scoped>
.lc-work-detail {
  .gc-section-framed {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
}

.lc-media-wrap {
  display: flex;
  justify-content: center;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.lc-image {
  width: min(100%, 960px);
  height: auto;
  border-radius: var(--radius-sm);
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

.lc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.lc-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface2);
  font-size: var(--font-size-sm);
}

@media (max-width: 640px) {
  .lc-meta-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
