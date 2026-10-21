import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUpRight, MapPin, Sparkles } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import RollLink from '../components/ui/RollLink'
import { PROFILE, STACK, TIMELINE } from '../data/profile'

gsap.registerPlugin(ScrollTrigger)

/**
 * About — the developer profile. Structured, scannable columns:
 * bio + status card → categorized tech stack → experience timeline.
 * Data lives in `src/data/profile.ts` (sourced from the public GitHub
 * profile and the shipped projects).
 */
export default function About() {
  const sectionRef = useRef<HTMLElement>(null)

  /* soft per-card reveal as blocks enter the viewport */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-about-card]').forEach((card) => {
        gsap.fromTo(
          card,
          { y: 26, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: { trigger: card, start: 'top 88%', once: true },
          },
        )
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="about" className="relative px-5 py-[14vh] md:px-10">
      {/* heading */}
      <span className="eyebrow">01 — about</span>
      <div className="mt-5 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <MaskedLines
            as="h2"
            start="top 82%"
            lines={['Full-Stack Developer.']}
            className="display-lg"
          />
          <MaskedLines
            as="h2"
            start="top 82%"
            delay={0.09}
            lines={['Based in Chemnitz, DE.']}
            className="display-lg transparent-text"
          />
        </div>
        <div className="md:col-span-4 md:pt-3">
          <p
            className="max-w-[38ch] text-[1.02rem] leading-relaxed"
            style={{ color: 'var(--c-fg)' }}
          >
            {PROFILE.tagline}
          </p>
        </div>
      </div>

      {/* bio + status card */}
      <div className="mt-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <span className="eyebrow">short bio</span>
          <div className="mt-4 space-y-5">
            {PROFILE.bio.map((p, i) => (
              <p key={i} className="max-w-[62ch] text-[0.95rem] leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
        </div>

        <aside
          data-about-card
          className="rounded-[20px] border border-line md:col-span-5 md:col-start-8"
          style={{
            background: 'color-mix(in srgb, var(--c-bg) 74%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow">status</span>
              <span
                className="flex items-center gap-2 rounded-full border border-line px-2.5 py-1"
                style={{ color: 'var(--c-fg)' }}
              >
                <span className="relative inline-flex size-2">
                  <span
                    className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
                    style={{ background: '#2ECC71' }}
                  />
                  <span
                    className="relative inline-flex size-2 rounded-full"
                    style={{ background: '#2ECC71' }}
                  />
                </span>
                <span className="eyebrow" style={{ color: 'var(--c-fg)', letterSpacing: '0.08em' }}>
                  open to work
                </span>
              </span>
            </div>
            <p className="mt-3 text-[0.95rem] font-semibold leading-snug">{PROFILE.openTo}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <span className="eyebrow">located</span>
                <p className="mt-1.5 flex items-center gap-1.5 text-[0.92rem] font-semibold">
                  <MapPin size={14} style={{ color: 'var(--c-accent)' }} />
                  {PROFILE.location}
                </p>
              </div>
              <div>
                <span className="eyebrow">timezone</span>
                <p className="mt-1.5 text-[0.92rem] font-semibold">{PROFILE.timezone}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <span className="eyebrow">github</span>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {PROFILE.githubStats.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 eyebrow" style={{ color: 'var(--c-fg)', letterSpacing: '0.08em' }}>
                    <Sparkles size={12} style={{ color: 'var(--c-accent)' }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <a
                href={PROFILE.links.github}
                target="_blank"
                rel="noreferrer"
                data-cursor=""
                data-cursor-variant="magnetic"
                className="pill btn-sweep !px-4 !py-2.5 !text-[0.85rem]"
              >
                GitHub
                <ArrowUpRight size={14} />
              </a>
              <a
                href={PROFILE.links.linkedin}
                target="_blank"
                rel="noreferrer"
                data-cursor=""
                data-cursor-variant="magnetic"
                className="pill btn-sweep btn-blank !px-4 !py-2.5 !text-[0.85rem]"
              >
                LinkedIn
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* categorized tech stack */}
      <div className="mt-[10vh]">
        <div className="flex items-end justify-between gap-4">
          <span className="eyebrow">tech stack — categorized</span>
          <span className="eyebrow hidden md:inline">
            everything here ran in a shipped, public build
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {STACK.map((cat) => (
            <div
              key={cat.title}
              data-about-card
              className="rounded-[20px] border border-line p-5"
              style={{
                background: 'color-mix(in srgb, var(--c-bg) 74%, transparent)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[1rem] font-bold tracking-tight">{cat.title}</h3>
                <span className="eyebrow">{cat.note}</span>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cat.items.map((it) => (
                  <li
                    key={it}
                    className="rounded-full border border-line px-3 py-1.5"
                    style={{ color: 'var(--c-fg)' }}
                  >
                    <span
                      className="eyebrow"
                      style={{ color: 'var(--c-fg)', fontSize: '0.68rem', letterSpacing: '0.08em' }}
                    >
                      {it}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* experience timeline */}
      <div className="mt-[10vh]">
        <div className="flex items-end justify-between gap-4">
          <span className="eyebrow">experience timeline</span>
          <span className="eyebrow hidden md:inline">
            milestones from the public GitHub history
          </span>
        </div>
        <ol className="mt-6 border-l border-line">
          {TIMELINE.map((row) => (
            <li key={row.year} className="relative pl-6 md:pl-8">
              <span
                className="absolute -left-[7px] top-2 block size-3.5 rounded-full border-2"
                style={{
                  borderColor: 'var(--c-accent)',
                  background: 'var(--c-bg)',
                }}
                aria-hidden
              />
              <div
                data-about-card
                className="rounded-[20px] border border-line mb-3 p-5 md:p-6"
                style={{
                  background: 'color-mix(in srgb, var(--c-bg) 74%, transparent)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[1.05rem] font-bold tracking-tight">{row.title}</h3>
                  <span
                    className="no-select leading-none"
                    aria-hidden
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)',
                      letterSpacing: '-0.03em',
                      color: 'var(--c-accent)',
                      opacity: 0.55,
                    }}
                  >
                    {row.year}
                  </span>
                </div>
                <p className="eyebrow mt-1">{row.org}</p>
                <p className="mt-2.5 max-w-[72ch] text-[0.95rem] leading-relaxed text-muted">
                  {row.text}
                </p>
                <p className="eyebrow mt-2.5">{row.tags.join(' • ')}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* closing offer line */}
      <div className="mt-[8vh] flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line p-5 md:p-7">
        <p className="max-w-[52ch] text-[1rem] font-semibold leading-snug">
          Want the full CV or a stack deep-dive? The fastest path is LinkedIn.
        </p>
        <RollLink
          label="Open the LinkedIn profile"
          href={PROFILE.links.linkedin}
          target="_blank"
          rel="noreferrer"
          data-cursor-variant="magnetic"
          data-cursor=""
          className="text-[0.95rem] font-semibold"
        />
      </div>
    </section>
  )
}
