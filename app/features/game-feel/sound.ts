// Game sounds, synthesised with Web Audio so they cost no downloads and sound
// the same everywhere. Recipes and names match the "Bernalar Game Feel"
// prototype (tab "Token gerak & suara"). Nothing plays before the first tap
// (browsers forbid it), while muted, or while the page is in a silent zone
// such as writing a stage.

type Recipe = (arg?: number) => void;

const MUTE_KEY = "nalar:sound-muted";
const VOLUME_KEY = "nalar:sound-volume";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
let volume = 0.7;
let silentZones = 0;
const listeners = new Set<() => void>();

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Without storage the choice lasts for this visit only.
  }
}

if (typeof window !== "undefined") {
  muted = read(MUTE_KEY) === "1";
  const stored = Number(read(VOLUME_KEY));
  if (read(VOLUME_KEY) !== null && Number.isFinite(stored)) volume = Math.min(1, Math.max(0, stored));
}

/** Creates the audio graph on the first tap; later calls only resume it. */
export function unlockSound() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    ctx = new AudioCtor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume * 0.9;
    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor).connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Fixed-seed noise, so every play of a sound is identical.
    let seed = 7;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
}

type Tone = { f?: number; f2?: number; type?: OscillatorType; dur?: number; gain?: number; at?: number; attack?: number };

function tone({ f = 440, f2, type = "sine", dur = 0.15, gain = 0.18, at = 0, attack = 0.004 }: Tone) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function noise({ dur = 0.3, gain = 0.12, at = 0, from = 300, to = 3000, q = 1.2 }) {
  if (!ctx || !master || !noiseBuffer) return;
  const t = ctx.currentTime + at;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(filter).connect(env).connect(master);
  source.start(t);
  source.stop(t + dur + 0.05);
}

const note = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const recipes = {
  click: () => tone({ f: 1500, f2: 700, type: "triangle", dur: 0.05, gain: 0.12 }),
  tick: (i = 0) => tone({ f: note(84 + (i % 5)), type: "triangle", dur: 0.035, gain: 0.07 }),
  chord: () => {
    [72, 76, 79, 84].forEach((n, i) => tone({ f: note(n), dur: 0.9, gain: 0.11, at: i * 0.045 }));
    tone({ f: note(96), type: "triangle", dur: 0.5, gain: 0.03, at: 0.18 });
  },
  small: () => [79, 84].forEach((n, i) => tone({ f: note(n), dur: 0.45, gain: 0.11, at: i * 0.07 })),
  ding: () => {
    tone({ f: note(88), dur: 0.6, gain: 0.12 });
    tone({ f: note(95), dur: 0.7, gain: 0.08, at: 0.09 });
  },
  arp: () => {
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone({ f: note(n), type: "triangle", dur: 0.22, gain: 0.1, at: i * 0.075 }));
    [72, 76, 79].forEach((n) => tone({ f: note(n), dur: 1.4, gain: 0.08, at: 0.55 }));
  },
  shake: (i = 0) => {
    tone({ f: note(48 + i * 3), f2: note(45 + i * 3), type: "square", dur: 0.08, gain: 0.05 });
    noise({ dur: 0.08, gain: 0.05, from: 200, to: 900 });
  },
  chest: () => {
    tone({ f: 140, f2: 55, dur: 0.35, gain: 0.3 });
    noise({ dur: 0.4, gain: 0.08, from: 600, to: 6000 });
    [84, 88, 91, 96, 100].forEach((n, i) => tone({ f: note(n), dur: 0.5, gain: 0.05, at: 0.12 + i * 0.06 }));
  },
  spin: (i = 0) => {
    tone({ f: note(77 + Math.min(i, 12)), type: "triangle", dur: 0.03, gain: 0.08 });
    noise({ dur: 0.03, gain: 0.03, from: 2000, to: 4000 });
  },
  land: () => [76, 81, 85, 88].forEach((n, i) => tone({ f: note(n), dur: 1.1, gain: 0.1, at: i * 0.03 })),
  plank: () => {
    tone({ f: 220, f2: 150, type: "triangle", dur: 0.12, gain: 0.2 });
    noise({ dur: 0.06, gain: 0.06, from: 900, to: 400 });
  },
  whoosh: () => noise({ dur: 0.5, gain: 0.1, from: 250, to: 2600, q: 0.8 }),
  bonk: () => tone({ f: 260, f2: 200, dur: 0.18, gain: 0.12 }),
  right: () => [76, 83].forEach((n, i) => tone({ f: note(n), type: "triangle", dur: 0.3, gain: 0.1, at: i * 0.06 })),
  stamp: () => {
    tone({ f: 110, f2: 60, dur: 0.2, gain: 0.28 });
    noise({ dur: 0.08, gain: 0.08, from: 500, to: 200 });
  },
  point: () => tone({ f: note(91), dur: 0.12, gain: 0.05 }),
  page: () => noise({ dur: 0.22, gain: 0.05, from: 1800, to: 700, q: 0.6 }),
} satisfies Record<string, Recipe>;

export type SoundName = keyof typeof recipes;

export function playSound(name: SoundName, arg?: number) {
  if (!ctx || muted || silentZones > 0) return;
  recipes[name](arg);
}

/** Tick sounds while a number counts up, at most one every 42 ms. */
export function tickThrottle() {
  let last = 0;
  let count = 0;
  return () => {
    const now = performance.now();
    if (now - last < 42) return;
    last = now;
    playSound("tick", count++);
  };
}

export function isMuted() {
  return muted;
}
export function setMuted(next: boolean) {
  muted = next;
  write(MUTE_KEY, next ? "1" : "0");
  if (master) master.gain.value = next ? 0 : volume * 0.9;
  listeners.forEach((listener) => listener());
}
export function onSoundChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Writing a stage is a silent zone: no sound until it is left. */
export function enterSilentZone() {
  silentZones++;
  return () => {
    silentZones = Math.max(0, silentZones - 1);
  };
}

/** Short vibration on Android; silent where unsupported or when muted. */
export function haptic(pattern: number | readonly number[]) {
  if (muted || silentZones > 0) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // Some browsers refuse vibration outside a gesture; it is only a bonus.
  }
}

export const HAPTIC = { tap: 8, award: [12, 40, 18], macro: [20, 60, 20, 60, 40] } as const;
