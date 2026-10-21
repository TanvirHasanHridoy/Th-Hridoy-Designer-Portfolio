/**
 * Per-frame mutable store.
 *
 * React state (zustand) is reserved for discrete UI state. Everything that
 * changes every frame (scroll progress, pointer, velocities) lives here so
 * `useFrame` inside the WebGL scene can read it without triggering
 * React re-renders.
 */

export interface Vec2 {
  x: number
  y: number
}

export const scrollStore = {
  /** Raw scroll position in px (from Lenis) */
  scrollY: 0,
  /** 0 → 1 position across the whole document */
  scrollProgress: 0,
  /** Raw px/frame velocity from Lenis */
  scrollVelocity: 0,
  /** Smoothed velocity — used to skew / stretch 3D objects */
  scrolledVelocitySmoothed: 0,
  /** Smoothed scroll progress */
  lerpedScrollProgress: 0,

  /** Raw pointer, normalized −1→1 (x: left→right, y: bottom→top) */
  pointer: { x: 0, y: 0 } as Vec2,
  /** Spring-smoothed pointer */
  pointerLerped: { x: 0, y: 0 } as Vec2,
  /** Smoothed pointer speed magnitude (0 → ~4) */
  pointerVelocity: 0,

  /** Viewport size, mirrored for the 3D scene */
  viewport: { width: 1, height: 1 } as { width: number; height: number },

  /** Index of the currently pinned section (drives camera choreography) */
  activeSection: 0,
  /** Smoothed 0→1 hero-entrance progress, pushed by the preloader */
  entrance: 0,

  /** Work carousel turntable — fed by the DOM drag overlay, read in useFrame */
  carousel: {
    /** current turntable angle (rad) */
    angle: 0,
    /** angular velocity (rad/s) — inertia after release */
    spin: 0,
    /** true while the pointer is held down on the arena */
    dragging: false,
    /** slow ambient drift until the user first interacts */
    interacted: false,
  },

  /* Project-model interaction plumbing (see ProjectModels.tsx) */
  /** Click counter — the DOM bump when the user taps the active model;
      model components watch this and run their demo sequences */
  modelPulse: 0,
  /** Screen-space hit circle of the featured model root; written every frame.
      `ok=false` while the model is faded out / inactive (no DOM hit tests). */
  modelRect: { x: 0, y: 0, r: 0, ok: false } as { x: number; y: number; r: number; ok: boolean },
  /** Screen-space hit circles for ALL three project slots — lets the DOM
      open a side (off-center) object directly by tapping it in the ring */
  slotRects: [0, 1, 2].map(() => ({ x: 0, y: 0, r: 0, ok: false })) as Array<{
    x: number
    y: number
    r: number
    ok: boolean
  }>,
  /** Focus-mode showpiece manipulation (drag-rotate inertia + wheel zoom),
      fed by the DOM interaction layer and integrated per-frame in the stage */
  modelSpin: {
    /** user yaw/pitch (rad) applied to the focused object */
    yaw: 0,
    pitch: 0,
    /** rotation inertia (rad/s) after release */
    yawVel: 0,
    pitchVel: 0,
    /** wheel zoom factor (current damped value + raw target) */
    zoom: 1,
    zoomTarget: 1,
  },
  /** Feature-row ↔ object hotspot: index of the feature row under the
      pointer in the focus detail panel (null = none) — the focused model
      draws a pulsing locator ring at the mapped part */
  hotspot: null as number | null,
  /** Imperative per-feature actions fired from the panel's feature rows
      ("run this inside the object"): bump `n` with an action name; models
      consume it like `modelPulse` and run that slice of their choreography */
  modelAction: { n: 0, name: null } as { n: number; name: string | null },
}

/** Frame-rate independent damping toward a target. */
export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number => target + (current - target) * Math.exp(-lambda * dt)

/** Smoothed velocity helper — clamps extreme spikes (tab switch etc.). */
export const dampVelocity = (
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number =>
  damp(current, Math.min(Math.abs(target), 6), lambda, dt)

/**
 * Global pointer tracking. Called once from the smooth-scroll provider —
 * writes normalized coordinates and mirrors the viewport into the store.
 */
export function initPointerTracking(): () => void {
  const syncViewport = () => {
    scrollStore.viewport.width = window.innerWidth
    scrollStore.viewport.height = window.innerHeight
  }
  syncViewport()

  const onPointerMove = (e: PointerEvent) => {
    scrollStore.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    scrollStore.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('resize', syncViewport, { passive: true })

  return () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('resize', syncViewport)
  }
}

/**
 * Advanced the mutable store once per frame. Driven by the gsap.ticker so
 * DOM, smooth scroll and the WebGL world all agree on the same clock.
 */
export function tickStores(dt: number): void {
  const s = scrollStore

  s.pointerLerped.x = damp(s.pointerLerped.x, s.pointer.x, 7, dt)
  s.pointerLerped.y = damp(s.pointerLerped.y, s.pointer.y, 7, dt)

  const instantSpeed = Math.min(
    Math.hypot(s.pointer.x - s.pointerLerped.x, s.pointer.y - s.pointerLerped.y) / Math.max(dt, 1 / 120),
    5,
  )
  s.pointerVelocity = dampVelocity(s.pointerVelocity, instantSpeed, 4, dt)

  s.lerpedScrollProgress = damp(s.lerpedScrollProgress, s.scrollProgress, 5, dt)
  s.scrolledVelocitySmoothed = dampVelocity(s.scrolledVelocitySmoothed, s.scrollVelocity, 5, dt)
}
