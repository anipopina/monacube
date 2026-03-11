<template>
  <div>
    <section v-if="isNew && !user" class="gc-section-framed">
      <h2 class="lc-welcome-title"><Box class="gc-icon gc-icon--title" /> Welcome to Monacube</h2>
      <section class="gc-section-surfaced">
        <h3>STEP1. Passkey を登録</h3>
        <p>未登録の方はブラウザやデバイスに新しい Passkey を登録してください</p>
        <div class="gc-actions gc-actions--left">
          <UiButton @click="managedCreatePasskey" :disabled="isLoading" variant="primary" size="large" :iconRight="KeyRound">
            Create Passkey
          </UiButton>
        </div>
      </section>
      <section class="gc-section-surfaced">
        <h3>STEP2. ウォレットを開いてログイン</h3>
        <p>Passkey から生成したウォレットでログインします</p>
        <div class="gc-actions gc-actions--left">
          <UiButton @click="managedLogin" :disabled="isLoading" variant="primary" size="large" :iconRight="KeyRound"> Login </UiButton>
        </div>
      </section>
    </section>

    <section v-if="works" class="lc-section-artworks">
      <div class="lc-works-grid">
        <NuxtLink v-for="work in works" :key="work.workId" :to="`/works/${work.workId}`" class="lc-work-tile" :title="work.title">
          <img :src="toThumbUrl(work.workId)" :alt="work.title" loading="lazy" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Box, KeyRound } from 'lucide-vue-next'
import { getHttpErrorStatusCode, workImageUrl } from '@/lib/util'
import { managedCreatePasskeyKey, managedLoginKey } from '@/lib/injectionKeys'

const api = useApi()
const runtimeConfig = useRuntimeConfig()
const { user, isLoading: isAuthLoading } = useWalletAuth()
const { isNew } = useAuth()

const managedCreatePasskey = inject(managedCreatePasskeyKey)
const managedLogin = inject(managedLoginKey)

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)

const { data, error } = await useAsyncData('works-home', async () => {
  return api.getWorks()
})

const works = computed(() => data.value?.works ?? [])

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
  if (statusCode) {
    return createError({ statusCode, statusMessage: 'Failed to load artworks' })
  }
  if (error instanceof Error) {
    return createError({ statusCode: 500, statusMessage: error.message })
  }
  return createError({ statusCode: 500, statusMessage: 'Unknown error' })
}
</script>

<style lang="scss" scoped>
.lc-welcome-title {
  margin-top: var(--space-3);
}

.lc-section-artworks {
  margin-block: var(--space-3);
}

.lc-works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
</style>
