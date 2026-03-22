<template>
  <div>
    <h2 class="gc-page-title">{{ doc.title }}</h2>

    <section class="gc-section-noframe">
      <p class="gc-page-meta">Version: {{ doc.version }} / Effective: {{ doc.effectiveAt }}</p>
    </section>

    <section v-for="section in doc.sections" :key="section.title" class="gc-section-noframe">
      <h3 class="gc-section-title">{{ section.title }}</h3>

      <template v-for="(block, index) in section.blocks" :key="index">
        <p v-if="block.type === 'paragraph'">
          {{ block.text }}
        </p>

        <ul v-else-if="block.type === 'list'">
          <li v-for="item in block.items" :key="item">
            {{ item }}
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getCurrentPrivacy } from '@shared/legal/privacy'

const doc = getCurrentPrivacy()
if (!doc) throw createError({ statusCode: 404, statusMessage: 'Privacy document not found' })
</script>

<style lang="scss" scoped></style>
