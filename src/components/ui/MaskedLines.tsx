import { useEffect, useRef, type CSSProperties, type ElementType } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useUI } from '../../store/store'

gsap.registerPlugin(ScrollTrigger)

interface MaskedLinesProps {
  /** One entry per visual line — authored for responsive clamp() sizing */
  lines: readonly string[]
  as?: ElementType
  className?: string
  /** Seconds added before the first line, for choreographing entrances */
  delay?: number
  /** Stagger between lines */
  stagger?: number
  /** Wait for the preloader to lift before the reveal starts */
  gateReady?: boolean
  /** ScrollTrigger start offset override */
  start?: string
  /** Inline styles for the root (font-size tweaks etc.) */
  style?: CSSProperties
}

/**
 * Signature Lusion-style masked line reveal. Every line lives inside an
 * `overflow: hidden` wrapper and its inner span slides up from underneath
 * when the block scrolls into view. `gateReady = true` defers the trigger
 * until after the preloader curtain (hero choreography).
 */
export default function MaskedLines({
  lines,
  as: Tag = 'h2',
  className = '',
  delay = 0,
  stagger = 0.09,
  gateReady = false,
  start = 'top 84%',
  style,
}: MaskedLinesProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const inner = el.querySelectorAll<HTMLElement>('[data-mask-inner]')
    gsap.set(inner, { yPercent: 118 })

    let played = false
    const play = () => {
      if (played) return
      played = true
      gsap.to(inner, {
        yPercent: 0,
        duration: 1.15,
        ease: 'expo.out',
        stagger,
        delay,
      })
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => {
        if (gateReady && !useUI.getState().ready) {
          /* preloader still up — flush the entrance the moment it lifts */
          const unsub = useUI.subscribe((s) => {
            if (s.ready) {
              unsub()
              play()
            }
          })
          return
        }
        play()
      },
    })

    return () => {
      st.kill()
    }
  }, [gateReady, delay, stagger, start])

  return (
    <Tag ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <span data-mask-inner>{line}</span>
        </span>
      ))}
    </Tag>
  )
}
