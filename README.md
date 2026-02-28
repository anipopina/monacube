## New project setup

- `"CHANGEME"` でプロジェクト内を検索して値を書き換える
- Secret 環境変数を設定
  - 本テンプレートでは `JWT_SECRET` という変数を使用
- ルートと `apps/web`, `packages/functions` の 3 箇所で `npm install`
- `aws configure` で AWS 認証情報を登録
- 利用ドメインのホストゾーンは Route53 で登録

### Secret 環境変数の設定

```bash
# 値の設定（対話式）
npx sst secret set --stage dev [ENV_NAME]
npx sst secret set --stage production [ENV_NAME]

# 変数の削除
npx sst secret remove --stage dev [ENV_NAME]
npx sst secret remove --stage production [ENV_NAME]

# 確認
npx sst secret list --stage dev
npx sst secret list --stage production
```

## Dev & deploy commands

- `npm run webdev`
  - localhostでWebサーバ実行してライブ反映
  - dev環境がsstdev用になってるとLambdaに繋がらないので注意（元に戻すには `deploy:dev`）
- `npm run webbuild`
  - Nuxtのビルド
- `npm run sstdev`
  - SSTのdevコマンドとNuxtのdevコマンドを同時実行するように設定済み
  - SSTのdevコマンドはLambdaコードをローカル実行してライブ反映してくれる
    - Lambda以外のリソースはAWS上のdev環境に接続
    - AWS上のdev環境の設定が変わるので注意（元に戻すには `deploy:dev`）
  - Nuxtのdevコマンドはクライアント側をライブ反映 + dev環境APIへのプロキシ
- `npm run deploy:dev`
  - dev環境をデプロイ
  - Nuxtのビルドも自動実行される
- `npm run deploy:prod`
  - production環境をデプロイ

SSTによって作成されたリソースは SST Console (https://console.sst.dev/) で確認できる

### Other SST commands

- `npx sst diff --stage dev`
  - 変化するリソースを確認できるらしい

## Directories

```
template-nuxt-sst/
  sst.config.ts          # SST
  packages.json
  apps/
    web/
      nuxt.config.ts     # Nuxt SPA
      packages.json
      ...
  packages/
    functions/           # Lambda
      package.json
      src/
        auth.challenge.ts
        auth.verify.ts
        health.ts
```

## Memo

### Base setup of this template

```
mkdir template-nuxt-sst
cd template-nuxt-sst
git init

# Frontend (Nuxt)
mkdir -p apps
cd apps
npm create nuxt@latest web
# gitセットアップやmoduleインストールはすべて断る

# IaC (SST)
cd ..
npm init -y
npm i sst
npx sst init

# Lambda
mkdir -p packages/functions
cd packages/functions
npm init -y
```
