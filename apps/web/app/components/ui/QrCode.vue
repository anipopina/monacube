<template>
  <canvas ref="canvas" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

interface Props {
  value: string
  size?: number // in pixels
  color?: string // CSS color value
  backgroundColor?: string // CSS color value
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

const props = withDefaults(defineProps<Props>(), {
  size: 256,
  color: '#000000',
  backgroundColor: '#ffffff',
  errorCorrectionLevel: 'M',
})

const canvas = ref<HTMLCanvasElement>()
const dataUrl = ref<string>('')

const generateQRCode = async () => {
  if (!props.value) return

  try {
    const options = {
      width: props.size,
      color: {
        dark: props.color,
        light: props.backgroundColor,
      },
      errorCorrectionLevel: props.errorCorrectionLevel,
    }

    if (canvas.value) {
      await QRCode.toCanvas(canvas.value, props.value, options)
      canvas.value.style.height = 'auto' // Maintain aspect ratio
    } else {
      dataUrl.value = await QRCode.toDataURL(props.value, options)
    }
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
}

onMounted(() => {
  generateQRCode()
})

watch(
  () => [props.value, props.size, props.color, props.backgroundColor, props.errorCorrectionLevel],
  () => {
    generateQRCode()
  },
)
</script>

<style lang="scss" scoped>
// qrcodeライブラリが設定するクラス
.qr-code canvas {
  display: block;
}
</style>
