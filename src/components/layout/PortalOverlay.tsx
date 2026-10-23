import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowUpRight, X } from 'lucide-react'
import { useUI } from '../../store/store'
import { playCue } from '../../audio/engine'
import { scrollToSection } from '../../hooks/useSmoothScroll'
import { GithubMark, LinkedinMark } from '../ui/BrandIcons'

const LAB_EXPERIMENTS = [
  {
    index: '01',
    title: 'Physics Sandbox',
    desc: 'Rapier zero-G body pit — the arena you just scrolled through, live in this page.',
    tag: 'this site',
  },
  {
    index: '02',
    title: 'JobFlow Score Engine',
    desc: 'Deterministic, explainable job-application scoring: 42 signals, zero hand-waving.',
    tag: 'Job-Flow',
  },
  {
    index: '03',
    title: 'Sudoku Multiplayer Net-code',
    desc: 'Real-time head-to-head Sudoku with server-authoritative validation.',
    tag: 'Sudoku-Online',
  },
  {
    index: '04',
    title: 'Shader Sketchbook',
    desc: 'GLSL sketches — simplex displacement, iridescence, and grain-driven light.',
    tag: 'glsl',
  },
] as const

const PROJECT_LINKS = [
  {
    label: 'Job-Flow',
    href: 'https://github.com/TanvirHasanHridoy/Job-Flow',
    note: 'AI-native job application tracker',
  },
  {
    label: 'Sudoku-Online',
    href: 'https://github.com/TanvirHasanHridoy/Sudoku-Online',
    note: 'head-to-head Sudoku showdown',
  },
  {
    label: 'NapTrip',
    href: 'https://github.com/TanvirHasanHridoy/NapTrip',
    note: 'nap-friendly travel planning',
  },
] as const

/**
 * The Labs Portal — an overlay modal reached by pushing the wheel past the
 * bottom of the footer. React-authoritative visibility (no ghost panels);
 * scroll is locked by App while open.
 */
export default function PortalOverlay() {
  const portalOpen = useUI((s) => s.portalOpen)
  const setPortalOpen = useUI((s) => s.setPortalOpen)
  const panelRef = useRef<HTMLDivElement>(null)
  const wasPortalOpen = useRef(false)

  /* entrance / exit voice */
  useEffect(() => {
    if (portalOpen) playCue('portal')
    else if (wasPortalOpen.current) playCue('close')
    wasPortalOpen.current = portalOpen
  }, [portalOpen])

  /* Escape closes + entrance/exit tween */
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPortalOpen(false)
    }
    window.addEventListener('keydown', onKey)

    if (portalOpen) {
      gsap.fromTo(
        panel,
        { y: 42, scale: 0.96, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.6, ease: 'expo.out' },
      )
    } else {
      gsap.to(panel, {
        y: 30,
        scale: 0.97,
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.in',
      })
    }

    return () => window.removeEventListener('keydown', onKey)
  }, [portalOpen, setPortalOpen])

  /* focus management — initial focus, Tab trap, restore on close */
  useEffect(() => {
    if (!portalOpen) return
    const panel = panelRef.current
    if (!panel) return
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0)

    /* one tick so the entrance tween has made the panel visible */
    const focusTimer = window.setTimeout(() => {
      focusables()[0]?.focus({ preventScroll: true })
    }, 80)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKey)

    return () => {
      window.clearTimeout(focusTimer)
      panel.removeEventListener('keydown', onKey)
      previous?.focus({ preventScroll: true })
    }
  }, [portalOpen])

  const onNavigate = (target: string) => {
    setPortalOpen(false)
    window.setTimeout(() => scrollToSection(target), 80)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={portalOpen ? true : undefined}
      aria-label="About and Labs portal"
      aria-hidden={!portalOpen}
      inert={!portalOpen}
      className="fixed inset-0 z-[65] flex items-stretch justify-center p-4 md:p-8"
      style={{
        background: 'color-mix(in srgb, var(--c-bg) 78%, transparent)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        visibility: portalOpen ? 'visible' : 'hidden',
      }}
    >
      <div className="flex w-full max-w-[1200px] flex-col overflow-hidden rounded-[28px] border border-line"
        style={{ background: 'var(--c-bg)' }}
      >
        {/* top bar */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
          <span className="eyebrow">About &amp; Labs — the playground behind the portfolio</span>
          <button
            type="button"
            onClick={() => setPortalOpen(false)}
            data-cursor="CLOSE"
            data-cursor-variant="view"
            aria-label="Close portal"
            className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <X size={18} />
          </button>
        </div>

        {/* scrollable body — focusable so the keyboard can scroll it */}
        <div
          tabIndex={0}
          role="region"
          aria-label="About and labs details"
          className="flex flex-1 flex-col gap-10 overflow-y-auto px-6 py-8 md:flex-row md:gap-16 md:px-10"
        >
          {/* about column */}
          <div className="md:w-[38%]">
            <h3 className="display-lg">S M Tanvir Hasan Hridoy</h3>
            <p className="mt-5 max-w-[34ch] text-[0.98rem] leading-relaxed text-muted">
              Developer based in Chemnitz, Germany — building AI-native tools and
              interactive web experiences. I like the seam where engineering
              rigor meets play: deterministic scoring engines, authoritative
              multiplayer net-code, real physics in the browser.
            </p>
            <p className="mt-4 max-w-[34ch] text-[0.98rem] leading-relaxed text-muted">
              This portfolio itself is a lab experiment: a persistent WebGL
              scene, scroll-choreographed cameras and a zero-gravity physics
              pit — all wired to the same clock.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href="https://github.com/TanvirHasanHridoy/"
                target="_blank"
                rel="noreferrer"
                data-cursor-variant="magnetic"
                data-cursor=""
                aria-label="GitHub"
                className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
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
                className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <LinkedinMark />
              </a>
            </div>
          </div>

          {/* labs column */}
          <div className="flex-1">
            <span className="eyebrow">lab experiments</span>
            <div className="mt-4 flex flex-col">
              {LAB_EXPERIMENTS.map((exp) => (
                <div
                  key={exp.index}
                  className="group flex items-start gap-5 border-b border-line py-4 first:pt-0 last:border-b-0"
                >
                  <span className="eyebrow shrink-0 pt-1" style={{ color: 'var(--c-accent)' }}>
                    {exp.index}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-[1.15rem] font-semibold tracking-tight">
                        {exp.title}
                      </span>
                      <span className="eyebrow ml-auto hidden md:inline">{exp.tag}</span>
                    </div>
                    <p className="mt-1 max-w-[52ch] text-[0.9rem] leading-relaxed text-muted">
                      {exp.desc}
                    </p>
                  </div>
                </div>
              ))}

              {/* real project quick-links */}
              <div className="mt-6 flex flex-wrap gap-3">
                {PROJECT_LINKS.map((p) => (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    title={p.note}
                    className="pill btn-sweep btn-blank !px-5 !py-3 !text-[0.85rem]"
                  >
                    {p.label}
                    <ArrowUpRight size={14} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 md:px-10">
          <span className="eyebrow">portal exit</span>
          <button
            type="button"
            data-cursor="JUMP"
            data-cursor-variant="view"
            onClick={() => onNavigate('#work')}
            className="pill btn-sweep btn-blank !px-6 !py-3.5 !text-[0.9rem]"
          >
            Back to the work
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
