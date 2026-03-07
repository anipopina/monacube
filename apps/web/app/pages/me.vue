<template>
  <div>
    <h2 class="gc-page-title"><Birdhouse class="gc-icon gc-icon--title" /> {{ authUser?.address }}</h2>
    <section class="gc-section-framed">
      <div class="gc-actions gc-actions--left">
        <UiButton :disabled="isLoading" :iconRight="Wallet" @click="openWalletModal">ウォレット</UiButton>
      </div>
      <hr />
      <div class="gc-actions gc-actions--right">
        <UiButton :disabled="isLoading" :iconRight="LogOut" @click="managedLogout">Logout</UiButton>
      </div>
    </section>

    <section v-if="profileUser" class="gc-section-framed lc-profile">
      <div class="lc-profile-head">
        <img v-if="userIconUrl" class="lc-user-icon" :src="userIconUrl" :alt="`${profileUser.name} icon`" loading="eager" />
        <UiColoredAddrIcon v-else :address="profileUser.userId" :size="72" :radius="12" />
        <div class="lc-profile-texts">
          <h3 class="lc-user-name">{{ profileUser.name }}</h3>
          <p class="lc-user-id">{{ profileUser.userId }}</p>
        </div>
      </div>

      <p class="lc-user-bio">{{ profileUser.bio || '自己紹介はまだ設定されていません。' }}</p>
    </section>

    <section class="gc-section-framed lc-artworks-section">
      <div class="lc-section-header">
        <h3>Artworks</h3>
        <p v-if="profileUser" class="lc-count">{{ userWorks.length }} works</p>
      </div>
      <div class="gc-actions gc-actions--stack">
        <UiButton :disabled="isLoading" :iconRight="ImagePlus" @click="onClickNewArtworkButton" variant="primary">
          作品を投稿する
        </UiButton>
      </div>

      <div v-if="userWorks.length" class="lc-works-grid">
        <NuxtLink v-for="work in userWorks" :key="work.workId" :to="`/works/${work.workId}`" class="lc-work-tile" :title="work.title">
          <img :src="toThumbUrl(work.workId)" :alt="work.title" loading="lazy" />
        </NuxtLink>
      </div>

      <p v-else-if="!isLoading" class="lc-empty">投稿作品はまだありません。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Birdhouse, Wallet, ImagePlus, LogOut } from 'lucide-vue-next'
import { openWalletModalKey, managedLogoutKey } from '@/lib/injectionKeys'
import { getHttpErrorStatusCode, workImageUrl } from '@/lib/util'

const managedLogout = inject(managedLogoutKey)
const openWalletModal = inject(openWalletModalKey)

const router = useRouter()
const { user: authUser, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()
const runtimeConfig = useRuntimeConfig()

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const meUserId = computed(() => (authUser.value?.address || '').trim())

const { data, error, refresh } = await useAsyncData(
  () => `me-${meUserId.value}`,
  async () => {
    return api.getUser(meUserId.value)
  },
  { immediate: false },
)

const profileUser = computed(() => data.value?.user)
const userWorks = computed(() => data.value?.userWorks ?? [])
const userIconUrl = computed(() => {
  if (!profileUser.value?.iconKey) return ''
  return `${runtimeConfig.public.imgBase}/${profileUser.value.iconKey}`
})

const setup = () => {
  if (!authUser.value) router.push('/')
  watch(authUser, (newUser) => {
    if (!newUser) router.push('/')
  })
}

watch(
  meUserId,
  async (value) => {
    if (value) await refresh()
  },
  { immediate: true },
)

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value))
  },
  { immediate: true },
)

const onClickNewArtworkButton = () => {
  router.push('/works/new')
}

function toThumbUrl(workId: string): string {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb')
}

function toNuxtError(error: unknown) {
  const statusCode = getHttpErrorStatusCode(error)
  if (statusCode === 404) {
    return createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (statusCode) {
    return createError({ statusCode, statusMessage: 'Failed to load my profile' })
  }
  if (error instanceof Error) {
    return createError({ statusCode: 500, statusMessage: error.message })
  }
  return createError({ statusCode: 500, statusMessage: 'Unknown error' })
}

setup()
</script>

<style lang="scss" scoped>
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

.lc-artworks-section {
  margin-block: var(--space-4);
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
  overflow: hidden;
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
