import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import gsap from 'gsap'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { PROJECTS } from '../data/projects'
import { scrollStore, damp } from '../store/scrollStore'
import { useUI } from '../store/store'

/**
 * PROJECT OBJECTS — the project carousel itself. The three flagship builds
 * appear as standalone, perpetually animating 3D objects (no cards, no
 * slabs), each modelled on its product's real visual language:
 *   • JobFlow    — the dark-violet Career Suite app window (workflow guide
 *                  01–04, Gemini badge, ATS match dial, skill chips)
 *   • Co-doku    — the competitive hub: neon-wolf ELO medallion, bolt logo
 *                  tile, live sudoku arena + sabotage keypad
 *   • NapTrip    — a night sleeper-pod diorama: crescent moon, alarm clock
 *                  with geofence rings, sleeping passenger drifting zzz's,
 *                  live departure board and a shimmering journey arc
 * Zero external assets: every surface is drawn onto CanvasTextures.
 *
 * Stage choreography (per-object groups, damped per-frame):
 *   • ring    — cover-flow arrangement driven by the shared turntable
 *               angle (scrollStore.carousel): pointer drag / dot tweens /
 *               inertia create a spin that shelves objects to the sides;
 *               the fronted object idles, sways and answers hover
 *   • focus   — workFocusOpen + workFocusIndex: the tapped object scales up
 *               and pans right of the DOM detail panel (desktop) or into
 *               the upper half (portrait); every other object shrinks away
 *   • exit    — as the work section leaves, everything shrinks + spreads
 *               apart (appear ramp from WorkCarousel)
 *
 * Interaction plumbing (canvas is pointer-events:none, behind DOM):
 *   • drag-rotate / wheel zoom in focus mode are fed into
 *     scrollStore.modelSpin by FeaturedWork and integrated here
 *   • hover    — manual raycast every frame from scrollStore.pointer
 *   • hitzones — each object projects its world position into a screen-space
 *                circle in scrollStore.slotRects (modelRect mirrors the
 *                featured one) for DOM tap hit-tests
 *   • click    — FeaturedWork bumps scrollStore.modelPulse; models watch
 *                the counter and run their feature demo sequences
 */

const ACCENT = '#1A2FFB'
const INK = '#F0F1FA'
const CYAN = '#66FCF1' /* NapTrip's dark-theme glow color */
const PINK = '#FF7ED4' /* ink-splash sabotage */
const AMBER = '#FFB020' /* opponent ghost cursor */
const ALARM = '#FF4E64'
/* JobFlow's career-suite identity (job-flow.devhridoy.site) */
const VIOLET = '#8B7CFF'
const VIOLET_D = '#7C5CFF'
const CYAN2 = '#22D3EE'
const TXT = '#ECEBFF'
/* Co-doku's competitive-hub identity (co-doku.devhridoy.site) */
/* NapTrip night-pod palette */
const MINT = '#9FF7E4'
const CREAM = '#F2EEDC'
const PEACH = '#E9C39B'

/* world-space hit radius of each model root (generous, used for ray + rect) */
const HIT_R = [1.35, 1.85, 1.7]

/* ---------------------------------------------------------------- helpers */
function makeTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const MONO = (px: number, w = 500) => `${w} ${px}px "JetBrains Mono", ui-monospace, monospace`
const SYNE = (px: number, w = 700) => `${w} ${px}px "Syne", system-ui, sans-serif`
const JAK = (px: number, w = 700) => `${w} ${px}px "Plus Jakarta Sans", system-ui, sans-serif`

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface ModelProps {
  hovering: MutableRefObject<boolean>
  pulse: () => number
  /** active focus-panel feature row (−1 = none) — the LocatorRing anchors to it */
  feature: () => number
}

/* ---------------------------------------------------------------- hotspots —
 * Panel feature rows ↔ object parts:
 *   • hovering a row draws a pulsing locator ring at that part (anchors below)
 *   • clicking a row fires `scrollStore.modelAction` — models run one slice
 *     of their demo choreography (named per-model actions)                     */
export type HotspotAnchors = Array<[number, number, number, number]> // x, y, z, ringR

/* JobFlow workflow-guide row centres in the suite-window's local space
   (the rows are baked into suiteTexture: 01–04 at y 272 + i·224 px) */
const JOBFLOW_ROW_Y = [0.85, 0.3626, -0.126, -0.614]

const AFDUR: Record<string, number> = {
  score: 2.6,
  chips: 3.2,
  doc: 3.2,
  kanban: 2.8,
  pdf: 3.2,
  elo: 1.9,
  sabotage: 2.6,
  voice: 3.4,
  engine: 2.4,
  cleanse: 1.8,
  resync: 2.2,
  sprint: 3.4,
  arrivals: 2.3,
  pin: 1.9,
  favourites: 1.9,
}

/** pulsing AR-locator ring that swims between the hovered feature's anchor */
function HotspotRing({
  anchors,
  feature,
  color = ACCENT,
}: {
  anchors: HotspotAnchors
  feature: () => number
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const cur = useRef({ x: 0, y: 0, z: 0, r: anchors[0]?.[3] ?? 0.6 })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    t.current += dt
    const g = ref.current
    if (!g) return
    const m = g.material as THREE.MeshBasicMaterial
    const h = feature()
    if (h < 0 || h >= anchors.length) {
      m.opacity = damp(m.opacity, 0, 6, dt)
      g.visible = m.opacity > 0.012
      return
    }
    const a = anchors[Math.round(h)]
    cur.current.x = damp(cur.current.x, a[0], 9, dt)
    cur.current.y = damp(cur.current.y, a[1], 9, dt)
    cur.current.z = damp(cur.current.z, a[2], 9, dt)
    cur.current.r = damp(cur.current.r, a[3], 9, dt)
    g.visible = true
    g.position.set(cur.current.x, cur.current.y, cur.current.z)
    g.scale.setScalar(cur.current.r * (1 + Math.sin(t.current * 3.4) * 0.045))
    m.opacity = damp(m.opacity, 0.7 + Math.sin(t.current * 2.2) * 0.14, 7, dt)
  })

  return (
    <mesh ref={ref} scale={0.001} visible={false}>
      <ringGeometry args={[0.92, 1, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

/* action timelines shared by the models */
type ActT = Record<string, number>

/* =============================================================== JobFlow AI
 * Rebuilt on job-flow.devhridoy.site's real look: a dark-violet "career
 * suite" app window — J logo mark, Gemini engine badge, the numbered
 * 01–04 workflow guide, ATS match dial, skill-classification chips.      */
const suiteTexture = () =>
  makeTex(1024, 1400, (g) => {
    g.fillStyle = '#151128'
    g.fillRect(0, 0, 1024, 1400)
    g.strokeStyle = '#3E3370'
    g.lineWidth = 4
    g.beginPath()
    g.roundRect(10, 10, 1004, 1380, 34)
    g.stroke()

    /* header — J logo tile + JobFlow AI wordmark + Gemini badge */
    const jGrad = g.createLinearGradient(56, 44, 148, 136)
    jGrad.addColorStop(0, '#8B5CF6')
    jGrad.addColorStop(1, '#6D28D9')
    g.fillStyle = jGrad
    g.beginPath()
    g.roundRect(56, 44, 92, 92, 24)
    g.fill()
    g.fillStyle = '#FFF'
    g.font = SYNE(56)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('J', 102, 92)
    g.textAlign = 'left'
    g.fillStyle = TXT
    g.font = JAK(54, 700)
    g.fillText('JobFlow', 176, 74)
    /* "AI" chip next to the wordmark */
    g.fillStyle = TXT
    g.font = JAK(54, 700)
    const wfW = g.measureText('JobFlow').width
    g.strokeStyle = VIOLET
    g.lineWidth = 4
    g.beginPath()
    g.roundRect(176 + wfW + 22, 44, 72, 72, 18)
    g.stroke()
    g.fillStyle = VIOLET
    g.font = JAK(40, 700)
    g.textAlign = 'center'
    g.fillText('AI', 176 + wfW + 58, 84)
    g.textAlign = 'left'

    /* Gemini engine pill (top right) */
    g.fillStyle = 'rgba(124,92,255,.14)'
    g.beginPath()
    g.roundRect(560, 54, 408, 66, 33)
    g.fill()
    g.strokeStyle = 'rgba(139,124,255,.55)'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = VIOLET
    g.font = JAK(40, 700)
    g.textAlign = 'center'
    g.fillText('✦', 604, 92)
    g.fillStyle = '#B7A9FF'
    g.font = MONO(26)
    g.fillText('GEMINI ENGINE', 792, 94)
    g.textAlign = 'left'

    g.strokeStyle = 'rgba(236,235,255,.09)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(56, 176)
    g.lineTo(968, 176)
    g.stroke()

    /* workflow guide — the site's numbered 01–04 cards as a column */
    g.fillStyle = VIOLET
    g.font = MONO(26)
    g.fillText('WORKFLOW GUIDE', 56, 226)

    const steps: Array<{ n: string; t: string; s: string; c1: string; c2: string }> = [
      { n: '01', t: 'Build Persona Vault', s: 'linkedin · github import', c1: '#8B5CF6', c2: '#6366F1' },
      { n: '02', t: 'Target & Tailor', s: 'jd paste · din 5008 · ats', c1: '#7C5CFF', c2: '#5B4FE8' },
      { n: '03', t: 'Polish & Style Live', s: 'star bullets · palettes', c1: '#A78BFA', c2: '#7C3AED' },
      { n: '04', t: 'Export, Outreach, Track', s: 'vector pdf · kanban', c1: '#10B981', c2: '#059669' },
    ]
    steps.forEach((st, i) => {
      const y = 272 + i * 224
      const ic = g.createLinearGradient(56, y, 132, y + 76)
      ic.addColorStop(0, st.c1)
      ic.addColorStop(1, st.c2)
      g.fillStyle = ic
      g.beginPath()
      g.roundRect(56, y, 76, 76, 18)
      g.fill()
      /* tiny white glyph per step: layers / bullseye / palette / send */
      g.strokeStyle = '#FFF'
      g.lineWidth = 5
      g.beginPath()
      if (i === 0) {
        g.arc(94, y + 38, 15, 0, Math.PI * 2)
        g.stroke()
        g.beginPath()
        g.arc(94, y + 38, 7, 0, Math.PI * 2)
        g.stroke()
      } else if (i === 1) {
        g.arc(94, y + 38, 16, 0, Math.PI * 2)
        g.stroke()
        g.moveTo(94, y + 26)
        g.lineTo(94, y + 50)
        g.moveTo(82, y + 38)
        g.lineTo(106, y + 38)
        g.stroke()
      } else if (i === 2) {
        g.moveTo(94, y + 20)
        g.lineTo(94, y + 56)
        g.moveTo(80, y + 28)
        g.lineTo(108, y + 28)
        g.moveTo(80, y + 48)
        g.lineTo(108, y + 48)
        g.stroke()
      } else {
        g.arc(94, y + 38, 15, 0, Math.PI * 2)
        g.stroke()
        g.fillStyle = '#FFF'
        g.beginPath()
        g.arc(94, y + 38, 6, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = VIOLET
      g.font = SYNE(54)
      g.fillText(st.n, 156, y + 12)
      g.fillStyle = TXT
      g.font = JAK(34, 700)
      g.fillText(st.t, 156, y + 62)
      g.fillStyle = 'rgba(236,235,255,.42)'
      g.font = MONO(21)
      g.fillText(st.s, 158, y + 104)
      if (i < 3) {
        g.strokeStyle = 'rgba(236,235,255,.06)'
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(56, y + 158)
        g.lineTo(640, y + 158)
        g.stroke()
      }
    })

    /* pipeline track label */
    g.fillStyle = VIOLET
    g.font = MONO(24)
    g.fillText('APPLICATION PIPELINE', 56, 1206)
    g.fillStyle = 'rgba(236,235,255,.12)'
    g.beginPath()
    g.roundRect(56, 1236, 520, 12, 6)
    g.fill()

    g.fillStyle = 'rgba(236,235,255,.34)'
    g.font = MONO(20)
    g.fillText('NEXT.JS 16 · DEEPSEEK · PRISMA · SUPABASE · REACT-PDF', 56, 1344)
  })

/** soft radial glow sprite (violet for the suite, moonlit indigo for the pod) */
const glowTex = (inner: string, outer: string) =>
  makeTex(512, 512, (g) => {
    const rad = g.createRadialGradient(256, 256, 30, 256, 256, 248)
    rad.addColorStop(0, inner)
    rad.addColorStop(1, outer)
    g.fillStyle = rad
    g.fillRect(0, 0, 512, 512)
  })

const chipTexOf = (label: string, color: string, text = INK) =>
  makeTex(512, 168, (g) => {
    g.clearRect(0, 0, 512, 168)
    g.fillStyle = color
    g.beginPath()
    g.roundRect(6, 6, 500, 156, 82)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,.22)'
    g.lineWidth = 3
    if (color === '#26223B') {
      g.strokeStyle = '#4A4763'
      g.stroke()
    }
    g.fillStyle = text
    g.font = MONO(46)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(label, 256, 90)
  })

const JOBFLOW_DEMO = 5.4

function JobFlowModel({ hovering, pulse, feature }: ModelProps) {
  const panel = useRef<THREE.Group>(null)
  const scan = useRef<THREE.Mesh>(null)
  const badge = useRef<THREE.Group>(null)
  const chips = useRef<THREE.Group>(null)
  const kanban = useRef<THREE.Group>(null)
  /* workflow-loop parts: live CV sheet, row highlight band, tick badges, ATS needle */
  const cv = useRef<THREE.Group>(null)
  const cvScan = useRef<THREE.Mesh>(null)
  const rowHi = useRef<THREE.Mesh>(null)
  const ticks = useRef<THREE.Group>(null)
  const needle = useRef<THREE.Group>(null)
  const t = useRef(0)
  const demo = useRef(0)
  const chipShow = useRef(0)
  const lastPulse = useRef(pulse())
  /* per-feature action timers (panel row clicks → targeted demo slices) */
  const act: ActT = useRef<ActT>({ score: 0, chips: 0, doc: 0, kanban: 0, pdf: 0 }).current
  const lastAct = useRef(scrollStore.modelAction.n)

  const suiteTex = useMemo(() => suiteTexture(), [])
  const glow = useMemo(() => glowTex('rgba(124,92,255,.34)', 'rgba(124,92,255,0)'), [])
  const chipTex = useMemo(
    () => [
      chipTexOf('EXACT', VIOLET_D),
      chipTexOf('ADJACENT', '#5B4FE8'),
      chipTexOf('MISSING', '#26223B', '#B9B7D3'),
    ],
    [],
  )
  const scoreTex = useMemo(
    () => makeTex(512, 512, (g) => {
      g.clearRect(0, 0, 512, 512)
      g.fillStyle = '#161326'
      g.beginPath()
      g.arc(256, 256, 250, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#4A3D96'
      g.lineWidth = 10
      g.beginPath()
      g.arc(256, 256, 236, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = TXT
      g.font = SYNE(200)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('92', 256, 240)
      g.fillStyle = CYAN2
      g.font = MONO(30)
      g.fillText('ATS MATCH', 256, 424)
    }),
    [],
  )

  /* the CV sheet the suite produces — cream paper, real document rhythm */
  const cvTex = useMemo(
    () =>
      makeTex(640, 840, (g) => {
        g.fillStyle = '#F7F3E8'
        g.fillRect(0, 0, 640, 840)
        g.fillStyle = VIOLET_D
        g.fillRect(0, 0, 16, 840)
        g.fillStyle = '#181428'
        g.font = JAK(38, 800)
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.fillText('S M TANVIR', 46, 74)
        g.fillText('HASAN HRIDOY', 46, 118)
        g.fillStyle = '#6B6480'
        g.font = MONO(19)
        g.fillText('FULL-STACK DEVELOPER · CHEMNITZ', 46, 158)
        /* ATS stamp */
        g.fillStyle = VIOLET_D
        g.beginPath()
        g.roundRect(486, 54, 112, 54, 14)
        g.fill()
        g.fillStyle = '#FFF'
        g.font = MONO(26)
        g.textAlign = 'center'
        g.fillText('ATS 92', 542, 82)
        g.textAlign = 'left'
        /* rule + section blocks */
        const section = (label: string, y: number, lines: number) => {
          g.fillStyle = '#181428'
          g.font = MONO(18)
          g.fillText(label, 46, y)
          g.fillStyle = 'rgba(24,20,40,.16)'
          g.fillRect(46, y + 14, 548, 2)
          for (let i = 0; i < lines; i += 1) {
            const w = i % 3 === 2 ? 340 : 520
            g.fillStyle = 'rgba(24,20,40,.34)'
            g.beginPath()
            g.roundRect(46, y + 34 + i * 22, w, 7, 4)
            g.fill()
          }
        }
        section('EXPERIENCE', 226, 4)
        section('TARGET ROLE · ATS MATRIX', 356, 5)
        section('SKILLS', 500, 3)
        section('DIN 5008 · ONE PAGE', 612, 2)
        /* footer */
        g.fillStyle = 'rgba(24,20,40,.4)'
        g.font = MONO(15)
        g.fillText('GENERATED BY JOBFLOW AI · GEMINI ENGINE · VECTOR PDF', 46, 796)
      }),
    [],
  )
  const tickTex = useMemo(
    () =>
      makeTex(128, 128, (g) => {
        g.clearRect(0, 0, 128, 128)
        g.fillStyle = VIOLET_D
        g.beginPath()
        g.arc(64, 64, 54, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = 'rgba(255,255,255,.75)'
        g.lineWidth = 6
        g.lineCap = 'round'
        g.lineJoin = 'round'
        g.beginPath()
        g.moveTo(40, 66)
        g.lineTo(58, 84)
        g.lineTo(90, 44)
        g.stroke()
      }),
    [],
  )

  useEffect(
    () => () => {
      suiteTex.dispose()
      glow.dispose()
      chipTex.forEach((c) => c.dispose())
      scoreTex.dispose()
      cvTex.dispose()
      tickTex.dispose()
    },
    [suiteTex, glow, chipTex, scoreTex, cvTex, tickTex],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    t.current += dt
    const n = pulse()
    if (n !== lastPulse.current) {
      lastPulse.current = n
      demo.current = JOBFLOW_DEMO
    }
    if (demo.current > 0) demo.current -= dt

    /* panel feature actions → targeted slices of the choreography */
    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name && fired.name in act) act[fired.name] = AFDUR[fired.name] ?? 2.5
    }
    for (const k in act) if (act[k] > 0) act[k] -= dt

    /* ══════════════════════════════════════════════════════════════════
       the product's real workflow, end to end:
       0.0–1.1s  CV sheet slides in beside the suite (a live document)
       1.1–3.3s  workflow rows 01 → 04 light up and tick off one by one
       3.3–4.6s  the ATS dial needle sweeps from 38 to 92
       4.6–5.4s  EXACT / ADJACENT / MISSING chips cascade out
       Hovering the DIN-templates row also pulls the CV sheet forward.
       ══════════════════════════════════════════════════════════════════ */
    const running = demo.current > 0
    const loopT = running ? JOBFLOW_DEMO - demo.current : 0
    const hoverRow = feature()
    const cvShow = running || act.doc > 0 || act.pdf > 0 || hoverRow === 2

    /* live CV sheet — slides in from the left while the kit works on it */
    if (cv.current) {
      const s = damp(cv.current.scale.x, cvShow ? 1 : 0.001, 4.2, dt)
      cv.current.scale.setScalar(Math.max(s, 0.001))
      cv.current.visible = s > 0.02
      cv.current.position.x = damp(cv.current.position.x, cvShow ? -1.74 : -2.42, 4.2, dt)
      cv.current.rotation.y = damp(cv.current.rotation.y, cvShow ? 0.44 : 0.88, 4.2, dt)
    }
    if (cvScan.current) {
      const cyc = (t.current * (act.pdf > 0 ? 1.7 : 1.05)) % 1
      cvScan.current.position.y = 0.6 - cyc * 1.2
      const cm = cvScan.current.material as THREE.MeshBasicMaterial
      cm.opacity = damp(cm.opacity, cvShow ? 0.42 : 0, 5, dt)
    }

    /* workflow rows tick off in order */
    let rowCount = 0
    let activeRow = -1
    if (running && loopT > 1.1) {
      rowCount = Math.min(4, Math.floor(((loopT - 1.1) / 2.2) * 4) + 1)
      activeRow = rowCount - 1
    } else if (act.doc > 0) {
      rowCount = 3
      activeRow = 2
    }
    if (rowHi.current) {
      const m = rowHi.current.material as THREE.MeshBasicMaterial
      m.opacity = damp(m.opacity, activeRow >= 0 ? 0.13 : 0, 6, dt)
      if (activeRow >= 0)
        rowHi.current.position.y = damp(rowHi.current.position.y, JOBFLOW_ROW_Y[activeRow], 7, dt)
    }
    if (ticks.current)
      ticks.current.children.forEach((c, i) => {
        const s = damp(c.scale.x, i < rowCount ? 1 : 0.001, 9, dt)
        c.scale.setScalar(Math.max(s, 0.001))
      })

    /* ATS dial needle sweeps up with the match score */
    if (needle.current) {
      const target = (running && loopT > 3.3) || act.score > 0 ? 1.764 : -2.1
      needle.current.rotation.z = damp(needle.current.rotation.z, target, running ? 5 : 2.2, dt)
    }

    /* skill-classification chips fly out at the loop's finale */
    const show = (running && loopT > 4.5) || act.chips > 0 ? 1 : 0
    chipShow.current = damp(chipShow.current, show, show ? 6 : 2.4, dt)
    if (chips.current)
      chips.current.children.forEach((c, i) => {
        const s = THREE.MathUtils.clamp(chipShow.current * 6 - i * 1.4, 0, 1)
        c.scale.setScalar(Math.max(s, 0.001))
        const pos = c.position
        pos.x = damp(pos.x, 1.92 - i * 0.34, 5, dt)
        pos.y = damp(
          pos.y,
          0.52 - i * 0.5 + (show ? Math.sin(t.current * 2.4 + i) * 0.03 : 0),
          5,
          dt,
        )
      })

    /* app-window parallax + float */
    const p = scrollStore.pointerLerped
    const amp = useUI.getState().workFocusOpen ? 0.3 : 0.12
    const hov = hovering.current ? 1.35 : 1
    if (panel.current) {
      panel.current.rotation.y = damp(panel.current.rotation.y, reduced() ? 0 : p.x * amp * hov, 3.2, dt)
      panel.current.rotation.x = damp(panel.current.rotation.x, reduced() ? 0 : -p.y * amp * 0.55 * hov, 3.2, dt)
      panel.current.position.y = Math.sin(t.current * 0.8) * 0.05
    }

    /* ATS scan beam — sweeps; faster when hovered / demoing / doc actions */
    if (scan.current) {
      const scanning =
        hovering.current || running || act.doc > 0 || act.pdf > 0
      const speed = scanning ? 1.5 : 0.5
      const cyc = (t.current * speed) % 1
      scan.current.position.y = 1.42 - cyc * 2.84
      const sm = scan.current.material as THREE.MeshBasicMaterial
      sm.opacity =
        0.16 + (running ? 0.14 : 0) + (act.doc > 0 || act.pdf > 0 ? 0.12 : 0) + (hovering.current ? 0.08 : 0)
    }

    /* score badge */
    if (badge.current) {
      badge.current.rotation.z = t.current * (hovering.current ? 1.4 : 0.35)
      const pop =
        (running && loopT > 3.3) || act.score > 0 ? 1 + Math.abs(Math.sin(t.current * 5)) * 0.16 : 1
      badge.current.scale.setScalar(pop * (1 + (hovering.current ? 0.06 : 0)))
    }

    /* kanban lifecycle wave — staggered dot pulse on the 'kanban' action */
    if (kanban.current) {
      kanban.current.children.forEach((c, i) => {
        if (act.kanban <= 0) {
          c.scale.setScalar(1)
          return
        }
        const u = (2.65 - act.kanban) * 1.55
        c.scale.setScalar(1 + 0.85 * Math.max(0, 0.8 - Math.abs(u - i * 0.42)))
      })
    }
  })

  return (
    <group>
      {/* violet ambient halo behind the suite window (site's glow) */}
      <mesh position={[0, 0, -0.09]}>
        <planeGeometry args={[3.7, 4.5]} />
        <meshBasicMaterial
          map={glow}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={panel}>
        <RoundedBox args={[2.3, 3.15, 0.07]} radius={0.07} smoothness={4}>
          <meshStandardMaterial color="#151128" roughness={0.32} metalness={0.4} envMapIntensity={1.05} />
        </RoundedBox>
        <mesh position={[0, 0, 0.043]}>
          <planeGeometry args={[2.2, 3.05]} />
          <meshBasicMaterial map={suiteTex} toneMapped={false} transparent />
        </mesh>
        <mesh ref={scan} position={[0, 0, 0.05]}>
          <planeGeometry args={[2.2, 0.3]} />
          <meshBasicMaterial
            color={VIOLET}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* live workflow-row highlight band — walks 01 → 04 */}
        <mesh ref={rowHi} position={[-0.02, JOBFLOW_ROW_Y[0], 0.052]}>
          <planeGeometry args={[1.9, 0.37]} />
          <meshBasicMaterial
            color={VIOLET}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* step-complete tick badges (the row's step is done) */}
        <group ref={ticks}>
          {JOBFLOW_ROW_Y.map((y, i) => (
            <mesh key={i} position={[0.94, y, 0.056]} scale={0.001}>
              <planeGeometry args={[0.15, 0.15]} />
              <meshBasicMaterial map={tickTex} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* live CV sheet — the suite's actual output, scanned in place */}
      <group
        ref={cv}
        position={[-2.42, -0.12, 0.34]}
        rotation={[0, 0.88, -0.03]}
        scale={0.001}
        visible={false}
      >
        <RoundedBox args={[1.04, 1.4, 0.024]} radius={0.03} smoothness={3}>
          <meshStandardMaterial color="#F7F3E8" roughness={0.62} metalness={0.02} envMapIntensity={0.5} />
        </RoundedBox>
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.99, 1.35]} />
          <meshBasicMaterial map={cvTex} toneMapped={false} />
        </mesh>
        <mesh ref={cvScan} position={[0, 0.6, 0.021]}>
          <planeGeometry args={[1.02, 0.16]} />
          <meshBasicMaterial
            color={VIOLET}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ATS match-score dial */}
      <group ref={badge} position={[1.06, 1.48, 0.22]}>
        <mesh>
          <torusGeometry args={[0.3, 0.032, 12, 40]} />
          <meshBasicMaterial color={VIOLET} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[0.27, 36]} />
          <meshBasicMaterial map={scoreTex} transparent toneMapped={false} alphaTest={0.02} />
        </mesh>
      </group>
      {/* the dial's needle — driven by the ATS score sweep */}
      <group ref={needle} position={[1.06, 1.48, 0.265]} rotation={[0, 0, -2.1]}>
        <mesh position={[0, 0.095, 0]}>
          <boxGeometry args={[0.016, 0.19, 0.012]} />
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.026, 16]} />
          <meshBasicMaterial color={VIOLET} toneMapped={false} />
        </mesh>
      </group>

      {/* skill-classification chips (fly out on demo) */}
      <group ref={chips}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[1.92 - i * 0.34, 0.52 - i * 0.5, 0.14]} scale={0.001}>
            <planeGeometry args={[0.64, 0.21]} />
            <meshBasicMaterial map={chipTex[i]} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* application pipeline dots */}
      <group ref={kanban} position={[0, -1.78, 0.1]}>
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[1.16, 0.06]} />
          <meshBasicMaterial color="#232043" transparent opacity={0.9} toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(i - 2) * 0.26, 0, 0]}>
            <circleGeometry args={[i === 2 ? 0.05 : 0.038, 20]} />
            <meshBasicMaterial
              color={i === 2 ? VIOLET : '#514E70'}
              transparent
              opacity={i === 2 ? 1 : 0.7}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* feature-row locator ring (panel hotspots) */}
      <HotspotRing
        color={VIOLET}
        anchors={[
          [1.06, 1.48, 0.28, 0.48], // deterministic ATS match-score dial + needle
          [1.58, 0.02, 0.24, 0.62], // skill-classification chip cascade
          [-1.74, -0.12, 0.46, 0.72], // live CV sheet — DIN 5008 DACH templates
          [0, -1.78, 0.16, 0.74], // application pipeline — kanban tracker
          [-1.74, 0.14, 0.46, 0.62], // CV export — vector-native PDF
        ]}
        feature={feature}
      />
    </group>
  )
}

/* ========================================================= Sudoku Showdown */
/* the live board: a valid 30-given puzzle in the real board's style
   (the screenshot's mid-game digits formed an unsolvable partial grid) */
const PUZZLE_ROWS = [
  '190800670',
  '807000053',
  '605710800',
  '000003496',
  '003000000',
  '000000007',
  '300980500',
  '010500008',
  '500070040',
]

const EMPTY_CELLS: Array<[number, number]> = []
for (let r = 0; r < 9; r += 1)
  for (let c = 0; c < 9; c += 1) if (PUZZLE_ROWS[r][c] === '0') EMPTY_CELLS.push([r, c])

/* backtracking solver — every digit the board shows comes from the solution,
   so the puzzle stays valid while the engine fills it in and the rival races */
const solvePuzzle = (): Record<string, number> => {
  const grid = PUZZLE_ROWS.map((r) => r.split('').map(Number))
  const ok = (r: number, c: number, v: number) => {
    for (let i = 0; i < 9; i += 1) if (grid[r][i] === v || grid[i][c] === v) return false
    const br = Math.floor(r / 3) * 3
    const bc = Math.floor(c / 3) * 3
    for (let i = 0; i < 3; i += 1)
      for (let j = 0; j < 3; j += 1) if (grid[br + i][bc + j] === v) return false
    return true
  }
  const run = (): boolean => {
    for (let r = 0; r < 9; r += 1)
      for (let c = 0; c < 9; c += 1) {
        if (grid[r][c] !== 0) continue
        for (let v = 1; v <= 9; v += 1) {
          if (!ok(r, c, v)) continue
          grid[r][c] = v
          if (run()) return true
          grid[r][c] = 0
        }
        return false
      }
    return true
  }
  const out: Record<string, number> = {}
  if (run())
    for (let r = 0; r < 9; r += 1)
      for (let c = 0; c < 9; c += 1) if (PUZZLE_ROWS[r][c] === '0') out[`${r},${c}`] = grid[r][c]
  return out
}
const SUDOKU_SOLUTION = solvePuzzle()
const solvedAt = (r: number, c: number, fallback: number) => SUDOKU_SOLUTION[`${r},${c}`] ?? fallback

/* a mid-game board: a handful of ink-mint player digits already placed */
const SUDOKU_PLAYER_INIT: Record<string, number> = Object.fromEntries(
  EMPTY_CELLS.filter((_, i) => i % 5 === 1)
    .slice(0, 12)
    .map(([r, c]) => [`${r},${c}`, solvedAt(r, c, 1)]),
)

/* rival digits land in a deterministic-but-scattered order */
const rivalDigits = (n: number) => {
  const o: Record<string, number> = {}
  for (let i = 0; i < n && i < EMPTY_CELLS.length; i += 1) {
    const [r, c] = EMPTY_CELLS[(i * 5 + 3) % EMPTY_CELLS.length]
    o[`${r},${c}`] = solvedAt(r, c, ((i * 7 + 2) % 9) + 1)
  }
  return o
}

const SUDOKU_FACE = 2.24
const RIVAL_FACE = 1.26
const SUDOKU_CELL = SUDOKU_FACE / 9

/* the solver's hint queue — cells it fills while you watch */
const SUDOKU_HINTS: Array<[number, number, number]> = EMPTY_CELLS.filter(
  ([r, c]) => !(`${r},${c}` in SUDOKU_PLAYER_INIT),
)
  .slice(0, 30)
  .map(([r, c], i) => [r, c, solvedAt(r, c, (i % 9) + 1)])

/* paints the real board: navy tile, thin dividers, bold 3×3 rules,
   white givens, mint player digits, one highlighted cell */
function paintSudoku(
  g: CanvasRenderingContext2D,
  player: Record<string, number>,
  opts: { rival?: boolean; selected?: [number, number] | null } = {},
) {
  const W = g.canvas.width
  const rival = !!opts.rival
  g.clearRect(0, 0, W, W)
  g.fillStyle = rival ? '#0A0F1D' : '#0C1220'
  g.beginPath()
  g.roundRect(0, 0, W, W, W * 0.045)
  g.fill()
  g.strokeStyle = rival ? 'rgba(255,176,32,.22)' : 'rgba(139,124,255,.24)'
  g.lineWidth = W * 0.0035
  g.beginPath()
  g.roundRect(W * 0.008, W * 0.008, W * 0.984, W * 0.984, W * 0.04)
  g.stroke()

  const pad = W * 0.038
  const size = W - pad * 2
  const cell = size / 9

  if (opts.selected) {
    const [sr, sc] = opts.selected
    g.fillStyle = rival ? 'rgba(255,176,32,.15)' : 'rgba(139,124,255,.16)'
    g.beginPath()
    g.roundRect(pad + sc * cell + 3, pad + sr * cell + 3, cell - 6, cell - 6, 10)
    g.fill()
  }

  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let r = 0; r < 9; r += 1)
    for (let c = 0; c < 9; c += 1) {
      const given = PUZZLE_ROWS[r][c]
      const v = given !== '0' ? Number(given) : player[`${r},${c}`]
      if (!v) continue
      const isGiven = given !== '0'
      g.fillStyle = isGiven
        ? rival
          ? 'rgba(224,229,244,.8)'
          : '#E7EAF5'
        : rival
          ? AMBER
          : MINT
      g.font = JAK(Math.round(cell * 0.62), 700)
      g.fillText(String(v), pad + c * cell + cell / 2, pad + r * cell + cell / 2 + 4)
    }

  for (let i = 1; i < 9; i += 1) {
    const bold = i % 3 === 0
    g.strokeStyle = bold ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)'
    g.lineWidth = bold ? W * 0.0032 : Math.max(1, W * 0.0014)
    const p = pad + i * cell
    g.beginPath()
    g.moveTo(p, pad)
    g.lineTo(p, W - pad)
    g.moveTo(pad, p)
    g.lineTo(W - pad, p)
    g.stroke()
  }
}

/* top scoreboard — you vs the rival, live ELO */
const sudokuHudTex = () =>
  makeTex(1024, 132, (g) => {
    g.clearRect(0, 0, 1024, 132)
    g.fillStyle = 'rgba(11,16,30,.94)'
    g.beginPath()
    g.roundRect(2, 2, 1020, 128, 34)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,.08)'
    g.lineWidth = 2
    g.stroke()

    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.fillStyle = MINT
    g.beginPath()
    g.arc(54, 66, 9, 0, Math.PI * 2)
    g.fill()
    g.font = MONO(30)
    g.fillText('SOLVER_2295', 78, 54)
    g.fillStyle = 'rgba(231,234,245,.55)'
    g.font = MONO(20)
    g.fillText('YOU · 1450 ELO', 78, 88)

    g.textAlign = 'right'
    g.fillStyle = AMBER
    g.beginPath()
    g.arc(968, 66, 9, 0, Math.PI * 2)
    g.fill()
    g.font = MONO(30)
    g.fillText('RIVAL_2048', 944, 54)
    g.fillStyle = 'rgba(231,234,245,.55)'
    g.font = MONO(20)
    g.fillText('1450 ELO · LIVE', 944, 88)

    g.textAlign = 'center'
    g.fillStyle = '#FFF'
    g.font = SYNE(42)
    g.fillText('VS', 512, 56)
    g.fillStyle = 'rgba(231,234,245,.5)'
    g.font = MONO(18)
    g.fillText('P2P MATCH', 512, 94)
  })

/* in-board control strip: Easy · timer · lives · Exit (the real board's chrome) */
const sudokuControlTex = () =>
  makeTex(1024, 92, (g) => {
    g.clearRect(0, 0, 1024, 92)
    g.fillStyle = 'rgba(11,16,30,.9)'
    g.beginPath()
    g.roundRect(2, 2, 1020, 88, 26)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,.06)'
    g.lineWidth = 2
    g.stroke()

    g.fillStyle = 'rgba(159,247,228,.12)'
    g.beginPath()
    g.roundRect(22, 20, 148, 52, 18)
    g.fill()
    g.fillStyle = MINT
    g.font = MONO(26)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillText('EASY ▾', 44, 48)

    g.strokeStyle = 'rgba(231,234,245,.7)'
    g.lineWidth = 3
    g.beginPath()
    g.arc(236, 46, 15, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#E7EAF5'
    g.font = MONO(28)
    g.fillText('00:05', 266, 48)

    for (let i = 0; i < 3; i += 1) {
      g.fillStyle = i < 2 ? ALARM : 'rgba(255,78,100,.26)'
      g.beginPath()
      g.arc(438 + i * 30, 46, 9, 0, Math.PI * 2)
      g.fill()
    }

    g.strokeStyle = 'rgba(255,78,100,.65)'
    g.lineWidth = 3
    g.beginPath()
    g.roundRect(838, 18, 164, 56, 20)
    g.stroke()
    g.fillStyle = ALARM
    g.textAlign = 'center'
    g.font = MONO(24)
    g.fillText('EXIT', 920, 48)
  })

/* numpad — nine keys with remaining counts */
const sudokuPadTex = () =>
  makeTex(1024, 150, (g) => {
    g.clearRect(0, 0, 1024, 150)
    const gap = 8
    const w = (1024 - gap * 8) / 9
    const counts = [4, 7, 9, 2, 5, 1, 3, 6, 8]
    for (let i = 0; i < 9; i += 1) {
      const x = i * (w + gap)
      g.fillStyle = '#111830'
      g.beginPath()
      g.roundRect(x, 4, w, 140, 20)
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,.08)'
      g.lineWidth = 2
      g.stroke()
      g.fillStyle = '#E7EAF5'
      g.font = SYNE(56)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(String(i + 1), x + w / 2, 58)
      g.fillStyle = 'rgba(231,234,245,.42)'
      g.font = MONO(18)
      g.fillText(`${counts[i]}/9`, x + w / 2, 114)
    }
  })

const sudokuVoiceTex = () =>
  makeTex(512, 96, (g) => {
    g.clearRect(0, 0, 512, 96)
    g.fillStyle = 'rgba(11,16,30,.92)'
    g.beginPath()
    g.roundRect(2, 2, 508, 92, 26)
    g.fill()
    g.strokeStyle = 'rgba(159,247,228,.3)'
    g.lineWidth = 2
    g.stroke()
    g.fillStyle = MINT
    g.font = MONO(26)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillText('P2P VOICE', 28, 48)
  })

/* reusable vectors for the hover ray-mapping */
const tmpV2 = new THREE.Vector2()
const t3a = new THREE.Vector3()
const t3b = new THREE.Vector3()

function SudokuModel({ hovering, pulse, feature }: ModelProps) {
  const board = useRef<THREE.Group>(null)
  const rival = useRef<THREE.Group>(null)
  const highlight = useRef<THREE.Mesh>(null)
  const rivalFace = useRef<THREE.Mesh>(null)
  const rivalCursor = useRef<THREE.Mesh>(null)
  const hud = useRef<THREE.Mesh>(null)
  const blots = useRef<THREE.Group>(null)
  const voiceBars = useRef<THREE.Group>(null)
  const engineScan = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const demoT = useRef(-1)
  const lastPulse = useRef(pulse())
  const hop = useRef({ from: new THREE.Vector2(4, 4), to: new THREE.Vector2(2, 6), k: 1 })
  const act: ActT = useRef<ActT>({
    elo: 0,
    sabotage: 0,
    voice: 0,
    engine: 0,
    resync: 0,
    cleanse: 0,
  }).current
  const lastAct = useRef(scrollStore.modelAction.n)

  /* mutable board state — digits land, canvases repaint */
  const player = useRef<Record<string, number>>({ ...SUDOKU_PLAYER_INIT })
  const rivalFilled = useRef(5)
  const rivalAcc = useRef(0)
  const hintIdx = useRef(0)
  const hintAcc = useRef(0)
  const hoverCell = useRef(new THREE.Vector2(-1, -1))

  const main = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 1024
    const g = c.getContext('2d')
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    if (g) paintSudoku(g, SUDOKU_PLAYER_INIT)
    return { c, g, tex }
  }, [])
  const rivalCv = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const g = c.getContext('2d')
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    if (g) paintSudoku(g, rivalDigits(5), { rival: true, selected: [2, 6] })
    return { c, g, tex }
  }, [])

  const repaintMain = () => {
    if (main.g) {
      paintSudoku(main.g, player.current)
      main.tex.needsUpdate = true
    }
  }
  const repaintRival = (n: number) => {
    if (rivalCv.g) {
      paintSudoku(rivalCv.g, rivalDigits(n), { rival: true, selected: [2, 6] })
      rivalCv.tex.needsUpdate = true
    }
  }

  const hudTex = useMemo(() => sudokuHudTex(), [])
  const controlTex = useMemo(() => sudokuControlTex(), [])
  const padTex = useMemo(() => sudokuPadTex(), [])
  const voiceTex = useMemo(() => sudokuVoiceTex(), [])
  const glow = useMemo(() => glowTex('rgba(102,252,241,.2)', 'rgba(102,252,241,0)'), [])
  const blotTex = useMemo(
    () =>
      makeTex(128, 128, (g) => {
        g.clearRect(0, 0, 128, 128)
        g.fillStyle = PINK
        g.beginPath()
        g.arc(64, 64, 27, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.arc(93, 44, 12, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.arc(37, 89, 9, 0, Math.PI * 2)
        g.fill()
      }),
    [],
  )

  useEffect(
    () => () => {
      main.tex.dispose()
      rivalCv.tex.dispose()
      hudTex.dispose()
      controlTex.dispose()
      padTex.dispose()
      voiceTex.dispose()
      glow.dispose()
      blotTex.dispose()
    },
    [main, rivalCv, hudTex, controlTex, padTex, voiceTex, glow, blotTex],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const g = board.current
    if (!g) return
    t.current += dt

    const n = pulse()
    if (n !== lastPulse.current) {
      lastPulse.current = n
      demoT.current = 0
    }
    if (demoT.current >= 0) {
      demoT.current += dt
      if (demoT.current > 4.2) demoT.current = -1
    }
    const demo = demoT.current >= 0

    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name && fired.name in act) act[fired.name] = AFDUR[fired.name] ?? 2.5
      /* resync: the rival board snaps back and re-syncs from the database */
      if (fired.name === 'resync') {
        rivalFilled.current = 3
        repaintRival(3)
      }
    }
    for (const k in act) if (act[k] > 0) act[k] -= dt

    /* ── multiplayer presence: a real opponent keeps solving beside you ── */
    const frenzy = demo || act.sabotage > 0 || act.resync > 0
    rivalAcc.current += dt * (frenzy ? 4.2 : hovering.current ? 1.7 : 1)
    if (rivalAcc.current > 1.25) {
      rivalAcc.current = 0
      rivalFilled.current = rivalFilled.current >= 24 ? 4 : rivalFilled.current + 1
      repaintRival(rivalFilled.current)
    }

    /* rival cursor hopping cell to cell */
    hop.current.k = Math.min(1, hop.current.k + dt * 1.3)
    if (hop.current.k >= 1) {
      hop.current.from.copy(hop.current.to)
      const e = EMPTY_CELLS[Math.floor(Math.random() * EMPTY_CELLS.length)]
      hop.current.to.set(e[0], e[1])
      hop.current.k = 0
    }
    if (rivalCursor.current) {
      const rr = THREE.MathUtils.lerp(hop.current.from.x, hop.current.to.x, hop.current.k)
      const cc = THREE.MathUtils.lerp(hop.current.from.y, hop.current.to.y, hop.current.k)
      rivalCursor.current.position.x = (cc - 4) * (RIVAL_FACE / 9)
      rivalCursor.current.position.y = (4 - rr) * (RIVAL_FACE / 9)
    }

    /* ── solver engine: hints land one mint digit at a time ── */
    const solving = act.engine > 0 || (demo && demoT.current > 0.6)
    if (solving) {
      hintAcc.current += dt
      if (hintAcc.current > 0.26) {
        hintAcc.current = 0
        if (hintIdx.current >= SUDOKU_HINTS.length) {
          /* board complete — a fresh puzzle deals in */
          hintIdx.current = 0
          player.current = { ...SUDOKU_PLAYER_INIT }
        } else {
          const [r, c, v] = SUDOKU_HINTS[hintIdx.current]
          hintIdx.current += 1
          player.current[`${r},${c}`] = v
        }
        repaintMain()
      }
    } else hintAcc.current = 0
    if (engineScan.current) {
      const em = engineScan.current.material as THREE.MeshBasicMaterial
      em.opacity = damp(em.opacity, solving ? 0.22 : 0, 6, dt)
      if (solving) engineScan.current.position.y = 1.12 - ((t.current * 1.1) % 1) * 2.24
    }

    /* ── rival feedback ── */
    if (rival.current) {
      rival.current.position.y = 0.5 + Math.sin(t.current * 0.9 + 1) * 0.04
      rival.current.rotation.z = act.sabotage > 0 ? Math.sin(t.current * 26) * 0.02 : 0
    }
    if (rivalFace.current) {
      const m = rivalFace.current.material as THREE.MeshBasicMaterial
      const flash = act.resync > 0 ? 0.55 + Math.abs(Math.sin(t.current * 10)) * 0.45 : 1
      m.opacity = damp(m.opacity, flash, 8, dt)
    }
    if (blots.current) {
      const want = demo || act.sabotage > 0 ? 1 : 0
      blots.current.children.forEach((c, i) => {
        const s = damp(c.scale.x, want ? 1 : 0.001, 8, dt)
        c.scale.setScalar(Math.max(s, 0.001))
        c.rotation.z = Math.sin(t.current * 3 + i) * 0.2
      })
    }

    /* ── P2P voice equalizer ── */
    if (voiceBars.current) {
      const energy = act.voice > 0 || demo ? 1 : hovering.current ? 0.55 : 0.28
      voiceBars.current.children.forEach((c, i) => {
        const h = 0.35 + Math.abs(Math.sin(t.current * (5 + i * 0.7) + i)) * (0.9 * energy + 0.2)
        c.scale.y = damp(c.scale.y, h, 10, dt)
      })
    }

    /* ── ELO scoreboard pop ── */
    if (hud.current) {
      const pop =
        act.elo > 0 || demo ? 1 + Math.abs(Math.sin(t.current * 6)) * 0.07 : 1 + (hovering.current ? 0.02 : 0)
      hud.current.scale.setScalar(pop)
    }

    /* ── hover cell on the real board (ray → board-local 9×9) ── */
    if (highlight.current) {
      const inv = g.matrixWorld.clone().invert()
      t3a.copy(state.raycaster.ray.origin).applyMatrix4(inv)
      t3b.copy(state.raycaster.ray.direction).transformDirection(inv)
      const den = t3b.z
      let inBoard = false
      if (Math.abs(den) > 1e-4) {
        const tt = (0.05 - t3a.z) / den
        if (tt > 0) {
          tmpV2.copy(t3a).addScaledVector(t3b, tt)
          const half = SUDOKU_FACE / 2
          if (Math.abs(tmpV2.x) < half && Math.abs(tmpV2.y) < half) {
            const c = Math.round(tmpV2.x / SUDOKU_CELL) + 4
            const r = 4 - Math.round(tmpV2.y / SUDOKU_CELL)
            hoverCell.current.set(r, c)
            highlight.current.visible = true
            highlight.current.position.x = (c - 4) * SUDOKU_CELL
            highlight.current.position.y = (4 - r) * SUDOKU_CELL
            inBoard = true
          }
        }
      }
      if (!inBoard) highlight.current.visible = false
    }

    /* board float + pointer parallax */
    const p = scrollStore.pointerLerped
    const amp = useUI.getState().workFocusOpen ? 0.26 : 0.1
    g.rotation.y = damp(g.rotation.y, reduced() ? 0 : p.x * amp, 3, dt)
    g.rotation.x = damp(g.rotation.x, reduced() ? 0 : -p.y * amp * 0.5, 3, dt)
    g.position.y = 0.02 + Math.sin(t.current * 0.7) * 0.03
  })

  return (
    <group>
      {/* cool arena halo */}
      <mesh position={[0, 0, -0.16]}>
        <planeGeometry args={[4.6, 3.9]} />
        <meshBasicMaterial
          map={glow}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={board}>
        {/* the real board plate */}
        <RoundedBox args={[2.34, 2.34, 0.08]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color="#0A1020" roughness={0.42} metalness={0.35} envMapIntensity={0.9} />
        </RoundedBox>
        <mesh position={[0, 0, 0.046]}>
          <planeGeometry args={[SUDOKU_FACE, SUDOKU_FACE]} />
          <meshBasicMaterial map={main.tex} toneMapped={false} />
        </mesh>

        {/* hovered cell */}
        <mesh ref={highlight} position={[0, 0, 0.052]} visible={false}>
          <planeGeometry args={[SUDOKU_CELL - 0.02, SUDOKU_CELL - 0.02]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </mesh>

        {/* solver-engine sweep */}
        <mesh ref={engineScan} position={[0, 1.12, 0.054]}>
          <planeGeometry args={[SUDOKU_FACE, 0.05]} />
          <meshBasicMaterial
            color={MINT}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* a rival's board, angled beside yours — live multiplayer */}
        <group ref={rival} position={[1.62, 0.5, -0.55]} rotation={[0.03, -0.5, 0]}>
          <RoundedBox args={[1.36, 1.36, 0.07]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color="#080D1A" roughness={0.5} metalness={0.3} envMapIntensity={0.7} />
          </RoundedBox>
          <mesh ref={rivalFace} position={[0, 0, 0.042]}>
            <planeGeometry args={[RIVAL_FACE, RIVAL_FACE]} />
            <meshBasicMaterial map={rivalCv.tex} transparent opacity={1} toneMapped={false} />
          </mesh>
          <mesh ref={rivalCursor} position={[0, 0, 0.047]}>
            <planeGeometry args={[RIVAL_FACE / 9 - 0.008, RIVAL_FACE / 9 - 0.008]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* ink-splash sabotage blots */}
          <group ref={blots}>
            {[
              [-0.28, 0.22],
              [0.3, -0.12],
              [0.04, 0.34],
            ].map(([x, y], i) => (
              <mesh key={i} position={[x, y, 0.05]} scale={0.001}>
                <planeGeometry args={[0.21, 0.21]} />
                <meshBasicMaterial map={blotTex} transparent toneMapped={false} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>

        {/* control strip: difficulty · timer · lives · exit */}
        <mesh position={[0, 1.27, 0.05]}>
          <planeGeometry args={[2.24, 0.2]} />
          <meshBasicMaterial map={controlTex} transparent toneMapped={false} />
        </mesh>

        {/* you vs rival scoreboard */}
        <mesh ref={hud} position={[0, 1.52, 0.05]}>
          <planeGeometry args={[2.24, 0.28]} />
          <meshBasicMaterial map={hudTex} transparent toneMapped={false} />
        </mesh>

        {/* numpad with remaining counts */}
        <mesh position={[0, -1.32, 0.05]}>
          <planeGeometry args={[2.2, 0.32]} />
          <meshBasicMaterial map={padTex} transparent toneMapped={false} />
        </mesh>

        {/* P2P voice pill (multiplayer channel) */}
        <mesh position={[0, -1.65, 0.05]}>
          <planeGeometry args={[1.3, 0.24]} />
          <meshBasicMaterial map={voiceTex} transparent toneMapped={false} />
        </mesh>
        <group ref={voiceBars} position={[0.18, -1.65, 0.07]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[i * 0.075, 0, 0]}>
              <boxGeometry args={[0.028, 0.11, 0.01]} />
              <meshBasicMaterial color={MINT} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      <HotspotRing
        color={CYAN}
        anchors={[
          [0, 1.52, 0.14, 0.6], // ELO scoreboard — rank + match sync
          [1.62, 0.5, -0.3, 0.72], // rival board — ink-splash sabotage
          [0.46, -1.65, 0.18, 0.34], // P2P voice channel
          [0, 0.02, 0.12, 1.2], // main board — solver engine
          [-0.34, 1.27, 0.16, 0.46], // control strip — reconnect / resync
        ]}
        feature={feature}
      />
    </group>
  )
}


/* ================================================================ NapTrip
 * A night-train compartment: a passenger asleep in a reclined seat, the
 * city sliding past the window, and a phone on the armrest pulsing a GPS
 * direction arrow + geofence rings toward the destination station.     */
const boardTexOf = (delayed: boolean) =>
  makeTex(640, 96, (g) => {
    g.clearRect(0, 0, 640, 96)
    g.fillStyle = 'rgba(13,16,32,.92)'
    g.beginPath()
    g.roundRect(4, 4, 632, 88, 22)
    g.fill()
    g.strokeStyle = 'rgba(102,252,241,.4)'
    g.lineWidth = 3
    g.stroke()
    g.fillStyle = CYAN
    g.font = MONO(34)
    g.textBaseline = 'middle'
    g.fillText('BERLIN HBF', 34, 50)
    if (delayed) {
      g.fillStyle = ALARM
      g.fillText('DELAYED +4', 250, 50)
      g.fillStyle = 'rgba(242,238,220,.6)'
      g.fillText('06:46', 462, 50)
    } else {
      g.fillStyle = '#F2EEDC'
      g.fillText('· 06:42 · ON TIME', 250, 50)
    }
  })

/* night city sliding past the carriage window */
const cityTex = () => {
  const t = makeTex(1024, 512, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#050919')
    sky.addColorStop(0.55, '#0E1737')
    sky.addColorStop(1, '#0A1226')
    g.fillStyle = sky
    g.fillRect(0, 0, 1024, 512)

    /* sodium-vapour haze over the rooftops */
    const haze = g.createRadialGradient(720, 340, 20, 720, 340, 440)
    haze.addColorStop(0, 'rgba(255,176,120,.2)')
    haze.addColorStop(1, 'rgba(255,176,120,0)')
    g.fillStyle = haze
    g.fillRect(0, 0, 1024, 512)

    const layer = (color: string, minH: number, maxH: number, step: number, seed: number) => {
      for (let x = 0; x < 1024; x += step) {
        const h = minH + ((x * 37 + seed) % (maxH - minH))
        g.globalAlpha = 1
        g.fillStyle = color
        g.fillRect(x, 512 - h, step - 4, h)
        for (let wy = 512 - h + 14; wy < 498; wy += 18)
          for (let wx = x + 6; wx < x + step - 10; wx += 12) {
            const lit = (wx * 13 + wy * 7 + seed) % 11 < 4
            g.globalAlpha = lit ? 0.55 : 0.12
            g.fillStyle = lit ? (wx % 3 === 0 ? '#FFD9A0' : '#9FD6FF') : '#F2EEDC'
            g.fillRect(wx, wy, 4, 6)
          }
      }
      g.globalAlpha = 1
    }
    layer('#0A1024', 120, 300, 74, 11)
    layer('#05080F', 64, 200, 54, 29)
  })
  t.wrapS = THREE.RepeatWrapping
  return t
}

/* the phone's GPS screen — route, geofence, destination */
const phoneTex = () =>
  makeTex(256, 512, (g) => {
    g.clearRect(0, 0, 256, 512)
    g.fillStyle = '#08101F'
    g.beginPath()
    g.roundRect(0, 0, 256, 512, 34)
    g.fill()

    g.strokeStyle = '#16233F'
    g.lineWidth = 6
    for (let i = 0; i < 8; i += 1) {
      g.beginPath()
      g.moveTo(0, 96 + i * 50)
      g.lineTo(256, 66 + i * 50)
      g.stroke()
      g.beginPath()
      g.moveTo(24 + i * 34, 0)
      g.lineTo(58 + i * 34, 512)
      g.stroke()
    }

    g.strokeStyle = CYAN
    g.lineWidth = 5
    g.shadowColor = CYAN
    g.shadowBlur = 12
    g.beginPath()
    g.moveTo(46, 430)
    g.bezierCurveTo(62, 330, 158, 302, 196, 210)
    g.bezierCurveTo(220, 152, 190, 118, 176, 96)
    g.stroke()
    g.shadowBlur = 0

    g.strokeStyle = 'rgba(102,252,241,.45)'
    g.lineWidth = 3
    g.beginPath()
    g.arc(176, 96, 30, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = CYAN
    g.beginPath()
    g.arc(176, 96, 7, 0, Math.PI * 2)
    g.fill()

    g.fillStyle = 'rgba(8,16,31,.86)'
    g.fillRect(0, 0, 256, 64)
    g.fillStyle = MINT
    g.font = MONO(16)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillText('GPS · 06:42', 18, 30)
    g.fillStyle = 'rgba(231,234,245,.5)'
    g.font = MONO(12)
    g.fillText('8 MIN · PLATFORM 4', 18, 50)

    g.fillStyle = 'rgba(8,16,31,.9)'
    g.fillRect(0, 440, 256, 72)
    g.textAlign = 'center'
    g.fillStyle = '#F2EEDC'
    g.font = JAK(21, 700)
    g.fillText('BERLIN HBF', 128, 468)
    g.fillStyle = MINT
    g.font = MONO(13)
    g.fillText('GEOFENCE ARMED', 128, 492)
  })

const wakeBadgeTex = () =>
  makeTex(512, 240, (g) => {
    g.clearRect(0, 0, 512, 240)
    g.fillStyle = ALARM
    g.beginPath()
    g.roundRect(6, 6, 500, 228, 64)
    g.fill()
    g.fillStyle = '#FFF'
    g.font = SYNE(84)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('WAKE UP!', 256, 96)
    g.font = MONO(30)
    g.fillText('90 M — HEAD TO PLATFORM', 256, 178)
  })

const moonTex = () =>
  makeTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256)
    g.shadowColor = 'rgba(244,239,217,.55)'
    g.shadowBlur = 26
    g.fillStyle = '#F4EFD9'
    g.beginPath()
    g.arc(128, 128, 88, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
    /* bite out the crescent */
    g.globalCompositeOperation = 'destination-out'
    g.beginPath()
    g.arc(166, 96, 74, 0, Math.PI * 2)
    g.fill()
    g.globalCompositeOperation = 'source-over'
  })

const starTex = () =>
  makeTex(96, 96, (g) => {
    g.clearRect(0, 0, 96, 96)
    g.strokeStyle = '#F4EFD9'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.shadowColor = 'rgba(244,239,217,.8)'
    g.shadowBlur = 10
    g.beginPath()
    g.moveTo(48, 10)
    g.lineTo(48, 86)
    g.moveTo(10, 48)
    g.lineTo(86, 48)
    g.stroke()
    g.shadowBlur = 0
  })

const heartTex = () =>
  makeTex(256, 232, (g) => {
    g.clearRect(0, 0, 256, 232)
    g.lineWidth = 12
    g.strokeStyle = CYAN
    g.fillStyle = 'rgba(102,252,241,.16)'
    g.shadowColor = 'rgba(102,252,241,.7)'
    g.shadowBlur = 16
    const w = 210
    const h = 186
    const x = 23
    const y = 18
    g.beginPath()
    g.moveTo(x + w / 2, y + h)
    g.bezierCurveTo(x - 8, y + h * 0.62, x + w * 0.08, y + h * 0.06, x + w / 2, y + h * 0.3)
    g.bezierCurveTo(x + w * 0.92, y + h * 0.06, x + w + 8, y + h * 0.62, x + w / 2, y + h)
    g.closePath()
    g.fill()
    g.stroke()
    g.shadowBlur = 0
  })

const zzzTex = () =>
  makeTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128)
    g.fillStyle = MINT
    g.font = SYNE(104)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.shadowColor = 'rgba(159,247,228,.8)'
    g.shadowBlur = 12
    g.fillText('Z', 64, 64)
    g.shadowBlur = 0
  })

const chevronGeo = () => {
  const s = new THREE.BufferGeometry()
  s.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0.04, 0, 0, -0.03, 0.024, 0, -0.03, -0.024, 0], 3),
  )
  s.computeVertexNormals()
  return s
}

/** one chevron sliding along the route (traffic-flow feel) */
function FlowChevron({ curve, geo, offset }: { curve: THREE.CatmullRomCurve3; geo: THREE.BufferGeometry; offset: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const u = (state.clock.elapsedTime * 0.09 + offset) % 1
    const v = curve.getPoint(u)
    const ahead = curve.getPoint(Math.min(u + 0.02, 1))
    ref.current.position.copy(v)
    ref.current.rotation.z = Math.atan2(ahead.y - v.y, ahead.x - v.x) - Math.PI / 2
  })
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial color={CYAN} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  )
}

function NapTripModel({ hovering, pulse, feature }: ModelProps) {
  const pod = useRef<THREE.Group>(null)
  const sleeper = useRef<THREE.Group>(null)
  const clock = useRef<THREE.Group>(null)
  const clockFace = useRef<THREE.Mesh>(null)
  const phone = useRef<THREE.Group>(null)
  const arrow = useRef<THREE.Mesh>(null)
  const pulseRings = useRef<THREE.Group>(null)
  const phoneGlow = useRef<THREE.Mesh>(null)
  const boardRef = useRef<THREE.Mesh>(null)
  const badgeRef = useRef<THREE.Mesh>(null)
  const heartRef = useRef<THREE.Mesh>(null)
  const pin = useRef<THREE.Group>(null)
  const pinRing = useRef<THREE.Mesh>(null)
  const spark = useRef<THREE.Mesh>(null)
  const arcRef = useRef<THREE.Mesh>(null)
  const zz = useRef<THREE.Group>(null)
  const t = useRef(0)
  const demoT = useRef(-1)
  const lastPulse = useRef(pulse())
  const youU = useRef(0.05)
  /* per-feature action timers: sprint / arrivals / pin / favourites */
  const act: ActT = useRef<ActT>({ sprint: 0, arrivals: 0, pin: 0, favourites: 0 }).current
  const lastAct = useRef(scrollStore.modelAction.n)

  /* the rail the carriage rides on, under the compartment */
  const CURVE = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.62, -1.18, 0.06),
        new THREE.Vector3(-0.8, -1.12, 0.06),
        new THREE.Vector3(0.02, -1.1, 0.06),
        new THREE.Vector3(0.86, -1.13, 0.06),
        new THREE.Vector3(1.62, -1.17, 0.06),
      ]),
    [],
  )
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(CURVE, 60, 0.013, 8, false), [CURVE])
  const chevGeo = useMemo(() => chevronGeo(), [])
  const halo = useMemo(() => glowTex('rgba(64,78,180,.32)', 'rgba(64,78,180,0)'), [])
  const boards = useMemo(() => [boardTexOf(false), boardTexOf(true)], [])
  const city = useMemo(() => cityTex(), [])
  const phoneScreen = useMemo(() => phoneTex(), [])
  const wake = useMemo(() => wakeBadgeTex(), [])
  const moon = useMemo(() => moonTex(), [])
  const star = useMemo(() => starTex(), [])
  const heart = useMemo(() => heartTex(), [])
  const zv = useMemo(() => zzzTex(), [])
  const phoneHalo = useMemo(() => glowTex('rgba(102,252,241,.5)', 'rgba(102,252,241,0)'), [])

  useEffect(
    () => () => {
      tubeGeo.dispose()
      chevGeo.dispose()
      halo.dispose()
      boards.forEach((b) => b.dispose())
      city.dispose()
      phoneScreen.dispose()
      wake.dispose()
      moon.dispose()
      star.dispose()
      heart.dispose()
      zv.dispose()
      phoneHalo.dispose()
    },
    [tubeGeo, chevGeo, halo, boards, city, phoneScreen, wake, moon, star, heart, zv, phoneHalo],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    t.current += dt
    const n = pulse()
    if (n !== lastPulse.current && demoT.current < 0) {
      lastPulse.current = n
      demoT.current = 0
    } else if (n !== lastPulse.current) lastPulse.current = n
    if (demoT.current >= 0) {
      demoT.current += dt
      if (demoT.current > 3.4) {
        demoT.current = -1
        youU.current = 0.05
      }
    }
    const alarm = demoT.current >= 0

    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name === 'alarm') demoT.current = 0
      else if (fired.name && fired.name in act) act[fired.name] = AFDUR[fired.name] ?? 2.4
    }
    for (const k in act) if (act[k] > 0) act[k] -= dt
    const sprinting = act.sprint > 0
    const boarding = act.arrivals > 0
    const pinning = act.pin > 0
    const favouring = act.favourites > 0

    /* pod parallax + float */
    const p = scrollStore.pointerLerped
    if (pod.current) {
      const hovF = hovering.current ? 1.6 : 1
      pod.current.rotation.y = damp(pod.current.rotation.y, reduced() ? 0 : p.x * 0.15 * hovF, 3, dt)
      pod.current.rotation.x = damp(pod.current.rotation.x, reduced() ? 0 : -p.y * 0.07 * hovF, 3, dt)
      pod.current.position.y = Math.sin(t.current * 0.75) * 0.05
    }

    /* the city keeps sliding past — faster when sprinting for a connection */
    city.offset.x = (city.offset.x + dt * (sprinting ? 0.115 : alarm ? 0.045 : 0.014)) % 1

    /* ── the phone in the armrest: GPS ping + direction arrow ── */
    if (arrow.current) {
      const beat = Math.abs(Math.sin(t.current * 2.4))
      arrow.current.position.y = 0.03 + beat * 0.022
      arrow.current.scale.setScalar(0.9 + beat * 0.35)
      const am = arrow.current.material as THREE.MeshBasicMaterial
      am.color.set(alarm && Math.sin(t.current * 14) > 0 ? ALARM : CYAN)
    }
    if (pulseRings.current) {
      pulseRings.current.children.forEach((c, i) => {
        const ph = (t.current * (alarm ? 0.85 : 0.5) + i * 0.5) % 1
        c.scale.setScalar(0.55 + ph * 1.9)
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = (1 - ph) * (alarm ? 0.8 : 0.5)
        m.color.set(alarm && Math.sin(t.current * 14) > 0 ? ALARM : CYAN)
      })
    }
    if (phoneGlow.current) {
      const m = phoneGlow.current.material as THREE.MeshBasicMaterial
      const s = 0.5 + Math.abs(Math.sin(t.current * 1.6)) * 0.22 + (alarm ? 0.2 : 0)
      phoneGlow.current.scale.setScalar(s)
      m.opacity = damp(m.opacity, alarm ? 0.75 : hovering.current ? 0.5 : 0.32, 4, dt)
    }
    if (phone.current) {
      phone.current.rotation.z =
        Math.sin(t.current * 0.9) * 0.02 + (alarm ? Math.sin(t.current * 20) * 0.03 : 0)
    }

    /* alarm clock — rattles during the wake-up, nudges on the pin plunge */
    if (clock.current) {
      const shake = alarm
        ? Math.sin(t.current * 22) * 0.12
        : pinning
          ? Math.sin(t.current * 10) * 0.04
          : 0
      clock.current.rotation.z = damp(clock.current.rotation.z, shake, 10, dt)
    }
    if (clockFace.current) {
      const m = clockFace.current.material as THREE.MeshBasicMaterial
      m.color.set(alarm && Math.sin(t.current * 12) > 0 ? '#FFD6DC' : CREAM)
    }

    /* sleeping passenger — breathing, then a jolt awake */
    if (sleeper.current) {
      sleeper.current.scale.y = 1 + (alarm ? 0 : Math.sin(t.current * 1.7) * 0.02)
      sleeper.current.rotation.x = damp(sleeper.current.rotation.x, alarm ? -0.16 : 0, 4.5, dt)
      sleeper.current.position.y = damp(sleeper.current.position.y, alarm ? 0.03 : 0, 4, dt)
    }

    /* zzz's drift up; scramble away when the alarm fires */
    if (zz.current) {
      const speed = alarm ? 2.6 : 0.5
      zz.current.children.forEach((c, i) => {
        const ph = (t.current * speed + i / 3) % 1
        c.position.set(alarm ? ph * 0.4 : 0, ph * 0.5, i * 0.012)
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = Math.sin(Math.PI * ph) * (alarm ? 0.9 : 0.55)
        c.scale.setScalar(0.45 + ph * 0.6)
      })
    }

    /* rail — the progress spark rides it; sprinting wakes it */
    if (spark.current) {
      youU.current = (youU.current + dt * (alarm ? 0.4 : sprinting ? 0.27 : 0.03)) % 1
      const v = CURVE.getPoint(youU.current)
      spark.current.position.set(v.x, v.y, 0.09)
      spark.current.scale.setScalar(1 + (sprinting ? Math.abs(Math.sin(t.current * 9)) * 0.5 : 0))
    }
    if (arcRef.current) {
      const m = arcRef.current.material as THREE.MeshBasicMaterial
      m.opacity = damp(m.opacity, sprinting || alarm ? 0.75 : 0.4, 5, dt)
    }

    /* departure board — flips to a delay alert on 'arrivals' */
    if (boardRef.current) {
      const m = boardRef.current.material as THREE.MeshBasicMaterial
      m.map = boarding ? boards[1] : boards[0]
      boardRef.current.position.y = 1.47 + (boarding ? Math.abs(Math.sin(t.current * 5.5)) * 0.05 : 0)
    }

    if (badgeRef.current) {
      const want = alarm ? 1 + Math.abs(Math.sin(t.current * 6)) * 0.08 : 0.001
      badgeRef.current.scale.setScalar(Math.max(want, 0.001))
    }

    /* destination pin — bobbing idle, bounces on the 'pin' plunge */
    if (pin.current) {
      pin.current.position.y =
        pinning ? 0.3 + Math.abs(Math.sin(t.current * 9)) * 0.16 : 0.18 + Math.sin(t.current * 1.6) * 0.03
    }
    if (pinRing.current) {
      const m = pinRing.current.material as THREE.MeshBasicMaterial
      m.color.set(pinning && Math.sin(t.current * 8) > 0 ? ACCENT : CYAN)
      pinRing.current.scale.setScalar(
        1 + (pinning ? Math.abs(Math.sin(t.current * 6.5)) * 0.16 : Math.sin(t.current * 1.15) * 0.07),
      )
    }

    if (heartRef.current) {
      heartRef.current.scale.setScalar(1 + (favouring ? Math.abs(Math.sin(t.current * 8)) * 0.2 : 0))
    }
  })

  return (
    <group>
      {/* moonlit halo */}
      <mesh position={[0, 0, -0.24]}>
        <planeGeometry args={[4.4, 3.8]} />
        <meshBasicMaterial
          map={halo}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={pod}>
        {/* carriage wall */}
        <RoundedBox args={[2.52, 2.5, 0.08]} radius={0.1} smoothness={4} position={[0.14, 0.38, -0.38]}>
          <meshStandardMaterial color="#0B1128" roughness={0.72} metalness={0.2} envMapIntensity={0.5} />
        </RoundedBox>

        {/* window frame + sliding night city */}
        <RoundedBox args={[2.26, 1.2, 0.1]} radius={0.09} smoothness={4} position={[0.18, 0.72, -0.29]}>
          <meshStandardMaterial color="#151D3E" roughness={0.5} metalness={0.45} envMapIntensity={0.8} />
        </RoundedBox>
        <mesh position={[0.18, 0.72, -0.232]}>
          <planeGeometry args={[2.0, 0.98]} />
          <meshBasicMaterial map={city} toneMapped={false} />
        </mesh>
        {/* window mullion + glass sheen */}
        <mesh position={[0.18, 0.72, -0.224]}>
          <boxGeometry args={[0.035, 0.98, 0.012]} />
          <meshBasicMaterial color="#0A0F22" toneMapped={false} />
        </mesh>

        {/* crescent moon + stars inside the view */}
        <mesh position={[-0.42, 1.0, -0.218]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshBasicMaterial map={moon} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        {[
          [-0.78, 1.12],
          [0.58, 1.14],
          [0.98, 0.98],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, -0.216]} rotation={[0, 0, i * 0.6]}>
            <planeGeometry args={[0.07, 0.07]} />
            <meshBasicMaterial map={star} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        ))}

        {/* live VBB departure board above the window */}
        <mesh ref={boardRef} position={[0.18, 1.47, -0.16]}>
          <planeGeometry args={[1.7, 0.255]} />
          <meshBasicMaterial map={boards[0]} transparent toneMapped={false} depthWrite={false} />
        </mesh>

        {/* seat pedestal + cushion */}
        <RoundedBox args={[0.82, 0.52, 0.5]} radius={0.08} smoothness={3} position={[0.06, -0.9, 0.06]}>
          <meshStandardMaterial color="#0E1530" roughness={0.6} metalness={0.3} envMapIntensity={0.6} />
        </RoundedBox>
        <RoundedBox args={[1.18, 0.2, 0.8]} radius={0.09} smoothness={4} position={[0.08, -0.6, 0.08]}>
          <meshStandardMaterial color="#243562" roughness={0.78} metalness={0.08} envMapIntensity={0.5} />
        </RoundedBox>

        {/* reclined backrest + headrest */}
        <RoundedBox
          args={[0.3, 1.26, 0.8]}
          radius={0.12}
          smoothness={4}
          position={[-0.6, -0.02, 0.08]}
          rotation={[0, 0, 0.1]}
        >
          <meshStandardMaterial color="#1A2550" roughness={0.8} metalness={0.08} envMapIntensity={0.5} />
        </RoundedBox>
        <RoundedBox
          args={[0.24, 0.34, 0.5]}
          radius={0.09}
          smoothness={3}
          position={[-0.68, 0.5, 0.08]}
          rotation={[0, 0, 0.1]}
        >
          <meshStandardMaterial color="#26366A" roughness={0.75} metalness={0.06} envMapIntensity={0.45} />
        </RoundedBox>

        {/* armrests */}
        <RoundedBox args={[0.9, 0.13, 0.18]} radius={0.05} smoothness={3} position={[0.14, -0.3, 0.5]}>
          <meshStandardMaterial color="#101A38" roughness={0.5} metalness={0.35} envMapIntensity={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.9, 0.13, 0.18]} radius={0.05} smoothness={3} position={[0.14, -0.3, -0.34]}>
          <meshStandardMaterial color="#101A38" roughness={0.5} metalness={0.35} envMapIntensity={0.7} />
        </RoundedBox>

        {/* sleeping passenger */}
        <group ref={sleeper}>
          {/* torso */}
          <RoundedBox
            args={[0.46, 0.8, 0.36]}
            radius={0.14}
            smoothness={3}
            position={[-0.26, -0.12, 0.06]}
            rotation={[0, 0, 0.16]}
          >
            <meshStandardMaterial color="#3A4568" roughness={0.82} metalness={0.04} envMapIntensity={0.4} />
          </RoundedBox>
          {/* neck pillow */}
          <mesh position={[-0.34, 0.29, 0.08]} rotation={[1.2, 0, 0.2]}>
            <torusGeometry args={[0.13, 0.045, 12, 28]} />
            <meshStandardMaterial color={CREAM} roughness={0.85} metalness={0.02} envMapIntensity={0.35} />
          </mesh>
          {/* head, hair, closed eyes */}
          <mesh position={[-0.36, 0.46, 0.05]} rotation={[0, 0, 0.22]}>
            <sphereGeometry args={[0.16, 28, 20]} />
            <meshStandardMaterial color={PEACH} roughness={0.7} metalness={0.02} envMapIntensity={0.35} />
          </mesh>
          <mesh position={[-0.39, 0.55, 0.03]} scale={[1, 0.8, 1]}>
            <sphereGeometry args={[0.164, 24, 16]} />
            <meshStandardMaterial color="#191E38" roughness={0.85} metalness={0.05} envMapIntensity={0.3} />
          </mesh>
          <mesh position={[-0.42, 0.48, 0.192]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.055, 0.009, 0.008]} />
            <meshBasicMaterial color="#1A1A24" toneMapped={false} />
          </mesh>
          <mesh position={[-0.3, 0.47, 0.192]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.055, 0.009, 0.008]} />
            <meshBasicMaterial color="#1A1A24" toneMapped={false} />
          </mesh>
          {/* arm resting on the near armrest toward the phone */}
          <mesh position={[0.1, -0.19, 0.32]} rotation={[0, 0, -0.42]}>
            <boxGeometry args={[0.46, 0.13, 0.14]} />
            <meshStandardMaterial color="#3A4568" roughness={0.82} metalness={0.04} envMapIntensity={0.4} />
          </mesh>
          <mesh position={[0.3, -0.24, 0.44]}>
            <sphereGeometry args={[0.062, 18, 14]} />
            <meshStandardMaterial color={PEACH} roughness={0.7} metalness={0.02} envMapIntensity={0.35} />
          </mesh>
          {/* legs + blanket */}
          <RoundedBox
            args={[0.62, 0.2, 0.28]}
            radius={0.08}
            smoothness={3}
            position={[0.34, -0.49, 0.18]}
          >
            <meshStandardMaterial color="#26315A" roughness={0.85} metalness={0.03} envMapIntensity={0.3} />
          </RoundedBox>
          <RoundedBox
            args={[0.62, 0.19, 0.26]}
            radius={0.08}
            smoothness={3}
            position={[0.34, -0.49, -0.12]}
          >
            <meshStandardMaterial color="#26315A" roughness={0.85} metalness={0.03} envMapIntensity={0.3} />
          </RoundedBox>
          <RoundedBox
            args={[0.66, 0.13, 0.68]}
            radius={0.1}
            smoothness={3}
            position={[0.3, -0.4, 0.03]}
            rotation={[0, 0, -0.03]}
          >
            <meshStandardMaterial color="#2C3D79" roughness={0.9} metalness={0.02} envMapIntensity={0.25} />
          </RoundedBox>
        </group>

        {/* drifting zzz's */}
        <group ref={zz} position={[-0.42, 0.68, 0.16]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.08, i * 0.012]} scale={0.3 + i * 0.12}>
              <planeGeometry args={[0.16, 0.16]} />
              <meshBasicMaterial map={zv} transparent opacity={0.4} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>

        {/* the phone — GPS arrow + pulsing geofence rings */}
        <group ref={phone} position={[0.5, -0.2, 0.52]} rotation={[-0.5, 0.02, -0.04]}>
          <mesh ref={phoneGlow} position={[0, 0, -0.03]}>
            <planeGeometry args={[0.8, 1.0]} />
            <meshBasicMaterial
              map={phoneHalo}
              transparent
              opacity={0.35}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <RoundedBox args={[0.2, 0.4, 0.02]} radius={0.03} smoothness={3}>
            <meshStandardMaterial color="#0A0E1B" roughness={0.35} metalness={0.6} envMapIntensity={0.9} />
          </RoundedBox>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.175, 0.36]} />
            <meshBasicMaterial map={phoneScreen} toneMapped={false} />
          </mesh>
          {/* direction arrow — points along the route */}
          <mesh ref={arrow} position={[0, 0.03, 0.035]} rotation={[0, 0, -0.72]}>
            <coneGeometry args={[0.028, 0.09, 18]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
          {/* GPS ping rings */}
          <group ref={pulseRings}>
            {[0, 1].map((i) => (
              <mesh key={i} position={[0, -0.06, 0.03]}>
                <ringGeometry args={[0.085, 0.092, 40]} />
                <meshBasicMaterial
                  color={CYAN}
                  transparent
                  opacity={0.5}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            ))}
          </group>
        </group>

        {/* alarm clock on the fold-down table (the wake trigger) */}
        <group ref={clock} position={[1.2, -0.16, 0.3]} scale={0.72}>
          <mesh>
            <torusGeometry args={[0.27, 0.035, 12, 40]} />
            <meshBasicMaterial color="#2A3357" toneMapped={false} />
          </mesh>
          <mesh ref={clockFace} position={[0, 0, 0.01]}>
            <circleGeometry args={[0.26, 36]} />
            <meshBasicMaterial color={CREAM} toneMapped={false} />
          </mesh>
          <mesh position={[0.045, 0.012, 0.03]} rotation={[0, 0, 2.0]}>
            <boxGeometry args={[0.028, 0.13, 0.012]} />
            <meshBasicMaterial color="#20263E" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.065, 0.04]} rotation={[0, 0, Math.PI]}>
            <boxGeometry args={[0.02, 0.13, 0.012]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
          <mesh position={[-0.13, 0.28, 0]}>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshBasicMaterial color={ALARM} toneMapped={false} />
          </mesh>
          <mesh position={[0.13, 0.28, 0]}>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshBasicMaterial color={ALARM} toneMapped={false} />
          </mesh>
        </group>

        {/* destination pin + geofence ring, floating off the phone */}
        <group ref={pin} position={[0.5, 0.18, 0.4]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.05, 0.15, 20]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.04, 16, 12]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={pinRing} position={[0.5, 0.1, 0.36]}>
          <ringGeometry args={[0.3, 0.33, 40]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>

        {/* saved-favourites heart */}
        <mesh ref={heartRef} position={[0.96, 0.02, 0.42]}>
          <planeGeometry args={[0.3, 0.27]} />
          <meshBasicMaterial map={heart} transparent toneMapped={false} depthWrite={false} />
        </mesh>

        {/* rail + flow shimmer under the carriage */}
        <mesh ref={arcRef} geometry={tubeGeo}>
          <meshBasicMaterial color={CYAN} transparent opacity={0.4} toneMapped={false} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <FlowChevron key={i} curve={CURVE} geo={chevGeo} offset={i / 3} />
        ))}
        <mesh ref={spark} position={[CURVE.getPoint(0.05).x, CURVE.getPoint(0.05).y, 0.09]}>
          <circleGeometry args={[0.045, 24]} />
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
      </group>

      {/* WAKE UP badge */}
      <mesh ref={badgeRef} position={[1.16, 0.98, 0.16]} scale={0.001}>
        <planeGeometry args={[0.88, 0.41]} />
        <meshBasicMaterial map={wake} transparent toneMapped={false} depthWrite={false} />
      </mesh>

      <HotspotRing
        color={CYAN}
        anchors={[
          [1.2, -0.16, 0.34, 0.46], // alarm clock — wake-up alarms
          [0, -1.12, 0.16, 1.3], // rail + spark — trip state machine
          [0.18, 1.47, 0.02, 0.8], // departure board — live VBB arrivals
          [0.5, 0.12, 0.5, 0.45], // GPS pin + rings — geofence
          [0.96, 0.02, 0.46, 0.34], // heart tile — offline favourites
        ]}
        feature={feature}
      />
    </group>
  )
}


/* ================================================================= ring stage */
const TAU = Math.PI * 2
const STEP = (Math.PI * 2) / PROJECTS.length
const DEPTH = 6.0
const TILT = 0.42
const wrapPi = (x: number) => {
  const r = ((x % TAU) + TAU) % TAU
  return r > Math.PI ? r - TAU : r
}
const smoothstep = (a: number, b: number, x: number) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return k * k * (3 - 2 * k)
}

const MODELS = [JobFlowModel, SudokuModel, NapTripModel]
const pulseNow = () => scrollStore.modelPulse

/**
 * ProjectModels — the carousel ring. All three project objects stay mounted
 * and live; the fronted one drives `useUI.featuredIndex` (re-render on
 * integer change only), the focused one is lifted to the right of the DOM
 * detail panel while the rest recede.
 */
export function ProjectModels({ appear }: { appear: MutableRefObject<number> }) {
  const ring = useRef<THREE.Group>(null)
  const slots = useRef<Array<THREE.Group | null>>([null, null, null])
  const presence = useRef([1, 1, 1])
  const lastFeatured = useRef(-1)
  const hover = useRef(false)
  const bob = useRef(0)
  const focusK = useRef(0)
  const w = useMemo(() => new THREE.Vector3(), [])
  const sphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 1), [])

  /* rect stores die with the stage so no stale hit zones linger */
  useEffect(
    () => () => {
      scrollStore.modelRect.ok = false
      scrollStore.slotRects.forEach((r) => (r.ok = false))
    },
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const g = ring.current
    if (!g) return
    const ui = useUI.getState()
    const car = scrollStore.carousel
    const spin = scrollStore.modelSpin
    const focusing = ui.workFocusOpen && ui.workFocusIndex !== null
    const focusIdx = Math.min(PROJECTS.length - 1, Math.max(0, ui.workFocusIndex ?? 0))
    focusK.current = damp(focusK.current, focusing ? 1 : 0, 3.4, dt)
    const focus = focusK.current

    /* turntable integration — idle drift, settle-snap (was the slab carousel) */
    if (!car.dragging) {
      const idle = car.interacted ? 0 : 0.035
      car.spin = damp(car.spin, idle, 0.8, dt)
      const tweening = gsap.isTweening(car)
      if (!tweening && car.interacted && Math.abs(car.spin) < 0.06) {
        const snapped = Math.round(car.angle / STEP) * STEP
        car.angle = damp(car.angle, snapped, 2.2, dt)
      }
    }
    car.angle += car.spin * dt

    /* ring-wide pointer tilt + ambient breathing.
       portrait: lift the whole ring into the free upper half so the bottom
       context card never covers the objects (mobile bug) */
    const vwPortrait = scrollStore.viewport.width || window.innerWidth
    const vhPortrait = scrollStore.viewport.height || window.innerHeight
    const portrait = vwPortrait / vhPortrait < 0.85
    const reduce = reduced()
    bob.current += dt * 0.6
    const p = scrollStore.pointerLerped
    g.rotation.x = damp(g.rotation.x, reduce ? 0 : -p.y * 0.035, 3, dt)
    g.position.y = damp(
      g.position.y,
      (reduce ? 0 : Math.sin(bob.current) * 0.03) + (portrait ? 0.55 : -0.32),
      3,
      dt,
    )

    /* camera framing */
    const cam = state.camera as THREE.PerspectiveCamera
    const camZ = Math.max(state.camera.position.z, 6)
    const halfW = Math.tan((cam.fov * Math.PI) / 360) * camZ * (cam.aspect || 1)
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * camZ
    const vw = vwPortrait
    const vh = vhPortrait
    const fit = THREE.MathUtils.clamp((halfW * 0.8) / 2.55, 0.48, 1.05)
    const spreadX = THREE.MathUtils.clamp(halfW * 0.66, 4.6, 7.6)

    /* drag-rotate inertia + zoom (fed by FeaturedWork while in focus mode) */
    if (focus > 0.55) {
      spin.yaw += spin.yawVel * dt
      spin.pitch += spin.pitchVel * dt
      spin.pitch = THREE.MathUtils.clamp(spin.pitch, -0.55, 0.55)
      spin.yawVel = damp(spin.yawVel, 0, 2.4, dt)
      spin.pitchVel = damp(spin.pitchVel, 0, 2.4, dt)
    } else {
      spin.yaw = damp(spin.yaw, 0, 1.5, dt)
      spin.pitch = damp(spin.pitch, 0, 1.5, dt)
      spin.zoomTarget = damp(spin.zoomTarget, 1, 2, dt)
    }
    spin.zoom = damp(spin.zoom, spin.zoomTarget, 6, dt)

    /* section-exit choreography: objects shrink + drift apart as appear↓ */
    const out = 1 - Math.min(1, appear.current)
    const shrink = 0.4 + 0.6 * appear.current

    /* which object fronts the camera right now */
    let featured = 0
    let bestAbs = Infinity
    for (let i = 0; i < PROJECTS.length; i += 1) {
      const phi = wrapPi(i * STEP + car.angle)
      const a = Math.abs(phi)
      if (a < bestAbs) {
        bestAbs = a
        featured = i
      }
    }
    if (featured !== lastFeatured.current) {
      lastFeatured.current = featured
      useUI.getState().setFeaturedIndex(featured)
    }

    /* per-object placement — focus pose vs cover-flow pose */
    for (let i = 0; i < PROJECTS.length; i += 1) {
      const slot = slots.current[i]
      if (!slot) continue
      const isFocusSlot = focusing && i === focusIdx
      /* non-focused objects recede out of the frame while one is expanded */
      const wantPresence = focusing && i !== focusIdx ? 0 : 1
      presence.current[i] = damp(presence.current[i], wantPresence, 2.8, dt)
      const pres = presence.current[i] * shrink

      if (isFocusSlot && focus > 0.001) {
        /* FOCUS — scale up + pan right of the detail panel (desktop) or
           into the upper half above the bottom sheet (portrait).
           portrait subtracts the ring's +0.55 group lift (keeps the
           world-space upper-half target) and drops a touch lower so the
           object clears the section heading. */
        const tx = portrait ? 0 : halfW * 0.36
        const ty = portrait ? halfH * 0.36 - 0.2 : 0.14
        const tz = 2.1
        const ts = fit * (portrait ? 0.64 : 1.04) * spin.zoom
        slot.position.set(
          damp(slot.position.x, tx, 3.4, dt),
          damp(slot.position.y, ty, 3.4, dt),
          damp(slot.position.z, tz, 3.4, dt),
        )
        slot.scale.setScalar(damp(slot.scale.x, ts * pres, 3.4, dt))
        /* showcase rotation: user drag-rotate + gentle pointer parallax */
        slot.rotation.y = damp(
          slot.rotation.y,
          spin.yaw + (reduce ? 0 : p.x * 0.06),
          4.5,
          dt,
        )
        slot.rotation.x = damp(slot.rotation.x, spin.pitch, 4.5, dt)
        slot.visible = pres > 0.012 && appear.current > 0.05
      } else {
        const phi = wrapPi(i * STEP + car.angle)
        const absPhi = Math.abs(phi)
        const n = absPhi / Math.PI
        const edgeFade = 1 - smoothstep(2.1, 2.9, absPhi)
        const front = 1 - Math.min(1, n * 3.4)
        /* pedestal sway for the fronted object (+hover presentation wobble),
           shelved objects keep still */
        const sway =
          front *
          (reduce
            ? 0
            : 0.06 * Math.sin(bob.current * 0.7 + i * 1.7) +
              (hover.current && i === featured ? 0.05 * Math.sin(bob.current * 1.7) : 0))
        const ts = fit * (0.94 + (1 - n) * 0.1)
        slot.position.set(
          damp(slot.position.x, (phi / Math.PI) * spreadX * (1 + out * 1.1), 7, dt),
          damp(slot.position.y, reduce ? 0 : Math.sin(bob.current * 1.25 + i * 2.3) * 0.05, 6, dt),
          damp(slot.position.z, -DEPTH * Math.pow(Math.sin((n * Math.PI) / 2), 1.2), 5, dt),
        )
        slot.scale.setScalar(damp(slot.scale.x, ts * pres, 5, dt))
        slot.rotation.y = damp(slot.rotation.y, -phi * TILT + sway, 4.5, dt)
        slot.rotation.x = damp(slot.rotation.x, reduce ? 0 : -p.y * 0.03, 4, dt)
        slot.visible = pres > 0.012 && edgeFade > 0.02 && appear.current > 0.05
      }
    }

    /* per-frame raycast + screen-space hit circles for the DOM layer */
    const ray = state.raycaster
    ray.setFromCamera(scrollStore.pointer as THREE.Vector2, cam)
    let over = false
    for (let i = 0; i < PROJECTS.length; i += 1) {
      const slot = slots.current[i]
      const rect = scrollStore.slotRects[i]
      rect.ok = false
      if (!slot || !slot.visible) continue
      slot.getWorldPosition(w)
      const dist = Math.max(cam.position.distanceTo(w), 0.001)
      /* only the object the user can sensibly act on raycasts: the fronted
         object while browsing, the expanded one while in focus */
      const primary = focusing ? i === focusIdx : i === featured
      if (primary && !car.dragging) {
        sphere.center.copy(w)
        sphere.radius = HIT_R[i] * slot.scale.x
        over = ray.ray.intersectsSphere(sphere) || over
      }
      w.project(cam)
      rect.x = (w.x * 0.5 + 0.5) * vw
      rect.y = (1 - (w.y * 0.5 + 0.5)) * vh
      const pxPerUnit = vh / (2 * Math.tan((cam.fov * Math.PI) / 360) * dist)
      rect.r = Math.max(HIT_R[i] * slot.scale.x * pxPerUnit, 40)
      rect.ok = true
    }

    /* featured object's rect gates on being properly fronted */
    const dockFade = 1 - smoothstep(0.35, 0.75, bestAbs)
    const fr = scrollStore.slotRects[featured]
    const mRect = scrollStore.modelRect
    mRect.x = fr.x
    mRect.y = fr.y
    mRect.r = fr.r
    mRect.ok = fr.ok && (focusing ? true : dockFade > 0.55) && appear.current > 0.3

    if (over !== hover.current) {
      hover.current = over
      useUI.getState().setModelHover(over)
    }
  })

  return (
    <group ref={ring}>
      {PROJECTS.map((p, i) => {
        const Model = MODELS[i]
        return (
          <group
            key={p.id}
            ref={(r) => {
              slots.current[i] = r
            }}
          >
            <Model
              hovering={hover}
              pulse={pulseNow}
              feature={() =>
                useUI.getState().workFocusOpen && useUI.getState().workFocusIndex === i
                  ? (scrollStore.hotspot ?? -1)
                  : -1
              }
            />
          </group>
        )
      })}
    </group>
  )
}
