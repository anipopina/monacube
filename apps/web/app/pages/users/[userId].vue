<template>
  <div>
    <h2 class="gc-page-title"><User class="gc-icon gc-icon--title" /> {{ userId }}</h2>
    <section class="gc-section-framed">
      <p>User ID: {{ userId }}</p>
      <p><NuxtLink :to="`/users/MXXXXXXXXXXXXX`">Invalid User Test</NuxtLink></p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next'
import { validateAddress } from '@/lib/monawallet'

const route = useRoute()
const userId = computed(() => String(route.params.userId))

const { error } = await useAsyncData(
  () => `user-${userId.value}`,
  async () => {
    // 本来はサーバからユーザ情報を取得する処理が入るが、とりあえずURLのパラメータからユーザIDを取得して表示する
    if (!validateAddress(userId.value)) {
      throw createError({ status: 404, statusText: 'User not found' })
    }
    return { id: userId.value }
  },
  { watch: [userId] },
)

if (error.value) showError(error.value) // Nuxtに登録されるのでwatchによる再実行でもちゃんと反映される
</script>
