<template>
  <div class="lc-user-page">
    <h2 class="gc-page-title"><User class="gc-icon gc-icon--title" /> User Profile</h2>

    <section v-if="user" class="gc-section-framed lc-profile">
      <div class="lc-profile-head">
        <img v-if="userIconUrl" class="lc-user-icon" :src="userIconUrl" :alt="`${user.name} icon`" loading="eager" />
        <UiColoredAddrIcon v-else :address="user.userId" :size="72" :radius="12" />
        <div class="lc-profile-texts">
          <h3 class="lc-user-name">{{ user.name }}</h3>
          <p class="lc-user-id">{{ user.userId }}</p>
        </div>
      </div>

      <p class="lc-user-bio">{{ user.bio || '自己紹介はまだ設定されていません。' }}</p>
    </section>

    <section v-if="user" class="gc-section-framed">
      <div class="lc-section-header">
        <h3>Artworks</h3>
        <p class="lc-count">{{ userWorks.length }} works</p>
      </div>

      <div v-if="userWorks.length" class="lc-works-grid">
        <NuxtLink v-for="work in userWorks" :key="work.workId" :to="`/works/${work.workId}`" class="lc-work-tile" :title="work.title">
          <img :src="toThumbUrl(work.workId)" :alt="work.title" loading="lazy" />
        </NuxtLink>
      </div>

      <p v-else class="lc-empty">投稿作品はまだありません。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next'
import { getHttpErrorStatusCode, workImageUrl } from '@/lib/util'
import { validateAddress } from '@/lib/monawallet'

const route = useRoute()
const api = useApi()
const runtimeConfig = useRuntimeConfig()
const userId = computed(() => String(route.params.userId || '').trim())

const { data, error } = await useAsyncData(
  () => `user-${userId.value}`,
  async () => {
    if (!validateAddress(userId.value)) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    return api.getUser(userId.value)
  },
  { watch: [userId] },
)

const user = computed(() => data.value?.user)
const userWorks = computed(() => data.value?.userWorks ?? [])
const userIconUrl = computed(() => {
  if (!user.value?.iconKey) return ''
  return `${runtimeConfig.public.imgBase}/${user.value.iconKey}`
})

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value))
  },
  { immediate: true },
)

function toThumbUrl(workId: string): string {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb')
}

function toNuxtError(error: unknown) {
  const statusCode = getHttpErrorStatusCode(error)
  if (statusCode === 404) {
    return createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (statusCode) {
    return createError({ statusCode, statusMessage: 'Failed to load user profile' })
  }
  if (error instanceof Error) {
    return createError({ statusCode: 500, statusMessage: error.message })
  }
  return createError({ statusCode: 500, statusMessage: 'Unknown error' })
}
</script>

<style lang="scss" scoped>
.lc-user-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lc-profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lc-profile-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lc-user-icon {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.lc-profile-texts {
  min-width: 0;
}

.lc-user-name {
  margin: 0;
}

.lc-user-id {
  margin: var(--space-1) 0 0;
  color: var(--color-muted);
  overflow-wrap: anywhere;
}

.lc-user-bio {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
}

.lc-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);

  h3 {
    margin: 0;
  }
}

.lc-count {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-size-sm);
}

.lc-works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-1);
}

.lc-work-tile {
  aspect-ratio: 1 / 1;
  display: block;
  // border-radius: var(--radius-md);
  overflow: hidden;
  // border: 1px solid var(--color-border);
  background: var(--color-surface);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.lc-empty {
  margin: 0;
  color: var(--color-muted);
}

@media (max-width: 640px) {
  .lc-works-grid {
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  }
}
</style>
