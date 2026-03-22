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

    <section class="lc-section-artworks">
      <div v-if="works" class="gc-works-grid">
        <NuxtLink v-for="work in works" :key="work.workId" :to="`/works/${work.workId}`" class="gc-work-tile" :title="work.title">
          <img :src="toThumbUrl(work.workId, work.updatedAt)" :alt="work.title" loading="lazy" />
        </NuxtLink>
      </div>

      <div v-else class="gc-works-loading"><UiLoadingOverlay :show="!works" /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Box, KeyRound } from 'lucide-vue-next'
import { toNuxtError, workImageUrl } from '@/lib/util'
import { managedCreatePasskeyKey, managedLoginKey } from '@/lib/injectionKeys'

const api = useApi()
const runtimeConfig = useRuntimeConfig()
const { user, isNew, isLoading: isAuthLoading } = useWalletAuth()

const managedCreatePasskey = inject(managedCreatePasskeyKey)
const managedLogin = inject(managedLoginKey)

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)

const { data, error } = useAsyncData('works-home', async () => {
  return api.getWorks()
})

const works = computed(() => data.value?.works ?? null)

const toThumbUrl = (workId: string, cacheBuster: string): string => {
  return workImageUrl(runtimeConfig.public.imgBase, workId, 'thumb', cacheBuster)
}

watch(
  error,
  (value) => {
    if (value) showError(toNuxtError(value, { 0: 'Failed to load artworks' }))
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.lc-welcome-title {
  margin-top: var(--space-3);
}

.lc-section-artworks {
  margin-block: var(--space-3);
}
</style>
