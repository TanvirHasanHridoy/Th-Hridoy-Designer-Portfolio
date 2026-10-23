import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/**
 * Adaptive pixel-ratio governor.
 *
 * The canvas starts at the display's native DPR (capped at 2) and watches
 * frame pacing in 1.8s windows. If the scene cannot hold a comfortable frame
 * rate it steps the render resolution down; if it is comfortably keeping up
 * it steps back toward native. MSAA stays at the initial tier — changing
 * composer samples at runtime would rebuild the whole post stack.
 *
 * `?quality=high` locks native DPR (useful for visual QA / screenshots);
 * `?quality=low` pins the minimum DPR for low-power machines.
 */
export function QualityGovernor({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr)
  const gl = useThree((s) => s.gl)
  const acc = useRef(0)
  const frames = useRef(0)
  const cooldown = useRef(0)
  const qualityParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('quality')
      : null
  const locked = useRef<'high' | 'low' | 'auto'>(
    qualityParam === 'high' ? 'high' : qualityParam === 'low' ? 'low' : 'auto',
  )

  useFrame((state, delta) => {
    if (document.hidden) {
      acc.current = 0
      frames.current = 0
      return
    }
    const dt = Math.min(delta, 0.25)

    if (locked.current === 'high') return
    if (locked.current === 'low') {
      if (gl.getPixelRatio() > 1) setDpr(1)
      return
    }

    /* let shaders, textures and fonts settle before judging the machine */
    if (state.clock.elapsedTime < 2.6) return
    if (cooldown.current > 0) {
      cooldown.current -= dt
      return
    }

    acc.current += dt
    frames.current += 1
    if (acc.current < 1.8) return

    const fps = frames.current / acc.current
    acc.current = 0
    frames.current = 0

    const current = gl.getPixelRatio()
    let next = current
    if (fps < 42 && current > 1) next = Math.max(1, current - 0.25)
    else if (fps > 57 && current < maxDpr) next = Math.min(maxDpr, current + 0.25)

    if (Math.abs(next - current) > 0.01) {
      setDpr(next)
      cooldown.current = 3
    }
  })

  return null
}
