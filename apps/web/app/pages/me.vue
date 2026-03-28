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

    <section v-if="userRecord" class="gc-section-noframe lc-section-monabalance">
      <div class="lc-monabalance">{{ balanceStr }} <small class="lc-monabalance-unit">MONA</small></div>
      <div class="lc-monabalance-quotabar">
        <div class="lc-monabalance-usedbar" :style="{ width: `${bytesUsedPercent}%` }"></div>
      </div>
      <div class="lc-quota-text">
        <span :class="{ 'gc-danger': remainingQuotaBytes <= 0 }">{{ formatBytes(usedBytes) }}</span> / {{ formatBytes(quotaBytes) }}
      </div>
      <div class="lc-quota-text">
        ( <span :class="{ 'gc-danger': remainingQuotaCount <= 0 }">{{ usedCount }}</span> / {{ quotaCount }} works )
      </div>

      <div v-if="quotaCount === 0" class="lc-quota-notes">
        <div class="lc-quota-note">
          MonaCubeに作品を投稿するには、ウォレットにモナコインを保有する必要があります。残高{{ QUOTA_UNIT_SAT / 100_000_000 }}MONAごとに{{
            QUOTA_UNIT_BYTES / (1024 * 1024)
          }}MB/{{ QUOTA_UNIT_COUNTS }}枚の投稿ができます。
        </div>
        <div class="lc-quota-note">{{ BALANCE_REFRESH_ADVICE }}</div>
      </div>
      <div v-else-if="remainingQuotaCount === 0" class="lc-quota-notes">
        <div class="lc-quota-note">
          投稿できる作品数の上限に達しています。新しい作品を投稿するには、既存の作品を削除するか、ウォレットにモナコインを追加してください。
        </div>
        <div class="lc-quota-note">{{ BALANCE_REFRESH_ADVICE }}</div>
      </div>
      <div v-else-if="remainingQuotaBytes === 0" class="lc-quota-notes">
        <div class="lc-quota-note">
          投稿できる総データ量の上限に達しています。新しい作品を投稿するには、既存の作品を削除するか、ウォレットにモナコインを追加してください。
        </div>
        <div class="lc-quota-note">{{ BALANCE_REFRESH_ADVICE }}</div>
      </div>
      <div v-if="isQuotaExceeded" class="lc-quota-notes">
        <div class="lc-quota-note gc-danger">
          クォータの上限を超過しています。既存の作品を削除するか、ウォレットにモナコインを追加してください。
        </div>
        <div class="lc-quota-note gc-danger">クォータを超過した状態が続く場合、投稿済みの作品が自動的に削除される場合があります。</div>
        <div class="lc-quota-note">{{ BALANCE_REFRESH_ADVICE }}</div>
      </div>
    </section>

    <section v-if="userRecord" class="gc-section-framed lc-section-artworks">
      <div class="lc-section-header">
        <h3>Artworks</h3>
        <p v-if="userWorks" class="lc-count">{{ usedCount }} works</p>
      </div>

      <UiWorksGrid v-if="userWorks" :works="userWorks">
        <template #prepend>
          <a href="/works/new" class="gc-work-tile" title="Upload new artwork" @click.prevent="onClickNewWork">
            <span class="lc-new-work-inner">
              <Plus class="lc-new-work-icon" />
            </span>
          </a>
        </template>
      </UiWorksGrid>

      <div v-else class="gc-works-loading"><UiLoadingOverlay :show="!userWorks" /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Birdhouse, Wallet, Plus, LogOut } from 'lucide-vue-next'
import { getQuota, QUOTA_UNIT_SAT, QUOTA_UNIT_BYTES, QUOTA_UNIT_COUNTS } from '@shared/const'
import { openWalletModalKey, managedLogoutKey } from '@/lib/injectionKeys'
import { toNuxtError, formatBalanceSat, formatBytes } from '@/lib/util'

const BALANCE_REFRESH_ADVICE =
  '残高の更新はあんまりリアルタイムではないため、ブロックチェーンでの承認をゆっくりと待った後で更新ボタンを押してください。'

const managedLogout = inject(managedLogoutKey)
const openWalletModal = inject(openWalletModalKey)

const router = useRouter()
const toast = useToast()
const { user: authUser, isLoading: isAuthLoading, updateUserRecords } = useWalletAuth()
const api = useApi()
const runtimeConfig = useRuntimeConfig()

const meUserId = computed(() => authUser.value?.address ?? '')
const userRecord = computed(() => authUser.value?.userRecord ?? null)
const userStatsRecord = computed(() => authUser.value?.userStatsRecord ?? null)
const userIconUrl = computed(() => {
  if (!userRecord.value?.iconKey) return ''
  return `${runtimeConfig.public.imgBase}/${userRecord.value.iconKey}?cb=${userRecord.value.updatedAt}`
})
const balanceStr = computed(() => {
  if (!userStatsRecord.value) return '--'
  return formatBalanceSat(userStatsRecord.value.balanceSat)
})
const quotaBytes = computed(() => {
  if (!userStatsRecord.value) return 0
  return getQuota(userStatsRecord.value.balanceSat).bytes
})
const quotaCount = computed(() => {
  if (!userStatsRecord.value) return 0
  return getQuota(userStatsRecord.value.balanceSat).count
})
const usedBytes = computed(() => userStatsRecord.value?.totalBytes ?? 0)
const usedCount = computed(() => userStatsRecord.value?.workCount ?? 0)
const remainingQuotaBytes = computed(() => quotaBytes.value - usedBytes.value)
const remainingQuotaCount = computed(() => quotaCount.value - usedCount.value)
const isQuotaExceeded = computed(() => remainingQuotaBytes.value < 0 || remainingQuotaCount.value < 0)
const bytesUsedPercent = computed(() => {
  if (!userStatsRecord.value) return 0
  if (quotaBytes.value <= 0) {
    if (usedBytes.value > 0) return 100
    else return 0
  }
  return (usedBytes.value / quotaBytes.value) * 100
})

const { data, error, refresh } = await useAsyncData(
  () => `me-${meUserId.value}`,
  async () => {
    if (!meUserId.value) return null // ログアウト時のundefinedアクセスを防止
    const data = await api.getUser(meUserId.value, { includeUserStats: true })
    updateUserRecords({
      userRecord: data.user,
      ...(data.userStats ? { userStatsRecord: data.userStats } : {}),
    })
    return data
  },
  { immediate: false }, // call refresh() manually
)

const userWorks = computed(() => data.value?.userWorks ?? null)

const onClickNewWork = () => {
  if (remainingQuotaCount.value <= 0 || remainingQuotaBytes.value <= 0) {
    toast.warning('投稿クォータが不足しています。既存の作品を削除するか、ウォレットにモナコインを追加してください。', 10_000)
    toast.info(BALANCE_REFRESH_ADVICE, 10_000)
    return
  }
  router.push('/works/new')
}

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
    if (value) showError(toNuxtError(value, { 0: 'Failed to load user profile', 404: 'User not found' }))
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.lc-section-profile {
  margin-block: var(--space-6);
}

.lc-section-monabalance {
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

.lc-monabalance {
  font-size: var(--font-size-2xl);
  text-align: right;
}

.lc-monabalance-unit {
  font-size: var(--font-size-md);
}

.lc-quota-text {
  margin: 0;
  text-align: right;
  color: var(--color-muted);
  font-size: var(--font-size-sm);
}

.lc-quota-notes {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  margin-block: var(--space-3);
}

.lc-quota-note {
  margin: 0;
  margin-block: var(--space-2);
}

.lc-monabalance-quotabar {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-block: var(--space-1);
}

.lc-monabalance-usedbar {
  height: 20px;
  background-color: var(--color-primary);
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
</style>
