// Soundeffekte als kleine Synth-Rezepte. Aufruf: sfx('jump')

import { engine } from './AudioEngine.js';

const SFX = {
  jump: (e) => e.tone({ type: 'square', freq: 320, freqEnd: 640, duration: 0.12, volume: 0.22 }),
  land: (e) => { e.noise({ duration: 0.06, filterFreq: 900, volume: 0.18 }); e.tone({ type: 'sine', freq: 140, freqEnd: 70, duration: 0.08, volume: 0.25 }); },
  hardLand: (e) => { e.noise({ duration: 0.12, filterFreq: 600, volume: 0.3 }); e.tone({ type: 'sine', freq: 110, freqEnd: 45, duration: 0.16, volume: 0.35 }); },
  glideOpen: (e) => e.noise({ duration: 0.22, filterType: 'bandpass', filterFreq: 600, filterEnd: 2400, volume: 0.2 }),
  dive: (e) => { e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 2500, filterEnd: 500, volume: 0.16 }); e.tone({ type: 'sawtooth', freq: 260, freqEnd: 90, duration: 0.3, volume: 0.08 }); },
  swoop: (e) => { e.tone({ type: 'triangle', freq: 220, freqEnd: 980, duration: 0.28, volume: 0.22 }); e.noise({ duration: 0.2, filterType: 'bandpass', filterFreq: 800, filterEnd: 3000, volume: 0.12 }); },
  stomp: (e) => { e.tone({ type: 'square', freq: 520, freqEnd: 110, duration: 0.13, volume: 0.25 }); e.noise({ duration: 0.08, filterFreq: 1500, volume: 0.15 }); },
  hurt: (e) => { e.tone({ type: 'sawtooth', freq: 330, freqEnd: 110, duration: 0.3, volume: 0.22 }); e.tone({ type: 'square', freq: 165, freqEnd: 60, duration: 0.3, volume: 0.12, at: e.now + 0.05 }); },
  coin: (e) => { e.tone({ type: 'square', freq: 988, duration: 0.07, volume: 0.18 }); e.tone({ type: 'square', freq: 1319, duration: 0.25, volume: 0.18, at: e.now + 0.07 }); },
  bigCoin: (e) => [784, 988, 1175, 1568].forEach((f, i) => e.tone({ type: 'square', freq: f, duration: i === 3 ? 0.3 : 0.08, volume: 0.18, at: e.now + i * 0.07 })),
  berry: (e) => [523, 659, 784].forEach((f, i) => e.tone({ type: 'triangle', freq: f, duration: 0.12, volume: 0.25, at: e.now + i * 0.08 })),
  key: (e) => [1047, 1319, 1568, 2093].forEach((f, i) => e.tone({ type: 'square', freq: f, duration: 0.1, volume: 0.14, at: e.now + i * 0.06 })),
  gate: (e) => { e.noise({ duration: 0.6, filterFreq: 300, filterEnd: 80, volume: 0.3 }); [131, 165, 196].forEach((f) => e.tone({ type: 'triangle', freq: f, duration: 0.7, volume: 0.2, attack: 0.1 })); },
  checkpoint: (e) => { e.tone({ type: 'triangle', freq: 659, duration: 0.12, volume: 0.22 }); e.tone({ type: 'triangle', freq: 988, duration: 0.3, volume: 0.22, at: e.now + 0.12 }); },
  fireball: (e) => { e.noise({ duration: 0.12, filterType: 'bandpass', filterFreq: 1800, filterEnd: 400, volume: 0.2 }); e.tone({ type: 'square', freq: 440, freqEnd: 180, duration: 0.12, volume: 0.12 }); },
  slam: (e) => { e.noise({ duration: 0.25, filterFreq: 500, filterEnd: 60, volume: 0.4 }); e.tone({ type: 'sine', freq: 80, freqEnd: 30, duration: 0.3, volume: 0.45 }); },
  mount: (e) => e.tone({ type: 'sine', freq: 220, freqEnd: 440, duration: 0.18, volume: 0.25 }),
  panic: (e) => [0, 1, 2, 3].forEach((i) => e.tone({ type: 'square', freq: i % 2 ? 620 : 830, duration: 0.07, volume: 0.16, at: e.now + i * 0.07 })),
  vanish: (e) => e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 1200, filterEnd: 300, volume: 0.18 }),
  hover: (e) => e.noise({ duration: 0.15, filterType: 'bandpass', filterFreq: 300, filterEnd: 900, volume: 0.1 }),
  select: (e) => e.tone({ type: 'square', freq: 880, duration: 0.06, volume: 0.15 }),
  step: (e) => e.tone({ type: 'triangle', freq: 440, duration: 0.05, volume: 0.1 }),
  pause: (e) => { e.tone({ type: 'square', freq: 660, duration: 0.06, volume: 0.12 }); e.tone({ type: 'square', freq: 440, duration: 0.1, volume: 0.12, at: e.now + 0.07 }); },
  die: (e) => [440, 370, 311, 220].forEach((f, i) => e.tone({ type: 'square', freq: f, duration: 0.14, volume: 0.2, at: e.now + i * 0.13 })),
};

/** Spielt einen Effekt ab (leise ignoriert, wenn Audio noch nicht freigeschaltet ist). */
export function sfx(name) {
  const fn = SFX[name];
  if (!fn || !engine.ready) return;
  try { fn(engine); } catch (_) { /* nie das Spiel stören */ }
}
