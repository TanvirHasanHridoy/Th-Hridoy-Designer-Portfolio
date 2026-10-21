import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MoveDown } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import { useUI } from '../store/store'
import { scrollToSection } from '../hooks/useSmoothScroll'

gsap.registerPlugin(ScrollTrigger)

/**
 * The Lab — the dark-theme arena. Owns the viewport while the Rapier pit
 * plays out behind it (DOM is kept sparse + transparent so the bodies are
 * the star). Entering flips the global theme to void black; scrolling back
 * returns it to alabaster.
 */
export default function Lab() {
  const sectionRef = useRef<HTMLElement>(null)
  const setTheme = useUI((s) => s.setTheme)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 62%',
        end: 'top 55%',
        onEnter: () => setTheme('dark'),
        onLeaveBack: () => setTheme('light'),
      })
    })
    return () => ctx.revert()
  }, [setTheme])

  return (
    <section ref={sectionRef} id="lab" className="relative h-[210svh]">
      {/* upper headline */}
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between px-5 py-32 md:px-10">
        <div>
          <span className="eyebrow">03 — the lab</span>
          <MaskedLines
            as="h2"
            start="top 78%"
            lines={['Where Complex Code', 'Becomes Tactile Reality']}
            className="display-lg mt-6 max-w-[12em]"
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <MaskedLines
            as="p"
            start="top 88%"
            lines={['Throw things. The physics runs', 'live inside this page']}
            className="max-w-[16em]"
            style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.7rem)', fontWeight: 600 }}
          />
          <button
            type="button"
            data-cursor="THROW"
            data-cursor-variant="drag"
            onClick={() => scrollToSection('#contact')}
            className="pill btn-sweep btn-blank"
          >
            <MoveDown size={15} />
            Continue
          </button>
        </div>
      </div>
    </section>
  )
}
