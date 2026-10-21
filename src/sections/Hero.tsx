import MaskedLines from '../components/ui/MaskedLines'

/**
 * Hero DOM — sits in front of the persistent canvas (artifact renders
 * behind, choreographed by scrollStore). Generous whitespace, bottom-left
 * mass, masked line reveals gated on the preloader curtain.
 */
export default function Hero() {
  return (
    <section id="hero" className="relative flex min-h-[100svh] flex-col justify-between px-5 pb-8 pt-32 md:px-10 md:pb-10">
      {/* top row — whitespace with a tiny version marker far right */}
      <div className="flex items-start justify-between">
        <span className="eyebrow opacity-0 md:opacity-100">
          thridoy° — webgl &amp; engineering
        </span>
        <span className="eyebrow text-right">
          portfolio — 2026
        </span>
      </div>

      {/* statement */}
      <div className="max-w-full md:mt-[26vh]">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-block size-2 rounded-full bg-accent" />
          <span
            className="eyebrow rounded-md px-1.5 py-0.5"
            style={{
              background: 'color-mix(in srgb, var(--c-bg) 84%, transparent)',
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
            }}
          >
            S M Tanvir Hasan Hridoy — Chemnitz, Germany
          </span>
        </div>
        <MaskedLines
          as="h1"
          gateReady
          delay={0.15}
          stagger={0.085}
          start="top 86%"
          lines={[
            'I craft 3D visual storytelling,',
            'high-performance web apps &',
            'interactive experiences.',
          ]}
          className="display-xl"
        />
      </div>

      {/* bottom micro-prompt */}
      <div className="flex items-end justify-between">
        <span className="eyebrow">react • three.js • gsap • node</span>
        <div className="flex flex-col items-center gap-2">
          <span className="eyebrow scroll-pulse">scroll to explore</span>
          <span
            className="block w-px overflow-hidden"
            style={{ height: 42, background: 'color-mix(in srgb, var(--c-fg) 25%, transparent)' }}
          >
            <span className="scroll-pulse block h-full w-full origin-top" style={{ background: 'var(--c-accent)' }} />
          </span>
        </div>
      </div>
    </section>
  )
}
