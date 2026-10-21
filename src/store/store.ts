import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

export type CursorVariant =
  | 'default' // small ring, no label
  | 'magnetic' // medium ring, no label
  | 'view' // filled accent disc + label (VIEW CASE)
  | 'play' // filled accent disc + label (PLAY REEL)
  | 'drag' // filled accent disc + label (DRAG / THROW)

export interface CursorState {
  label: string
  variant: CursorVariant
}

interface UIState {
  /** Preloader has finished and the site is unlocked */
  ready: boolean
  setReady: (v: boolean) => void

  menuOpen: boolean
  setMenuOpen: (v: boolean) => void

  soundOn: boolean
  setSoundOn: (v: boolean) => void

  theme: ThemeMode
  setTheme: (v: ThemeMode) => void

  /** Rapier physics pit should be mounted (section 4 active) */
  pitActive: boolean
  setPitActive: (v: boolean) => void

  /** About / Labs portal modal (triggered from the footer scroll bar) */
  portalOpen: boolean
  setPortalOpen: (v: boolean) => void

  /** Work-carousel turntable should be mounted/visible (section 3 active) */
  carouselActive: boolean
  setCarouselActive: (v: boolean) => void

  /** Which project slab currently faces the camera (0..2, set from the canvas) */
  featuredIndex: number
  setFeaturedIndex: (v: number) => void

  /** Pointer is over the interactive 3D project model (canvas → DOM cursor) */
  modelHover: boolean
  setModelHover: (v: boolean) => void

  /** Focus mode: detail panel expanded for the featured project */
  workFocusOpen: boolean
  setWorkFocusOpen: (v: boolean) => void

  /** Which project object is expanded in focus mode (null while closed) —
      decoupled from featuredIndex so tapping a side object can expand the
      project the user actually clicked, even while the ring still has to
      tween it to the front */
  workFocusIndex: number | null
  /** Expand project `i`: opens focus mode and expands that object */
  openFocus: (i: number) => void
  /** Leave focus mode (object docks back into the ring) */
  closeFocus: () => void

  cursor: CursorState
  setCursor: (label: string, variant: CursorVariant) => void
  resetCursor: () => void

  /** 0 → 1 overall page load progress used by the preloader counter */
  loadProgress: number
  setLoadProgress: (v: number) => void
}

export const useUI = create<UIState>((set) => ({
  ready: false,
  setReady: (v) => set({ ready: v }),

  menuOpen: false,
  setMenuOpen: (v) => set({ menuOpen: v }),

  soundOn: false,
  setSoundOn: (v) => set({ soundOn: v }),

  theme: 'light',
  setTheme: (v) => set({ theme: v }),

  pitActive: false,
  setPitActive: (v) => set({ pitActive: v }),

  portalOpen: false,
  setPortalOpen: (v) => set({ portalOpen: v }),

  carouselActive: false,
  setCarouselActive: (v) => set({ carouselActive: v }),

  featuredIndex: 0,
  setFeaturedIndex: (v) => set((s) => (s.featuredIndex === v ? s : { featuredIndex: v })),

  modelHover: false,
  setModelHover: (v) => set((s) => (s.modelHover === v ? s : { modelHover: v })),

  workFocusOpen: false,
  setWorkFocusOpen: (v) => set((s) => (s.workFocusOpen === v ? s : { workFocusOpen: v })),

  workFocusIndex: null,
  openFocus: (i) =>
    set((s) =>
      s.workFocusOpen && s.workFocusIndex === i
        ? s
        : { workFocusIndex: i, workFocusOpen: true },
    ),
  closeFocus: () =>
    set((s) =>
      s.workFocusOpen ? { workFocusOpen: false, workFocusIndex: null } : s,
    ),

  cursor: { label: '', variant: 'default' },
  setCursor: (label, variant) =>
    set((s) =>
      s.cursor.label === label && s.cursor.variant === variant
        ? s
        : { cursor: { label, variant } },
    ),
  resetCursor: () =>
    set((s) =>
      s.cursor.label === '' && s.cursor.variant === 'default'
        ? s
        : { cursor: { label: '', variant: 'default' } },
    ),

  loadProgress: 0,
  setLoadProgress: (v) => set({ loadProgress: v }),
}))

/* DEV ONLY: console access for browser QA */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__useUI = useUI
  void import('./scrollStore').then((m) => {
    ;(window as unknown as Record<string, unknown>).__scrollStore = m.scrollStore
  })
}
