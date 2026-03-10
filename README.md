## About

- App Name: MonaCube
- Key Features
  - モナコインによるtipができる画像作品の投稿プラットフォーム
  - Passkeyから生成したモナコインウォレットによってユーザを認証する
  - スパムや人気工作への対策としてモナコインウォレットの残高（MONA高）を参照する
    - MONA高によってアップロードできる作品の総数と総サイズをアンロック
    - 投稿者のMONA高を人気の指標として扱う
    - 作品へのtip額などは工作可能なので指標としては使わない

## Directories

```
project-root/
  sst.config.ts          # サーバレスアーキテクチャ管理: SST
  package.json
  apps/
    web/
      nuxt.config.ts     # フロントエンド: Nuxt SPA
      package.json
      app/
        app.vue
        lib/
        pages/
        components/
        composables/
        assets/
          css/
  packages/
    functions/           # バックエンド: Lambda
      package.json
      src/
        lib/
        api/
        batch/
```

## S3 ImageBucket Path Design

```
users/
  <userId>/
    icon.webp (128x128)
    icon@2x.webp (256×256)

works/
  <workId>/
    original (ユーザがアップロードした画像を EXIF削除, カラープロファイルをsRGBに変換 してから保存)
    large.webp (長辺 1920px, 想定サイズ 300KB〜1MB)
    medium.webp (長辺 960px, 想定サイズ 100KB〜300KB)
    thumb.webp (square crop 320x320, 想定サイズ 20KB〜60KB)

uploads/
  <uploadId>/
    tmp
```

### Upload Sequence

1. init API でtmpへのアップロードURLを発行
1. クライアントが画像をtmpにアップロード
1. finalize API で
   1. tmpにアップロードされた画像のサイズなどをチェック
   1. 画像のバリエーションを生成して保存
   1. DB更新

### Delivery

- original が 1MB 未満ならアートワーク詳細で original を表示 / 1MB以上なら large.webp を表示
- blurHash, thumbBHash でロード時間をつなぐ

## Other Definition Files

- API Interface: shared/apiInterface.ts
- DynamoDB Record: shared/ddbRecord.ts
