<template>
  <div>
    <h2 class="gc-page-title"><Birdhouse class="gc-icon gc-icon--title" /> {{ authUser?.address }}</h2>

    <section v-if="userRecord" class="gc-section-noframe lc-section-profile">
      <div class="lc-profile-head">
        <img v-if="userIconUrl" class="lc-user-icon" :src="userIconUrl" :alt="`${userRecord.name} icon`" loading="eager" />
        <UiColoredAddrIcon v-else :address="userRecord.userId" :size="72" :radius="6" />
        <div class="lc-profile-texts">
          <h3 class="lc-user-name">{{ userRecord.name }}</h3>
          <p class="lc-user-bio">{{ userRecord.bio || 'プロフィールの設定機能はまだ実装してません' }}</p>
        </div>
      </div>
    </section>

    <section class="gc-section-noframe">
      <div class="gc-actions gc-actions--left">
        <UiButton :disabled="isAuthLoading" :iconRight="Wallet" @click="openWalletModal">ウォレット</UiButton>
        <UiButton :disabled="isAuthLoading" :iconRight="LogOut" @click="managedLogout">Logout</UiButton>
      </div>
    </section>

    <section v-if="userRecord" class="gc-section-framed lc-section-artworks">
      <div class="lc-section-header">
        <h3>Artworks</h3>
        <p v-if="userWorks" class="lc-count">{{ userWorks.length }} works</p>
      </div>

      <div v-if="userWorks" class="lc-works-grid">
        <NuxtLink key="new" to="/works/new" class="lc-work-tile">
          <span class="lc-new-work-inner">
            <Plus class="lc-new-work-icon" />
          </span>
        </NuxtLink>
        <NuxtLink v-for="work in userWorks" :key="work.workId" :to="`/works/${work.workId}`" class="lc-work-tile" :title="work.title">
          <img :src="toThumbUrl(work.workId)" :alt="work.title" loading="lazy" />
        </NuxtLink>
      </div>

      <div v-else class="lc-works-loading"><UiLoadingOverlay :show="!userWorks" /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Birdhouse, Wallet, Plus, LogOut } from 'lucide-vue-next'
import { openWalletModalKey, managedLogoutKey } from '@/lib/injectionKeys'
import { getHttpErrorStatusCode, workImageUrl } from '@/lib/util'

const managedLogout = inject(managedLogoutKey)
const openWalletModal = inject(openWalletModalKey)

const router = useRouter()
const { user: authUser, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()
const runtimeConfig = useRuntimeConfig()

const meUserId = computed(() => authUser.value?.address || '')
const userRecord = computed(() => authUser.value?.userRecord)
const userIconUrl = computed(() => {
  if (!userRecord.value?.iconKey) return ''
  return `${runtimeConfig.public.imgBase}/${userRecord.value.iconKey}`
})

const { data, error, refresh } = await useAsyncData(
  () => `me-${meUserId.value}`,
  async () => {
    return api.getUser(meUserId.value)
  },
  { immediate: false },
)

const userWorks = computed(() => data.value?.userWorks ?? null)

watch(
  authUser,
  (value) => {
    if (!value) router.push('/')
  },
  { immediate: true },
)

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

const toThumbUrl = (workId: string): string => {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb')
}

const toNuxtError = (error: unknown) => {
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
  border-radius: 6px;
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

.lc-works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-1);
}

.lc-works-loading {
  position: relative;
  height: 180px;
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

.lc-new-work-inner {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  gap: var(--space-2);
  text-align: center;
  color: var(--color-muted);
  border: 3px dashed var(--color-muted);
}

.lc-new-work-icon {
  justify-self: center;
  width: 36px;
  height: 36px;
}

.lc-empty {
  margin: 0;
  color: var(--color-muted);
}

@media (max-width: tokens.$pagewidth-phone) {
  .lc-works-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  .lc-works-loading {
    height: 120px;
  }
}
</style>
