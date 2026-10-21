import { useReducer, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { damp } from '../store/scrollStore'
import { useUI } from '../store/store'
import { ProjectModels } from './ProjectModels'

/**
 * WORK CAROUSEL — mount/visibility controller.
 *
 * The three flagship projects ARE the carousel: no slab geometry, no cover
 * art — just the live per-project 3D objects (`ProjectModels`) arranged in a
 * cover-flow ring and driven by the shared turntable state in
 * `scrollStore.carousel` (angle/spin fed by the DOM drag layer in
 * FeaturedWork, integrated + snapped here).
 *
 * This component mounts the ring on demand when the work section is pinned
 * and ramps a 0→1 `appear` factor that the stage uses for its entrance /
 * exit choreography (objects shrink + spread apart as the section leaves).
 */
export function WorkCarousel() {
  const active = useUI((s) => s.carouselActive)
  const mounted = useRef(false)
  const appear = useRef(0)
  const [, force] = useReducer((x: number) => x + 1, 0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    appear.current = damp(appear.current, active ? 1 : 0, 3.2, dt)
    const shouldMount = active || appear.current > 0.02
    if (shouldMount !== mounted.current) {
      mounted.current = shouldMount
      force()
    }
  })

  if (!mounted.current) return null
  return <ProjectModels appear={appear as MutableRefObject<number>} />
}
