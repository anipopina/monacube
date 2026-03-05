<template>
  <div>
    <h2 class="gc-page-title"><ImagePlus class="gc-icon gc-icon--title" /> New Artwork</h2>
    <section class="gc-section-framed">
      <p>Upload your new artwork here.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const { user, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)

const setup = () => {
  if (!user.value) router.push('/')
  watch(user, (newUser) => {
    if (!newUser) router.push('/')
  })
}

setup()
</script>
