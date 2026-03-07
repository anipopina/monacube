<template>
  <div>
    <h2 class="gc-page-title"><ImagePlus class="gc-icon gc-icon--title" /> New Artwork</h2>
    <section class="gc-section-framed lc-upload-section">
      <UiLoadingOverlay :show="isLoading" />

      <p>画像・タイトル・説明を入力して投稿できます。</p>

      <form class="lc-upload-form" @submit.prevent="submitArtwork">
        <label class="lc-field">
          <span class="lc-field-label">Image</span>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" :disabled="isLoading" @change="onChangeFile" />
          <small class="lc-field-help"> JPEG / PNG / WEBP, max {{ Math.floor(WORK_IMAGE_MAX_BYTES / (1024 * 1024)) }}MB </small>
        </label>

        <div v-if="previewUrl" class="lc-preview-wrap">
          <img :src="previewUrl" alt="Selected image preview" class="lc-preview" />
        </div>

        <label class="lc-field">
          <span class="lc-field-label">Title</span>
          <input v-model.trim="title" type="text" :maxlength="WORK_TITLE_MAX_LENGTH" placeholder="作品タイトル" :disabled="isLoading" />
          <small class="lc-field-help">{{ title.length }} / {{ WORK_TITLE_MAX_LENGTH }}</small>
        </label>

        <label class="lc-field">
          <span class="lc-field-label">Description</span>
          <textarea
            v-model.trim="description"
            :maxlength="WORK_DESCRIPTION_MAX_LENGTH"
            rows="6"
            placeholder="作品の説明"
            :disabled="isLoading"
          />
          <small class="lc-field-help">{{ description.length }} / {{ WORK_DESCRIPTION_MAX_LENGTH }}</small>
        </label>

        <label class="lc-field">
          <span class="lc-field-label">Tags</span>
          <input v-model="tagsText" type="text" placeholder="例: pixel, mona, animation" :disabled="isLoading" @blur="normalizeTagsInput" />
          <small class="lc-field-help">カンマ区切り。最大 {{ WORK_TAG_MAX_COUNT }} 個、各 {{ WORK_TAG_MAX_LENGTH }} 文字まで。</small>
        </label>

        <div v-if="normalizedTags.length" class="lc-tags">
          <span v-for="tag in normalizedTags" :key="tag" class="lc-tag">#{{ tag }}</span>
        </div>

        <div class="gc-actions gc-actions--right">
          <UiButton type="button" :disabled="isLoading" @click="resetForm">Clear</UiButton>
          <UiButton type="submit" variant="primary" :disabled="!canSubmit || isLoading">Upload Artwork</UiButton>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'
import {
  WORK_DESCRIPTION_MAX_LENGTH,
  WORK_IMAGE_ALLOWEDCONTENTTYPES,
  WORK_IMAGE_MAX_BYTES,
  WORK_TAG_MAX_COUNT,
  WORK_TAG_MAX_LENGTH,
  WORK_TITLE_MAX_LENGTH,
} from '@shared/const'

const router = useRouter()
const toast = useToast()
const { user, isLoading: isAuthLoading } = useWalletAuth()
const api = useApi()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const title = ref('')
const description = ref('')
const tagsText = ref('')

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const normalizedTags = computed(() => parseTags(tagsText.value))
const canSubmit = computed(() => {
  return Boolean(selectedFile.value) && title.value.length > 0 && description.value.length > 0
})

const setup = () => {
  if (!user.value) router.push('/')
  watch(user, (newUser) => {
    if (!newUser) router.push('/')
  })
}

const onChangeFile = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) {
    selectedFile.value = null
    clearPreview()
    return
  }

  if (!WORK_IMAGE_ALLOWEDCONTENTTYPES.includes(file.type.toLowerCase())) {
    toast.error('対応していない画像形式です')
    target.value = ''
    selectedFile.value = null
    clearPreview()
    return
  }
  if (file.size <= 0 || file.size > WORK_IMAGE_MAX_BYTES) {
    toast.error(`画像サイズが不正です（最大 ${Math.floor(WORK_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`)
    target.value = ''
    selectedFile.value = null
    clearPreview()
    return
  }

  selectedFile.value = file
  clearPreview()
  previewUrl.value = URL.createObjectURL(file)
}

const submitArtwork = async () => {
  if (!selectedFile.value) {
    toast.error('画像を選択してください')
    return
  }
  if (!title.value) {
    toast.error('タイトルを入力してください')
    return
  }
  if (!description.value) {
    toast.error('説明を入力してください')
    return
  }
  if (title.value.length > WORK_TITLE_MAX_LENGTH) {
    toast.error('タイトルが長すぎます')
    return
  }
  if (description.value.length > WORK_DESCRIPTION_MAX_LENGTH) {
    toast.error('説明が長すぎます')
    return
  }
  if (normalizedTags.value.length > WORK_TAG_MAX_COUNT) {
    toast.error('タグ数が上限を超えています')
    return
  }

  isActionLoading.value = true
  toast.loading('作品をアップロード中です', isActionLoading)

  try {
    const file = selectedFile.value
    const init = await api.postWorksUploadsInit({
      contentType: file.type,
      declaredBytes: file.size,
    })

    const uploadRes = await fetch(init.uploadUrl, {
      method: init.method,
      headers: {
        ...init.headers,
      },
      body: file,
    })
    if (!uploadRes.ok) {
      throw new Error(`upload_failed_${uploadRes.status}`)
    }

    const finalized = await api.postWorksUploadsFinalize({
      uploadId: init.uploadId,
      title: title.value,
      description: description.value,
      tags: normalizedTags.value,
    })

    toast.success('作品を投稿しました')
    await router.push(`/works/${finalized.work.workId}`)
  } catch (error) {
    console.error('Artwork upload failed:', error)
    toast.error('作品アップロードに失敗しました')
  } finally {
    isActionLoading.value = false
  }
}

const resetForm = () => {
  title.value = ''
  description.value = ''
  tagsText.value = ''
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  clearPreview()
}

const normalizeTagsInput = () => {
  tagsText.value = normalizedTags.value.join(', ')
}

function parseTags(raw: string): string[] {
  const source = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  const unique = new Set<string>()
  for (const tag of source) {
    if (tag.length > WORK_TAG_MAX_LENGTH) continue
    unique.add(tag)
    if (unique.size >= WORK_TAG_MAX_COUNT) break
  }
  return [...unique]
}

function clearPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

onBeforeUnmount(() => {
  clearPreview()
})

setup()
</script>

<style lang="scss" scoped>
.lc-upload-section {
  position: relative;
}

.lc-upload-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.lc-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lc-field-label {
  font-weight: var(--font-weight-medium);
}

.lc-field-help {
  color: var(--color-muted);
}

.lc-preview-wrap {
  display: flex;
  justify-content: center;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.lc-preview {
  max-height: 320px;
  width: auto;
  border-radius: var(--radius-sm);
}

.lc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.lc-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface2);
  font-size: var(--font-size-sm);
}
</style>
