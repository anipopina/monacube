<template>
  <div>
    <h2 class="gc-page-title"><Birdhouse class="gc-icon gc-icon--title" /> {{ user?.address }}</h2>
    <section class="gc-section-framed">
      <div class="gc-actions gc-actions--left">
        <UiButton :disabled="isLoading" :iconRight="Wallet" @click="openWalletModal">ウォレット</UiButton>
      </div>
      <hr />
      <div class="gc-actions gc-actions--right">
        <UiButton :disabled="isLoading" :iconRight="LogOut" @click="managedLogout">Logout</UiButton>
      </div>
    </section>
    <section class="gc-section-framed">
      <h3>Artworks</h3>
      <div class="gc-actions gc-actions--stack">
        <UiButton :disabled="isLoading" :iconRight="ImagePlus" @click="onClickNewArtworkButton" variant="primary">
          作品を投稿する
        </UiButton>
      </div>
      <div class="lc-artwork-list">
        <article v-for="artwork in artworks" :key="artwork.id" class="lc-artwork-item">
          <img :src="artwork.imageUrl" :alt="artwork.title" />
          <h4>{{ artwork.title }}</h4>
          <p>{{ artwork.description }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Birdhouse, Wallet, ImagePlus, LogOut } from 'lucide-vue-next'
import { openWalletModalKey, managedLogoutKey } from '@/lib/injectionKeys'
const managedLogout = inject(managedLogoutKey)
const openWalletModal = inject(openWalletModalKey)

const router = useRouter()
const toast = useToast()
const { user, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const artworks = ref<Artwork[]>([])

const setup = () => {
  if (!user.value) router.push('/')
  watch(user, (newUser) => {
    if (!newUser) router.push('/')
  })

  // 本来はサーバから自分の作品一覧を取得して表示する
  // とりあえずダミーのデータを表示するために配列を初期化
  artworks.value = [
    {
      id: 1,
      title: '作品A',
      description: 'これは作品Aです',
      imageUrl: 'https://monacharat-img.komikikaku.com/A15965408931790364585_320.png',
    },
    {
      id: 2,
      title: '作品B',
      description: 'これは作品Bです',
      imageUrl: 'https://monacharat-img.komikikaku.com/A15965408931790364585_320.png',
    },
    {
      id: 3,
      title: '作品C',
      description: 'これは作品Cです',
      imageUrl: 'https://monacharat-img.komikikaku.com/A15965408931790364585_320.png',
    },
  ]
}

const tryApi = async () => {
  // 仮メソッド
  isActionLoading.value = true
  toast.loading('サーバと通信中', isActionLoading)
  try {
    const response = await api.postPrivateApiSample()
    toast.success(`API Response: ${JSON.stringify(response)}`)
  } catch (error) {
    console.error('API call failed:', error)
    toast.error('API call failed. Check console for details.')
  } finally {
    isActionLoading.value = false
  }
}

const onClickNewArtworkButton = () => {
  router.push('/works/new')
}

interface Artwork {
  id: number
  title: string
  description: string
  imageUrl: string
}

setup()
</script>

<style lang="scss" scoped>
.lc-artwork-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-block: var(--space-4);
}
.lc-artwork-item {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
</style>
