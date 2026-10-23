import { useEffect } from 'react'
import gsap from 'gsap'
import { useUI } from '../store/store'

const PALETTE = {
  light: {
    '--c-bg': '#F0F1FA',
    '--c-fg': '#0A0A0E',
    '--c-muted': '#5F6276',
    '--c-accent-ink': '#1A2FFB',
  },
  dark: {
    '--c-bg': '#0A0A0E',
    '--c-fg': '#F0F1FA',
    '--c-muted': '#9093A6',
    '--c-accent-ink': '#8B9BFF',
  },
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
