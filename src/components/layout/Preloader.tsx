import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useUI } from '../../store/store'

/**
 * Boot curtain: full-void overlay with an oversized numeric counter and a
 * minimal progress bar. When it completes, the counter glides away, the
 * curtain panels slide up, and the Hero camera entrance is triggered by
 * flipping `ready` in the global store.
 */
export default function Preloader() {
  const setReady = useUI((s) => s.setReady)
  const rootRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const lock = { v: 0 }
    const counter = counterRef.current
    const bar = barRef.current

    const tl = gsap.timeline()
    tl.to(lock, {
      v: 100,
      duration: 2.1,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (counter) counter.textContent = String(Math.round(lock.v)).padStart(2, '0')
        if (bar) bar.style.transform = `scaleX(${lock.v / 100})`
      },
    })
    /* counter exits through its own mask first */
    tl.to('[data-pre-count]', { yPercent: -115, duration: 0.45, ease: 'power3.in' }, '+=0.25')
    /* the boot labels/progress live outside the curtain panels; fade them
       before the panels lift so they can never ghost over the live page */
    tl.to(
      '[data-pre-content]',
      { autoAlpha: 0, duration: 0.25, ease: 'power2.in' },
      '-=0.05',
    )
    /* curtains away — flips `ready`, which starts the hero camera entrance */
    tl.to(
      '[data-curtain]',
      {
        yPercent: -100,
        duration: 0.95,
        ease: 'expo.inOut',
        stagger: 0.09,
        onStart: () => setReady(true),
      },
      '-=0.1',
    )
    tl.add(() => setGone(true))

    return () => {
      tl.kill()
    }
  }, [setReady])

  if (gone) return null

  return (
    <div ref={rootRef} className="fixed inset-0 z-[70]" style={{ pointerEvents: 'auto' }}>
      {/* curtain panels */}
      <div data-curtain className="absolute inset-0 grid grid-cols-2">
        <div className="h-full w-full" style={{ background: '#0A0A0E' }} />
        <div className="h-full w-full" style={{ background: '#0A0A0E' }} />
      </div>

      {/* content */}
      <div data-pre-content className="relative flex h-full flex-col justify-between p-6 md:p-10">
        <div className="flex items-center justify-between text-[#F0F1FA]">
          <span className="text-[13px] font-semibold tracking-tight">THRIDOY°</span>
          <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.55)' }}>
            portfolio — 2026
          </span>
        </div>

        <div
          data-pre-count
          className="absolute bottom-6 right-6 md:bottom-10 md:right-10"
          style={{ overflow: 'hidden' }}
        >
          <span
            ref={counterRef}
            className="block"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(5rem, 16vw, 12rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              color: '#F0F1FA',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            00
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.55)' }}>
            assembling gravity • shaders • physics
          </span>
          <div className="h-px w-full max-w-[420px] overflow-hidden" style={{ background: 'rgba(240,241,250,0.14)' }}>
            <div
              ref={barRef}
              className="h-full w-full origin-left"
              style={{ background: '#1A2FFB', transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
