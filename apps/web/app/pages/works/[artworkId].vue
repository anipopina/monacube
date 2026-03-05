<template>
  <div>
    <h2 class="gc-page-title">Artwork Detail</h2>
    <section class="gc-section-framed">
      <p>Artwork ID: {{ artworkId }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const artworkId = computed(() => String(route.params.artworkId))

const { error } = await useAsyncData(
  () => `artwork-${artworkId.value}`,
  async () => {
    // 本来はサーバからartwork情報を取得する処理が入るが、とりあえずURLのパラメータからartwork IDを取得して表示する
    if (!artworkId.value) {
      throw createError({ status: 404, statusText: 'Artwork not found' })
    }
    return { id: artworkId.value }
  },
  { watch: [artworkId] },
)

if (error.value) showError(error.value) // Nuxtに登録されるのでwatchによる再実行でもちゃんと反映される
</script>
