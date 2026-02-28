// composable for managing color mode (light/dark theme)

export type ColorMode = 'light' | 'dark' | 'auto'

const STOREKEY_COLORMODE = 'colormode'

export const useColorMode = () => {
  const colorMode = useState<ColorMode>('colormode:colorMode', () => 'auto')
  const isDark = useState<boolean>('colormode:isDark', () => true)
  const initialized = useState<boolean>('colormode:initialized', () => false)

  const applyColorMode = (mode: ColorMode) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = mode === 'dark' || (mode === 'auto' && prefersDark)
    isDark.value = shouldBeDark

    // Apply to document
    if (shouldBeDark) {
      document.documentElement.setAttribute('data-color-mode', 'dark')
    } else {
      document.documentElement.setAttribute('data-color-mode', 'light')
    }
  }

  const setColorMode = (mode: ColorMode) => {
    colorMode.value = mode
    localStorage.setItem(STOREKEY_COLORMODE, mode)
    applyColorMode(mode)
  }

  const init = () => {
    // skip if already initialized
    if (initialized.value) return
    initialized.value = true

    // Load from localStorage or default to 'auto'
    const stored = localStorage.getItem(STOREKEY_COLORMODE) as ColorMode | null
    const initial = stored || 'auto'
    colorMode.value = initial
    applyColorMode(initial)

    // Watch for system preference changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (colorMode.value === 'auto') applyColorMode('auto')
    }
    mediaQuery.addEventListener('change', handleChange)
  }

  init()

  return {
    colorMode: readonly(colorMode),
    isDark: readonly(isDark),
    setColorMode,
  }
}
