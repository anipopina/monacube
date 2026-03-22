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
        <div class="lc-meta-row">
          <dt>Content Type</dt>
          <dd>{{ work.normalized ? 'image/webp (normalized)' : work.uploadCType }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="work" class="gc-section-noframe lc-work-actions">
      <div class="gc-actions gc-actions--left">
        <UiButton :iconRight="ExternalLink" @click="openOriginalImage"> View Original </UiButton>
        <UiButton v-if="isOwner" variant="danger" :iconRight="Trash2" @click="deleteWork"> Delete Artwork </UiButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink, Trash2 } from 'lucide-vue-next'
import { toNuxtError, formatBytes, formatIsoDate, workImageUrl } from '@/lib/util'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()
const api = useApi()
const runtimeConfig = useRuntimeConfig()
const { user: authUser } = useWalletAuth()
const workId = computed(() => String(route.params.workId || '').trim())

const { data, error } = await useAsyncData(
  () => `work-${workId.value}`,
  async () => {
    if (!workId.value) {
      throw createError({ statusCode: 404 })
    }
    return api.getWork(workId.value)
  },
  { watch: [workId] },
)

const work = computed(() => {
  console.log('work:', data.value?.work)
  return data.value?.work
})
const isOwner = computed(() => authUser.value?.address === work.value?.ownerId)
const workOriginalImageUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'original', work.value.updatedAt)
})
const workLargeImageUrl = computed(() => {
  if (!work.value) return ''
  return workImageUrl(runtimeConfig.public.imgBase, work.value.workId, 'large', work.value.updatedAt)
})
const isUnder1MB = computed(() => {
  if (!work.value) return false
  return work.value.bytes <= 1024 * 1024
})

const openOriginalImage = () => {
  if (!workOriginalImageUrl.value) return
  window.open(workOriginalImageUrl.value, '_blank')
}

const deleteWork = async () => {
  if (!(await confirm('この作品を削除してもよろしいですか？\nこの操作は元に戻せません', { okVariant: 'danger' }))) return
  try {
    await api.deleteWork(workId.value)
    toast.success('作品を削除しました')
    router.push(`/me`)
  } catch (error) {
    console.error('Artwork deletion failed:', error)
    toast.error('作品の削除に失敗しました')
  }
}

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value, { 0: 'Failed to load artwork detail', 404: 'Artwork not found' }))
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
@use '@/assets/css/tokens' as tokens;

.lc-work-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lc-work-meta {
  margin-top: var(--space-8);
}

.lc-work-actions {
  margin-top: var(--space-6);
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
