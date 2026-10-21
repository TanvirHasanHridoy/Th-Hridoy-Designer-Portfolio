import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { Physics, RigidBody, BallCollider, type RapierRigidBody } from '@react-three/rapier'
import { RoundedBox } from '@react-three/drei'
import { useUI } from '../store/store'
import { scrollStore } from '../store/scrollStore'

/**
 * THE LUSION PHYSICS PIT — zero-gravity body playground.
 *
 * An `@react-three/rapier` world with no gravity:
 *   • 44 glossy cobalt / matte obsidian / chrome bodies (spheres, capsules,
 *     rounded cubes) are pulled toward the viewport center by a custom
 *     impulse field, clustering and colliding in zero-G.
 *   • an invisible kinematic ball glues itself to the smoothed pointer and
 *     scatters everything it touches with real inertia.
 *
 * Mounted/unmounted as `pitActive` flips, so the solver costs nothing when
 * the user is elsewhere on the page.
 */

type BodyKind = 'sphere' | 'capsule' | 'roundcube'
type Finish = 'cobalt' | 'obsidian' | 'chrome'

interface BodySpec {
  kind: BodyKind
  finish: Finish
  pos: [number, number, number]
  size: number
  rotation: number
}

function matProps(finish: Finish) {
  switch (finish) {
    case 'cobalt':
      return {
        color: '#1A2FFB',
        roughness: 0.16,
        metalness: 0.3,
        emissive: '#1A2FFB',
        emissiveIntensity: 0.32,
      }
    case 'obsidian':
      return { color: '#111116', roughness: 0.62, metalness: 0.18 }
    case 'chrome':
      return { color: '#E4E7F2', roughness: 0.1, metalness: 1 }
  }
}

function buildRoster(count: number): BodySpec[] {
  const specs: BodySpec[] = []
  const finishes: Finish[] = ['cobalt', 'obsidian', 'chrome', 'cobalt']
  const kinds: BodyKind[] = ['sphere', 'capsule', 'roundcube']
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.4
    const r = 2 + ((i * 37) % 19) / 9
    const kind = kinds[i % 3]
    const size =
      kind === 'sphere' ? 0.2 + ((i * 13) % 5) / 25 : kind === 'capsule' ? 0.16 : 0.3
    specs.push({
      kind,
      finish: finishes[i % finishes.length],
      pos: [
        Math.cos(a) * r * 1.25,
        Math.sin(a * 2.3) * r * 0.8,
        Math.sin(a) * r,
      ],
      size,
      rotation: (i % 7) * 0.75,
    })
  }
  return specs
}

const clampAbs = (v: number, m: number) => Math.max(-m, Math.min(m, v))

/**
 * The world. Bodies register themselves into a shared ref list so the
 * gravity loop can apply impulses every frame.
 */
function PitWorld() {
  /* fewer solver bodies on small screens — mobile GPUs/CPU first */
  const bodyCount = useMemo(() => {
    if (typeof navigator === 'undefined') return 44
    const small = window.innerWidth < 768
    const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4
    return small || lowCores ? 24 : 44
  }, [])
  const roster = useMemo(() => buildRoster(bodyCount), [bodyCount])
  const bodyRefs = useRef<Array<RapierRigidBody | null>>([])
  const ballRef = useRef<RapierRigidBody>(null)

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)

    /* pointer collider → unprojected plane at z = 0 */
    const ball = ballRef.current
    if (ball) {
      const persp = camera as PerspectiveCamera
      const dist = 7.6 // CameraRig frame-3 camera distance
      const halfH = Math.tan((persp.fov * Math.PI) / 360) * dist
      const halfW = halfH * (persp.aspect || 1)
      ball.setNextKinematicTranslation({
        x: scrollStore.pointerLerped.x * halfW,
        y: scrollStore.pointerLerped.y * halfH,
        z: 0,
      })
    }

    /* custom central gravity + cohesion damping */
    for (const b of bodyRefs.current) {
      if (!b) continue
      const t = b.translation()
      const g = 5.2 // acceleration toward center
      b.applyImpulse(
        {
          x: clampAbs(-t.x, 8) * g * dt,
          y: clampAbs(-t.y, 8) * g * dt,
          z: clampAbs(-t.z, 8) * g * dt,
        },
        true,
      )
      /* gently damp velocities so the cluster stays breathable */
      const lv = b.linvel()
      b.setLinvel({ x: lv.x * 0.995, y: lv.y * 0.995, z: lv.z * 0.995 }, true)
    }
  })

  return (
    <group>
      {/* invisible kinematic pointer ball */}
      <RigidBody
        ref={ballRef}
        type="kinematicPosition"
        colliders={false}
        enabledRotations={[false, false, false]}
      >
        <BallCollider args={[1.05]} />
      </RigidBody>

      {roster.map((spec, i) => (
        <RigidBody
          key={i}
          ref={(r) => {
            bodyRefs.current[i] = r ?? null
          }}
          position={spec.pos}
          rotation={[spec.rotation, spec.rotation * 0.6, spec.rotation * 0.3]}
          colliders={spec.kind === 'roundcube' ? 'cuboid' : spec.kind === 'capsule' ? 'hull' : 'ball'}
          restitution={0.82}
          friction={0.2}
          linearDamping={0.25}
          angularDamping={0.2}
        >
          {spec.kind === 'sphere' && (
            <mesh>
              <sphereGeometry args={[spec.size, 24, 24]} />
              <meshStandardMaterial {...matProps(spec.finish)} />
            </mesh>
          )}
          {spec.kind === 'capsule' && (
            <mesh>
              <capsuleGeometry args={[spec.size, spec.size * 1.9, 8, 16]} />
              <meshStandardMaterial {...matProps(spec.finish)} />
            </mesh>
          )}
          {spec.kind === 'roundcube' && (
            <RoundedBox
              args={[spec.size * 2, spec.size * 2, spec.size * 2]}
              radius={spec.size * 0.42}
              smoothness={5}
            >
              <meshStandardMaterial {...matProps(spec.finish)} />
            </RoundedBox>
          )}
        </RigidBody>
      ))}
    </group>
  )
}

export function PhysicsPit() {
  const pitActive = useUI((s) => s.pitActive)
  if (!pitActive) return null
  return (
    <Physics gravity={[0, 0, 0]} timeStep="vary">
      <PitWorld />
    </Physics>
  )
}
