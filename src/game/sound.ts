/**
 * Sounds and music, all synthesised with Web Audio: no audio files to load or license.
 * Nothing plays before the player's first tap (browser autoplay rules); everything pauses
 * while the game is hidden. Music and sounds can be switched off separately.
 */

const PREFS_KEY = 'modshop-audio';
export interface AudioPrefs { music: boolean; sfx: boolean }

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { music: true, sfx: true, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { music: true, sfx: true };
}

let prefs = loadPrefs();
const listeners = new Set<() => void>();
export const audioPrefs = () => prefs;
export function onAudioPrefs(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function setAudioPrefs(p: Partial<AudioPrefs>) {
  prefs = { ...prefs, ...p };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  if (ctx) {
    musicBus!.gain.setTargetAtTime(prefs.music ? MUSIC_VOL : 0, ctx.currentTime, 0.3);
    sfxBus!.gain.setTargetAtTime(prefs.sfx ? SFX_VOL : 0, ctx.currentTime, 0.05);
  }
  if (prefs.music) startMusic();
  listeners.forEach((l) => l());
}

const MUSIC_VOL = 0.13;
const SFX_VOL = 0.5;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** A short echo the bright sounds (rare finds) are sent into, so they ring on for a moment. */
let echo: AudioNode | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(comp);
  musicBus = ctx.createGain();
  musicBus.gain.value = prefs.music ? MUSIC_VOL : 0;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = prefs.sfx ? SFX_VOL : 0;
  sfxBus.connect(master);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.16;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 5500;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  delay.connect(damp).connect(fb).connect(delay);
  damp.connect(wet).connect(sfxBus);
  echo = delay;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Browsers start audio only from a user gesture: the first tap anywhere unlocks it and starts the music. */
export function initAudio() {
  const unlock = () => {
    const c = ensure();
    if (!c) return;
    c.resume().then(() => { if (prefs.music) startMusic(); });
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  // a soft tick on every button; buttons with their own sound say data-sound="none"
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('button');
    if (b && !b.disabled && b.dataset.sound !== 'none') sfx('tap');
  }, true);
}

/* ---------- building blocks ---------- */

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function tone(bus: AudioNode, t: number, freq: number, dur: number, opts: {
  type?: OscillatorType; vol?: number; attack?: number; slideTo?: number; filter?: number;
} = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = opts.type ?? 'triangle';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  const g = c.createGain();
  const a = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.2, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out: AudioNode = g;
  if (opts.filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opts.filter;
    g.connect(f);
    out = f;
  }
  o.connect(g);
  out.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(bus: AudioNode, t: number, dur: number, opts: { vol?: number; freq?: number; q?: number; type?: BiquadFilterType } = {}) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.value = opts.freq ?? 6000;
  f.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.vol ?? 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/** A glassy bell: a sine with an inharmonic partial, a quick strike and a long ring, sent into the echo. */
function bell(bus: AudioNode, t: number, freq: number, dur: number, vol = 0.1) {
  tone(bus, t, freq, dur, { type: 'sine', vol });
  tone(bus, t, freq * 2.76, dur * 0.45, { type: 'sine', vol: vol * 0.35 });
  tone(bus, t, freq * 5.4, dur * 0.2, { type: 'sine', vol: vol * 0.15 });
  if (echo) {
    tone(echo, t, freq, dur, { type: 'sine', vol: vol * 0.6 });
    tone(echo, t, freq * 2.76, dur * 0.4, { type: 'sine', vol: vol * 0.2 });
  }
}

/** A rising whoosh: filtered noise sweeping up, under the reveal. */
function sweep(bus: AudioNode, t: number, dur: number, vol = 0.08) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2.5;
  f.frequency.setValueAtTime(600, t);
  f.frequency.exponentialRampToValueAtTime(9000, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  s.connect(f).connect(g).connect(bus);
  s.start(t);
  s.stop(t + dur + 0.1);
}

/** Tiny random high bells falling like sparkles. */
function sparkles(bus: AudioNode, t: number, count: number, span: number, vol = 0.05) {
  const notes = [96, 98, 100, 103, 105, 108];
  for (let i = 0; i < count; i++) {
    bell(bus, t + (i / count) * span + Math.random() * 0.04, hz(notes[Math.floor(Math.random() * notes.length)]), 0.35, vol);
  }
}

/* ---------- sound effects ---------- */

export type Sfx = 'tap' | 'dig' | 'find' | 'rare' | 'epic' | 'buy' | 'coin' | 'pop' | 'star' | 'level'
  | 'vote' | 'ticket' | 'gift' | 'unlock' | 'fail' | 'send';

let lastTap = 0;

/** Play a sound effect; `step` raises the pitch (stars one after another). */
export function sfx(name: Sfx, step = 0) {
  if (!prefs.sfx) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const b = sfxBus!;
  const t = c.currentTime + 0.005;
  switch (name) {
    case 'tap':
      if (t - lastTap < 0.06) return;
      lastTap = t;
      tone(b, t, 880, 0.05, { type: 'sine', vol: 0.05, slideTo: 620 });
      break;
    case 'pop':
      tone(b, t, 520, 0.08, { type: 'sine', vol: 0.12, slideTo: 980 });
      break;
    case 'coin':
      tone(b, t, 1976, 0.07, { type: 'square', vol: 0.025, filter: 5000 });
      tone(b, t + 0.05, 2637, 0.16, { type: 'square', vol: 0.025, filter: 6000 });
      break;
    case 'dig':
      hiss(b, t, 0.12, { vol: 0.12, freq: 2500, q: 1.5 });
      hiss(b, t + 0.17, 0.12, { vol: 0.1, freq: 3200, q: 1.5 });
      hiss(b, t + 0.36, 0.14, { vol: 0.09, freq: 2200, q: 1.5 });
      break;
    case 'find':
      [72, 76, 79].forEach((m, i) => tone(b, t + i * 0.07, hz(m), 0.22, { vol: 0.12 }));
      break;
    case 'rare':
      // a quick whoosh up, a bright chord flash, a bell run two octaves up and falling sparkles
      sweep(b, t, 0.28, 0.07);
      [72, 76, 79].forEach((m) => tone(b, t + 0.26, hz(m), 0.7, { type: 'square', vol: 0.03, attack: 0.01, filter: 4200 }));
      [84, 88, 91, 96].forEach((m, i) => bell(b, t + 0.26 + i * 0.065, hz(m), 0.9, 0.11));
      sparkles(b, t + 0.55, 7, 0.6, 0.04);
      hiss(b, t + 0.26, 0.8, { vol: 0.05, freq: 10000, type: 'highpass' });
      break;
    case 'epic':
      // a longer rise, a big shining chord, a bell cascade over three octaves, a final high chord and a shower of sparkles
      sweep(b, t, 0.55, 0.09);
      [60, 67, 72, 76, 79].forEach((m) => tone(b, t + 0.5, hz(m), 1.6, { type: 'sawtooth', vol: 0.028, attack: 0.02, filter: 5000 }));
      tone(b, t + 0.5, hz(48), 1.2, { type: 'sine', vol: 0.18, attack: 0.02 });
      [79, 84, 88, 91, 96, 100, 103].forEach((m, i) => bell(b, t + 0.5 + i * 0.06, hz(m), 1.1, 0.1));
      [96, 100, 103, 108].forEach((m) => bell(b, t + 1.05, hz(m), 1.4, 0.06));
      sparkles(b, t + 0.8, 14, 1.2, 0.04);
      hiss(b, t + 0.5, 1.4, { vol: 0.06, freq: 10000, type: 'highpass' });
      break;
    case 'buy':
      hiss(b, t, 0.08, { vol: 0.12, freq: 5000 });
      tone(b, t + 0.04, hz(88), 0.18, { type: 'square', vol: 0.03, filter: 6000 });
      tone(b, t + 0.12, hz(93), 0.35, { type: 'square', vol: 0.03, filter: 7000 });
      break;
    case 'star':
      tone(b, t, hz(79 + [0, 2, 4, 7, 9][Math.min(step, 4)]), 0.25, { vol: 0.1 });
      tone(b, t, hz(91 + [0, 2, 4, 7, 9][Math.min(step, 4)]), 0.18, { type: 'sine', vol: 0.04 });
      break;
    case 'level':
      [60, 64, 67].forEach((m) => tone(b, t, hz(m), 0.9, { type: 'sawtooth', vol: 0.03, attack: 0.03, filter: 2500 }));
      [72, 76, 79, 84].forEach((m, i) => tone(b, t + i * 0.1, hz(m), 0.3, { vol: 0.13 }));
      [79, 84].forEach((m) => tone(b, t + 0.45, hz(m), 0.7, { vol: 0.1 }));
      break;
    case 'vote':
      tone(b, t, 660, 0.09, { type: 'sine', vol: 0.12, slideTo: 990 });
      break;
    case 'ticket':
      [84, 88, 91].forEach((m, i) => tone(b, t + i * 0.06, hz(m), 0.25, { vol: 0.1 }));
      break;
    case 'gift':
      [67, 72, 76, 79, 84].forEach((m, i) => tone(b, t + i * 0.06, hz(m), 0.3, { vol: 0.1 }));
      hiss(b, t + 0.25, 0.5, { vol: 0.04, freq: 9000, type: 'highpass' });
      break;
    case 'unlock':
      tone(b, t, hz(67), 0.12, { type: 'square', vol: 0.03, filter: 3000 });
      [72, 79, 84].forEach((m, i) => tone(b, t + 0.15 + i * 0.09, hz(m), 0.4, { vol: 0.12 }));
      break;
    case 'send':
      tone(b, t, 440, 0.18, { type: 'sine', vol: 0.1, slideTo: 1320 });
      hiss(b, t, 0.2, { vol: 0.04, freq: 4000 });
      break;
    case 'fail':
      tone(b, t, hz(67), 0.18, { vol: 0.09 });
      tone(b, t + 0.16, hz(63), 0.3, { vol: 0.09 });
      break;
  }
}

/* ---------- music ---------- */

/**
 * A light lo-fi pop loop composed on the fly: four chords, soft pad, round bass, a plucked
 * arpeggio, a quiet beat and a little melody that changes every phrase, so it never repeats exactly.
 */
const BPM = 88;
const BEAT = 60 / BPM;
/** Fmaj7 – Em7 – Dm7 – Cmaj7, then Fmaj7 – G – Em7 – Am7 (midi notes of each chord). */
const PROGRESSIONS = [
  [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
  [[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [57, 60, 64, 67]],
];
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76];

let playing = false;
let nextBar = 0;
let bar = 0;
let timer: ReturnType<typeof setInterval> | null = null;

export function startMusic() {
  const c = ensure();
  if (!c || playing || !prefs.music) return;
  playing = true;
  nextBar = c.currentTime + 0.1;
  timer = setInterval(schedule, 200);
  schedule();
}

function schedule() {
  const c = ctx!;
  if (c.state !== 'running') return;
  while (nextBar < c.currentTime + 1.2) {
    playBar(nextBar, bar);
    nextBar += BEAT * 4;
    bar++;
  }
}

function playBar(t: number, n: number) {
  const m = musicBus!;
  const prog = PROGRESSIONS[Math.floor(n / 4) % PROGRESSIONS.length];
  const chord = prog[n % 4];
  // pad: the chord held softly through the bar
  chord.forEach((note) => tone(m, t, hz(note), BEAT * 4, { type: 'sine', vol: 0.05, attack: 0.25, filter: 1400 }));
  chord.slice(1, 3).forEach((note) => tone(m, t, hz(note + 12), BEAT * 4, { type: 'triangle', vol: 0.015, attack: 0.4, filter: 1800 }));
  // bass: root on 1 and 3, a passing fifth before the next bar
  tone(m, t, hz(chord[0] - 12), BEAT * 1.8, { type: 'sine', vol: 0.16, attack: 0.02 });
  tone(m, t + BEAT * 2, hz(chord[0] - 12), BEAT * 1.4, { type: 'sine', vol: 0.13, attack: 0.02 });
  tone(m, t + BEAT * 3.5, hz(chord[0] - 5), BEAT * 0.45, { type: 'sine', vol: 0.09, attack: 0.02 });
  // plucked arpeggio in eighths
  const arp = [0, 2, 1, 3, 2, 1, 3, 2];
  arp.forEach((k, i) => tone(m, t + i * BEAT / 2, hz(chord[k] + 12), BEAT * 0.9, { type: 'triangle', vol: 0.045, filter: 2600 }));
  // beat: soft kick on 1 and 3, closed hat on the off-beats (from the third bar on)
  if (n >= 2) {
    [0, 2].forEach((k) => tone(m, t + k * BEAT, 110, 0.22, { type: 'sine', vol: 0.22, slideTo: 45 }));
    [0.5, 1.5, 2.5, 3.5].forEach((k) => hiss(m, t + k * BEAT, 0.05, { vol: 0.05, freq: 8000, type: 'highpass' }));
    hiss(m, t + BEAT, 0.12, { vol: 0.06, freq: 1800, q: 0.7 });
    hiss(m, t + BEAT * 3, 0.12, { vol: 0.06, freq: 1800, q: 0.7 });
  }
  // melody: a short phrase from the scale, a new one every four bars, resting every other phrase
  const phrase = Math.floor(n / 4);
  if (n >= 4 && phrase % 2 === 1) {
    let seed = phrase * 9301 + (n % 4) * 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const steps = [0, 1.5, 2, 3];
    let idx = 2 + Math.floor(rnd() * 4);
    steps.forEach((s) => {
      if (rnd() < 0.25) return;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + Math.floor(rnd() * 5) - 2));
      tone(m, t + s * BEAT, hz(SCALE[idx] + 12), BEAT * 0.8, { type: 'sine', vol: 0.055, attack: 0.01, filter: 3500 });
    });
  }
}

export function stopMusic() {
  playing = false;
  if (timer) clearInterval(timer);
  timer = null;
}
