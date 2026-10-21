import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowUpRight } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import Magnetic from '../components/ui/Magnetic'
import RollLink from '../components/ui/RollLink'
import { GithubMark, LinkedinMark, XMark } from '../components/ui/BrandIcons'
import { useUI } from '../store/store'
import { damp } from '../store/scrollStore'

/* smoothed-fill holder lives on the bar element itself */
type FillEl = HTMLDivElement & { __smooth?: number }

/**
 * Footer — massive CTA, structured info grid with a live Europe/Berlin clock,
 * and the "CONTINUE TO SCROLL" progress portal. Pushing the wheel past the
 * bottom of the document fills the bar; at 100% the About/Labs portal opens.
 */
export default function Footer() {
  const setPortalOpen = useUI((s) => s.setPortalOpen)
  const portalOpen = useUI((s) => s.portalOpen)
  const footerRef = useRef<HTMLElement>(null)
  const barWrapRef = useRef<HTMLDivElement>(null)
  const barFillRef = useRef<FillEl>(null)
  const [now, setNow] = useState(() => new Date())
  const portalProgress = useRef(0)

  /* the portal bar only fades in once the footer owns the viewport —
     checked in the existing ticker loop (avoid stale ScrollTrigger math
     when the browser restores a mid-page scroll position on reload) */
  useEffect(() => {
    const el = footerRef.current
    const wrap = barWrapRef.current
    if (!el || !wrap) return
    let visible = false
    const check = () => {
      const top = el.getBoundingClientRect().top
      const want = top < window.innerHeight * 0.92
      if (want !== visible) {
        visible = want
        wrap.style.opacity = want ? '1' : '0'
      }
    }
    check()
    /* re-check on task-level delays too (fonts, HMR) */
    const id = window.setInterval(check, 350)
    return () => window.clearInterval(id)
  }, [])

  /* live clock — Chemnitz runs on Europe/Berlin */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  /* push-past-bottom detection → portal charge */
  useEffect(() => {
    if (portalOpen) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) return
      const limit = document.documentElement.scrollHeight - window.innerHeight
      if (limit - window.scrollY < 4) {
        portalProgress.current = Math.min(portalProgress.current + e.deltaY / 3000, 1)
        if (portalProgress.current >= 1) {
          portalProgress.current = 0
          setPortalOpen(true)
        }
      }
    }
    /* slow self-bleed so the bar is a deliberate gesture, not an accident */
    const decay = (time: number) => {
      void time
      if (portalProgress.current > 0) {
        portalProgress.current = Math.max(0, portalProgress.current - 0.0025)
      }
      const bar = barFillRef.current
      if (bar) {
        bar.__smooth = damp(bar.__smooth ?? 0, portalProgress.current, 9, 0.016)
        bar.style.transform = `scaleX(${bar.__smooth})`
      }
    }
    gsap.ticker.add(decay)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      gsap.ticker.remove(decay)
      window.removeEventListener('wheel', onWheel)
    }
  }, [portalOpen, setPortalOpen])

  /* reset the charge when the portal closes again */
  useEffect(() => {
    if (!portalOpen) {
      portalProgress.current = 0
      if (barFillRef.current) barFillRef.current.__smooth = 0
    }
  }, [portalOpen])

  return (
    <footer
      ref={footerRef}
      id="contact"
      className="relative flex min-h-[100svh] flex-col justify-between px-5 pb-24 pt-[16vh] md:px-10"
    >
      {/* CTA */}
      <div>
        <span className="eyebrow">04 — contact</span>
        <MaskedLines
          as="h2"
          start="top 86%"
          lines={['Is Your Next Project', 'Ready to Go Wild?']}
          className="display-xl mt-6"
        />
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Magnetic strength={0.5}>
            <a
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor="SAY HI"
              data-cursor-variant="view"
              className="pill btn-sweep btn-blank !px-9 !py-5 !text-[1.05rem]"
            >
              Let&apos;s build together!
              <ArrowUpRight size={18} />
            </a>
          </Magnetic>
          <span className="eyebrow">open to working • student and entry roles</span>
        </div>
      </div>

      {/* info grid */}
      <div className="mt-[12vh] grid gap-10 border-t border-line pt-8 md:grid-cols-4">
        <div>
          <span className="eyebrow">located</span>
          <p className="mt-3 text-[0.95rem] font-semibold">Chemnitz, Germany</p>
          <p className="eyebrow mt-1">Europe/Berlin · CET</p>
          <p
            className="mt-2 font-mono text-[1.15rem] font-bold tracking-tight"
            style={{ color: 'var(--c-accent)', fontVariantNumeric: 'tabular-nums' }}
          >
            {timeStr}
          </p>
        </div>

        <div>
          <span className="eyebrow">socials</span>
          <div className="mt-3 flex flex-col items-start gap-2">
            <RollLink
              label="GitHub"
              href="https://github.com/TanvirHasanHridoy/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.95rem] font-semibold"
            />
            <RollLink
              label="LinkedIn"
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.95rem] font-semibold"
            />
            <RollLink
              label="X / Twitter"
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.95rem] font-semibold"
            />
          </div>
        </div>

        <div>
          <span className="eyebrow">contact</span>
          <p className="mt-3 max-w-[26ch] text-[0.95rem] leading-relaxed text-muted">
            The fastest way in is LinkedIn — full profile, projects and open to
            work status all live there.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-6 md:items-end">
          <div className="flex gap-2">
            <a
              href="https://github.com/TanvirHasanHridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor-variant="magnetic"
              data-cursor=""
              aria-label="GitHub"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <GithubMark />
            </a>
            <a
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor-variant="magnetic"
              data-cursor=""
              aria-label="LinkedIn"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <LinkedinMark />
            </a>
            <a
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              data-cursor-variant="magnetic"
              data-cursor=""
              aria-label="X"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <XMark />
            </a>
          </div>
          <span className="eyebrow">© 2026 S M Tanvir Hasan Hridoy</span>
        </div>
      </div>

      {/* CONTINUE TO SCROLL portal bar */}
      <div
        ref={barWrapRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5 pb-3 opacity-0 transition-opacity duration-500 md:px-10"
      >
        <div className="flex items-center justify-between gap-6">
          <span className="eyebrow">continue to scroll</span>
          <div
            className="relative h-[3px] flex-1 overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--c-fg) 14%, transparent)', borderRadius: 4 }}
          >
            <div
              ref={barFillRef}
              className="absolute inset-y-0 left-0 w-full origin-left"
              style={{ background: 'var(--c-accent)', transform: 'scaleX(0)' }}
            />
          </div>
          <span className="eyebrow">labs portal</span>
        </div>
      </div>
    </footer>
  )
}
