import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react'
import { damp } from '../../store/scrollStore'

interface MagneticProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** 0.0 → 1.0 — how hard the child is pulled toward the cursor */
  strength?: number
}

const clampDelta = (delta: number, reference: number): number =>
  Math.max(Math.min(delta, reference * 2), -reference * 2)

/**
 * Magnetic hover wrapper — the child is elastically attracted to the
 * pointer while hovered and snaps back with an elastic release on leave.
 */
export default function Magnetic({
  children,
  strength = 0.4,
  ...rest
}: MagneticProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let hovering = false
    let raf = 0
    let lastTime = performance.now()
    let pos = { x: 0, y: 0 }
    let target = { x: 0, y: 0 }

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      pos.x = damp(pos.x, target.x, 9, dt)
      pos.y = damp(pos.y, target.y, 9, dt)
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      if (hovering || Math.abs(pos.x) > 0.05 || Math.abs(pos.y) > 0.05) {
        raf = requestAnimationFrame(loop)
      } else {
        raf = 0
        el.style.transform = 'translate3d(0px, 0px, 0)'
      }
    }

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      target.x = clampDelta(dx * strength, rect.width)
      target.y = clampDelta(dy * strength, rect.height)
      if (!hovering) {
        hovering = true
        if (!raf) raf = requestAnimationFrame(loop)
      }
    }

    const onLeave = () => {
      hovering = false
      target.x = 0
      target.y = 0
      if (!raf) raf = requestAnimationFrame(loop)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])

  return (
    <div ref={wrapRef} style={{ willChange: 'transform' }} {...rest}>
      {children}
    </div>
  )
}
