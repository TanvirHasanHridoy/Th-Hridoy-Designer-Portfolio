import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useUI, type CursorVariant } from '../../store/store'

const RING_SIZE: Record<CursorVariant, number> = {
  default: 40,
  magnetic: 56,
  view: 92,
  play: 96,
  drag: 84,
  locate: 60,
}

/**
 * Dual-layer spring cursor:
 *  - dot:    razor-sharp 6px precision dot, glued to the pointer
 *  - ring:   elastic outer ring that expands + fills and can display
 *            contextual labels (VIEW / PLAY / DRAG)
 *
 * Annotation sources: any element with `data-cursor` receives the ring
 * context and `data-cursor-variant` selects the ring behavior.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  /* Touch + pen devices get the native pointer. The fake cursor only exists
     where a mouse can actually move it — it used to render frozen in place
     on mobile (motion hook bails early, elements stayed). */
  const [isFine, setIsFine] = useState(() => window.matchMedia('(pointer: fine)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const onChange = (e: MediaQueryListEvent) => setIsFine(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const cursor = useUI((s) => s.cursor)
  const setCursor = useUI((s) => s.setCursor)
  const resetCursor = useUI((s) => s.resetCursor)

  /* Movement — quickTo spring chains */
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -200, y: -200 })

    const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' })
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' })
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' })
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' })

    const onMove = (e: PointerEvent) => {
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
    }

    /* Contextual hover annotation via event delegation */
    const onOver = (e: MouseEvent) => {
      const annotated = (e.target as HTMLElement | null)?.closest?.(
        '[data-cursor]',
      ) as HTMLElement | null
      if (annotated) {
        const label = annotated.getAttribute('data-cursor') ?? ''
        const variant = (annotated.getAttribute('data-cursor-variant') ?? 'magnetic') as CursorVariant
        setCursor(label, variant)
      } else {
        resetCursor()
      }
    }

    const onDown = () => gsap.to(dot, { scale: 0.5, duration: 0.2 })
    const onUp = () => gsap.to(dot, { scale: 1, duration: 0.35, ease: 'back.out(2.4)' })

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, true)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('mouseover', onOver, true)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [setCursor, resetCursor])

  /* Ring morph on state change */
  useEffect(() => {
    if (!isFine) return
    const ring = ringRef.current
    if (!ring) return
    const size = RING_SIZE[cursor.variant]
    gsap.to(ring, {
      width: size,
      height: size,
      duration: 0.5,
      ease: 'back.out(1.7)',
    })
  }, [cursor.variant, isFine])

  if (!isFine) return null

  return (
    <div className="no-select" aria-hidden>
      <div
        ref={ringRef}
        className={`cursor-root cursor-ring ${cursor.variant === 'view' || cursor.variant === 'play' || cursor.variant === 'drag' || cursor.variant === 'locate' ? 'is-filled' : ''}`}
      >
        <span className="cursor-ring-label">{cursor.label}</span>
      </div>
      <div ref={dotRef} className="cursor-root">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '9999px',
            background: 'var(--c-accent)',
          }}
        />
      </div>
    </div>
  )
}
