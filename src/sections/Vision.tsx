import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Play } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import Magnetic from '../components/ui/Magnetic'
import { scrollToSection } from '../hooks/useSmoothScroll'

gsap.registerPlugin(ScrollTrigger)

/**
 * Vision statement + "Our Approach" + the scroll-expanding showreel card.
 * The card scrubs from 75vw → 100vw × 100vh (32px → 0 radius) while pinned.
 */
export default function Vision() {
  const reelRef = useRef<HTMLDivElement>(null)
  const reelBgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reel = reelRef.current
    const bg = reelBgRef.current
    if (!reel) return

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: reel,
            start: 'top 18vh',
            end: '+=85vh',
            pin: true,
            scrub: true,
            anticipatePin: 1,
          },
        })
        .to(reel, {
          width: '100vw',
          height: '100vh',
          borderRadius: 0,
          ease: 'none',
        }, 0)
      if (bg) {
        gsap.to(bg, {
          rotate: 70,
          scale: 1.35,
          ease: 'none',
          scrollTrigger: {
            trigger: reel,
            start: 'top 18vh',
            end: '+=85vh',
            scrub: true,
          },
        })
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <section id="vision" className="relative px-5 pt-[16vh] md:px-10">
      {/* statement + approach */}
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-8">
          <span className="eyebrow">01 — vision</span>
          <MaskedLines
            as="h2"
            start="top 80%"
            lines={['Bold Engineering,']}
            className="display-lg mt-5"
          />
          <MaskedLines
            as="h2"
            start="top 79%"
            lines={['Brought to Life.']}
            delay={0.08}
            className="display-lg transparent-text"
          />
        </div>

        <div className="flex flex-col gap-6 md:col-span-4 md:col-start-9 md:pt-14">
          <p
            className="max-w-[38ch]"
            style={{ fontSize: 'clamp(1rem, 1.2vw, 1.25rem)', lineHeight: 1.55 }}
          >
            Where pixels meet physics. I build at the collision point of
            creative frontend engineering, real-time 3D graphics and scalable
            system architecture — shipping products that feel alive, load
            fast and scale clean.
          </p>
          <span className="eyebrow">architecture • webgl • product thinking</span>
          <Magnetic strength={0.45} className="w-fit">
            <button
              type="button"
              data-cursor=""
              data-cursor-variant="magnetic"
              onClick={() => scrollToSection('#lab')}
              className="pill btn-sweep btn-blank"
            >
              Our Approach
            </button>
          </Magnetic>
        </div>
      </div>

      {/* showreel */}
      <div className="flex justify-center py-[16vh]">
        <div
          ref={reelRef}
          data-cursor="PLAY REEL"
          data-cursor-variant="play"
          className="relative"
          style={{
            width: '75vw',
            height: '60vh',
            borderRadius: 32,
            overflow: 'hidden',
            willChange: 'width, height, border-radius',
          }}
        >
          <div ref={reelBgRef} className="reel-bg no-select" />
          <div className="reel-grid no-select" />

          {/* chrome */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-8">
            <div className="flex items-center justify-between text-[#F0F1FA]">
              <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.75)' }}>
                showreel — 2026
              </span>
              <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.75)' }}>
                procedural loop
              </span>
            </div>
            <div className="flex items-center justify-center pb-10">
              <span
                className="grid size-[74px] place-items-center rounded-full border border-white/70 text-white backdrop-blur-sm"
                style={{ background: 'rgb(10 10 14 / 0.25)' }}
              >
                <Play size={22} fill="currentColor" />
              </span>
            </div>
            <div className="flex items-end justify-between text-[#F0F1FA]">
              <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.75)' }}>
                motion • shaders • physics
              </span>
              <span className="eyebrow" style={{ color: 'rgba(240,241,250,0.75)' }}>
                00 : 42
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
