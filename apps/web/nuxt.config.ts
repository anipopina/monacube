// https://nuxt.com/docs/api/configuration/nuxt-config

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_NAME = 'MonaCube'
const APP_DESCRIPTION = 'An illustration platform built for a fair and sustainable creative community, powered by Monacoin.'
const THEME_COLOR = '#1A1A1A'
const HOSTNAME = 'monacube.com' // OGP用なのでrootを書いておく
const DEV_HOSTNAME = 'gallery-dev.monacube.com'

const WEB_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT_DIR = resolve(WEB_DIR, '../..')
const SHARED_DIR = resolve(ROOT_DIR, 'shared')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  alias: {
    '@shared': SHARED_DIR,
  },
  css: ['~/assets/css/main.scss'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: APP_NAME,
      htmlAttrs: { lang: 'ja' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: APP_DESCRIPTION },

        // UI / theming
        { name: 'color-scheme', content: 'light dark' }, // カラーモード切替を実装しなくてもこう書いておくのがいいらしい
        { name: 'theme-color', content: THEME_COLOR },
        { name: 'format-detection', content: 'telephone=no' }, // 電話番号の自動リンク化を防止
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },

        // OGP
        { property: 'og:title', content: APP_NAME },
        { property: 'og:description', content: APP_DESCRIPTION },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/og.png' }, // CHANGEME (画像を): publicフォルダに置く  1200 x 630
        { property: 'og:url', content: `https://${HOSTNAME}` },

        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' }, // これならog:imageと同じ画像でOK
        { name: 'twitter:title', content: APP_NAME },
        { name: 'twitter:description', content: APP_DESCRIPTION },
        { name: 'twitter:image', content: '/og.png' },
      ],
      link: [
        // icons / manifest
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }, // CHANGEME (画像を): publicフォルダに置く 512 x 512
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, // CHANGEME (画像を): publicフォルダに置く 180 x 180
        { rel: 'manifest', href: '/manifest.json' }, // publicフォルダに置く

        // fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP&display=swap',
        },
      ],
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['node'],
        baseUrl: '.',
        paths: {
          '@shared/*': ['../../shared/*'],
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api', // run dev 時は localhost/api に向くようにする
      imgBase: process.env.NUXT_PUBLIC_IMG_BASE || `https://img.${DEV_HOSTNAME}`,
      stage: process.env.NUXT_PUBLIC_STAGE || 'dev',
      webAuthnRpName: APP_NAME,
      webAuthnUserName: 'Monar',
    },
  },
  nitro: {
    devProxy: {
      '/api': {
        target: `https://api.${DEV_HOSTNAME}`, // localhost/api に来たリクエストをdev環境APIにプロキシ
        changeOrigin: true,
        prependPath: true,
      },
    },
  },
  vite: {
    resolve: {
      alias: {
        buffer: 'buffer/',
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
      },
    },
    optimizeDeps: {
      include: ['buffer', 'crypto-browserify', 'stream-browserify'],
    },
    define: {
      global: 'globalThis',
    },
    server: {
      fs: {
        allow: [ROOT_DIR],
      },
    },
  },
})
