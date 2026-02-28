<template>
  <div>
    <h2 class="gc-page-title">Item {{ itemID }}</h2>
    <section class="gc-section-framed">
      <p>This page will be displayed at the /items/[item_id]</p>
    </section>
    <section class="gc-section-framed">
      <h2>H2 Title</h2>
      <p>
        あのイーハトーヴォのすきとおった風、夏でも底に冷たさをもつ青いそら、うつくしい森で飾られたモリーオ市、郊外のぎらぎらひかる草の波。
      </p>
      <p>これは2つ目のPブロック</p>
      <section class="gc-section-framed">
        <h3>H3 Title</h3>
        <p>Pブロックのサンプル</p>
        <section class="gc-section-surfaced">
          <h4>H4 Title</h4>
          <p>Pブロックのサンプル</p>
        </section>
      </section>
    </section>
    <div class="gc-section-noframe">
      <h2>H2 Title</h2>
      <p>Pブロックのサンプル</p>
      <p>これは2つ目のPブロック</p>
    </div>
    <div class="gc-section-noframe">
      <h3>H3 Title</h3>
      <p>Pブロックのサンプル</p>
    </div>
    <div class="gc-section-noframe">
      <h4>H4 Title</h4>
      <p>Pブロックのサンプル</p>
    </div>

    <section class="gc-section-framed">
      <h2>Toast</h2>
      <div class="gc-actions gc-actions--left">
        <UiButton @click="showToastSuccess('何かに成功しました')">Success Toast</UiButton>
        <UiButton @click="showToastInfo('ここに何かしらの情報を表示します')">Info Toast</UiButton>
        <UiButton @click="showToastError('何かしらのエラーが発生しました')">Error Toast</UiButton>
        <UiButton @click="showToastWarning('何かしらの警告')">Warning Toast</UiButton>
      </div>
      <div class="gc-actions gc-actions--left">
        <UiButton @click="toggleToastLoading('何かをロードしています')">Loading Toast</UiButton>
      </div>
      <div class="gc-actions gc-actions--left">
        <UiButton
          @click="
            showToastSuccess(
              'LongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongLong Message',
            )
          "
          >Long Long Long Toast</UiButton
        >
      </div>
    </section>

    <section class="gc-section-framed">
      <h2>Confirmation</h2>
      <div class="gc-actions gc-actions--left">
        <UiButton @click="confirm('Are you sure?')">Confirm</UiButton>
      </div>
    </section>

    <section class="gc-section-framed">
      <h2>Tooltip</h2>
      <div class="gc-actions gc-actions--left">
        <UiTooltip position="bottom">
          <UiButton>bottom tooltip</UiButton>
          <template #tip> tooltip </template>
        </UiTooltip>
        <UiTooltip position="top">
          <UiButton>top tooltip</UiButton>
          <template #tip> tooltip </template>
        </UiTooltip>
      </div>
    </section>

    <section class="gc-section-framed">
      <h2>Inputs</h2>
      <section class="gc-section-framed">
        <div class="gc-actions gc-actions--stack">
          <input type="text" placeholder="Text Input" />
          <textarea placeholder="Textarea"></textarea>
        </div>
        <div class="gc-actions gc-actions--left">
          <UiSwitch v-model="isSwitchOn" label="Switch Label" />
        </div>
      </section>
      <section class="gc-section-surfaced">
        <div class="gc-actions gc-actions--stack">
          <input type="text" placeholder="Text Input" />
          <textarea placeholder="Textarea"></textarea>
        </div>
        <div class="gc-actions gc-actions--left">
          <UiSwitch v-model="isSwitchOn" label="Switch Label" />
        </div>
      </section>
    </section>

    <section class="gc-section-framed">
      <h2>Buttons</h2>
      <div>
        <div class="gc-actions gc-actions--left">
          <UiButton variant="primary">Click Me</UiButton>
          <UiButton variant="secondary">Click Me</UiButton>
          <UiButton variant="text">Click Me</UiButton>
          <UiButton variant="danger">Click Me</UiButton>
        </div>
        <section class="gc-section-surfaced">
          <div class="gc-actions gc-actions--left">
            <UiButton variant="primary">Click Me</UiButton>
            <UiButton variant="secondary">Click Me</UiButton>
            <UiButton variant="text">Click Me</UiButton>
            <UiButton variant="danger">Click Me</UiButton>
          </div>
        </section>
        <div class="gc-actions gc-actions--center">
          <UiButton variant="primary" disabled>Click Me</UiButton>
          <UiButton variant="secondary" disabled>Click Me</UiButton>
          <UiButton variant="text" disabled>Click Me</UiButton>
          <UiButton variant="danger" disabled>Click Me</UiButton>
        </div>
        <hr />
        <div class="gc-actions gc-actions--right">
          <UiButton size="large">Click Me</UiButton>
          <UiButton size="medium">Click Me</UiButton>
          <UiButton size="small">Click Me</UiButton>
        </div>
        <div class="gc-actions">
          <UiButton variant="primary" size="large" :iconLeft="Settings">Click Me</UiButton>
          <UiButton variant="primary" size="medium" :iconRight="Settings">Click Me</UiButton>
          <UiButton variant="primary" size="small" :iconRight="Settings">Click Me</UiButton>
        </div>
        <hr class="gc-in-section-fullwidth" />
        <div class="gc-actions gc-actions--stack">
          <UiButton variant="primary" :iconLeft="Settings">Click Me</UiButton>
          <UiButton variant="secondary">Click Me</UiButton>
          <UiButton variant="text">Click Me</UiButton>
          <UiButton variant="danger" :iconRight="Settings">Click Me</UiButton>
        </div>
        <div class="gc-actions gc-actions--center">
          <UiIconButton variant="primary" :icon="Settings" ariaLabel="Settings" />
          <UiIconButton variant="secondary" :icon="Settings" ariaLabel="Settings" />
          <UiIconButton variant="text" :icon="Settings" ariaLabel="Settings" />
          <UiIconButton variant="danger" :icon="Settings" ariaLabel="Settings" />
        </div>
        <div class="gc-actions gc-actions--center">
          <UiIconButton variant="primary" :icon="Settings" ariaLabel="Settings" size="small" />
          <UiIconButton variant="secondary" :icon="Settings" ariaLabel="Settings" size="small" />
          <UiIconButton variant="text" :icon="Settings" ariaLabel="Settings" size="small" />
          <UiIconButton variant="danger" :icon="Settings" ariaLabel="Settings" size="small" />
        </div>
        <div class="gc-actions gc-actions--center">
          <UiIconButton variant="primary" :icon="Settings" ariaLabel="Settings" size="large" />
          <UiIconButton variant="secondary" :icon="Settings" ariaLabel="Settings" size="large" />
          <UiIconButton variant="text" :icon="Settings" ariaLabel="Settings" size="large" />
          <UiIconButton variant="danger" :icon="Settings" ariaLabel="Settings" size="large" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'

const route = useRoute()
const { confirm } = useConfirm()
const toast = useToast()

const isToastLoading = ref(false)
const isSwitchOn = ref(false)

const itemID = route.params.item_id

const showToastSuccess = (message: string) => {
  toast.success(message)
}
const showToastInfo = (message: string) => {
  toast.info(message)
}
const showToastError = (message: string) => {
  toast.error(message)
}
const showToastWarning = (message: string) => {
  toast.warning(message)
}
const toggleToastLoading = (message: string) => {
  if (isToastLoading.value) {
    isToastLoading.value = false
    return
  }
  isToastLoading.value = true
  toast.loading(message, isToastLoading)
}
</script>
