/**
 * Procedural interaction sound engine — zero external assets.
 *
 * One AudioContext owns both the ambient bed and every UI cue. The engine only
 * exists while the header sound toggle is on, so every cue is automatically
 * gated by the user's choice (and by browser autoplay rules).
 */

export type SoundCue =
  | 'hover'
  | 'locate'
  | 'run'
  | 'model'
  | 'blob'
  | 'impact'
  | 'open'
  | 'close'
  | 'switch'
  | 'portal'
  | 'enable'

export interface CueOptions {
  /** 0 → 1; used by blob / impact cues for a soft dynamic response. */
  intensity?: number
  /** -1 → 1 stereo placement. */
  pan?: number
}

interface ToneOptions {
  freq: number
  endFreq?: number
  type?: OscillatorType
  gain?: number
  attack?: number
  decay?: number
  delay?: number
  pan?: number
  filter?: { type: BiquadFilterType; freq: number; q?: number }
}

interface HissOptions {
  gain?: number
  attack?: number
  decay?: number
  delay?: number
  pan?: number
  filter?: { type: BiquadFilterType; freq: number; endFreq?: number; q?: number }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export class SoundEngine {
  private ctx: AudioContext
  private ambient: GainNode
  private cues: GainNode
  private noise: AudioBuffer
  private lastCue = new Map<SoundCue, number>()
  private disposed = false

  constructor() {
    this.ctx = new AudioContext()

    const compressor = this.ctx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 18
    compressor.ratio.value = 4
    compressor.attack.value = 0.003
    compressor.release.value = 0.24
    compressor.connect(this.ctx.destination)

    this.ambient = this.ctx.createGain()
    this.ambient.gain.value = 0
    this.ambient.connect(compressor)

    this.cues = this.ctx.createGain()
    this.cues.gain.value = 0.6
    this.cues.connect(compressor)

    /* 2s brown-ish noise shared by the bed and every transient */
    const bufferSize = this.ctx.sampleRate * 2
    this.noise = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }

    this.buildAmbient()
  }

  private buildAmbient() {
    const lowpass = this.ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 340
    lowpass.Q.value = 0.6

    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 160
    lfo.connect(lfoGain)
    lfoGain.connect(lowpass.frequency)

    const noise = this.ctx.createBufferSource()
    noise.buffer = this.noise
    noise.loop = true
    noise.connect(lowpass)

    const pad = this.ctx.createGain()
    pad.gain.value = 0.12
    const oscA = this.ctx.createOscillator()
    oscA.type = 'sine'
    oscA.frequency.value = 55
    const oscB = this.ctx.createOscillator()
    oscB.type = 'sine'
    oscB.frequency.value = 55.7
    oscA.connect(pad)
    oscB.connect(pad)

    lowpass.connect(this.ambient)
    pad.connect(this.ambient)

    noise.start()
    lfo.start()
    oscA.start()
    oscB.start()
  }

  start() {
    if (this.disposed || this.ctx.state === 'closed') return
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* a real user gesture will re-arm this via the caller */
      })
    }
    this.ambient.gain.cancelScheduledValues(this.ctx.currentTime)
    this.ambient.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.9)
  }

  /** Schedule one short, self-contained cue. */
  cue(name: SoundCue, options: CueOptions = {}) {
    if (this.disposed || this.ctx.state === 'closed') return
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    const now = performance.now()
    const throttle =
      name === 'hover' ? 55 : name === 'locate' ? 80 : name === 'impact' ? 70 : name === 'blob' ? 700 : 0
    if (now - (this.lastCue.get(name) ?? 0) < throttle) return
    this.lastCue.set(name, now)

    const intensity = clamp01(options.intensity ?? 0.6)
    const pan = options.pan ?? 0

    switch (name) {
      case 'hover':
        this.tone({ freq: 760, endFreq: 1020, gain: 0.014, decay: 0.075, pan: pan || -0.08 })
        break
      case 'locate':
        this.tone({ freq: 659.25, gain: 0.024, decay: 0.26, pan: -0.14 })
        this.tone({ freq: 987.77, gain: 0.018, delay: 0.055, decay: 0.3, pan: 0.16 })
        this.hiss({ gain: 0.008, decay: 0.11, filter: { type: 'highpass', freq: 4200 }, pan: 0.1 })
        break
      case 'run':
        ;[392, 523.25, 783.99].forEach((freq, i) =>
          this.tone({
            freq,
            type: 'triangle',
            gain: 0.022,
            delay: i * 0.058,
            decay: 0.3,
            pan: -0.1 + i * 0.1,
          }),
        )
        this.hiss({ gain: 0.006, decay: 0.14, filter: { type: 'highpass', freq: 5200 } })
        break
      case 'model':
        this.tone({ freq: 174.61, endFreq: 130.81, type: 'triangle', gain: 0.018, decay: 0.18 })
        this.hiss({ gain: 0.012, decay: 0.12, filter: { type: 'bandpass', freq: 900, q: 0.8 }, pan: 0.08 })
        break
      case 'blob': {
        const gain = 0.018 + intensity * 0.026
        this.tone({ freq: 220, endFreq: 105, gain, decay: 0.38, pan: 0.08 })
        this.tone({ freq: 330, endFreq: 176, type: 'triangle', gain: gain * 0.5, delay: 0.035, decay: 0.33, pan: -0.1 })
        this.hiss({ gain: 0.008 + intensity * 0.01, decay: 0.22, filter: { type: 'lowpass', freq: 700 } })
        break
      }
      case 'impact': {
        const gain = 0.014 + intensity * 0.024
        this.tone({ freq: 104, endFreq: 48, gain, decay: 0.2, pan })
        this.hiss({ gain: 0.008 + intensity * 0.012, decay: 0.09, filter: { type: 'lowpass', freq: 480 }, pan })
        break
      }
      case 'open':
        this.tone({ freq: 392, type: 'triangle', gain: 0.02, decay: 0.24, pan: -0.1 })
        this.tone({ freq: 587.33, type: 'triangle', gain: 0.018, delay: 0.06, decay: 0.32, pan: 0.12 })
        this.hiss({ gain: 0.006, decay: 0.16, filter: { type: 'highpass', freq: 3800 } })
        break
      case 'close':
        this.tone({ freq: 587.33, type: 'triangle', gain: 0.016, decay: 0.22, pan: 0.1 })
        this.tone({ freq: 392, type: 'triangle', gain: 0.014, delay: 0.055, decay: 0.28, pan: -0.08 })
        break
      case 'switch':
        this.tone({ freq: 523.25, endFreq: 659.25, gain: 0.013, decay: 0.14 })
        break
      case 'portal':
        this.tone({ freq: 146.83, endFreq: 220, type: 'sine', gain: 0.03, decay: 0.55 })
        this.hiss({
          gain: 0.022,
          attack: 0.09,
          decay: 0.55,
          filter: { type: 'bandpass', freq: 520, endFreq: 2400, q: 0.7 },
        })
        this.tone({ freq: 587.33, gain: 0.015, delay: 0.16, decay: 0.34, pan: 0.2 })
        break
      case 'enable':
        this.tone({ freq: 523.25, type: 'triangle', gain: 0.017, decay: 0.22, pan: -0.08 })
        this.tone({ freq: 783.99, type: 'triangle', gain: 0.015, delay: 0.08, decay: 0.3, pan: 0.12 })
        break
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    try {
      this.ambient.gain.cancelScheduledValues(this.ctx.currentTime)
      this.ambient.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06)
      this.cues.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06)
    } catch {
      /* already closed */
    }
    window.setTimeout(() => {
      try {
        void this.ctx.close()
      } catch {
        /* already closed */
      }
    }, 180)
  }

  private tone(opts: ToneOptions) {
    const {
      freq,
      endFreq = freq,
      type = 'sine',
      gain = 0.02,
      attack = 0.006,
      decay = 0.22,
      delay = 0,
      pan = 0,
      filter,
    } = opts
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(freq, 1), t0)
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + decay)
    }

    let node: AudioNode = osc
    if (filter) {
      const f = this.ctx.createBiquadFilter()
      f.type = filter.type
      f.frequency.setValueAtTime(filter.freq, t0)
      f.Q.value = filter.q ?? 0.7
      osc.connect(f)
      node = f
    }

    const amp = this.ctx.createGain()
    amp.gain.setValueAtTime(0.0001, t0)
    amp.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), t0 + attack)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)

    const panner = this.ctx.createStereoPanner()
    panner.pan.value = pan
    node.connect(amp)
    amp.connect(panner)
    panner.connect(this.cues)

    osc.start(t0)
    osc.stop(t0 + decay + 0.05)
  }

  private hiss(opts: HissOptions) {
    const {
      gain = 0.01,
      attack = 0.005,
      decay = 0.12,
      delay = 0,
      pan = 0,
      filter,
    } = opts
    const t0 = this.ctx.currentTime + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true

    const f = this.ctx.createBiquadFilter()
    f.type = filter?.type ?? 'bandpass'
    f.frequency.setValueAtTime(filter?.freq ?? 1200, t0)
    if (filter?.endFreq) f.frequency.exponentialRampToValueAtTime(filter.endFreq, t0 + decay)
    f.Q.value = filter?.q ?? 0.8

    const amp = this.ctx.createGain()
    amp.gain.setValueAtTime(0.0001, t0)
    amp.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), t0 + attack)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)

    const panner = this.ctx.createStereoPanner()
    panner.pan.value = pan

    src.connect(f)
    f.connect(amp)
    amp.connect(panner)
    panner.connect(this.cues)

    src.start(t0)
    src.stop(t0 + decay + 0.05)
  }
}

/* ------------------------------------------------------------------ active —
 * Components call `playCue` freely; it is a no-op whenever sound is off. */
let active: SoundEngine | null = null

export function setSoundEngine(engine: SoundEngine | null) {
  active = engine
}

export function playCue(name: SoundCue, options?: CueOptions) {
  active?.cue(name, options)
}
