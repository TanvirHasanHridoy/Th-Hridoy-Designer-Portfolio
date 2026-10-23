import { Suspense, lazy } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { HeroArtifact } from './HeroArtifact'
import { ParticleField } from './ParticleField'
import { CameraRig } from './CameraRig'
import { WorkCarousel } from './WorkCarousel'

/* the rapier world (+ its WASM payload) only loads when the Lab approaches */
const PhysicsPit = lazy(() =>
  import('./PhysicsPit').then((m) => ({ default: m.PhysicsPit })),
)

/* phones / low-core machines keep true MSAA, just at a lighter sample count */
const compactDevice =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4)

/**
 * THE persistent WebGL canvas.
 *
 * There is exactly one `<Canvas>` for the entire application. It is
 * position-fixed, full-viewport, sits behind the DOM (z-index 0,
 * pointer-events: none) and choreographs itself by reading the reactive
 * `scrollStore` inside useFrame — nothing here triggers React re-renders.
 */
export function SceneCanvas() {
  return (
    <div aria-hidden className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.1, 16], fov: 50, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <Suspense fallback={null}>
          <CameraRig />

          {/* light rig — cold key + cobalt rim accents */}
          <ambientLight intensity={0.35} />
          <directionalLight position={[-6, 8, 4]} intensity={1.4} color="#E7EAFF" />
          <directionalLight position={[5, -4, -4]} intensity={0.5} color="#1A2FFB" />
          <pointLight position={[0, -3, -5]} intensity={2.2} color="#1A2FFB" distance={18} />

          {/* offline procedural environment (no HDR download) */}
          <Environment resolution={512} frames={1}>
            <Lightformer form="rect" intensity={2.4} color="#F0F1FA" position={[0, 6, -6]} scale={[10, 6, 1]} />
            <Lightformer form="rect" intensity={3.2} color="#1A2FFB" position={[-8, 1, 2]} scale={[6, 10, 1]} />
            <Lightformer form="rect" intensity={1.1} color="#101024" position={[8, -2, 4]} scale={[6, 10, 1]} />
          </Environment>

          <HeroArtifact />
          <ParticleField />
          <WorkCarousel />
          <PhysicsPit />

          {/* postprocessing MSAA is what actually anti-aliases the composer
              render target; the renderer's antialias flag alone was unused. */}
          <EffectComposer multisampling={compactDevice ? 2 : 4}>
            <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.28} mipmapBlur />
            <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
            <Vignette offset={0.28} darkness={0.55} eskil={false} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
