import { useEffect } from 'react'
import gsap from 'gsap'
import { useUI } from '../store/store'

const PALETTE = {
  light: { '--c-bg': '#F0F1FA', '--c-fg': '#0A0A0E' },
  dark: { '--c-bg': '#0A0A0E', '--c-fg': '#F0F1FA' },
} as const

/**
 * Cross-fades the root CSS variables whenever the theme flips, so every
 * surface, border and text color on the page interpolates instead of
 * snapping.
 */
export function useThemeSync(): void {
  const theme = useUI((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    gsap.to(document.documentElement, {
      ...PALETTE[theme],
      duration: 0.9,
      ease: 'power2.inOut',
    })
  }, [theme])
}
