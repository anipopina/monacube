<template>
  <div>
    <h2 class="gc-page-title"><ImagePlus class="gc-icon gc-icon--title" /> New Artwork</h2>
    <section class="gc-section-noframe lc-upload-section">
      <form class="lc-upload-form" @submit.prevent="submitArtwork">
        <div class="lc-field">
          <span class="lc-field-label">Image *</span>
          <div
            class="lc-dropzone"
            :class="{ 'is-dragover': isDragOver, 'is-disabled': isLoading }"
            @click.stop="openFileDialog"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDropFile"
          >
            <p class="lc-dropzone-title">Drag & Drop image here</p>
            <p class="lc-dropzone-sub">or click to select file</p>
            <input
              ref="fileInput"
              class="lc-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              :disabled="isLoading"
              @change="onChangeFile"
            />
          </div>
          <small class="lc-field-help"> JPEG / PNG / WEBP, max {{ WORK_IMAGE_MAX_BYTES / (1024 * 1024) }} MB </small>
        </div>

        <div v-if="previewUrl" class="lc-preview-wrap">
          <img :src="previewUrl" alt="Selected image preview" class="lc-preview" />
        </div>

        <label class="lc-field">
          <span class="lc-field-label">Title *</span>
          <input v-model.trim="title" type="text" :maxlength="WORK_TITLE_MAX_LENGTH" placeholder="作品タイトル" :disabled="isLoading" />
          <small class="lc-field-help">{{ title.length }} / {{ WORK_TITLE_MAX_LENGTH }}</small>
        </label>

        <label class="lc-field">
          <span class="lc-field-label">Description</span>
          <textarea
            v-model.trim="description"
            :maxlength="WORK_DESCRIPTION_MAX_LENGTH"
            rows="6"
            placeholder="作品の説明文"
            :disabled="isLoading"
          />
          <small class="lc-field-help">{{ description.length }} / {{ WORK_DESCRIPTION_MAX_LENGTH }}</small>
        </label>

        <div class="gc-actions gc-actions--right">
          <!-- <UiButton type="button" :disabled="isLoading" @click="resetForm">Clear</UiButton> -->
          <UiButton type="submit" variant="primary" :disabled="!canSubmit || isLoading">Upload Artwork</UiButton>
        </div>
      </form>

      <div class="lc-notes">
        <p class="lc-note">
          MonaCubeでは投稿画像をできるだけ未変換で保存しますが、表示は適宜最適化されます。ページ上に投稿画像をそのまま表示したい場合は、画像サイズを{{
            WORK_IMAGE_SHOWORIGINAL_MAX_BYTES / (1024 * 1024)
          }}MB以下にしてください。
        </p>
        <p class="lc-note">
          Web表示に不適または個人に繋がる可能性のあるメタデータを含む画像は、サイズによらず変換してから保存されます。クォータ消費量も変換後の画像サイズで計算されます。
        </p>
      </div>

      <UiLoadingOverlay :show="isLoading" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'
import {
  WORK_DESCRIPTION_MAX_LENGTH,
  WORK_IMAGE_ALLOWEDCONTENTTYPES,
  WORK_IMAGE_MAX_BYTES,
  WORK_IMAGE_MAX_HEIGHT,
  WORK_IMAGE_MAX_WIDTH,
  WORK_TITLE_MAX_LENGTH,
  WORK_IMAGE_MIN_WIDTH,
  WORK_IMAGE_MIN_HEIGHT,
  WORK_IMAGE_SHOWORIGINAL_MAX_BYTES,
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
const isDragOver = ref(false)
const dragDepth = ref(0)

const isActionLoading = ref(false)
const isLoading = computed(() => isAuthLoading.value || isActionLoading.value)
const canSubmit = computed(() => {
  return Boolean(selectedFile.value) && title.value.length > 0
})

const getImageResolution = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const width = image.naturalWidth
      const height = image.naturalHeight
      URL.revokeObjectURL(objectUrl)
      resolve({ width, height })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('invalid_image'))
    }

    image.src = objectUrl
  })
}

const openFileDialog = () => {
  if (isLoading.value) return
  fileInput.value?.click()
}

const selectFile = async (file: File, targetToReset?: HTMLInputElement | null): Promise<boolean> => {
  const clearSelection = () => {
    if (targetToReset) targetToReset.value = ''
    selectedFile.value = null
    clearPreview()
  }

  if (!WORK_IMAGE_ALLOWEDCONTENTTYPES.includes(file.type.toLowerCase())) {
    toast.error('対応していない画像形式です')
    clearSelection()
    return false
  }

  if (file.size <= 0 || file.size > WORK_IMAGE_MAX_BYTES) {
    toast.error(`画像サイズが不正です（最大 ${Math.floor(WORK_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`)
    clearSelection()
    return false
  }

  try {
    const { width, height } = await getImageResolution(file)
    if (width < WORK_IMAGE_MIN_WIDTH || height < WORK_IMAGE_MIN_HEIGHT) {
      toast.error(`画像解像度が不正です（最小 ${WORK_IMAGE_MIN_WIDTH} x ${WORK_IMAGE_MIN_HEIGHT}px）`)
      clearSelection()
      return false
    }
    if (width > WORK_IMAGE_MAX_WIDTH || height > WORK_IMAGE_MAX_HEIGHT) {
      toast.error(`画像解像度が不正です（最大 ${WORK_IMAGE_MAX_WIDTH} x ${WORK_IMAGE_MAX_HEIGHT}px）`)
      clearSelection()
      return false
    }
  } catch {
    toast.error('画像の読み込みに失敗しました')
    clearSelection()
    return false
  }

  selectedFile.value = file
  clearPreview()
  previewUrl.value = URL.createObjectURL(file)
  return true
}

const onChangeFile = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) {
    selectedFile.value = null
    clearPreview()
    return
  }
  await selectFile(file, target)
}

const onDragEnter = () => {
  if (isLoading.value) return
  dragDepth.value += 1
  isDragOver.value = true
}

const onDragOver = () => {
  if (isLoading.value) return
  isDragOver.value = true
}

const onDragLeave = () => {
  if (isLoading.value) return
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDragOver.value = false
  }
}

const onDropFile = async (event: DragEvent) => {
  if (isLoading.value) return
  dragDepth.value = 0
  isDragOver.value = false

  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  await selectFile(file, fileInput.value)
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
  if (title.value.length > WORK_TITLE_MAX_LENGTH) {
    toast.error('タイトルが長すぎます')
    return
  }
  if (description.value.length > WORK_DESCRIPTION_MAX_LENGTH) {
    toast.error('説明文が長すぎます')
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

// const resetForm = () => {
//   title.value = ''
//   description.value = ''
//   selectedFile.value = null
//   if (fileInput.value) fileInput.value.value = ''
//   clearPreview()
// }

const clearPreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

onBeforeUnmount(() => {
  clearPreview()
})

watch(
  user,
  (value) => {
    if (!value) router.push('/')
  },
  { immediate: true },
)
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

.lc-dropzone {
  border: 3px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  min-height: 132px;
  display: grid;
  place-content: center;
  gap: var(--space-1);
  text-align: center;
  padding: var(--space-4);
  cursor: pointer;
}

.lc-dropzone.is-dragover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
}

.lc-dropzone.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lc-dropzone-title {
  margin: 0;
  font-weight: var(--font-weight-medium);
}

.lc-dropzone-sub {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}

.lc-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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

.lc-notes {
  margin-block: var(--space-4);
}

.lc-note {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  margin-block: var(--space-3);
}
</style>
