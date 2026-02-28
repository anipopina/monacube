# Web Application

Nuxt 3 + TypeScript + SCSS を使用したフロントエンドアプリケーション。

## 技術スタック

- **Framework**: Nuxt 3 (SSR無効)
- **Language**: TypeScript
- **Styling**: SCSS + CSS Variables
- **Icons**: lucide-vue-next
- **State Management**: Composition API + Composables
- **Authentication**: WebAuthn (Passkey)

## プロジェクト構造

```
app/
├── assets/css/          # グローバルスタイル
│   ├── main.scss        # メインエントリポイント
│   ├── tokens.scss      # デザイントークン (CSS変数)
│   ├── base.scss        # ベーススタイル
│   ├── mixins.scss      # SCSS mixins
│   └── _modal.scss      # モーダル共通スタイル
├── components/ui/       # 再利用可能なUIコンポーネント
├── composables/         # Vue composables (状態管理・ロジック)
├── lib/                 # ユーティリティ関数
├── pages/               # ルーティングページ
└── plugins/             # Nuxtプラグイン
```

## コーディング規約

### CSSクラス命名規則

プロジェクト全体で統一された命名規則を使用：

#### `lc-*` (Local Component)

コンポーネント固有の要素に使用。BEM風の命名。

```vue
<!-- 例: Button.vue -->
<button class="lc-button lc-button--variant-primary lc-button--size-large">
  <span class="lc-label">...</span>
  <Icon class="lc-icon lc-icon--left" />
</button>
```

**パターン:**

- ブロック: `.lc-button`, `.lc-header`, `.lc-nav`
- 修飾子: `.lc-button--variant-primary`, `.lc-header--hidden`
- 要素: `.lc-icon`, `.lc-label`, `.lc-actions`

#### `lcm-*` (Local Component Modal)

モーダル・ダイアログ関連の要素に使用。

```vue
<!-- 例: Confirm.vue, WalletModal.vue -->
<dialog class="lcm-modal lcm-modal--open">
  <div class="lcm-panel">
    <header class="lcm-panel-header">
      <h3 class="lcm-panel-title">...</h3>
    </header>
    <div class="lcm-panel-content">
      <div class="lcm-field">
        <label class="lcm-label">...</label>
        <input class="lcm-input" />
      </div>
      <div class="lcm-actions">...</div>
    </div>
  </div>
</dialog>
```

#### `gc-*` (Global Class)

グローバルに定義されたユーティリティクラス (base.scss)。

```html
<!-- 例 -->
<div class="gc-page-container">...</div>
<div class="gc-section-framed">...</div>
<div class="gc-actions gc-actions--left">...</div>
<span class="gc-spacer-6"></span>
<div class="gc-only-desktop">...</div>
<div class="gc-only-mobile">...</div>
```

### Vue コンポーネント

#### ファイル構成

すべてのコンポーネントは単一ファイルコンポーネント (SFC) として実装：

```vue
<template>
  <!-- HTML -->
</template>

<script setup lang="ts">
// TypeScript (Composition API)
</script>

<style lang="scss" scoped>
// SCSS (スコープ付き)
</style>
```

#### 必須ルール

1. **Composition API** を使用 (Options API は使用しない)
2. **`<script setup>`** 構文を使用
3. **TypeScript** で型定義を明示
4. **`scoped`** スタイルを使用 (グローバル汚染を防ぐ)

#### Props定義

```typescript
type Props = {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
})
```

#### Emits定義

```typescript
type Emits = {
  'update:modelValue': [value: boolean]
  click: [event: MouseEvent]
}

const emit = defineEmits<Emits>()
```

### SCSS規約

#### SCSS mixins の使用

```scss
@use '@/assets/css/mixins' as mixins;

.lc-button {
  @include mixins.responsive-hover {
    filter: var(--filter-hover);
  }
}
```

`responsive-hover` mixin: デスクトップではhover、モバイルではactiveに対応。

#### モーダル共通スタイル

```scss
@use '@/assets/css/modal' as modal;
@include modal.styles;
```

#### CSS変数の使用

デザイントークンは `tokens.scss` で定義され、CSS変数として使用可能：

```scss
.element {
  color: var(--color-fg);
  background: var(--color-surface);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--duration-normal) var(--ease-out);
}
```

**主要な変数カテゴリ:**

- Colors: `--color-*`
- Spacing: `--space-1` ~ `--space-8`
- Font: `--font-size-*`, `--font-weight-*`
- Duration: `--duration-*`
- Radius: `--radius-*`
- Z-index: `--z-*`

### Composables

再利用可能なロジックは composables として実装：

```typescript
// composables/useToast.ts
export const useToast = () => {
  return {
    success: (message: string) => {
      /* ... */
    },
    error: (message: string) => {
      /* ... */
    },
    // ...
  }
}

// 使用例
const toast = useToast()
toast.success('Success!')
```

**既存のcomposables:**

- `useToast()` - トースト通知
- `useConfirm()` - 確認ダイアログ
- `useWalletAuth()` - ウォレット認証

### アイコン

lucide-vue-next を使用：

```vue
<script setup lang="ts">
import { Settings, User, LogOut } from 'lucide-vue-next'
</script>

<template>
  <UiIconButton :icon="Settings" aria-label="Settings" />
</template>
```

### Injection Keys

型安全な provide/inject のために injection keys を使用：

```typescript
// lib/injectionKeys.ts
export const managedLoginKey = Symbol() as InjectionKey<() => Promise<void>>

// app.vue (提供側)
provide(managedLoginKey, managedLogin)

// 子コンポーネント (注入側)
const managedLogin = inject(managedLoginKey)
```

## 特殊な実装パターン

### Toast通知の遅延表示

ローディング状態が短時間で終わる場合、トーストが一瞬だけ表示されるのを防ぐため、500ms待機してから表示：

```typescript
const isLoading = ref(true)
toast.loading('Loading...', isLoading)

// isLoading.value が false になると自動的にトーストが閉じる
// 500ms以内に完了した場合はトーストが表示されない
```

### ヘッダーの自動非表示

スクロール方向に応じてヘッダーを表示/非表示：

- 下スクロール: ヘッダーが上に消える
- 上スクロール: ヘッダーが出現
- ページ上部 (100px以内): 常に表示

### モーダル実装

`<dialog>` 要素を使用し、トップレイヤーで表示：

```vue
<dialog ref="dialogRef" class="lcm-modal">
  <!-- content -->
</dialog>

<script setup>
const dialogRef = ref<HTMLDialogElement>()
const openModal = () => dialogRef.value?.showModal()
const closeModal = () => dialogRef.value?.close()
</script>
```

### レスポンシブデザイン

```scss
@use '@/assets/css/tokens' as tokens;

.element {
  @media (max-width: tokens.$pagewidth-phone) {
    // スマホ
  }
  @media (min-width: tokens.$pagewidth-tablet) {
    // タブレット以上
  }
}
```

グローバルクラス: `.gc-only-desktop`, `.gc-only-mobile`

## CSS_TOKENS同期

`tokens.scss` の値を JavaScript で使用する場合、`lib/util.ts` の `CSS_TOKENS` と同期させること：

```typescript
// lib/util.ts
export const CSS_TOKENS = {
  '--duration-fast': 120,
  '--duration-normal': 200,
  // ...tokens.scss と同じ値
}
```

## 開発環境

### セットアップ

```bash
npm install
npm run dev
```

### ビルド

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## 参考

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [lucide-vue-next](https://lucide.dev/guide/packages/lucide-vue-next)
