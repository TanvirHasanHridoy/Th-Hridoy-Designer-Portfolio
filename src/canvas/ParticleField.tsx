import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, Color } from 'three'
import { scrollStore, damp } from '../store/scrollStore'

/**
 * Volumetric dust — a parallax particle shell that drifts with scroll and
 * shimmers subtly. Adds depth between the DOM layer and the sculpture.
 */
export function ParticleField() {
  const pointsRef = useRef<Points>(null)
  const drift = useRef(0)

  const positions = useMemo(() => {
    const count = 900
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      // random shell, radius 4 → 16
      const r = 4 + Math.random() * 12
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.6
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return geo
  }, [])

  const material = useMemo(
    () =>
      new PointsMaterial({
        color: new Color('#4B5BFF'),
        transparent: true,
        opacity: 0.42,
        size: 0.038,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const points = pointsRef.current
    if (!points) return
    points.rotation.y = state.clock.elapsedTime * 0.014
    drift.current = damp(drift.current, scrollStore.scrollVelocity * 0.012, 3, dt)
    points.position.y -= scrollStore.scrollProgress * 3.4
    points.position.x += drift.current
  })

  return <points ref={pointsRef} geometry={positions} material={material} />
}
