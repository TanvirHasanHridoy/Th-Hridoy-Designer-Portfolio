import { useEffect, useRef } from 'react'

/**
 * Procedural ambient audio engine — zero external assets.
 *
 * A looped brown-noise bed is pushed through a slowly-breathing lowpass
 * filter plus a faint detuned sub-oscillator pad; sounds like a soft studio
 * hum that the equalizer toggle can fade in and out.
 */

interface Ambience {
  start: () => void
  stop: () => void
  dispose: () => void
}

function createAmbience(): Ambience {
  const ctx = new AudioContext()

  // Brown-ish noise buffer (2s, looped)
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 340
  lowpass.Q.value = 0.6

  // Slow LFO breathing the filter open and shut
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 160
  lfo.connect(lfoGain)
  lfoGain.connect(lowpass.frequency)

  // Detuned sub pad
  const pad = ctx.createGain()
  pad.gain.value = 0.12
  pad.connect(lowpass)
  const oscA = ctx.createOscillator()
  oscA.type = 'sine'
  oscA.frequency.value = 55
  const oscB = ctx.createOscillator()
  oscB.type = 'sine'
  oscB.frequency.value = 55.7

  noise.connect(lowpass)
  lowpass.connect(master)
  oscA.connect(pad)
  oscB.connect(pad)
  pad.connect(master)

  noise.start()
  lfo.start()
  oscA.start()
  oscB.start()

  return {
    start: () => {
      if (ctx.state === 'suspended') void ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0.035, ctx.currentTime, 0.9)
    },
    stop: () => {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.35)
    },
    dispose: () => {
      try {
        noise.stop()
        lfo.stop()
        oscA.stop()
        oscB.stop()
        void ctx.close()
      } catch {
        /* already closed */
      }
    },
  }
}

export function useAmbientAudio(enabled: boolean): void {
  const ambRef = useRef<Ambience | null>(null)

  useEffect(() => {
    if (!enabled) return
    ambRef.current ??= createAmbience()
    ambRef.current.start()
  }, [enabled])

  useEffect(() => {
    const amb = ambRef.current
    return () => amb?.dispose()
  }, [])
}
