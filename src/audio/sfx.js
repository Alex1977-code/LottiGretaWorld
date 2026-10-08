// Soundeffekte als kleine Synth-Rezepte. Aufruf: sfx('jump')
//
// Jedes Rezept bekommt eine Sicht `v` auf die Synth-Stimmen (Klasse `Voices`) mit eingefrorener Startzeit
// `v.now` – so liegen alle Teile eines Effekts zeitlich exakt zueinander, und derselbe Effekt lässt sich im
// Test über einen OfflineAudioContext rendern und vermessen (`renderSfx`). Bausteine: `v.tone`, `v.noise`
// und die Musik-Stimmen (`v.stab`, `v.ravePiano`, `v.riser`, `v.kick909`, `v.hatOpen`, `v.crash` …), damit
// die Effekte zur Eurodance-Klangwelt passen. Alle liegen auf dem Effekt-Bus (Pegel 0,5).
//
// Unbekannte Namen bleiben stumm (kein Fehler) – auch Namen wie "toString" oder "__proto__".
//
// Kurs-Effekte (Vertrag docs/KURS-ARCHITEKTUR.md, Abschnitt Audio) und wann sie gedacht sind:
//   jump / jump2 / jump3   Absprung 1./2./3. Sprung der Dreifachsprung-Kette (jump3 mit Glitzer-Arpeggio)
//   backflip / longjump    Rückwärtssalto (Wirbel nach oben) / Weitsprung (flaches Gleiten)
//   walljump               Abstoßen von der Wand
//   groundpound            Aufprall der Stampfattacke (beim Aufschlag auslösen)
//   slide                  Rutschen/Ducken-Rutschen beginnt
//   land                   Landung
//   coin / star / stamp    Bitcoin / versteckter Stern / Stempel eingesammelt
//   powerup / powerdown    Power-up erhalten / Treffer im großen Zustand (schrumpfen)
//   oneup                  Extraleben
//   blockhit / brickbreak  Block von unten gestoßen / Ziegel zerbricht
//   pipe                   Röhre betreten oder verlassen
//   checkpoint / goalpole  Checkpoint erreicht / Zielmast berührt
//   timewarn               Zeit wird knapp (einmalig, z.B. bei 100 s)
//   claw / fireball        Krallenhieb / Feuerball
//   stomp / hurt / die     Gegner zertreten / Treffer / Tod
//   switch / bounce        Schalter gedrückt / Sprungfeder, Trampolin, Pilz-Kissen

import { engine, Voices } from './AudioEngine.js';

/** Eigene Eigenschaft? (ohne Object.hasOwn – ältere iOS-Safari kennen es nicht) */
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const SEMI = Math.pow(2, 1 / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "C6" → Hz (nur für die Rezepte; ohne Abhängigkeit vom Sequencer). */
function hz(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  const n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  return 440 * Math.pow(SEMI, n - 69);
}
const chord = (...names) => names.map(hz);

/** Federnde Tonhöhenkurve (Boing): steigt von `from` nach `to`, überlagert von gedämpftem Wackeln. */
function springCurve(from, to, wobble, n = 48) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c.push(from + (to - from) * Math.pow(x, 0.6) + wobble * Math.sin(x * Math.PI * 9) * (1 - x));
  }
  return c;
}

const SFX = {
  // ---- Klassik-Spiel (unverändert, außer coin/checkpoint) – teils auch im Kurs genutzt ----
  jump: (e) => e.tone({ type: 'square', freq: 320, freqEnd: 640, duration: 0.12, volume: 0.22 }),
  land: (e) => { e.noise({ duration: 0.06, filterFreq: 900, volume: 0.18 }); e.tone({ type: 'sine', freq: 140, freqEnd: 70, duration: 0.08, volume: 0.25 }); },
  hardLand: (e) => { e.noise({ duration: 0.12, filterFreq: 600, volume: 0.3 }); e.tone({ type: 'sine', freq: 110, freqEnd: 45, duration: 0.16, volume: 0.35 }); },
  glideOpen: (e) => e.noise({ duration: 0.22, filterType: 'bandpass', filterFreq: 600, filterEnd: 2400, volume: 0.2 }),
  dive: (e) => { e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 2500, filterEnd: 500, volume: 0.16 }); e.tone({ type: 'sawtooth', freq: 260, freqEnd: 90, duration: 0.3, volume: 0.08 }); },
  swoop: (e) => { e.tone({ type: 'triangle', freq: 220, freqEnd: 980, duration: 0.28, volume: 0.22 }); e.noise({ duration: 0.2, filterType: 'bandpass', filterFreq: 800, filterEnd: 3000, volume: 0.12 }); },
  stomp: (e) => { e.tone({ type: 'square', freq: 520, freqEnd: 110, duration: 0.13, volume: 0.25 }); e.noise({ duration: 0.08, filterFreq: 1500, volume: 0.15 }); },
  hurt: (e) => { e.tone({ type: 'sawtooth', freq: 330, freqEnd: 110, duration: 0.3, volume: 0.22 }); e.tone({ type: 'square', freq: 165, freqEnd: 60, duration: 0.3, volume: 0.12, at: e.now + 0.05 }); },
  // Bitcoin: eigener Klang (Quinte hinauf, dann ein heller Glanzton) statt der alten Zweiton-Folge
  coin: (e) => {
    const t = e.now;
    e.tone({ type: 'square', freq: hz('C6'), duration: 0.05, volume: 0.13 });
    e.tone({ type: 'square', freq: hz('G6'), duration: 0.05, volume: 0.13, at: t + 0.045 });
    e.tone({ type: 'triangle', freq: hz('C7'), duration: 0.24, volume: 0.22, release: 0.16, at: t + 0.09 });
  },
  bigCoin: (e) => [784, 988, 1175, 1568].forEach((f, i) => e.tone({ type: 'square', freq: f, duration: i === 3 ? 0.3 : 0.08, volume: 0.18, at: e.now + i * 0.07 })),
  berry: (e) => [523, 659, 784].forEach((f, i) => e.tone({ type: 'triangle', freq: f, duration: 0.12, volume: 0.25, at: e.now + i * 0.08 })),
  key: (e) => [1047, 1319, 1568, 2093].forEach((f, i) => e.tone({ type: 'square', freq: f, duration: 0.1, volume: 0.14, at: e.now + i * 0.06 })),
  gate: (e) => { e.noise({ duration: 0.6, filterFreq: 300, filterEnd: 80, volume: 0.3 }); [131, 165, 196].forEach((f) => e.tone({ type: 'triangle', freq: f, duration: 0.7, volume: 0.2, attack: 0.1 })); },
  // Checkpoint: die alte Zweiton-Folge (E5 → H5) mit Stab-Akkorden darunter
  checkpoint: (e) => {
    const t = e.now;
    e.stab({ notes: chord('E4', 'G#4', 'B4', 'E5'), duration: 0.12, volume: 0.1 });
    e.tone({ type: 'triangle', freq: 659, duration: 0.12, volume: 0.2 });
    e.stab({ at: t + 0.12, notes: chord('B4', 'E5', 'G#5', 'B5'), duration: 0.26, volume: 0.1 });
    e.tone({ type: 'triangle', freq: 988, duration: 0.3, volume: 0.2, at: t + 0.12 });
  },
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

  // ---- Kurs: Bewegung ----
  // 2. Sprung: höher und mit hellem Dreieck-Nachklang
  jump2: (e) => {
    e.tone({ type: 'square', freq: 400, freqEnd: 860, duration: 0.13, volume: 0.2 });
    e.tone({ type: 'triangle', freq: 800, freqEnd: 1300, duration: 0.1, volume: 0.13, at: e.now + 0.03 });
  },
  // 3. Sprung: weiter Sweep, Dur-Arpeggio (C–E–G) und Luftzug
  jump3: (e) => {
    const t = e.now;
    e.tone({ type: 'square', freq: 300, freqEnd: 900, duration: 0.16, volume: 0.19 });
    ['C6', 'E6', 'G6'].forEach((n, i) => e.tone({ type: 'triangle', freq: hz(n), duration: 0.1, volume: 0.15, at: t + 0.08 + i * 0.05 }));
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 900, filterEnd: 3500, volume: 0.1 });
  },
  // Rückwärtssalto: aufsteigender Wirbel (Dreieck + leise Quinte) und Luftzug
  backflip: (e) => {
    e.noise({ duration: 0.38, filterType: 'bandpass', filterFreq: 600, filterEnd: 3200, volume: 0.13 });
    e.tone({ type: 'triangle', freq: 260, freqEnd: 1100, duration: 0.32, volume: 0.24 });
    e.tone({ type: 'square', freq: 390, freqEnd: 1650, duration: 0.3, volume: 0.07, at: e.now + 0.02 });
  },
  // Weitsprung: flacher, langer Gleit-Ton mit Fahrtwind
  longjump: (e) => {
    e.tone({ type: 'square', freq: 330, freqEnd: 560, duration: 0.18, volume: 0.15 });
    e.tone({ type: 'sawtooth', freq: 220, freqEnd: 440, duration: 0.3, volume: 0.09 });
    e.noise({ duration: 0.4, filterType: 'bandpass', filterFreq: 1800, filterEnd: 900, volume: 0.12 });
  },
  // Wandsprung: dumpfes Abstoßen, dann Sweep nach oben
  walljump: (e) => {
    e.tone({ type: 'sine', freq: 200, freqEnd: 90, duration: 0.07, volume: 0.3 });
    e.noise({ duration: 0.04, filterFreq: 2500, volume: 0.15 });
    e.tone({ type: 'square', freq: 420, freqEnd: 900, duration: 0.11, volume: 0.18, at: e.now + 0.03 });
  },
  // Stampfattacke (Aufprall): 909-Kick mit tiefem Pitch-Drop, Staub-Rauschen, fallender Rechteck-Ton
  groundpound: (e) => {
    e.kick909({ volume: 0.5, pitchStart: 200, pitchEnd: 38, decay: 0.32, click: 0.6 });
    e.noise({ duration: 0.22, filterFreq: 1400, filterEnd: 120, volume: 0.28 });
    e.tone({ type: 'square', freq: 260, freqEnd: 70, duration: 0.14, volume: 0.1 });
  },
  // Rutschen: Reibung (Bandpass-Rauschen, fallend) mit leisem Brummen
  slide: (e) => {
    e.noise({ duration: 0.32, filterType: 'bandpass', filterFreq: 1300, filterEnd: 650, volume: 0.36 });
    e.tone({ type: 'triangle', freq: 180, freqEnd: 140, duration: 0.26, volume: 0.18, attack: 0.03 });
  },

  // ---- Kurs: Sammeln, Power-ups ----
  // Versteckter Stern: Funkel-Arpeggio (Cmaj7 hinauf), heller Piano-Akkord, offene Hat als Glitzern
  star: (e) => {
    const t = e.now;
    ['C6', 'E6', 'G6', 'B6', 'C7'].forEach((n, i) => e.tone({ type: i % 2 ? 'triangle' : 'square', freq: hz(n), duration: 0.09, volume: i % 2 ? 0.2 : 0.12, at: t + i * 0.055 }));
    e.ravePiano({ at: t + 0.28, notes: chord('E6', 'G6', 'C7'), duration: 0.42, volume: 0.09, oscs: 1, cutoff: 7000, cutoffEnd: 3000 });
    e.hatOpen({ at: t + 0.28, volume: 0.12, duration: 0.4 });
  },
  // Stempel: „Stempel drauf“ (kurze, hohe Kick mit Klick) und zwei fröhliche Piano-Akkorde
  stamp: (e) => {
    const t = e.now;
    e.kick909({ volume: 0.3, pitchStart: 320, pitchEnd: 120, decay: 0.12, click: 0.8 });
    e.noise({ duration: 0.05, filterFreq: 3000, volume: 0.12 });
    e.ravePiano({ at: t + 0.1, notes: chord('E5', 'G5', 'C6'), duration: 0.16, volume: 0.09 });
    e.ravePiano({ at: t + 0.24, notes: chord('G5', 'C6', 'E6'), duration: 0.34, volume: 0.09 });
  },
  // Power-up: Hoover-Riser über zwei Oktaven, dann C-Dur-Stab mit Glanzton
  powerup: (e) => {
    const t = e.now;
    e.riser({ freq: 220, glide: 4, duration: 0.38, volume: 0.13, noise: 0.06 });
    e.stab({ at: t + 0.36, notes: chord('C5', 'E5', 'G5', 'C6'), duration: 0.28, volume: 0.15 });
    e.tone({ type: 'triangle', freq: hz('G6'), duration: 0.22, volume: 0.14, at: t + 0.36 });
  },
  // Power verloren: kurzer Moll-Stab, dann Hoover fällt zwei Oktaven
  powerdown: (e) => {
    e.stab({ notes: chord('A4', 'C5', 'E5'), duration: 0.12, volume: 0.12 });
    e.riser({ at: e.now + 0.06, freq: 660, glide: 0.25, duration: 0.5, volume: 0.11, noise: 0.03 });
  },
  // Extraleben: Rechteck-Arpeggio G–C–E–G mit Piano-Akkord am Ende
  oneup: (e) => {
    const t = e.now;
    ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => e.tone({ type: 'square', freq: hz(n), duration: i === 3 ? 0.26 : 0.08, volume: 0.12, at: t + i * 0.075 }));
    e.ravePiano({ at: t + 0.225, notes: chord('C6', 'E6', 'G6'), duration: 0.36, volume: 0.07, oscs: 1 });
  },

  // ---- Kurs: Blöcke, Welt ----
  // Block von unten: kurzes „Tock“
  blockhit: (e) => {
    e.tone({ type: 'square', freq: 210, freqEnd: 150, duration: 0.07, volume: 0.2 });
    e.tone({ type: 'triangle', freq: 520, freqEnd: 420, duration: 0.06, volume: 0.15 });
    e.noise({ duration: 0.04, filterFreq: 1800, volume: 0.15 });
  },
  // Ziegel zerbricht: Krachen (fallender Tiefpass), dumpfer Schlag, drei Splitter
  brickbreak: (e) => {
    const t = e.now;
    e.noise({ duration: 0.28, filterFreq: 3200, filterEnd: 250, volume: 0.3 });
    e.tone({ type: 'sine', freq: 160, freqEnd: 55, duration: 0.15, volume: 0.3 });
    [0.06, 0.11, 0.17].forEach((d, i) => e.noise({ at: t + d, duration: 0.05, filterType: 'bandpass', filterFreq: 2600 - i * 500, volume: 0.14 }));
  },
  // Röhre: weiches Hineinsaugen (gleitender Dreieck-Ton, Bandpass-Rauschen fällt mit)
  pipe: (e) => {
    e.tone({ type: 'triangle', freq: 720, freqEnd: 110, duration: 0.42, volume: 0.26 });
    e.tone({ type: 'square', freq: 360, freqEnd: 55, duration: 0.42, volume: 0.06 });
    e.noise({ duration: 0.4, filterType: 'bandpass', filterFreq: 1600, filterEnd: 200, volume: 0.12 });
  },
  // Zielmast: Riser die Stange hinauf, G-Dur-Stab, Crash
  goalpole: (e) => {
    const t = e.now;
    e.riser({ freq: 196, glide: 4, duration: 0.55, volume: 0.1, noise: 0.06 });
    e.stab({ at: t + 0.55, notes: chord('G4', 'B4', 'D5', 'G5'), duration: 0.3, volume: 0.14 });
    e.tone({ type: 'square', freq: hz('G5'), duration: 0.3, volume: 0.08, at: t + 0.55 });
    e.crash({ at: t + 0.55, volume: 0.1 });
  },
  // Zeit knapp: drei verminderte Stabs mit Rechteck-Piepton, ein vierter einen Halbton höher (Alarm)
  timewarn: (e) => {
    const t = e.now;
    const dim = chord('B4', 'D5', 'F5', 'Ab5');
    [0, 0.13, 0.26].forEach((d) => {
      e.stab({ at: t + d, notes: dim, duration: 0.1, volume: 0.14 });
      e.tone({ type: 'square', freq: hz('B5'), duration: 0.08, volume: 0.1, at: t + d });
    });
    e.stab({ at: t + 0.39, notes: dim.map((f) => f * SEMI), duration: 0.22, volume: 0.14 });
    e.tone({ type: 'square', freq: hz('C6'), duration: 0.2, volume: 0.1, at: t + 0.39 });
  },
  // Krallenhieb: zwei schnelle Kratzer (Hochton-Rauschen + fallender Sägezahn)
  claw: (e) => {
    const t = e.now;
    e.noise({ duration: 0.12, filterType: 'bandpass', filterFreq: 2200, filterEnd: 6000, volume: 0.5 });
    e.tone({ type: 'sawtooth', freq: 1200, freqEnd: 300, duration: 0.08, volume: 0.16 });
    e.noise({ at: t + 0.06, duration: 0.1, filterType: 'bandpass', filterFreq: 2600, filterEnd: 6500, volume: 0.4 });
    e.tone({ type: 'sawtooth', freq: 1000, freqEnd: 260, duration: 0.07, volume: 0.13, at: t + 0.06 });
  },
  // Schalter: Klick, dumpfes Einrasten, zwei bestätigende Töne
  switch: (e) => {
    const t = e.now;
    e.noise({ duration: 0.03, filterType: 'highpass', filterFreq: 3000, volume: 0.2 });
    e.tone({ type: 'sine', freq: 140, freqEnd: 70, duration: 0.1, volume: 0.28 });
    e.tone({ type: 'square', freq: 440, duration: 0.07, volume: 0.13, at: t + 0.06 });
    e.tone({ type: 'square', freq: 660, duration: 0.12, volume: 0.13, at: t + 0.13 });
  },
  // Sprungfeder: „Boing“ – federnd wackelnde Tonhöhe, leise Unteroktave
  bounce: (e) => {
    e.tone({ type: 'triangle', freq: 150, curve: springCurve(150, 620, 70), duration: 0.34, volume: 0.28, release: 0.12 });
    e.tone({ type: 'square', freq: 75, curve: springCurve(75, 310, 35), duration: 0.22, volume: 0.05 });
  },
};

/** Effekt-Namen aus dem Kurs-Vertrag (docs/KURS-ARCHITEKTUR.md). */
export const COURSE_SFX = ['jump', 'jump2', 'jump3', 'backflip', 'longjump', 'walljump', 'groundpound', 'slide', 'land',
  'coin', 'star', 'stamp', 'powerup', 'powerdown', 'oneup', 'blockhit', 'brickbreak', 'pipe', 'checkpoint', 'goalpole',
  'timewarn', 'claw', 'fireball', 'stomp', 'hurt', 'die', 'switch', 'bounce'];

/** Alle Effekt-Namen. */
export const SFX_NAMES = Object.keys(SFX);

/** Sicht auf die Stimmen mit fester Startzeit (alle Teile eines Effekts beziehen sich auf dieselbe Zeit). */
const at = (voices, t) => Object.create(voices, { now: { value: t } });

/** Spielt einen Effekt ab (leise ignoriert, wenn Audio noch nicht freigeschaltet ist oder der Name unbekannt ist). */
export function sfx(name) {
  if (typeof name !== 'string' || !has(SFX, name) || !engine.ready) return;
  try { SFX[name](at(engine.voices, engine.now)); } catch (_) { /* nie das Spiel stören */ }
}

/**
 * Effekte offline rendern (Test/Messung): je Effekt ein eigener OfflineAudioContext mit Effekt-Bus 0,5
 * wie im Spiel. Liefert je Name die Samples und die Zahl der erzeugten Knoten/Oszillatoren.
 * @returns {Promise<Array<{ name, samples: Float32Array, sampleRate, nodes, oscillators }>>}
 */
export async function renderSfx(names = SFX_NAMES, { seconds = 1.6, sampleRate = 44100 } = {}) {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const out = [];
  for (const name of names) {
    const ctx = new Ctx(1, Math.ceil(seconds * sampleRate), sampleRate);
    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
    const voices = new Voices(ctx, bus, 3);
    if (has(SFX, name)) SFX[name](at(voices, 0.01));
    const buffer = await ctx.startRendering();
    out.push({ name, samples: buffer.getChannelData(0), sampleRate, nodes: voices.stats.nodes, oscillators: voices.stats.oscillators });
  }
  return out;
}
