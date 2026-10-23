import { useEffect, useRef } from 'react'
import { SoundEngine, setSoundEngine } from '../audio/engine'

/**
 * Procedural ambient + interaction audio — zero external assets.
 *
 * A looped brown-noise bed is pushed through a slowly-breathing lowpass
 * filter plus a faint detuned sub-oscillator pad. The same engine also owns
 * the one-shot UI cues (hover, locate, actions, blob excitement) exported by
 * `playCue`; creating/disposing it here means the header toggle gates every
 * sound in the site together.
 */
export function useAmbientAudio(enabled: boolean): void {
  const engineRef = useRef<SoundEngine | null>(null)

  useEffect(() => {
    if (!enabled) return

    /* A context per enable: StrictMode's mount/unmount pass closes the first
       context, so rebasing on an old ref would play into a dead node. */
    let engine: SoundEngine
    try {
      engine = new SoundEngine()
    } catch {
      return
    }
    engineRef.current = engine
    setSoundEngine(engine)
    engine.start()
    const enableCue = window.setTimeout(() => engine.cue('enable'), 160)

    return () => {
      window.clearTimeout(enableCue)
      setSoundEngine(null)
      engineRef.current = null
      engine.dispose()
    }
  }, [enabled])

  /* autoplay-policy insurance: browsers can hold a context suspended until a
     real user gesture has landed; re-arm the fade on the first pointer event */
  useEffect(() => {
    if (!enabled) return
    const kick = () => engineRef.current?.start()
    document.addEventListener('pointerdown', kick, { once: true })
    return () => document.removeEventListener('pointerdown', kick)
  }, [enabled])
}
