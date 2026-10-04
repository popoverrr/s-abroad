// WebAudio synthesis — no audio files. The AudioContext is created only from a user gesture.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let reverb: ConvolverNode | null = null
let noise: AudioBuffer | null = null
let lastClick = 0
let lastTick = 0

// While the language gate is open, the global "unlock on first gesture" listener stands down:
// the gate creates the context itself, and only when its sound switch is on.
let unlockHeld = false
export const holdUnlock = (v: boolean) => {
  unlockHeld = v
}
export const isUnlockHeld = () => unlockHeld

/** The site's shared AudioContext if it already exists (created only by a user gesture); never creates one. */
export const sharedAudioContext = (): AudioContext | null => ctx

export function ensureAudio(): AudioContext | null {
  if (ctx) {
    // iOS may leave the context 'suspended' or 'interrupted' (calls, tab switches) — wake it on every gesture
    if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {})
    return ctx
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)

  // White noise buffer for flap clicks.
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

  // Generated impulse response: a short, soft hall tail.
  const len = Math.floor(ctx.sampleRate * 1.6)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const b = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  reverb = ctx.createConvolver()
  reverb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  reverb.connect(wet).connect(master)
  return ctx
}

const ready = () => (ctx && master && ctx.state === 'running' ? ctx : null)

/** Split-flap click: 12 ms of band-passed noise, ±10% pitch, at most one per 30 ms. */
export function flapClick() {
  const c = ready()
  if (!c || !noise) return
  const now = c.currentTime
  if (now - lastClick < 0.03) return
  lastClick = now
  const src = c.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.9 + Math.random() * 0.2
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2000 + Math.random() * 1000
  bp.Q.value = 1.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, now)
  g.gain.exponentialRampToValueAtTime(0.0008, now + 0.012)
  src.connect(bp).connect(g).connect(master!)
  src.start(now)
  src.stop(now + 0.02)
}

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine', toReverb = false) {
  const c = ctx!
  const o = c.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(master!)
  if (toReverb && reverb) g.connect(reverb)
  o.start(start)
  o.stop(start + dur + 0.05)
}

/** Airport "ding-dong": E5 → C5, 180 ms each, with a reverb tail. */
export function dingDong() {
  const c = ready()
  if (!c) return
  const t = c.currentTime + 0.02
  tone(659.25, t, 0.9, 0.12, 'sine', true)
  tone(1318.5, t, 0.4, 0.02, 'sine', true)
  tone(523.25, t + 0.18, 1.1, 0.12, 'sine', true)
  tone(1046.5, t + 0.18, 0.45, 0.02, 'sine', true)
}

/** Stamp: low 110 Hz thud with a fast 90 ms decay plus a click. */
export function thud() {
  const c = ready()
  if (!c || !noise) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(110, t + 0.03)
  const g = c.createGain()
  g.gain.setValueAtTime(0.28, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + 0.12)
  const src = c.createBufferSource()
  src.buffer = noise
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1800
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.08, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.02)
  src.connect(lp).connect(ng).connect(master!)
  src.start(t)
  src.stop(t + 0.03)
}

/** Barely audible hover tick (desktop gate rows), throttled to 80 ms. */
export function hoverTick() {
  const c = ready()
  if (!c) return
  const now = c.currentTime
  if (now - lastTick < 0.08) return
  lastTick = now
  tone(2400, now, 0.025, 0.02, 'triangle')
}
