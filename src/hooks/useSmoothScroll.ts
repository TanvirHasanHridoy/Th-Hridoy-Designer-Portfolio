import { useEffect, useRef, type RefObject } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollStore, initPointerTracking, tickStores } from '../store/scrollStore'

gsap.registerPlugin(ScrollTrigger)

/** Module-level Lenis handle — lets header / menu buttons drive scroll. */
export const lenisRef: RefObject<Lenis | null> = { current: null }

export function scrollToSection(target: string, immediate = false): void {
  const lenis = lenisRef.current
  if (!lenis) return
  lenis.scrollTo(target, {
    duration: immediate ? 0 : 1.5,
    easing: (t: number) => 1 - Math.pow(1 - t, 4),
  })
}

/**
 * Wires Lenis into both the gsap.ticker (single render clock shared with
 * every useFrame in the WebGL canvas) and the ScrollTrigger update cycle.
 *
 * @param locked when true (e.g. preloader / modal), scrolling is frozen.
 */
export function useSmoothScroll(locked: boolean): void {
  const instanceRef = useRef<Lenis | null>(null)

  useEffect(() => {
    /* honor prefers-reduced-motion: no smoothing, no wheel hijack */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = new Lenis({
      lerp: reduce ? 1 : 0.09,
      smoothWheel: !reduce,
      syncTouch: false,
    })
    lenisRef.current = lenis
    instanceRef.current = lenis

    const removePointer = initPointerTracking()

    const onScroll = (l: Lenis) => {
      scrollStore.scrollY = l.scroll
      scrollStore.scrollVelocity = l.velocity ?? 0
      scrollStore.scrollProgress = l.limit > 0 ? l.scroll / l.limit : 0
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)

    let lastTime = 0
    const tick = (time: number) => {
      const dt = Math.min(time - lastTime, 0.05)
      lastTime = time
      lenis.raf(time * 1000) // gsap ticker is seconds, lenis wants ms
      tickStores(dt)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    ScrollTrigger.config({ ignoreMobileResize: true })

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(true)
      removePointer()
      lenis.destroy()
      instanceRef.current = null
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    const lenis = instanceRef.current
    if (!lenis) return
    if (locked) lenis.stop()
    else lenis.start()
  }, [locked])
}
