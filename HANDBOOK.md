# PROJECT HANDOFF — "THRIDOY°" Lusion-Style Portfolio

> Working dir: `D:\Projects\ALL AI RELATED STUFFS\Open Code\Portfolio`
> Stack: Vite + React 19 + TypeScript + Tailwind v4 (CSS-first) + three/R3F v9 + @react-three/drei + @react-three/postprocessing + @react-three/rapier + gsap/@gsap/react + lenis + zustand + lucide-react
> Dev server: running in background shell on **http://localhost:5174** (port 5173 was busy).
> Typecheck: `npx tsc --noEmit` — currently passing. Scripts in package.json: dev / build (`tsc --noEmit && vite build`) / typecheck / preview.

---

## 1. GOALS & REQUIREMENTS (recap of the user's brief)

Build an Awwwards/FWA-level personal developer portfolio for **S M Tanvir Hasan Hridoy** inspired by **lusion.co v3**. Must include:

- **Identity/links:** GitHub github.com/TanvirHasanHridoy, LinkedIn linkedin.com/in/th-hridoy, based in Chemnitz, Germany (Europe/Berlin, UTC+2). Existing projects to feature: **Job-Flow (JobFlow AI)**, **Sudoku-Online (Sudoku Showdown)**, **NapTrip** — plus Sudoku-Battle-Online, Netflix-Mod-New, and old portfolio v1 as the other 3 cards (all real links/URLs in `src/data/projects.ts`).
- **Stack:** Next.js or Vite+React (chose Vite), Tailwind + CSS vars, three/R3F/drei/@react-three/postprocessing, @react-three/rapier physics, gsap + ScrollTrigger, lenis synced to gsap.ticker, lucide-react.
- **Design system** (all in `src/styles/index.css`):
  - Colors: `--c-bg #F0F1FA` (light default) ⇄ `#0A0A0E` (dark), accent `#1A2FFB` cobalt, muted `#6E7185`. Theme is cross-faded at runtime by `useThemeSync` animating CSS variables on `<html>`.
  - Fonts (self-hosted @fontsource-variable, imported in `src/main.tsx`): Syne (display), Space Grotesk, Plus Jakarta Sans (body), JetBrains Mono (metadata/eyebrows). Classes: `.display-xl/.display-lg/.display-md` with clamp() sizing.
  - Signature: pill geometry, magnetic hover, dual-layer spring cursor with contextual labels (VIEW CASE / PLAY REEL / DRAG), masked line reveals, `.eyebrow` mono bullets.
- **Architecture rule:** ONE persistent fixed `<Canvas>` (pointer-events none, z-0) for the whole site behind DOM (DOM z-10); per-frame state lives in a mutable `scrollStore` (NO React re-renders in useFrame), discrete UI state in zustand store `useUI`.
- **Sections:** A) Preloader (counter 00→100, curtain exit) + fixed header (monogram magnetic, animated EQ sound toggle w/ procedural WebAudio ambience, "Let's talk" pill, Menu pill → floating glass nav card with staggered masked items Home/About/Projects/Labs/Contact). B) Hero: statement "I craft 3D visual storytelling, high-performance web applications, and interactive digital experiences." + 3D shader sculpture reacting to pointer + `scroll to explore`. C) Vision: "Bold Engineering, Brought to Life" + asymmetric editorial + "Our Approach" pill + showreel card 75vw→100vw×100vh scrub (radius 32px→0, PLAY REEL cursor). D) Featured Work: staggered 2-col grid, 6 project cards (gradient covers, tags line, hover scale + chromatic aberration + VIEW CASE cursor), "See all projects" button. E) Dark transition + Rapier physics pit (35–50 instanced glossy cobalt/matte obsidian/chrome shapes, gravity to center, kinematic pointer collider ball that scatters them, bloom). F) Footer: big CTA "Is Your Next Project Ready to Go Wild? Let's build together!", live Europe/Berlin clock, socials, "CONTINUE TO SCROLL" progress bar that triggers About/Labs modal when filled to 100%.

---

## 2. FILE MAP (what exists now, all compiling)

- `package.json` / `tsconfig.json` / `vite.config.ts` (react + @tailwindcss/vite plugins) / `index.html` (void-black pre-CSS bg, TH favicon, title "THRIDOY° — Creative Developer & 3D Engineer") / `src/vite-env.d.ts`
- `src/styles/index.css` — Tailwind v4 `@theme inline` mapping color-name tokens (bg/void/fg/accent/muted/line) to the runtime CSS vars; base styles; hidden scrollbars; lenis CSS; font utilities; `.eyebrow`; display classes; `.pill`; `.btn-sweep` (accent fill sweep hover); `.btn-blank`; `.roll` text-roll CSS; `.eq` equalizer bars keyframes; `.grain` SVG-noise overlay + grain-shift keyframes; `.cursor-root/.cursor-ring/.cursor-ring-label`; `.line-mask` (overflow hidden) for reveals; `.scroll-pulse` keyframes.
- `src/main.tsx` — StrictMode, fontsource imports, App.
- `src/App.tsx` — z-index map (0 canvas, 10 DOM, 30 grain, 40 header, 50 menu, **65 portal**, 60 cursor, 70 preloader); hooks: `useSmoothScroll(!ready || portalOpen)`, `useAmbientAudio(soundOn)`, `useThemeSync()`, `useSectionTracking()`; renders SceneCanvas, Grain, CustomCursor, Header, MenuOverlay, PortalOverlay, `<main>` (Hero, Vision, FeaturedWork, Lab, Footer), Preloader last.
- `src/store/store.ts` — zustand `useUI`: `ready` (default false; preloader sets true), `menuOpen`, `soundOn`, `theme: 'light'|'dark'`, `pitActive` (drives PhysicsPit mount), `portalOpen` (About/Labs modal + scroll lock), `cursor {label, variant: 'default'|'magnetic'|'view'|'play'|'drag'}` set/reset (no-op when unchanged), `loadProgress`. **DEV QoL:** `window.__useUI` is exposed on the store exports when `import.meta.env.DEV` (console QA access — be careful: the expose must stay BELOW the store definition or the module crashes with "Cannot access 'useUI' before initialization").
- `src/store/scrollStore.ts` — mutable per-frame store: scrollY/scrollProgress/scrollVelocity/scrolledVelocitySmoothed/lerpedScrollProgress, pointer (norm −1..1, y up)/pointerLerped/pointerVelocity, viewport, **activeSection** (0–4), **entrance** (0→1 hero ramp). Helpers `damp(current,target,lambda,dt)`, `dampVelocity`, `initPointerTracking()` (mousemove+resize listeners, returns cleanup), `tickStores(dt)` (pointer lerp λ7, velocity damp λ4, progress lerp λ5) — called from gsap.ticker.
- `src/hooks/useSmoothScroll.ts` — Lenis (lerp .09) + module `lenisRef` + `scrollToSection(target)` (scrollTo w/ quartOut easing 1.5s); `lenis.on('scroll')` writes scrollStore + `ScrollTrigger.update()`; gsap.ticker drives `lenis.raf(time*1000)` + `tickStores(dtSeconds)`; lagSmoothing(0); `locked` arg calls lenis.stop()/start(). NOTE: gsap ticker time is SECONDS, lenis wants ms.
- `src/hooks/useAmbientAudio.ts` — procedural WebAudio (brown-noise buffer + breathing lowpass LFO + detuned 55Hz sub pad), master gain envelope start/stop, `enabled` prop.
- `src/hooks/useThemeSync.ts` — gsap animates `--c-bg`/`--c-fg` on documentElement when `useUI.theme` flips; also sets `data-theme` attr (used by some CSS dark-mode hooks like `--c-line`).
- `src/hooks/useSectionTracking.ts` — `SECTION_SELECTORS = ['#hero','#vision','#work','#lab','#contact']`; `useSectionTracking()` creates ScrollTriggers (start 'top 60%', end 'bottom 40%', onToggle writes `scrollStore.activeSection`). **IMPORTANT FIX:** it now skips selectors whose element doesn't exist yet (`if (!el) return null; filter(Boolean)`) — without this the missing anchors made ScrollTrigger create phantom triggers and `activeSection` stuck at 4, which froze the artifact fade at 0 (that was the invisible-hero bug). Also: index 3 (`#lab`) `onToggle` drives `useUI.setPitActive(isActive)` so the Rapier pit mounts/unmounts with the arena. Has DEV-gated `[track]` console probe (remove at final pass).
- `src/components/cursor/CustomCursor.tsx` — dot (6px accent, instant quickTo 0.12) + ring (quickTo 0.45, sizes per variant: default 40/magnetic 56/view 92/play 96/drag 84, filled accent for view/play/drag with uppercase mono label); hover annotation via `mouseover` delegation on `[data-cursor]` (reads `data-cursor` label + `data-cursor-variant`), resets when leaving; pointerdown dot scale.
- `src/components/ui/Magnetic.tsx` — pointer-tracking rAF damp(λ9) translate3d pull (strength prop), elastic-ish return on leave; respects `(pointer: fine)`.
- `src/components/ui/RollLink.tsx` — `.roll/.roll-stack` two-copy text-roll anchor.
- `src/components/ui/Grain.tsx`, `src/components/ui/BrandIcons.tsx` (Github/Linkedin/X inline SVG marks — lucide v1 dropped brand icons).
- `src/utils/cn.ts` — tiny class joiner.
- `src/components/layout/Header.tsx` — Monogram (pill TH + name), SoundToggle (eq bars + on/off, wired to soundOn), TalkCTA (scrolls #contact), MenuButton (Menu/Close roll + rotating ✛). All `data-cursor-variant="magnetic"`.
- `src/components/layout/MenuOverlay.tsx` — fixed top-right glass card (backdrop-blur, rounded-28), **React-authoritative visibility** (inline `visibility` from `menuOpen`, `pointerEvents` set imperatively) + gsap `fromTo` entrance / `to` exit tweens only — the earlier paused-timeline approach left a ghost panel visible on load and was replaced. Escape closes, nav items call `scrollToSection` (80ms delay after close), socials row with brand marks, `data-menu-card` attr kept for QA probing.
- `src/components/layout/Preloader.tsx` — 2 curtains data-curtain, counter element `data-pre-count` (00→100 over 2.1s power2.inOut, set via direct DOM writes), thin accent bar scaleX; counter exits, curtains slide up `expo.inOut` (onStart → `setReady(true)`), then unmounts.
- `src/data/projects.ts` — `PROJECTS: Project[]` (id/index/title/year/tags/description/href/demo?/tech/features/tone[2 gradient stops]/ink). **Three flagship projects only** (JobFlow AI w/ demo, Sudoku Showdown w/ demo, NapTrip GitHub-only). `tech`/`features` feed the focus-mode detail panel.
- `src/canvas/r3f WorkCarousel.tsx` (Stage 3, object carousel) + `src/canvas/ProjectModels.tsx` + interactive per-project 3D objects driven by the shared turntable in `scrollStore.carousel` (angle/spin fed by the DOM drag overlay in FeaturedWork); **v2 (current): NO slab cards** — `WorkCarousel` is only a mount/appear controller, `ProjectModels` renders the three standalone objects (`MODELS = [JobFlowModel, SudokuModel, NapTripModel]` — CV dossier / sudoku arena / transit-map diorama, all CanvasTexture-based, zero assets) in a cover-flow ring: fronted object drives `featuredIndex`, idles/sways, answers hover; `openFocus(i)` lifts object `i` right of the detail panel (desktop: `halfW*0.36`, scale ×1.04·zoom; portrait: upper half) while the others recede; drag-rotate inertia + wheel zoom live in `scrollStore.modelSpin`; per-object screen-space hit circles in `scrollStore.slotRects` (featured mirrored to `modelRect`) for DOM taps; section-exit = objects shrink + spread (`appear` ramp).
- `src/canvas/SceneCanvas.tsx` — fixed div `z-0 pointer-events-none` wrapping `<Canvas dpr={[1,1.75]} gl={{alpha, antialias, high-performance}}`; camera starts z=16 (rig dollys in); light rig (ambient .35, cold key dir, cobalt rim dir, blue pointLight); **offline procedural Environment** (drei `<Environment resolution={256} frames={1}>` + 3 Lightformers — no HDR network fetch); `<HeroArtifact/>`, `<ParticleField/>`, `<CameraRig/>`; EffectComposer (multisampling 0): Bloom (threshold .72, intensity .55, mipmapBlur), Noise .05 OVERLAY, Vignette .28/.55. All inside `<Suspense fallback={null}>`.
- `src/canvas/CameraRig.tsx` — `FRAMES` per-section camera pos/lookUs targets (hero [0,0.1,8] → footer [0,-0.6,10.5]); useFrame: damps `scrollStore.entrance` toward `ready?1:0` (λ1.6), damps position toward frame + pointer parallax (x .42/y .34) + velocity z-push, look target damp, FOV damp 42↔50, slight roll via group rotation.z.
- `src/canvas/HeroArtifact.tsx` — the centerpiece. Custom ShaderMaterial (useMemo instance, transparent, depthWrite false): uniforms uTime/uAmp/uFade/uAccent(#1A2FFB)/uBase(#101024)/uHiColor(#F0F1FA); vertex = 3-octave simplex displacement (low .24 / mid .11 / ripple·uAmp — amp rises with pointerVelocity); fragment = fresnel + iridescent() palette + fake spec + accent glow on positive displacement. Mesh = IcosahedronGeometry(1.5, 40). Plus: torus ring (emissive accent), 4 orbiting satellites, glowing cobalt orb + pointLight sweeping. Per-frame (mutable `smooth` ref): fade target = 0 when activeSection≥3, 0.3 at section 2, else ready?1:0; scale by section (1.08 hero / .78 vision / .5 work) × entrance ease (easeOutExpo); group scale multiplied ALSO by Math.max(fade, .001) — so it visually disappears entirely in work/physics sections; tilt toward pointerLerped; satellites orbital param anims; material.visible = fade>.012. **GLSL note:** `SIMPLEX_3D_GLSL` (in `src/canvas/glsl/noise.ts`, includes ashima snoise + iq iridescent palette) must be included in BOTH vertex and fragment shader (fragment uses `iridescent`) — this was the original compile failure.
- `src/canvas/ParticleField.tsx` — 900-point shell (r 4–16), PointsMaterial #4B5BFF op .42, rotation + scroll-driven y drift + velocity x drift.
- `src/canvas/PhysicsPit.tsx` — **Phase 4.** `<Physics gravity={[0,0,0]} timeStep="vary">` world, mounted/unmounted by `useUI.pitActive` (null when inactive → zero solver cost). `PitWorld`: 44 bodies (roster from deterministic `buildRoster`): spheres r 0.2–0.4 (`colliders="ball"`), capsules 0.16 (`hull`), drei RoundedBoxes 0.6 (`cuboid`), finishes: cobalt #1A2FFB (emissive .32) / obsidian #111116 / chrome #E4E7F2 metal 1. `restitution .82`, `linearDamping .25`. Per-frame in `useFrame`: (a) invisible kinematic pointer ball (`type="kinematicPosition"`, `BallCollider args=[1.05]` — import from @react-three/rapier, NOT drei!) positioned at `pointerLerped` unprojected on z=0 plane (`halfH = tan(fov·π/360)·7.6`, camera cast to `PerspectiveCamera`); (b) custom central gravity: per body `applyImpulse(clampAbs(-t,8)·5.2·dt)` (spring-style, grows with distance) + linvel ×0.995 cohesion damp. Body refs collected via `ref` callbacks into `bodyRefs.current[]`.

---

## 2b. PHASE 3/4 SECTION FILES (all exist, tsc + vite build clean)

- `src/components/ui/MaskedLines.tsx` — polymorphic (`as`, default `div`), props `{lines, className, delay, stagger, gateReady, start, style}` (`style` added in Phase 4 for Lab's inline sizing). Per-line `.line-mask` wraps; ScrollTrigger once reveal `expo.out` stagger 0.08; `gateReady` waits `useUI.ready`.
- `src/sections/Hero.tsx` — `#hero` min-h-svh, eyebrow "S M Tanvir Hasan Hridoy — Chemnitz, Germany" (full name per user request), MaskedLines display-xl gated lines "I craft 3D visual storytelling," / "high-performance web applications" / "and interactive digital experiences." (full-width, no `max-w-[14ch]`), `.scroll-pulse` bottom prompt.
- `src/sections/Vision.tsx` — `#vision`: "Bold Engineering," / outlined "Brought to Life." + editorial cols + "Our Approach" pill + pinned scrub showreel (75vw→100vw×100vh, radius 32→0, PLAY REEL cursor, `.reel-bg`).
- `src/sections/FeaturedWork.tsx` — `#work`: 6 real project cards (data from `src/data/projects.ts`), staggered grid (`md:mt-[24vh]` right col), gradient covers, hover scale, VIEW CASE cursor, "See all projects" pill → GitHub.
- `src/sections/Lab.tsx` — `#lab`, `h-[210svh]`; sticky 100svh overlay inside: eyebrow "03 — the lab", MaskedLines "Where Complex Code / Becomes Tactile Reality", sub "Step into the sandbox and / let your curiosity run wild", THROW-cursor Continue pill → `#contact`. Owns a ScrollTrigger (`start 'top 62%', end 'top 55%'`) with `onEnter → setTheme('dark')`, `onLeaveBack → setTheme('light')`.
- `src/sections/Footer.tsx` — `#contact` min-h-svh: eyebrow "04 — contact", CTA "Is Your Next Project / Ready to Go Wild?", magnetic "Let's build together!" pill → LinkedIn (no fabricated email), info grid: live `Europe/Berlin` clock (tabular-nums, setInterval 1s), RollLink socials, contact blurb → LinkedIn, brand icons + "© 2026 S M Tanvir Hasan Hridoy". Fixed bottom `CONTINUE TO SCROLL` bar: wheel-past-bottom charges `portalProgress` (+`e.deltaY/3000`, threshold `limit - scrollY < 4`), fills bar via `damp`-smoothed `scaleX` on a gsap.ticker callback storing smoothed value on the element (`__smooth`), gsap-ticker decay −0.0025/frame makes it a deliberate gesture, at ≥1 → `setPortalOpen(true)`; resets on portal close. Body locked by App via `useSmoothScroll(!ready || portalOpen)`.
- `src/components/layout/PortalOverlay.tsx` — z-[65] About/Labs full-screen glass modal (`visibility` React-authoritative like MenuOverlay; gsap fromTo/to on `portalOpen`): left = bio ("S M Tanvir Hasan Hridoy" display heading, Chemnitz dev narrative, GitHub/LinkedIn marks); right = 4 lab experiments (Physics Sandbox / JobFlow Score Engine / Sudoku Multiplayer Net-code / Shader Sketchbook) + project quick-link pills (Job-Flow, Sudoku-Online, NapTrip → real GitHub URLs); top bar CLOSE button, bottom bar "Back to the work" → jumps to `#work`. Escape closes.

**Verified in browser (Chrome via opencode tab `tab_7e3d10d8-fc1f-4674-a51a-a443a0a96753`):** preloader runs & exits, theme light, header/cursor/menu OK, artifact renders beautifully (iridescent blob + ring + satellites + orb + particles), no console errors (only benign warnings: missing anchor warnings now fixed, THREE.Clock deprecation, soft float-precision X4122).

---

## 3. PROGRESS LOG

### Phase 1–2 (foundation + canvas) — DONE, verified earlier
Theme tokens, cursor, header, menu, preloader, persistent canvas, camera rig, HeroArtifact shader sculpture, ParticleField, postprocessing stack, lenis/gsap clock sync. `tsc --noEmit` clean.

### Phase 3 (DOM sections) — DONE, browser-verified
- MaskedLines reveal component; Hero, Vision + scrub-pinned showreel, FeaturedWork 6-card grid all verified by screenshot (statement typography, cards 05/06 gradient covers confirmed good).
- **User-reported fixes (this round):**
  1. Menu overlay ghost panel: rewritten React-authoritative (inline `visibility` from `menuOpen`; gsap only entrance/exit tweens). PHASE 4 QA must re-verify open/close.
  2. Hero statement sizing: `.display-xl` clamp reduced from `8vw` to `(2.1rem, 5.2vw, 5.6rem)`; removed `max-w-[14ch]` from the statement wrapper so authored lines fit full width. Verified: statement renders cleanly.
  3. Name updated everywhere to **"S M Tanvir Hasan Hridoy"** (Header monogram label, Hero eyebrow, Footer copyright). Verified in header screenshot.
- Scroll choreography verified via DEV console `[track]` toggles (activeSection 0→1→2 while scrolling; artifact correctly vanishes from section 2 onward).
- Known acceptable quirk: hero↔vision triggers flicker for ±1 frame in the ~0.2 viewport overlap zone (last toggle wins — invisible, harmless).

### Phase 4 (dark arena + physics + portal) — DONE, browser-verified this round
- `pitActive`/`portalOpen` store flags; `#lab` trigger drives the pit mount; App locked with `useSmoothScroll(!ready || portalOpen)`.
- Verified in-browser: dark theme flip on Lab entry ✅, physics pit renders (44 cobalt/obsidian/chrome bodies clustering center-zero-G, pointer wiggle scatters them) ✅, footer live clock + socials + copyright ✅, portal bar fades in at footer ✅, menu 5-item entrance ✅.
- `npx tsc --noEmit` ✅ · `npx vite build` ✅.

### Bundle & perf work
- `vite.config.ts` manualChunks: `rapier` (2.26MB, WASM compat blob — unavoidable, isolated), `three` (three + @react-three/* + postprocessing + monogrid/maath/stats-gl), `gsap`, `app-vendor` (lenis/zustand/lucide), generic `vendor`. Fixed `three -> vendor -> three` circular-chunk warning by routing drei deps (monogrid/maath/stats-gl) into the three chunk.
- `PhysicsPit` now `React.lazy` in SceneCanvas + warm-up `import('../canvas/PhysicsPit')` fired when activeSection first hits 2 (work grid) → rapier only downloads as the user heads to the Lab.

### Projects data narrowed to the 3 flagship projects (user request)
- `src/data/projects.ts` now contains ONLY: JobFlow AI (`demo: job-flow.devhridoy.site`), Sudoku Showdown (`demo: co-doku.devhridoy.site`), NapTrip (GitHub only, no demo URL). Removed: Sudoku Battle Online, Netflix Mod, Portfolio v1.
- FeaturedWork staggered 2-col grid still renders with 3 (left: JobFlow + NapTrip, right: Sudoku offset).
- The next pick came later as "Slab turntable" (first pass) and is now superseded by the object carousel below (v3 dark scroll-pit ink).

### Object carousel v3 (user: "no cards — the 3D objects ARE the carousel"), verified in browser this round
- Removed all slab geometry (RoundedBox turntable cards + CanvasTexture covers + makeCover) — `WorkCarousel.tsx` is now just a mount/fade controller; `ProjectModels.tsx` owns the ring.
- Ring choreography: cover-flow (φ ∈ −π..π per slot → x spreadX·φ/π, z −DEPTH·sin-curve, rotY −φ·TILT), featured = argmin|φ|, idle drift 0.035 + settle-snap, pointer tilt on the ring, per-object pedestal sway + hover wobble, individual per-model bobs/parallax (existing) do the "alive" idle.
- Focus mode: `useUI.workFocusIndex` (NEW, next to workFocusOpen) + `openFocus(i)`/`closeFocus()`. Tapping ANY object (fronted or shelved — `slotRects` hit tests) opens it: the ring tweens while the tapped object eases into the right dock (desktop) / upper half (portrait); the others shrink (presence), the DOM context strip fades out and a left detail panel stamps in (glass, scrollable, close btn, feature list, tech chips, Open/Source buttons, its own dots + ←/→ keys). Esc / tap-void / close btn leave; the object flies back and re-shelves.
- In focus: drag = showcase rotate (yaw free, pitch ±0.55, inertia; feed in `scrollStore.modelSpin`), wheel = zoom (0.75–1.55, damped); page scroll frozen via `lenisRef.stop()` for the duration so the wheel belongs to the object. Tap the expanded object again → replays its feature demo (`scrollStore.modelPulse` counter, unchanged plumbing).
- Browser-verified: idle ring renders all three; drag + throw + snap; tap fronted CV → expands right + panel; wheel zoom keeps scroll pinned; drag-rotate shows the object's back plate; tap shelved NapTrip (left slot) → brings front + expands in one gesture; Esc closes; second tap on the expanded object fired the NapTrip wake-up alarm demo. `tsc --noEmit` + `vite build` clean.
- Notes/QA rem: portrait (< 768px) focus pose is untested (browser tools can't resize); panel top = 27vh avoids the section heading; large "throw" spins (fast flick) can beat a quick tap — intended inertia, settle-snap fixes placement.

### Feature hotspots + sabotage console (this round, on top of the object carousel)
- New channels in `scrollStore`: `hotspot` (feature-row index under the pointer, null = none) and `modelAction { n, name }` (bump + name, consumed like `modelPulse`).
- `ProjectModels.tsx`: `ModelProps.feature: () => number` — the ring stage passes a closure that is only live for the *currently focused* slot; per-project `HotspotAnchors` map feature-row indexes to model-local [x, y, z, ringR]; shared `HotspotRing` swimming locator ring (pulsing additive accent ring, damps position/radius/opacity between anchors, gates opacity 0 when no row hovered).
- Per-model action slices (each name mapped in `AFDUR`): JobFlow `score` (badge pop) / `chips` (chip cascade) / `doc`+`pdf` (scan sweeps) / `kanban` (staggered dot wave); Sudoku `sabotage` = full round (demoT) / `elo` (card pulse) / `voice` (rival-cursor frenzy ×3 + scale pulse) / `engine` (keypad scramble) / `resync` (cleanse shield + mana flash); NapTrip `alarm` = full wake-up (demoT) / `sprint` (marker sprints, journey fill rides up) / `arrivals` (HUD chip alert flash + bounce) / `pin` (pin plunge + geofence snap) / `favourites` (geofence chip puff).
- `FeaturedWork.tsx` `FEATURE_ACTIONS` maps project.id + row index → action name; each feature row is now a `<button>` (RUN cursor label, hover accent bg, marker dot scales) that fires the action on click — hover in the panel draws the ring in the object; clicking replays just that feature's slice. Row hover/click are excluded from the arena close-tap logic (`a,button` widget check) and focus stays open.
- `goTo` clears `hotspot` so the locator can't ghost into a different project's anchors.
- Verified via DOM→canvas channel probes (hotspot 1 on hover of the DeepSeek row; `modelAction {n:1, name:'chips'}` on click; panel stays open; Escape closes; zero console errors) + `tsc`/`vite build` clean.
- **Visual QA completed this round (screenshots):** locator ring renders at the chips anchor on the focused JobFlow object; chips cascade after clicking the DeepSeek row (EXACT/ADJACENT/MISSING pills fly in around the ring); Sudoku — ring encircles the whole board when hovering the engine row, keypad scramble fires on click (keys reshuffled 123/456/789 → 963/452/781); NapTrip — ring wraps the destination pin/geofence, clicking the Geofenced row runs the full wake-up alarm (red WAKE UP — ARRIVING chip + WAKE UP! badge + journey fill surge + flashing geofence). ←/→ and dots switch projects mid-focus; hotspot ring clears correctly on project switch (goTo) and on close.
- Focus close hardening: Escape-close after a hard flick into # work revealed Lenis keeps the queued pre-focus target — on `start()` the page glided away to the footer. Fix in the focus scroll-lock effect cleanup (`FeaturedWork.tsx`): `lenis.start()` then `lenis.scrollTo(lenis.scroll, { immediate: true })` to anchor the target at the actual position, and `scrollStore.hotspot = null` on close so a stale hovered row can't ghost into the next session. Verified: overshoot → open focus → Escape → scrollY unchanged, section stays 2, hotspot null.

### Menu entrance polish (user: "menu modal is still not correct")
- Root cause of the "broken" look: card entrance (0.5s) ran slower than the item-mask stagger start, so mid-animation frames showed blank bordered rows. Fix: card lands in 0.42s, items start at 0.05s with 0.55s duration / 0.04 stagger; `itemsRef` deduped via `new Set` (StrictMode double-registration guard). Verified: open renders all 5 items cleanly from first frames.
- Rendered QA screenshot caught "floating pill at top" — identified as the "See all projects" pill legitimately scrolling out at the work-section tail, not a bug.

### Model redesign — site-derived identities (user rejected the first three models)
- User: the plain CV dossier / plain-board sudoku / transit-map diorama didn't like. JobFlow + co-doku were researched on their real demo sites (browser screenshots of hero, workflow guide, capabilities, lobby/profile hub); NapTrip has no public UI yet, so it got an invented, concept-true object instead.
- **JobFlow** (job-flow.devhridoy.site look: dark-violet career-suite app UI): the CV sheet was replaced by the *app window itself* — dark panel with J logo tile + "JobFlow AI" wordmark + AI chip, "GEMINI ENGINE" pill, the 01-04 workflow guide rows with gradient icon tiles (bullseye / target / layers / send, emerald for 04), APPLICATION PIPELINE track, footer tech line; floating ATS match-score dial (92 / ATS MATCH on a dark disc, violet torus), EXACT/ADJACENT/MISSING chips restyled (violet / indigo / dark), violet scan beam recolored, soft violet halo (new shared `glowTex`) behind the panel. `paper` renamed to `panel`; `PAPER` const removed; hotspot ring now takes a per-model `color` prop (JobFlow violet `#8B7CFF`, co-doku cyan `#22D3EE`, NapTrip cyan `#66FCF1`).
- **Co-doku** (co-doku.devhridoy.site = esports competitive hub): plain ELO text card replaced by a neon-wolf **avatar medallion** (canvas "apex wolf" angular line-art on a dark disc + cyan online ring, group at the old elo anchor, `elo` pulse reused on the group); "ELO 1450 / DIAMOND IV" restyled as a violet/cyan stat card below the board; violet bolt-logo tile ("Co-doku / Competitive Hub") added top-right; board cells to navy `#12142B` (NAVY const), keypad keys restyled, mana fill violet, cleanse shield cyan, rival ghosts violet+amber, highlight violet, hotspot ring cyan.
- **NapTrip** (invented "night sleeper pod" — no map anymore): floating bed diorama — mattress + blanket + pillow + breathing peach-blob passenger (sits up on the alarm), drifting Z particles (scatter on wake), crescent moon + sparkle stars, alarm clock (cream face, red bells, hands ~06:30; bells rattle + face flashes on alarm) wrapped in geofence pulse rings, `BERLIN HBF 06:42 ON TIME` departure board (flips to `DELAYED +4` red on `arrivals`), WAKE UP! badge pop, favourites heart puff, home-pin geofence cluster (`pin` plunge), and a shimmering journey arc (chevrons + riding progress spark; `sprint` brightens + speeds; wraps `% 1`). Moonlit indigo halo replaces the map card; mapTexture/fenceTex/alert-chip/DEST/youRef/fillRef/chipRef gear all removed; the 5 hotspot anchors rebuilt for the new geometry.
- Palette consts added: `VIOLET`, `VIOLET_D`, `CYAN2`, `TXT`, `NAVY`, `CARD`, `MINT`, `CREAM`, `BLANKET`, `PEACH`.
- Verified in browser (screenshots): idle ring shows all three new identities; focus close-ups per object; locator rings land on the new parts (wolf medallion / chips zone / alarm clock + board + arc + pin + heart); action slices re-tested — JobFlow `chips` cascade at the new chips zone, co-doku `engine` keypad scramble, NapTrip `alarm` full wake-up (badge + red ring storm + arc surge) and `arrivals` board flip to `DELAYED +4`; Escape-close keeps scroll at 2047, hotspot to null, front slot restored; console 0 errors (only the pre-existing THREE.Clock deprecation); `tsc --noEmit` clean.

### Visual QA checklist
1. ~~Lab entry: theme flips dark; pit bodies cluster at center-zero-G; pointer ball scatters them.~~ ✅ verified
2. ~~Portal modal E2E~~ ✅ verified (wheel-past-bottom → fills → opens with lenis locked; Escape closes, unlocks scroll, bar resets to scaleX(0))
3. ~~Menu open/close correctness~~ ✅ verified (after timing fix)
4. ~~Dark-theme DOM text legibility over the pit~~ ✅ verified
5. ~~Portal bar visibility gating~~ ✅ verified (fades in at footer only)
6. Sound toggle + ambient audio — optional final check.

### Final polish (before delivery)
- Remove DEV-only console probes: `[track]` logs in `useSectionTracking.ts`; optionally keep `window.__useUI` (dev-gated).
- Minor cleanups from the earlier list: projects.ts "DIN 5008 Raven Kritter" → "DIN 5008 DACH templates"; Header SoundToggle useless `onMouseEnter`; HeroArtifact leftover diagnostic comment.

### Browser/QA tooling notes (for me, next session)
- Dev server bg shell on 5174; use `tools.browser.tabs.open` → tab `tab_7e3d10d8-fc1f...` exists; after edits, `tools.browser.reload({tabID})` then `tools.browser.console` + `screens.take` (files returned as temp paths, auto-shown to user).
- Console diagnostics pattern (used before): temporary `console.log('[artifact-diag]', JSON.stringify({...}))` gated on DEV + frame counter inside useFrame — proveneffective.
- vite dev output file: `C:\Users\thhri\.local\share\opencode\shell\...\sh_15c5d7...out` — port info etc.
- The user may have the Review pane open (screens auto-attached in chat).

### Env/OS notes
- Windows, PowerShell. Multi-line writes: use the write tool (CRLF handled). Careful: `edit` oldString must match file EXACTLY — the tool does fuzzy extra (quotes/dashes) retries; safest to re-`read` the file section first when match fails.
- npm is fast here; node v22.

---

## 3. UPDATE � developer-portfolio restructure (2026-10-21, session 2)

User request: "This should be a developer portfolio. Dedicated section about me (bio, categorized tech stack, experience timeline). Remove unnecessary texts. Sound not working. Project cards should be the same size. Clear structure/UI-UX + mobile friendly."

### A. Vision section REPLACED by the dedicated About section
- src/sections/Vision.tsx DELETED (fluffy "Bold Engineering" + showreel reel). Same index in the section order, so the camera choreography (CameraRig FRAMES[1], physics-pit hooks at index 3) keeps working � only the comment label changed to "about".
- New src/data/profile.ts � the single source of truth the user can edit:
  - PROFILE: name/alias/role/location/timezone/tagline/openTo (mirrors the GitHub headline bi?o), links, githubStats badges (18 public repos / Pull-Shark �2 / Arctic Code Vault / shipping since 2019), 2-paragraph bio.
  - STACK: 8 categorised cards (Languages, Frontend, Backend & Data, Realtime & Media, Mobile, AI & Integrations, Motion & 3D, Workflow) � only tools verifiably used in public repos; no ESLint/other unverified claims.
  - TIMELINE: 5 milestone rows (2026, 2025 flagship builds, 2024 Chemnitz platform, 2023 first portfolio + e-shop, 2019�22 start) reconstructed from public GitHub repo creation/push dates � labelled "milestones from the public GitHub history".
- LinkedIn is auth-walled (webfetch 999) � data built from the GitHub API (/users/TanvirHasanHridoy/repos) + the shipped projects; the About section links LinkedIn rather than quoting it.
- New src/sections/About.tsx (#about, 01): display heading ("Full-Stack Developer." + outlined "Based in Chemnitz, DE."), tagline col, bio col, glass **status card** (open-to-work pulse dot, located/timezone, GitHub badges, GitHub/LinkedIn pills), 8-card responsive stack grid (sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4), <ol> timeline with accent-rail dots (mobile-safe padding), closing LinkedIn offer line. data-about-card per-card gsap reveal.
- Wiring: App.tsx imports/renders About; useSectionTracking SECTION_SELECTORS = ['#hero','#about','#work','#lab','#contact']; MenuOverlay item 02 = About ? #about; heading/eyebrows renumbered 01 about / 02 work / 03 lab / 04 contact.

### B. Copy trims (unnecessary text removal)
- Hero statement ? "I build full-stack web apps, / real-time 3D graphics & / interactive experiences."; eyebrow ? "thridoy� � full-stack engineering"; name chip kept.
- Lab sub copy ? "Throw things. The physics runs / live inside this page".
- Footer CTA ? "Let's Build / Something Great." + "Say hi!" pill; eyebrow ? "open to working-student & entry-level roles in Germany"; contact col ? "The fastest path in is LinkedIn � or browse the code on GitHub."
- Dead links removed: X/Twitter (menu overlay socials AND footer RollLink row AND footer icon row; XMark import dropped).
- Positioning updated: index.html title/meta/OG ? "Full-Stack Developer & 3D Engineer" (old file had mojibake ? encoded chars; rewritten clean UTF-8); header Monogram subtitle ? "full-stack developer"; CameraRig frame comment.

### C. Sound fix (root cause + rewrite)
- Bug: main.tsx has StrictMode ? first mount created the AudioContext, unmount DISPOSED (closed) it, remount reused the closed ref (mbRef.current ??= createAmbience() never recreated) ? toggle played into a dead context = permanent silence in dev; autoplay-suspend insurance missing entirely.
- useAmbientAudio.ts rewritten: fresh ctx per enable (effect keyed on enabled, dispose+null in cleanup), start()/stop() guard ctx.state === 'closed', esume().catch(() => {}), one-shot pointerdown re-arm listener while enabled, master target 0.035 ? 0.06.
- Verified end-to-end headless (instrumented window.AudioContext via addInitScript): exactly **1 context, state "running"**, toggle label flips ON, 0 console errors.

### D. Featured Work idle strip card � same size for all three projects
- Left group got min-w-0 flex-1 basis-full md:basis-auto + inner min-w-0; tag row now 	runcate (single line); description -webkit-line-clamp inline block replaced by Tailwind line-clamp-2; actions row got min-h-[46px] (NapTrip has no demo button but keeps pill height).
- Measured headless across the 3 dots: card heights **{p0:189, p1:189, p2:189}** � identical.

### E. REAL(scroll-tracking) bug found + fixed (qa artifact hunt)
- QA teleport-scrolls exposed a pre-existing stale-state bug: useSectionTracking recomputed scrollStore.activeSection ONLY from onToggle � triggers already active at teleport/restore positions never toggle ? section stayed stale (hero at #about, lab at footer, footer never reached 4). Bottom section can never END (its 'bottom 40%' line is beyond max scroll) but scrolling back up past its start fires correctly, so only the recompute path needed a catch-up.
- Fix: added ScrollTrigger.create({ start: 0, end: 'max', onUpdate: recomputeOwner() }) in useSectionTracking � every scroll update recomputes deepmost-active. Verified: hero=0, about zone=1, work=2 (all dot states), footer=4 via teleport AND natural wheel.

### F. QA tooling + artifacts
- The desktop-browser tab lost its OS window mid-session (user minimized; screenshot tool requires a visible tab) ? switched to **headless playwright-core** QA: qa-shots.mjs (temp, gitignored) drives chromium-1223 from %LOCALAPPDATA%\ms-playwright with --enable-unsafe-swiftshader + autoplay unlocked; captures 10 stops incl. natural-wheel footer, strip-height metrics, audio ctx probe; artifacts in qa-shots/ (gitignored). NOTE: import.meta.url pathname %-encodes spaces � use ileURLToPath.
- Full run: **0 console errors/pageerrors**, audio verified, cards equal, waypoints correct.
- NOT verifiable by tooling: OS-window mobile viewport � responsive CSS was reviewed manually (About grid stacks, strip card wraps via asis-full, timeline padding, focus-panel bottom sheet). User should spot-check on a phone.

### G. Files touched this session
src/data/profile.ts (new), src/sections/About.tsx (new), src/sections/Vision.tsx (deleted), src/App.tsx, src/hooks/useSectionTracking.ts (+ onUpdate fix), src/hooks/useAmbientAudio.ts (rewrite), src/components/layout/MenuOverlay.tsx, src/components/layout/Header.tsx, src/sections/Hero.tsx, src/sections/Lab.tsx, src/sections/Footer.tsx, src/sections/FeaturedWork.tsx, src/canvas/CameraRig.tsx (comment), index.html, .gitignore (+qa-shots), qa-shots.mjs (temp QA driver).
