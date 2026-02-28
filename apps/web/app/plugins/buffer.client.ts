import { Buffer } from 'buffer'

export default defineNuxtPlugin(() => {
  // bitcoinjs-message のために global Buffer を使えるようにする
  ;(globalThis as any).Buffer = Buffer
})
