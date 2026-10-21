import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import gsap from 'gsap'
import { useFrame, type RootState } from '@react-three/fiber'
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
const NAVY = '#12142B'
const CARD = '#161A2B'
/* NapTrip night-pod palette */
const MINT = '#9FF7E4'
const CREAM = '#F2EEDC'
const BLANKET = '#1E2A5E'
const PEACH = '#E9C39B'

/* world-space hit radius of each model root (generous, used for ray + rect) */
const HIT_R = [1.35, 1.5, 1.6]

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

const AFDUR: Record<string, number> = {
  score: 2.6,
  chips: 3.2,
  doc: 3.2,
  kanban: 2.8,
  pdf: 3.2,
  elo: 1.9,
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

function JobFlowModel({ hovering, pulse, feature }: ModelProps) {
  const panel = useRef<THREE.Group>(null)
  const scan = useRef<THREE.Mesh>(null)
  const badge = useRef<THREE.Group>(null)
  const chips = useRef<THREE.Group>(null)
  const kanban = useRef<THREE.Group>(null)
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

  useEffect(
    () => () => {
      suiteTex.dispose()
      glow.dispose()
      chipTex.forEach((c) => c.dispose())
      scoreTex.dispose()
    },
    [suiteTex, glow, chipTex, scoreTex],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    t.current += dt
    const n = pulse()
    if (n !== lastPulse.current) {
      lastPulse.current = n
      demo.current = 3.2
    }
    if (demo.current > 0) demo.current -= dt

    /* panel feature actions → targeted slices of the choreography */
    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name && fired.name in act) act[fired.name] = AFDUR[fired.name] ?? 2.5
    }
    for (const k in act) if (act[k] > 0) act[k] -= dt

    /* skill chips cascade during the demo or the 'chips' action, else rest */
    const show = demo.current > 0 || act.chips > 0 ? 1 : 0
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
        hovering.current || demo.current > 0 || act.doc > 0 || act.pdf > 0
      const speed = scanning ? 1.5 : 0.5
      const cyc = (t.current * speed) % 1
      scan.current.position.y = 1.42 - cyc * 2.84
      const sm = scan.current.material as THREE.MeshBasicMaterial
      sm.opacity =
        0.16 + (demo.current > 0 ? 0.14 : 0) + (act.doc > 0 || act.pdf > 0 ? 0.12 : 0) + (hovering.current ? 0.08 : 0)
    }

    /* score badge */
    if (badge.current) {
      badge.current.rotation.z = t.current * (hovering.current ? 1.4 : 0.35)
      const pop = demo.current > 0 || act.score > 0 ? 1 + Math.abs(Math.sin(t.current * 5)) * 0.16 : 1
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
          [1.06, 1.48, 0.28, 0.48], // deterministic ATS match-score badge
          [1.58, 0.02, 0.24, 0.62], // skill-classification chip cascade
          [0, -0.2, 0.1, 1.58], // suite window — DIN 5008 DACH templates
          [0, -1.78, 0.16, 0.74], // application pipeline — kanban tracker
          [0, 0.95, 0.12, 0.55], // scan sweep — vector-native PDF export
        ]}
        feature={feature}
      />
    </group>
  )
}

/* ========================================================= Sudoku Showdown */
const clueDigit = (r: number, c: number) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1
const keepClue = (r: number, c: number) => (r * 7 + c * 13) % 9 > 3

const digitTexOf = (n: number) =>
  makeTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256)
    g.fillStyle = INK
    g.font = SYNE(170)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(n), 128, 140)
  })

const keyTexOf = (n: number) =>
  makeTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256)
    g.fillStyle = '#101223'
    g.beginPath()
    g.roundRect(8, 8, 240, 240, 52)
    g.fill()
    g.strokeStyle = '#34395C'
    g.lineWidth = 6
    g.stroke()
    g.fillStyle = INK
    g.font = SYNE(150)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(String(n), 128, 140)
  })

const tmpV2 = new THREE.Vector2()
const tmpV2b = new THREE.Vector2()
const t3a = new THREE.Vector3()
const t3b = new THREE.Vector3()

function SudokuModel({ hovering, pulse, feature }: ModelProps) {
  const board = useRef<THREE.Group>(null)
  const highlight = useRef<THREE.Mesh>(null)
  const ghostA = useRef<THREE.Mesh>(null)
  const ghostB = useRef<THREE.Mesh>(null)
  const keypad = useRef<THREE.Group>(null)
  const shield = useRef<THREE.Mesh>(null)
  const manaFill = useRef<THREE.Mesh>(null)
  const blots = useRef<THREE.Group>(null)
  const eloRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const demoT = useRef(-1)
  const lastPulse = useRef(pulse())
  const hopA = useRef({ from: new THREE.Vector2(2, 1), to: new THREE.Vector2(2, 1), k: 1 })
  const hopB = useRef({ from: new THREE.Vector2(6, 5), to: new THREE.Vector2(6, 5), k: 1 })
  const hoverCell = useRef(new THREE.Vector2(-1, -1))
  /* per-feature action timers: elo / voice / engine / cleanse / resync */
  const act: ActT = useRef<ActT>({ elo: 0, voice: 0, engine: 0, cleanse: 0, resync: 0 }).current
  const lastAct = useRef(scrollStore.modelAction.n)

  const S = 0.235
  const pos2 = (r: number, c: number, out: THREE.Vector2) =>
    out.set((c - 4) * S, (4 - r) * S)

  const digits = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digitTexOf), [])
  const keys = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(keyTexOf), [])
  const wolfTex = useMemo(
    () =>
      makeTex(256, 256, (g) => {
        g.clearRect(0, 0, 256, 256)
        /* round hub-avatar disc */
        g.fillStyle = '#0D1122'
        g.beginPath()
        g.arc(128, 128, 124, 0, Math.PI * 2)
        g.fill()
        /* neon "apex wolf" emblem — angular electric line-art, cyan glow */
        g.strokeStyle = '#8DF6FF'
        g.lineWidth = 7
        g.lineJoin = 'round'
        g.shadowColor = 'rgba(55,228,242,.95)'
        g.shadowBlur = 12
        /* ears */
        g.beginPath()
        g.moveTo(64, 70)
        g.lineTo(86, 16)
        g.lineTo(110, 64)
        g.moveTo(192, 70)
        g.lineTo(170, 16)
        g.lineTo(146, 64)
        g.stroke()
        /* skull + cheeks + muzzle */
        g.beginPath()
        g.moveTo(110, 64)
        g.lineTo(64, 70)
        g.lineTo(56, 122)
        g.lineTo(82, 170)
        g.lineTo(112, 214)
        g.lineTo(128, 198)
        g.lineTo(144, 214)
        g.lineTo(174, 170)
        g.lineTo(200, 122)
        g.lineTo(192, 70)
        g.lineTo(146, 64)
        g.closePath()
        g.stroke()
        /* glowing eyes */
        g.fillStyle = '#EAFFFF'
        g.beginPath()
        g.moveTo(94, 100)
        g.lineTo(122, 96)
        g.lineTo(116, 116)
        g.lineTo(90, 120)
        g.closePath()
        g.fill()
        g.beginPath()
        g.moveTo(162, 96)
        g.lineTo(190, 100)
        g.lineTo(166, 120)
        g.lineTo(140, 116)
        g.closePath()
        g.fill()
        /* nose */
        g.fillStyle = '#37E4F2'
        g.beginPath()
        g.moveTo(128, 178)
        g.lineTo(119, 168)
        g.lineTo(137, 168)
        g.closePath()
        g.fill()
        g.shadowBlur = 0
      }),
    [],
  )
  const statTex = useMemo(
    () =>
      makeTex(512, 128, (g) => {
        g.clearRect(0, 0, 512, 128)
        g.fillStyle = CARD
        g.beginPath()
        g.roundRect(4, 4, 504, 120, 30)
        g.fill()
        g.strokeStyle = 'rgba(139,124,255,.4)'
        g.lineWidth = 3
        g.stroke()
        g.fillStyle = 'rgba(236,235,255,.55)'
        g.font = MONO(26)
        g.textBaseline = 'top'
        g.fillText('ELO', 30, 18)
        g.fillStyle = '#A78BFA'
        g.font = SYNE(52)
        g.fillText('1450', 110, 22)
        g.fillStyle = CYAN2
        g.font = MONO(28)
        g.fillText('DIAMOND IV', 320, 40)
      }),
    [],
  )
  const boltTex = useMemo(
    () =>
      makeTex(512, 170, (g) => {
        g.clearRect(0, 0, 512, 170)
        /* violet bolt mark (the site's logo tile) */
        const grad = g.createLinearGradient(24, 25, 144, 145)
        grad.addColorStop(0, '#8B7CFF')
        grad.addColorStop(1, '#6D5AE8')
        g.fillStyle = grad
        g.beginPath()
        g.roundRect(24, 25, 120, 120, 28)
        g.fill()
        g.fillStyle = '#FFF'
        g.beginPath()
        g.moveTo(96, 44)
        g.lineTo(62, 96)
        g.lineTo(84, 96)
        g.lineTo(74, 132)
        g.lineTo(110, 84)
        g.lineTo(88, 84)
        g.lineTo(100, 44)
        g.closePath()
        g.fill()
        g.fillStyle = TXT
        g.font = JAK(44, 700)
        g.textBaseline = 'top'
        g.fillText('Co-doku', 168, 38)
        g.fillStyle = VIOLET
        g.font = MONO(24)
        g.fillText('COMPETITIVE HUB', 168, 100)
      }),
    [],
  )
  const blotTex = useMemo(
    () =>
      makeTex(256, 256, (g) => {
        const rad = g.createRadialGradient(128, 128, 20, 128, 128, 120)
        rad.addColorStop(0, 'rgba(255,126,212,.95)')
        rad.addColorStop(0.7, 'rgba(240,70,170,.6)')
        rad.addColorStop(1, 'rgba(240,70,170,0)')
        g.fillStyle = rad
        g.beginPath()
        g.arc(128, 128, 118, 0, Math.PI * 2)
        g.fill()
      }),
    [],
  )

  useEffect(
    () => () => {
      digits.forEach((d) => d.dispose())
      keys.forEach((k) => k.dispose())
      wolfTex.dispose()
      statTex.dispose()
      boltTex.dispose()
      blotTex.dispose()
    },
    [digits, keys, wolfTex, statTex, boltTex, blotTex],
  )

  const clues = useMemo(() => {
    const list: Array<{ r: number; c: number; n: number }> = []
    for (let r = 0; r < 9; r += 1)
      for (let c = 0; c < 9; c += 1) if (keepClue(r, c)) list.push({ r, c, n: clueDigit(r, c) })
    return list
  }, [])

  useFrame((state: RootState, delta) => {
    const dt = Math.min(delta, 0.05)
    const g = board.current
    if (!g) return
    t.current += dt
    const n = pulse()
    if (n !== lastPulse.current && demoT.current < 0) {
      lastPulse.current = n
      demoT.current = 0
    } else if (n !== lastPulse.current) lastPulse.current = n
    if (demoT.current >= 0) {
      demoT.current += dt
      if (demoT.current > 4.2) demoT.current = -1
    }
    const demo = demoT.current >= 0

    /* panel feature actions → discrete sabotage slices */
    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name === 'sabotage') demoT.current = 0 /* full sabotage round */
      else if (fired.name && fired.name in act) act[fired.name] = AFDUR[fired.name] ?? 2.4
    }
    for (const k in act) if (act[k] > 0) act[k] -= dt

    /* board bob */
    if (!reduced()) {
      g.position.y = Math.sin(t.current * 0.7) * 0.045
      g.rotation.z = scrollStore.pointerLerped.x * 0.015
    }

    /* highlight follows the hovered cell (manual ray → board plane at the
       board's WORLD z, not its local z) */
    g.getWorldPosition(t3b)
    const ray = state.raycaster
    ray.setFromCamera(scrollStore.pointer as THREE.Vector2, state.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -t3b.z)
    const pt = new THREE.Vector3()
    if (ray.ray.intersectPlane(plane, pt)) {
      const local = g.worldToLocal(pt.clone())
      if (Math.abs(local.x) <= 1.06 && Math.abs(local.y) <= 1.06) {
        const c = Math.round(local.x / S) + 4
        const r = 4 - Math.round(local.y / S)
        hoverCell.current.set(r, c)
      } else hoverCell.current.set(-1, -1)
    }
    if (highlight.current) {
      const on = hovering.current && hoverCell.current.x >= 0
      const m = highlight.current.material as THREE.MeshBasicMaterial
      m.opacity = damp(m.opacity, on ? 0.4 : 0, 9, dt)
      if (on) {
        const v = new THREE.Vector2()
        pos2(hoverCell.current.x, hoverCell.current.y, v)
        highlight.current.position.set(v.x, v.y, 0.028)
      }
    }

    /* rival cursors — PvP voice/spectate presence; frenzy boost on 'voice' */
    const hop = (h: typeof hopA.current, speed: number, out: THREE.Vector3) => {
      h.k += dt * speed
      if (h.k >= 1) {
        h.k = 0
        h.from.copy(h.to)
        h.to.set(Math.floor(Math.random() * 9), Math.floor(Math.random() * 9))
      }
      const from = pos2(h.from.x, h.from.y, tmpV2)
      const to = pos2(h.to.x, h.to.y, tmpV2b)
      out.set(
        from.x + (to.x - from.x) * h.k,
        from.y + (to.y - from.y) * h.k,
        0.05 + Math.sin(h.k * Math.PI) * 0.14,
      )
      return out
    }
    const vBoost = act.voice > 0 ? 3 : 1
    const a = hop(hopA.current, 0.9 * vBoost, t3a)
    const b = hop(hopB.current, 0.68 * vBoost, t3b)
    if (ghostA.current) ghostA.current.position.set(a.x, a.y, a.z)
    if (ghostB.current) ghostB.current.position.set(b.x, b.y, b.z)
    if (ghostA.current)
      ghostA.current.scale.setScalar(
        1 + (act.voice > 0 ? 0.24 + Math.sin(t.current * 6) * 0.14 : 0),
      )
    if (ghostB.current)
      ghostB.current.scale.setScalar(
        1 + (act.voice > 0 ? 0.24 + Math.sin(t.current * 6 + 1.4) * 0.14 : 0),
      )

    /* mana charge bar — sabotage demo, resync flash or idle level */
    if (manaFill.current) {
      const resyncing = act.resync > 0
      const want = demo
        ? Math.min(demoT.current / 2.4, 1)
        : resyncing
          ? 0.62 + Math.sin(t.current * 14) * 0.28
          : 0.34
      manaFill.current.scale.x = damp(manaFill.current.scale.x, Math.max(want, 0.03), 4, dt)
      ;(manaFill.current.material as THREE.MeshBasicMaterial).color.set(
        demo || resyncing ? PINK : VIOLET,
      )
    }

    /* ink splashes spawn mid-demo, then fade */
    if (blots.current) {
      blots.current.visible = demo && demoT.current > 0.35 && demoT.current < 3.4
      blots.current.children.forEach((c, i) => {
        const popIn = THREE.MathUtils.clamp((demoT.current - 0.35 - i * 0.25) / 0.3, 0, 1)
        const popOut = 1 - THREE.MathUtils.clamp((demoT.current - 2.7 - i * 0.2) / 0.5, 0, 1)
        c.scale.setScalar(Math.max(Math.min(popIn, popOut) * 1.5, 0.001))
      })
    }

    /* keypad scramble mid-demo or on the 'engine' action */
    if (keypad.current) {
      const scrambling =
        (demo && demoT.current > 0.8 && demoT.current < 3.1) || act.engine > 0
      keypad.current.children.forEach((c) => {
        const idx = Number((c as THREE.Mesh).userData.k)
        let slot = idx
        if (scrambling) {
          const swaps: Record<number, number> = { 0: 8, 8: 0, 1: 5, 5: 1 }
          slot = swaps[idx] ?? idx
        }
        c.position.x = damp(c.position.x, ((slot % 3) - 1) * 0.26, scrambling ? 7 : 4, dt)
        c.position.y = damp(c.position.y, (1 - Math.floor(slot / 3)) * 0.26, scrambling ? 7 : 4, dt)
        c.rotation.z = damp(c.rotation.z, scrambling ? Math.sin(t.current * 9 + idx) * 0.16 : 0, 6, dt)
      })
    }

    /* cleanses shield flashes at the demo's end, or the cleanse/resync actions */
    if (shield.current) {
      const want =
        (demo && demoT.current > 2.8) || act.cleanse > 0 || act.resync > 0 ? 1 : 0
      const m = shield.current.material as THREE.MeshBasicMaterial
      m.opacity = damp(m.opacity, want ? 0.55 : 0, 5, dt)
      shield.current.scale.setScalar(Math.max(0.94 + (1 - m.opacity / 0.55) * 0.3 * (m.opacity > 0.01 ? 1 : 0), 0.001))
    }

    /* ELO card pulse on the 'elo' action */
    if (eloRef.current) {
      const e = act.elo
      eloRef.current.scale.setScalar(
        1 + (e > 0 ? Math.sin(Math.min(1, (1.9 - e) / 1.9) * Math.PI) * 0.16 : 0),
      )
    }
  })

  return (
    <group>
      <group ref={board}>
        {/* 81-cell grid */}
        {Array.from({ length: 81 }, (_, i) => {
          const r = Math.floor(i / 9)
          const c = i % 9
          const v = new THREE.Vector2()
          pos2(r, c, v)
          return (
            <mesh key={i} position={[v.x, v.y, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.042]} />
              <meshStandardMaterial color={NAVY} roughness={0.3} metalness={0.42} envMapIntensity={1.05} />
            </mesh>
          )
        })}
        {/* clue digits */}
        {clues.map(({ r, c, n }) => {
          const v = new THREE.Vector2()
          pos2(r, c, v)
          return (
            <mesh key={`d${r}-${c}`} position={[v.x, v.y, 0.024]}>
              <planeGeometry args={[0.17, 0.17]} />
              <meshBasicMaterial map={digits[n - 1]} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          )
        })}
        {/* hover cell highlight */}
        <mesh ref={highlight} position={[0, 0, 0.028]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
        {/* player ghost cursors */}
        <mesh ref={ghostA} position={[0, 0, 0.05]}>
          <torusGeometry args={[0.085, 0.014, 8, 28]} />
          <meshBasicMaterial color={VIOLET} toneMapped={false} />
        </mesh>
        <mesh ref={ghostB} position={[0, 0, 0.05]}>
          <torusGeometry args={[0.085, 0.014, 8, 28]} />
          <meshBasicMaterial color={AMBER} toneMapped={false} />
        </mesh>
        {/* ink splashes (demo) */}
        <group ref={blots} visible={false}>
          {[0, 1, 2].map((i) => {
            const r = (i * 3 + 2) % 9
            const c = (i * 4 + 3) % 9
            const v = new THREE.Vector2()
            pos2(r, c, v)
            return (
              <mesh key={i} position={[v.x, v.y, 0.06]}>
                <planeGeometry args={[0.32, 0.32]} />
                <meshBasicMaterial map={blotTex} transparent depthWrite={false} toneMapped={false} />
              </mesh>
            )
          })}
        </group>
        {/* cleanse shield */}
        <mesh ref={shield} position={[0, 0, 0.09]}>
          <ringGeometry args={[1.22, 1.3, 48]} />
          <meshBasicMaterial
            color={CYAN2}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ELO medallion — neon "apex wolf" avatar + online ring */}
      <group ref={eloRef} position={[-0.85, 1.34, 0.1]}>
        <mesh>
          <circleGeometry args={[0.27, 40]} />
          <meshBasicMaterial map={wolfTex} transparent toneMapped={false} alphaTest={0.02} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.295, 0.02, 10, 44]} />
          <meshBasicMaterial color={CYAN2} toneMapped={false} />
        </mesh>
      </group>

      {/* competitive stat card */}
      <mesh position={[-0.85, -1.36, 0.1]}>
        <planeGeometry args={[1.0, 0.25]} />
        <meshBasicMaterial map={statTex} transparent toneMapped={false} />
      </mesh>

      {/* bolt logo tile (the site's logo + subtitle) */}
      <mesh position={[0.9, 1.34, 0.1]}>
        <planeGeometry args={[1.1, 0.365]} />
        <meshBasicMaterial map={boltTex} transparent toneMapped={false} />
      </mesh>

      {/* mini keypad (scramble target) */}
      <group ref={keypad} position={[1.62, -0.1, 0.1]}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[((i % 3) - 1) * 0.26, (1 - Math.floor(i / 3)) * 0.26, 0]} userData={{ k: i }}>
            <planeGeometry args={[0.2, 0.2]} />
            <meshBasicMaterial map={keys[i]} transparent toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* mana bar */}
      <group position={[1.62, -1.02, 0.1]}>
        <mesh position={[0, 0.14, 0]}>
          <planeGeometry args={[0.92, 0.028]} />
          <meshBasicMaterial color={INK} transparent opacity={0.16} toneMapped={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[0.86, 0.09]} />
          <meshBasicMaterial color="#23243A" toneMapped={false} />
        </mesh>
        <mesh ref={manaFill} position={[-0.43, 0, 0.005]} scale={[0.34, 1, 1]}>
          <planeGeometry args={[0.86, 0.09]} />
          <meshBasicMaterial color={VIOLET} toneMapped={false} />
        </mesh>
      </group>

      {/* feature-row locator ring (panel hotspots) */}
      <HotspotRing
        color={CYAN2}
        anchors={[
          [-0.85, 1.34, 0.18, 0.56], // ELO rank card — matchmaking tiers
          [1.62, -0.1, 0.18, 0.52], // keypad — mana & combo sabotages
          [0, 0.12, 0.14, 1.22], // rival cursors — WebRTC voice + spectate
          [0, -0.05, 0.06, 1.34], // board — full sudoku engine
          [1.62, -0.98, 0.18, 0.54], // mana bar — disconnect grace resync
        ]}
        feature={feature}
      />
    </group>
  )
}

/* ================================================================ NapTrip
 * Rebuilt as a "night sleeper pod" diorama (no app UI exists to copy): a
 * floating bed with a sleeping passenger drifting zzz's, a crescent moon,
 * an alarm clock wrapped in geofence rings, a live departure board and a
 * shimmering journey arc underneath.                                  */
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
  const clock = useRef<THREE.Group>(null)
  const clockFace = useRef<THREE.Mesh>(null)
  const rings = useRef<THREE.Mesh>(null)
  const zz = useRef<THREE.Group>(null)
  const sleeper = useRef<THREE.Group>(null)
  const boardRef = useRef<THREE.Mesh>(null)
  const badgeRef = useRef<THREE.Mesh>(null)
  const heartRef = useRef<THREE.Mesh>(null)
  const pin = useRef<THREE.Group>(null)
  const pinRing = useRef<THREE.Mesh>(null)
  const spark = useRef<THREE.Mesh>(null)
  const arcRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const demoT = useRef(-1)
  const lastPulse = useRef(pulse())
  const youU = useRef(0.05)
  /* per-feature action timers: sprint / arrivals / pin / favourites */
  const act: ActT = useRef<ActT>({ sprint: 0, arrivals: 0, pin: 0, favourites: 0 }).current
  const lastAct = useRef(scrollStore.modelAction.n)

  /* journey arc that sweeps under the bed */
  const CURVE = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.5, -0.52, 0.06),
        new THREE.Vector3(-0.75, -0.38, 0.06),
        new THREE.Vector3(0.05, -0.3, 0.06),
        new THREE.Vector3(0.8, -0.4, 0.06),
        new THREE.Vector3(1.5, -0.5, 0.06),
      ]),
    [],
  )
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(CURVE, 60, 0.013, 8, false), [CURVE])
  const chevGeo = useMemo(() => chevronGeo(), [])
  const halo = useMemo(() => glowTex('rgba(64,78,180,.32)', 'rgba(64,78,180,0)'), [])
  const boards = useMemo(() => [boardTexOf(false), boardTexOf(true)], [])
  const wake = useMemo(() => wakeBadgeTex(), [])
  const moon = useMemo(() => moonTex(), [])
  const star = useMemo(() => starTex(), [])
  const heart = useMemo(() => heartTex(), [])
  const zv = useMemo(() => zzzTex(), [])

  useEffect(
    () => () => {
      tubeGeo.dispose()
      chevGeo.dispose()
      halo.dispose()
      boards.forEach((b) => b.dispose())
      wake.dispose()
      moon.dispose()
      star.dispose()
      heart.dispose()
      zv.dispose()
    },
    [tubeGeo, chevGeo, halo, boards, wake, moon, star, heart, zv],
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
        /* let the passenger drift back to sleep + reset the ride */
        youU.current = 0.05
      }
    }
    const alarm = demoT.current >= 0

    /* panel feature actions → pod-slice animations */
    const fired = scrollStore.modelAction
    if (fired.n !== lastAct.current) {
      lastAct.current = fired.n
      if (fired.name === 'alarm') demoT.current = 0 /* full wake-up sequence */
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
      pod.current.rotation.y = damp(pod.current.rotation.y, reduced() ? 0 : p.x * 0.16 * hovF, 3, dt)
      pod.current.rotation.x = damp(pod.current.rotation.x, reduced() ? 0 : -p.y * 0.08 * hovF, 3, dt)
      pod.current.position.y = Math.sin(t.current * 0.75) * 0.05
    }

    /* alarm clock — bells rattle during the wake-up, nudge on the pin plunge */
    if (clock.current) {
      const shake = alarm
        ? Math.sin(t.current * 22) * 0.12
        : pinning
          ? Math.sin(t.current * 10) * 0.04
          : 0
      clock.current.rotation.z = damp(clock.current.rotation.z, shake, 10, dt)
    }
    /* clock tint flashes red on the alarm */
    if (clockFace.current) {
      const m = clockFace.current.material as THREE.MeshBasicMaterial
      m.color.set(alarm && Math.sin(t.current * 12) > 0 ? '#FFD6DC' : CREAM)
    }
    /* geofence rings storm on alarm, snap on pin, else breathe */
    if (rings.current) {
      const speed = alarm ? 9 : pinning ? 6.5 : hovering.current ? 1.9 : 1.15
      rings.current.scale.setScalar(
        alarm
          ? 1 + Math.abs(Math.sin(t.current * speed)) * 0.24
          : pinning
            ? 1 + Math.abs(Math.sin(t.current * speed)) * 0.16
            : 1 + Math.sin(t.current * speed) * 0.07,
      )
      const m = rings.current.material as THREE.MeshBasicMaterial
      m.color.set(
        alarm && Math.sin(t.current * 18) > 0
          ? ALARM
          : pinning && Math.sin(t.current * 8) > 0
            ? ACCENT
            : CYAN,
      )
    }

    /* sleeping passenger — breathes, jolts awake during the alarm */
    if (sleeper.current) {
      sleeper.current.scale.y = 1 + (alarm ? 0 : Math.sin(t.current * 1.7) * 0.025)
      sleeper.current.rotation.x = damp(sleeper.current.rotation.x, alarm ? -0.55 : 0, 4.5, dt)
    }

    /* zzz's drift up; scramble away when the alarm fires */
    if (zz.current) {
      const speed = alarm ? 2.6 : 0.5
      zz.current.children.forEach((c, i) => {
        const ph = (t.current * speed + i / 3) % 1
        c.position.set(alarm ? ph * 0.45 : 0, ph * 0.55, i * 0.012)
        const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = Math.sin(Math.PI * ph) * (alarm ? 0.9 : 0.55)
        c.scale.setScalar(0.45 + ph * 0.6)
      })
    }

    /* journey arc — the progress spark rides it; sprints wake it */
    if (spark.current) {
      youU.current = (youU.current + dt * (alarm ? 0.4 : sprinting ? 0.27 : 0.03)) % 1
      const v = CURVE.getPoint(youU.current)
      spark.current.position.set(v.x, v.y, 0.09)
      spark.current.scale.setScalar(1 + (sprinting ? Math.abs(Math.sin(t.current * 9)) * 0.5 : 0))
    }
    if (arcRef.current) {
      const m = arcRef.current.material as THREE.MeshBasicMaterial
      m.opacity = damp(m.opacity, sprinting || alarm ? 0.8 : 0.42, 5, dt)
    }

    /* departure board — flips to a delay alert on 'arrivals' */
    if (boardRef.current) {
      const m = boardRef.current.material as THREE.MeshBasicMaterial
      m.map = boarding ? boards[1] : boards[0]
      boardRef.current.position.y = 1.0 + (boarding ? Math.abs(Math.sin(t.current * 5.5)) * 0.06 : 0)
    }

    /* WAKE UP badge pops during the wake-up */
    if (badgeRef.current) {
      const want = alarm ? 1 + Math.abs(Math.sin(t.current * 6)) * 0.08 : 0.001
      badgeRef.current.scale.setScalar(Math.max(want, 0.001))
    }

    /* home pin — bobbing idle, bounces on the 'pin' plunge */
    if (pin.current) {
      pin.current.position.y =
        pinning
          ? 0.24 + Math.abs(Math.sin(t.current * 9)) * 0.16
          : 0.12 + Math.sin(t.current * 1.6) * 0.03
    }
    if (pinRing.current) {
      const m = pinRing.current.material as THREE.MeshBasicMaterial
      m.color.set(pinning && Math.sin(t.current * 8) > 0 ? ACCENT : CYAN)
      pinRing.current.scale.setScalar(
        1 + (pinning ? Math.abs(Math.sin(t.current * 6.5)) * 0.16 : Math.sin(t.current * 1.15) * 0.07),
      )
    }

    /* favourites heart puffs */
    if (heartRef.current) {
      heartRef.current.scale.setScalar(1 + (favouring ? Math.abs(Math.sin(t.current * 8)) * 0.2 : 0))
    }
  })

  return (
    <group>
      {/* moonlit halo */}
      <mesh position={[0, 0, -0.09]}>
        <planeGeometry args={[4.2, 3.6]} />
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
        {/* crescent moon + stars */}
        <mesh position={[-1.06, 1.42, 0.03]}>
          <planeGeometry args={[0.66, 0.66]} />
          <meshBasicMaterial map={moon} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        {[
          [-0.72, 1.62],
          [-1.38, 1.08],
          [-0.95, 1.8],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.03]} rotation={[0, 0, i * 0.6]}>
            <planeGeometry args={[0.1, 0.1]} />
            <meshBasicMaterial map={star} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        ))}

        {/* live VBB departure board */}
        <mesh ref={boardRef} position={[0.05, 1.0, 0.1]}>
          <planeGeometry args={[1.66, 0.25]} />
          <meshBasicMaterial map={boards[0]} transparent toneMapped={false} depthWrite={false} />
        </mesh>

        {/* the sleeper bed */}
        <RoundedBox args={[2.5, 0.34, 0.62]} radius={0.12} smoothness={4} position={[0, 0.05, -0.05]}>
          <meshStandardMaterial color="#141B3F" roughness={0.55} metalness={0.25} envMapIntensity={0.7} />
        </RoundedBox>
        {/* blanket */}
        <RoundedBox args={[1.4, 0.3, 0.52]} radius={0.1} smoothness={4} position={[-0.42, 0.28, -0.04]}>
          <meshStandardMaterial color={BLANKET} roughness={0.6} metalness={0.15} envMapIntensity={0.6} />
        </RoundedBox>
        {/* pillow */}
        <RoundedBox args={[0.56, 0.22, 0.44]} radius={0.1} smoothness={4} position={[0.78, 0.22, -0.03]}>
          <meshStandardMaterial color="#D9DFF2" roughness={0.5} metalness={0.05} envMapIntensity={0.5} />
        </RoundedBox>
        {/* sleeping passenger */}
        <group ref={sleeper} position={[0.52, 0.33, 0.06]}>
          <mesh>
            <sphereGeometry args={[0.155, 24, 18]} />
            <meshStandardMaterial color={PEACH} roughness={0.65} metalness={0.02} envMapIntensity={0.35} />
          </mesh>
        </group>

        {/* drifting zzz's */}
        <group ref={zz} position={[0.78, 0.34, 0.12]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.08, i * 0.012]} scale={0.3 + i * 0.12}>
              <planeGeometry args={[0.16, 0.16]} />
              <meshBasicMaterial map={zv} transparent opacity={0.4} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>

        {/* alarm clock + bells (the wake trigger) */}
        <group ref={clock} position={[1.32, 0.52, 0.06]}>
          <mesh>
            <torusGeometry args={[0.27, 0.035, 12, 40]} />
            <meshBasicMaterial color="#2A3357" toneMapped={false} />
          </mesh>
          <mesh ref={clockFace} position={[0, 0, 0.01]}>
            <circleGeometry args={[0.26, 36]} />
            <meshBasicMaterial color={CREAM} toneMapped={false} />
          </mesh>
          {/* hands at ~06:30 */}
          <mesh position={[0.045, 0.012, 0.03]} rotation={[0, 0, 2.0]}>
            <boxGeometry args={[0.028, 0.13, 0.012]} />
            <meshBasicMaterial color="#20263E" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.065, 0.04]} rotation={[0, 0, Math.PI]}>
            <boxGeometry args={[0.02, 0.13, 0.012]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
          {/* bells */}
          <mesh position={[-0.13, 0.28, 0]}>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshBasicMaterial color={ALARM} toneMapped={false} />
          </mesh>
          <mesh position={[0.13, 0.28, 0]}>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshBasicMaterial color={ALARM} toneMapped={false} />
          </mesh>
        </group>

        {/* geofence rings around the wake trigger */}
        <mesh ref={rings} position={[1.32, 0.52, 0.02]}>
          <ringGeometry args={[0.38, 0.41, 48]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>

        {/* home pin + geofence circle ("drop a pin on the dark map") */}
        <group ref={pin} position={[-1.6, 0.12, 0.06]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.05, 0.15, 20]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.04, 16, 12]} />
            <meshBasicMaterial color={CYAN} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={pinRing} position={[-1.6, 0.12, 0.03]}>
          <ringGeometry args={[0.3, 0.33, 40]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>

        {/* saved-favourites heart */}
        <mesh ref={heartRef} position={[-0.85, 0.5, 0.1]}>
          <planeGeometry args={[0.34, 0.31]} />
          <meshBasicMaterial map={heart} transparent toneMapped={false} depthWrite={false} />
        </mesh>

        {/* journey arc + flow shimmer */}
        <mesh ref={arcRef} geometry={tubeGeo}>
          <meshBasicMaterial color={CYAN} transparent opacity={0.42} toneMapped={false} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <FlowChevron key={i} curve={CURVE} geo={chevGeo} offset={i / 3} />
        ))}
        <mesh ref={spark} position={[CURVE.getPoint(0.05).x, CURVE.getPoint(0.05).y, 0.09]}>
          <circleGeometry args={[0.045, 24]} />
          <meshBasicMaterial color={INK} toneMapped={false} />
        </mesh>
      </group>

      {/* WAKE UP badge (demo) */}
      <mesh ref={badgeRef} position={[1.28, 1.16, 0.14]} scale={0.001}>
        <planeGeometry args={[0.94, 0.44]} />
        <meshBasicMaterial map={wake} transparent toneMapped={false} depthWrite={false} />
      </mesh>

      {/* feature-row locator ring (panel hotspots) */}
      <HotspotRing
        color={CYAN}
        anchors={[
          [1.32, 0.52, 0.22, 0.52], // alarm clock + geofence rings — wake-up alarms
          [0, -0.52, 0.16, 1.35], // shimmering journey arc — trip state machine
          [0.05, 1.0, 0.22, 0.95], // departure board — live VBB arrivals
          [-1.6, 0.12, 0.16, 0.5], // home pin cluster — dark map + geofence + pin
          [-0.85, 0.5, 0.18, 0.4], // heart tile — offline favourites
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
        const ty = portrait ? halfH * 0.36 - 1.3 : 0.14
        const tz = 2.1
        const ts = fit * (portrait ? 0.68 : 1.04) * spin.zoom
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
