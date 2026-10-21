import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, PerspectiveCamera, Vector3 } from 'three'
import { scrollStore, damp } from '../store/scrollStore'
import { useUI } from '../store/store'

/**
 * Per-section camera choreography. Damps between discrete framing targets in
 * sync with `scrollStore.activeSection`, adds pointer parallax and a slight
 * velocity-driven dolly so the whole world feels weighty.
 */
const FRAMES: Array<{ position: [number, number, number]; look: [number, number, number] }> = [
  { position: [0, 0.1, 8], look: [0, 0.1, 0] }, // hero
  { position: [1.6, 0.4, 9.2], look: [-1.2, 0.4, 0] }, // vision
  { position: [0, 0.4, 12.2], look: [0, 0.15, 0] }, // work carousel
  { position: [0, 0.1, 7.6], look: [0, -0.2, 0] }, // physics pit
  { position: [0, -0.6, 10.5], look: [0, -0.6, 0] }, // footer portal
]

export function CameraRig() {
  const lookTarget = useRef(new Vector3(0, 0.1, 0))
  const groupRef = useRef<Group>(null)

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05)
    const { activeSection, pointerLerped, scrolledVelocitySmoothed } = scrollStore
    const ready = useUI.getState().ready

    /* entrance is the global cinematic ramp, handled right here */
    scrollStore.entrance = damp(scrollStore.entrance, ready ? 1 : 0, 1.6, dt)

    const frame = FRAMES[Math.min(activeSection, FRAMES.length - 1)]

    /* entrance dolly: start pulled back, glide in as preloader lifts */
    const zTarget =
      frame.position[2] + (ready ? 0 : 9) + pointerLerped.x * 0.18 + Math.max(scrolledVelocitySmoothed, 0) * 0.05

    camera.position.x = damp(camera.position.x, frame.position[0] + pointerLerped.x * 0.42, 2.2, dt)
    camera.position.y = damp(camera.position.y, frame.position[1] + pointerLerped.y * 0.34, 2.2, dt)
    camera.position.z = damp(camera.position.z, zTarget, 2.2, dt)

    /* slight roll with pointer for liveliness */
    const rig = groupRef.current
    if (rig) rig.rotation.z = damp(rig.rotation.z, pointerLerped.x * 0.02, 2, dt)

    lookTarget.current.x = damp(lookTarget.current.x, frame.look[0], 2, dt)
    lookTarget.current.y = damp(lookTarget.current.y, frame.look[1], 2, dt)
    lookTarget.current.z = 0
    camera.lookAt(lookTarget.current)

    /* FOV breathes open toward the entrance reveal */
    const cam = camera as PerspectiveCamera
    cam.fov = damp(cam.fov, ready ? 42 : 50, 2, dt)
    cam.updateProjectionMatrix()
  })

  return <group ref={groupRef} />
}
