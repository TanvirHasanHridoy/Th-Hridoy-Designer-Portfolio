import { useEffect } from 'react'
import { playCue, type SoundCue } from '../audio/engine'

const HOVER_SELECTOR = '[data-sfx],a,button,[data-cursor]'

/**
 * Delegated hover sonification. One quiet tick when the pointer first enters
 * an interactive element; elements can request a different cue with
 * `data-sfx="locate"` or opt out with `data-sfx="none"`.
 */
export function useHoverSounds(): void {
  useEffect(() => {
    let last = 0

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const target = (e.target as Element | null)?.closest?.(
        HOVER_SELECTOR,
      ) as HTMLElement | null
      if (!target) return

      const requested = target.dataset.sfx
      if (requested === 'none') return

      /* pointerover also fires when crossing into a child of the same
         interactive element — only cue on an actual element entry */
      const related = e.relatedTarget as Node | null
      if (related && target.contains(related)) return

      const now = performance.now()
      if (now - last < 45) return
      last = now
      playCue((requested || 'hover') as SoundCue)
    }

    window.addEventListener('pointerover', onOver, true)
    return () => window.removeEventListener('pointerover', onOver, true)
  }, [])
}
