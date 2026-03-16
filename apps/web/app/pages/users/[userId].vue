<template>
  <div>
    <h2 class="gc-page-title"><User class="gc-icon gc-icon--title" /> {{ userRecord?.userId }}</h2>

    <section v-if="userRecord" class="gc-section-noframe lc-section-profile">
      <div class="lc-profile-head">
        <img v-if="userIconUrl" class="lc-user-icon" :src="userIconUrl" :alt="`${userRecord.name} icon`" loading="eager" />
        <UiColoredAddrIcon v-else :address="userRecord.userId" :size="72" :radius="12" />
        <div class="lc-profile-texts">
          <h3 class="lc-user-name">{{ userRecord.name }}</h3>
          <p class="lc-user-bio">{{ userRecord.bio }}</p>
        </div>
      </div>
    </section>

    <section v-if="userRecord" class="gc-section-framed lc-section-artworks">
      <div class="lc-section-header">
        <h3>Artworks</h3>
        <p v-if="userWorks" class="lc-count">{{ userWorks.length }} works</p>
      </div>

      <div v-if="userWorks?.length" class="gc-works-grid">
        <NuxtLink v-for="work in userWorks" :key="work.workId" :to="`/works/${work.workId}`" class="gc-work-tile" :title="work.title">
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

const userRecord = computed(() => data.value?.user)
const userWorks = computed(() => data.value?.userWorks ?? null)
const userIconUrl = computed(() => {
  if (!userRecord.value?.iconKey) return ''
  return `${runtimeConfig.public.imgBase}/${userRecord.value.iconKey}`
})

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value))
  },
  { immediate: true },
)

const toThumbUrl = (workId: string): string => {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb')
}

const toNuxtError = (error: unknown) => {
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
@use '@/assets/css/tokens' as tokens;

.lc-section-profile {
  margin-block: var(--space-6);
}

.lc-section-artworks {
  margin-block: var(--space-6);
  padding-block: var(--space-4) var(--space-5);
}

.lc-profile-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-5);
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
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lc-user-name {
  margin: 0;
}

.lc-user-bio {
  margin: 0;
  color: var(--color-muted);
}

.lc-section-header {
  display: flex;
  align-items: flex-end;
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
  font-size: var(--font-size-md);
}

.lc-empty {
  margin: 0;
  color: var(--color-muted);
}
</style>
