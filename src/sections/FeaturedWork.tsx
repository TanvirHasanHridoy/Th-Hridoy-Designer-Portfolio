import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowUpRight, X } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import Magnetic from '../components/ui/Magnetic'
import { GithubMark } from '../components/ui/BrandIcons'
import { PROJECTS, type Project, type ProjectId } from '../data/projects'
import { useUI } from '../store/store'
import { scrollStore } from '../store/scrollStore'
import { lenisRef } from '../hooks/useSmoothScroll'

const STEP = (Math.PI * 2) / PROJECTS.length
const TAU = Math.PI * 2

/** feature-row index → model action name (`scrollStore.modelAction`) */
const FEATURE_ACTIONS: Record<ProjectId, string[]> = {
  'job-flow': ['score', 'chips', 'doc', 'kanban', 'pdf'],
  'sudoku-online': ['elo', 'sabotage', 'voice', 'engine', 'resync'],
  'naptrip': ['alarm', 'sprint', 'arrivals', 'pin', 'favourites'],
}

/** tween the turntable to bring project i to the front (shortest wrap-around) */
const tweenAngleTo = (i: number) => {
  const car = scrollStore.carousel
  const base = -i * STEP
  const target = base - Math.round((base - car.angle) / TAU) * TAU
  car.spin = 0
  car.interacted = true
  gsap.to(car, { angle: target, duration: 1.05, ease: 'power3.inOut' })
}

/**
 * Featured Work — the project-object carousel stage.
 *
 * The three flagship builds appear as standalone, perpetually animating 3D
 * objects in the persistent WebGL canvas (`ProjectModels` — no cards, no
 * cover slabs). This DOM stage owns:
 *   • a full-bleed drag surface — idle: drag spins the object ring with
 *     inertia; focused: drag rotates the expanded object, wheel zooms it
 *   • tap targets — tapping the fronted object opens focus mode, tapping a
 *     shelved object brings it front and expands it in one gesture, tapping
 *     the expanded object replays its feature demo, tapping the void closes
 *   • the context strip (idle) / the left detail panel (focus mode) —
 *     the object pans right while features, stack and links stamp in left
 */
export default function FeaturedWork() {
  const featuredIndex = useUI((s) => s.featuredIndex)
  const focusIndex = useUI((s) => s.workFocusIndex)
  const focusOpen = useUI((s) => s.workFocusOpen)
  const modelHover = useUI((s) => s.modelHover)
  const stageRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [hasInteracted, setHasInteracted] = useState(false)

  const idleProject = PROJECTS[featuredIndex] ?? PROJECTS[0]
  const focusedProject = focusIndex != null ? PROJECTS[focusIndex] ?? PROJECTS[0] : null

  /** ring tween to project `i`; while focused it also expands that object */
  const goTo = (i: number) => {
    tweenAngleTo(i)
    if (useUI.getState().workFocusOpen) useUI.getState().openFocus(i)
    scrollStore.hotspot = null
    setHasInteracted(true)
  }

  /* interaction layer — pointer capture + drag feeds + tap hit-tests */
  useEffect(() => {
    const stage = stageRef.current
    const car = scrollStore.carousel
    const spin = scrollStore.modelSpin
    if (!stage) return
    let mode: 'none' | 'ring' | 'rotate' = 'none'
    let lastX = 0
    let lastY = 0
    let downX = 0
    let downY = 0

    const down = (e: PointerEvent) => {
      const ui = useUI.getState()
      const t = e.target as HTMLElement | null
      const onWidget = !!t?.closest?.('a,button')
      const inPanel = !!t?.closest?.('[data-focus-panel]')
      lastX = e.clientX
      lastY = e.clientY
      downX = e.clientX
      downY = e.clientY
      if (inPanel || onWidget) {
        mode = 'none' /* panel scrolls / clicks normally */
        return
      }
      /* focused → drag rotates the object; idle → drag spins the ring */
      mode = ui.workFocusOpen ? 'rotate' : 'ring'
      if (mode === 'rotate') {
        spin.yawVel = 0
        spin.pitchVel = 0
      }
      car.dragging = true
      if (mode === 'ring') {
        car.interacted = true
        setHasInteracted(true)
      }
      try {
        stage.setPointerCapture(e.pointerId)
      } catch {
        /* capture optional */
      }
    }
    const move = (e: PointerEvent) => {
      if (mode === 'none') return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (mode === 'ring') {
        gsap.killTweensOf(scrollStore.carousel, 'angle')
        const d = dx * 0.0062
        car.angle += d
        car.spin = d * 30 /* inertia feed (rad/s) */
      } else {
        /* showcase rotate with inertia — pitch clamped */
        spin.yaw += dx * 0.0062
        spin.yawVel = dx * 0.0062 * 26
        spin.pitch = Math.min(0.55, Math.max(-0.55, spin.pitch + dy * 0.004))
        spin.pitchVel = dy * 0.004 * 20
        setHasInteracted(true)
      }
    }
    const up = (e: PointerEvent) => {
      if (mode === 'none') return
      try {
        stage.releasePointerCapture(e.pointerId)
      } catch {
        /* release optional */
      }
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
      car.dragging = false
      mode = 'none'
      if (moved > 9) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('a,button')) return
      const ui = useUI.getState()
      const hitSlot = (i: number) => {
        const r = scrollStore.slotRects[i]
        return r.ok && Math.hypot(e.clientX - r.x, e.clientY - r.y) < r.r
      }
      if (ui.workFocusOpen) {
        /* expanded: tap the object to replay its demo, tap the void to close */
        if (t?.closest?.('[data-focus-panel]')) return
        if (hitSlot(ui.workFocusIndex ?? ui.featuredIndex)) {
          scrollStore.modelPulse += 1
          return
        }
        ui.closeFocus()
        return
      }
      /* idle: tap the fronted object to expand it in place, or tap a
         shelved one to bring it front and expand it in a single gesture */
      for (let i = 0; i < PROJECTS.length; i += 1) {
        if (!hitSlot(i)) continue
        setHasInteracted(true)
        if (i !== ui.featuredIndex) tweenAngleTo(i)
        ui.openFocus(i)
        return
      }
    }
    const cancel = () => {
      mode = 'none'
      car.dragging = false
    }

    stage.addEventListener('pointerdown', down)
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerup', up)
    stage.addEventListener('pointercancel', cancel)
    return () => {
      stage.removeEventListener('pointerdown', down)
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerup', up)
      stage.removeEventListener('pointercancel', cancel)
      car.dragging = false
      scrollStore.modelSpin.yawVel = 0
      /* leaving the section altogether also leaves focus mode */
      useUI.getState().closeFocus()
    }
  }, [])

  /* wheel zoom on the expanded object (panel keeps its own scrolling).
     Page scroll is frozen for the duration of focus mode — the wheel
     belongs to the object, and the section can't be scrolled away from
     out from under the opened state. */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !focusOpen) return
    const lenis = lenisRef.current
    lenis?.stop()
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-focus-panel]')) return
      e.preventDefault()
      const s = scrollStore.modelSpin
      s.zoomTarget = Math.min(
        1.55,
        Math.max(0.75, s.zoomTarget * Math.exp(-e.deltaY * 0.0011)),
      )
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
      /* resume scrolling, but anchor Lenis's target to the actual position —
         otherwise a queued pre-focus glide (hard flick into #work) resumes on
         close and runs away with the page */
      lenis?.start()
      lenis?.scrollTo(lenis.scroll, { immediate: true })
      /* drop any feature-row hover so the locator ring can't ghost on */
      scrollStore.hotspot = null
    }
  }, [focusOpen])

  /* keyboard: Escape closes · ←/→ swap the expanded project */
  useEffect(() => {
    if (!focusOpen) return
    const unsubReady = useUI.subscribe((s) => {
      if (!s.carouselActive) useUI.getState().closeFocus()
    })
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      const cur = ui.workFocusIndex ?? ui.featuredIndex
      if (e.key === 'Escape') ui.closeFocus()
      else if (e.key === 'ArrowRight') goTo((cur + 1) % PROJECTS.length)
      else if (e.key === 'ArrowLeft')
        goTo((cur + PROJECTS.length - 1) % PROJECTS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unsubReady()
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpen, focusIndex, featuredIndex])

  /* context strip crossfade — content swap on featured change only */
  useEffect(() => {
    const strip = stripRef.current
    if (!strip || focusOpen) return
    gsap.fromTo(
      strip,
      { y: 22, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, ease: 'expo.out' },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredIndex])

  /* detail panel stamp-in — on open and on project swap while focused */
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    gsap.fromTo(
      panel,
      { x: -26, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIndex])

  return (
    <section id="work" className="relative h-[175svh]">
      <div
        ref={stageRef}
        className="absolute inset-0 sticky top-0 flex h-[100svh] flex-col px-5 pb-6 pt-[14vh] md:px-10"
      >
        {/* header — compact so the object carousel keeps the stage */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">02 — selected works</span>
            <MaskedLines
              as="h2"
              start="top 84%"
              lines={['Featured Work']}
              className="display-lg mt-4"
            />
          </div>
          <p className="hidden max-w-[36ch] pb-2 text-sm leading-relaxed text-muted md:block">
            {focusOpen
              ? 'Focus mode — drag the object to rotate, scroll to zoom, tap it to replay its demo, Esc to close.'
              : 'Three flagship builds as live 3D objects — drag to spin the ring, tap one to open.'}
          </p>
        </div>

        {/* ARENA — drag surface over the object ring */}
        <div
          data-cursor={modelHover ? (focusOpen ? 'ROTATE' : 'OPEN') : focusOpen ? 'DRAG' : hasInteracted ? '' : 'DRAG'}
          data-cursor-variant={modelHover ? 'view' : 'drag'}
          className="relative flex-1 touch-pan-y select-none"
          role="application"
          aria-label="Project object carousel — drag to explore; tap an object to open it"
        >
          {/* fronted-object reticle hint */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
            style={{
              width: 'min(26vw, 170px)',
              height: 'min(26vw, 170px)',
              opacity: hasInteracted || focusOpen ? 0 : 0.4,
              transition: 'opacity .6s var(--e-io)',
              borderColor: 'color-mix(in srgb, var(--c-fg) 30%, transparent)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 eyebrow"
            style={{
              opacity: hasInteracted || focusOpen ? 0 : 1,
              transition: 'opacity .6s var(--e-io)',
            }}
            aria-hidden
          >
            drag to spin · tap an object
          </div>
        </div>

        {/* BOTTOM STRIP — idle context card (fades away in focus mode) */}
        <div
          ref={stripRef}
          className="mt-auto rounded-[22px] border border-line px-4 pb-3 pt-4 md:px-7 md:pb-4 md:pt-5"
          style={{
            background: 'color-mix(in srgb, var(--c-bg) 78%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            opacity: focusOpen ? 0 : 1,
            transform: focusOpen ? 'translateY(16px) scale(0.985)' : 'none',
            pointerEvents: focusOpen ? 'none' : 'auto',
            transition:
              'opacity .5s var(--e-io), transform .5s var(--e-io)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 md:gap-5">
            <div className="flex min-w-0 flex-1 basis-full items-start gap-4 md:basis-auto md:gap-6">
              <span
                className="no-select hidden leading-none sm:block"
                aria-hidden
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(2.6rem, 5vw, 4.6rem)',
                  letterSpacing: '-0.04em',
                  color: 'var(--c-fg)',
                  opacity: 0.16,
                }}
              >
                {idleProject.index}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3
                    className="display-md"
                    style={{ fontSize: 'clamp(1.45rem, 2.6vw, 2.4rem)' }}
                  >
                    {idleProject.title}
                  </h3>
                  <span className="eyebrow rounded-full border border-line px-2.5 py-1">
                    {idleProject.year}
                  </span>
                </div>
                <p className="eyebrow mt-2 truncate">{idleProject.tags.join(' • ')}</p>
                <p className="mt-2 hidden max-w-[52ch] text-[0.92rem] leading-relaxed text-muted line-clamp-2 sm:block">
                  {idleProject.description}
                </p>
              </div>
            </div>

            <div className="flex min-h-[42px] w-full items-center gap-2.5 md:min-h-[46px] md:w-auto">
              {idleProject.demo && (
                <Magnetic strength={0.45}>
                  <a
                    href={idleProject.demo}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="OPEN"
                    data-cursor-variant="magnetic"
                    className="pill btn-sweep !px-5 !py-3.5 !text-[0.9rem]"
                  >
                    Open project
                    <ArrowUpRight size={15} />
                  </a>
                </Magnetic>
              )}
              <ProjectGithubButton
                label="GitHub"
                href={idleProject.href}
                title={idleProject.title}
              />
            </div>
          </div>

          {/* dot selectors — tween the ring */}
          <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Projects">
            {PROJECTS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === featuredIndex}
                aria-label={p.title}
                onClick={() => goTo(i)}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === featuredIndex ? 34 : 14,
                  background:
                    i === featuredIndex
                      ? 'var(--c-accent)'
                      : 'color-mix(in srgb, var(--c-fg) 22%, transparent)',
                }}
                data-cursor-variant="magnetic"
                data-cursor=""
              />
            ))}
            <span className="eyebrow ml-2 hidden sm:inline">
              {String(featuredIndex + 1).padStart(2, '0')} /{' '}
              {String(PROJECTS.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* FOCUS PANEL — left of the expanded object (desktop), bottom sheet (portrait) */}
        {focusOpen && focusedProject && (
          <div
            ref={panelRef}
            data-focus-panel
            data-lenis-prevent=""
            className="absolute bottom-4 right-4 z-20 max-h-[56svh] overflow-y-auto overscroll-contain rounded-[22px] border border-line px-5 pb-4 pt-5 md:bottom-9 md:right-auto md:top-[27vh] md:max-h-[65svh] md:w-[min(36vw,440px)] md:pb-5"
            style={{
              background: 'color-mix(in srgb, var(--c-bg) 80%, transparent)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <FocusPanel project={focusedProject} featuredIndex={featuredIndex} onGoTo={goTo} />
          </div>
        )}
      </div>
    </section>
  )
}

function ProjectGithubButton({ label, href, title }: { label: string; href: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-cursor-variant="magnetic"
      data-cursor="CODE"
      aria-label={`${title} on ${label}`}
      className="grid size-11 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
    >
      <GithubMark />
    </a>
  )
}

/** Focus mode — left detail panel: tech stack, headline features and links */
function FocusPanel({
  project,
  featuredIndex,
  onGoTo,
}: {
  project: Project
  featuredIndex: number
  onGoTo: (i: number) => void
}) {
  const close = () => useUI.getState().closeFocus()
  return (
    <div className="relative">
      <button
        type="button"
        onClick={close}
        data-cursor-variant="magnetic"
        data-cursor="CLOSE"
        aria-label="Close focus mode"
        className="absolute right-0 top-0 grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <X size={17} />
      </button>

      <div>
        {/* numeral + title row */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pe-10 md:pe-12">
          <span
            className="no-select leading-none"
            aria-hidden
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
              letterSpacing: '-0.04em',
              color: 'var(--c-accent)',
              opacity: 0.5,
            }}
          >
            {project.index}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="display-md" style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.4rem)' }}>
              {project.title}
            </h3>
            <span className="eyebrow rounded-full border border-line px-2.5 py-1">
              {project.year}
            </span>
            <span className="eyebrow text-accent">focus mode</span>
          </div>
        </div>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
          {project.description}
        </p>

        <p className="eyebrow mt-3">tech stack</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {project.tech.map((tk) => (
            <span
              key={tk}
              className="eyebrow rounded-full border border-line px-3 py-1.5"
              style={{ color: 'var(--c-fg)' }}
            >
              {tk}
            </span>
          ))}
        </div>

        <p className="eyebrow mt-3">key features</p>
        <p className="mt-1 text-[0.72rem] tracking-wide text-muted">
          hover a feature — it lights up in the object · click to run it
        </p>
        <ul className="mt-1.5 space-y-1">
          {project.features.map((f, i) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => {
                  scrollStore.modelAction.n += 1
                  scrollStore.modelAction.name = FEATURE_ACTIONS[project.id]?.[i] ?? null
                  scrollStore.hotspot = i
                }}
                onMouseEnter={() => (scrollStore.hotspot = i)}
                onMouseLeave={() => {
                  if (scrollStore.hotspot === i) scrollStore.hotspot = null
                }}
                data-cursor="RUN"
                data-cursor-variant="view"
                title="Run this inside the object"
                className="group flex w-full items-start gap-2.5 rounded-md px-2 py-1 -mx-2 text-left transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--c-accent)_9%,transparent)]"
              >
                <span
                  className="mt-[6px] inline-block size-2 shrink-0 rounded-[3px] transition-transform duration-300 group-hover:scale-125"
                  style={{ background: 'var(--c-accent)' }}
                  aria-hidden
                />
                <span className="text-[0.9rem] leading-snug" style={{ color: 'var(--c-fg)' }}>
                  {f}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {project.demo && (
            <Magnetic strength={0.45}>
              <a
                href={project.demo}
                target="_blank"
                rel="noreferrer"
                data-cursor="OPEN"
                data-cursor-variant="magnetic"
                className="pill btn-sweep !px-5 !py-3.5 !text-[0.9rem]"
              >
                Open project
                <ArrowUpRight size={15} />
              </a>
            </Magnetic>
          )}
          <a
            href={project.href}
            target="_blank"
            rel="noreferrer"
            data-cursor-variant="magnetic"
            data-cursor="CODE"
            className="pill !px-5 !py-3.5 !text-[0.9rem]"
          >
            View source
            <GithubMark />
          </a>
        </div>

        <p className="eyebrow mt-4 hidden sm:block" style={{ opacity: 0.7 }}>
          drag the object → rotate · scroll → zoom · tap it → replay demo
        </p>
      </div>

      {/* project switcher inside focus mode (← / → keys too) */}
      <div
        className="mt-4 flex items-center gap-2 pe-10 md:pe-12"
        role="tablist"
        aria-label="Projects"
      >
        {PROJECTS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={i === featuredIndex}
            aria-label={p.title}
            onClick={() => onGoTo(i)}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === featuredIndex ? 34 : 14,
              background:
                i === featuredIndex
                  ? 'var(--c-accent)'
                  : 'color-mix(in srgb, var(--c-fg) 22%, transparent)',
            }}
            data-cursor-variant="magnetic"
            data-cursor=""
          />
        ))}
        <span className="eyebrow ml-2">
          {String(featuredIndex + 1).padStart(2, '0')} /{' '}
          {String(PROJECTS.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
