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
//
// Welt 2–4:
//   clone / clone_lost     Spiegelfrucht-Klon entsteht / Klon geht verloren
//   helm_on / helm_off     Trage-Helm aufgesetzt / abgelegt
//   cannon                 Schuss des Kanonen-Helms
//   propeller              Propeller-Helm: Aufstieg (kurzer Schwirr-Klang, darf wiederholt ausgelöst werden)
//   light                  Licht-Helm/Lichtbox an
//   quicksand / sand_crumble  Einsinken im Treibsand / Sandblock zerbröselt
//   peck                   Hackvogel hackt (drei schnelle Schläge)
//   bullet                 Projektilkopf wird abgefeuert
//   boss_hit / boss_spin   Endgegner getroffen / Endgegner wirbelt
//   house_tick / room_clear  Prüfungs-Haus: Tick je Sekunde in den letzten 3 s / Raum geschafft
//   ice_slide / snowball   Rutschen auf Eis / Schneeball (rollt an, prallt)
//   ghost                  Spuk erscheint („Huuu“)
//   splash_big             großes Platschen (Sprung ins Wasser, Wasserspiegel)
//   train_whistle          Dampfpfeife des Zuges
//   beep / beep_switch     Piep-Block-Warnton / Piep-Blöcke schalten um (klingt wie die Pieps in course_beep)
//
// Welt 6 „Wolkeninseln“ (W6_SFX; vorher Ersatzklänge in blocks/w6kit.js):
//   gust / wind            Windböe (Windfeld bläst) / Wind-Vorwarnung (Windlinien)
//   rumble                 Grummeln (Quetschblock-Vorwarnung, Tempel)
//   door                   Papier-Schiebetür gleitet auf/zu
//   poof                   Wolke verpufft / erscheint wieder (auch Schattenläuferin)
//   splash                 kleines Platschen (Floß legt ab, Sprung ins Wasser – kleiner als splash_big)
//   bump                   Anstoßen / prallt ab / geht nicht
//   powerup_appear         etwas erscheint (Power-up aus dem Block, verstecktes Teil)
//   gong                   Gong-Schlag
// Halloween-Welt „Kürbisinsel“ (HW_SFX; vorher Ersatzklänge über hwSfx in blocks/hwkit.js):
//   klingel / tuer / alle_tueren   Türklingel „Ding-Dong“ / Tür knarrt auf / alle Türen geschafft
//   kessel / blase / netz          Sprung auf den Hexenkessel / Blase platzt / Spinnennetz-Trampolin
//   laterne / laterne_aus          Laterne an / aus
//   suessigkeit / muenzregen       Süßigkeit / Münzregen
//   buh / grabstein / kuerbis_platzt  „Buh!“ (drollig) / Grabstein-Schalter / Kürbis platzt
// Ergänzt für vorher stumme Aufrufe (MORE_SFX; Bestandsaufnahme aller Aufrufnamen: node tests/sfx_namen.mjs):
//   victory                Siegespose (kleine Fanfare, ≈ 0,9 s)
//   skid / glide / wallslide / swim   Kehrtwende-Rutschen / Gleitblatt öffnet / Wandrutschen beginnt / Schwimmzug
//   fence / grab / swing   Zaun/Gitter greifen / Trapez-Stange greifen / Trapez-Schwung
//   fall / boost           Absturz (fallender Pfeifton) / Schub (Temposchwelle, Sprungfeld, Strömung)
//   chain / alarm / flip / donut / pfiff   Kettenrasseln / „Entdeckt!“ / Farbfelder klappen um / Donut-Block wackelt / Schaffnerpfiff
//   note0 … note7          Tastenstein-Töne (C-Dur-Pentatonik C5 … E6)
//   hop / dash / kick      Gegner hüpft / Fisch-Vorstoß / Rollpilz angestoßen
//   dizzy / boomerang / dig / throw   schwindelig (Boss besiegt) / Bumerang / Graben / Felswurf
//   fuse / burn            Zündschnur (Kanone lädt) / Verbrennen in Lava
// Drosselung (SFX_GAP): derselbe Effekt klingt erst nach einem Mindestabstand wieder (Dauer-/Wiederholklänge wie swim,
// wallslide, hop, chain; sonst 0,03 s – gleichzeitige Auslösungen im selben Bild klingen einmal).

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

/** Schwirr-Kurve (Propeller): steigt von `from` nach `to`, schnell wackelnd (`rate` Hz über `dur` s). */
function whirrCurve(from, to, rate, dur, n = 96) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c.push((from + (to - from) * x) * (1 + 0.12 * Math.sin(2 * Math.PI * rate * dur * x)));
  }
  return c;
}

/** Wirbel-Kurve (Boss dreht sich): `turns` Bögen zwischen `lo` und `hi`, zum Ende hin höher. */
function spinCurve(lo, hi, turns, n = 96) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c.push(lo * (1 + 0.3 * x) + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * turns * x)));
  }
  return c;
}

/** Federnde Tonhöhenkurve (Boing): steigt von `from` nach `to`, überlagert von gedämpftem Wackeln. */
function springCurve(from, to, wobble, n = 48) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c.push(from + (to - from) * Math.pow(x, 0.6) + wobble * Math.sin(x * Math.PI * 9) * (1 - x));
  }
  return c;
}

/** Windböe: Pfeifton schwillt hinauf und sinkt zurück (Hz über die Dauer). */
const GUST_CURVE = [520, 640, 780, 880, 900, 840, 720, 600];
/** Knarrende Tür: steigt langsam, wackelt dabei schnell (Hz über die Dauer). */
const CREAK_CURVE = Array.from({ length: 64 }, (_, i) => { const x = i / 63; return 250 + 170 * x + 38 * Math.sin(x * 38) * (1 - 0.4 * x); });
/** Kurve aus `n` Punkten über x = 0..1. */
const curveOf = (fn, n = 64) => Array.from({ length: n }, (_, i) => fn(i / (n - 1)));
/** Absturz: Pfeifton fällt exponentiell über gut zwei Oktaven, leicht wackelnd (Zeichentrick-„Wiiiuuu“). */
const FALL_CURVE = curveOf((x) => 1100 * Math.pow(0.2, x) * (1 + 0.03 * Math.sin(x * Math.PI * 2 * 5)));
/** Trapez-Schwung: Bogen hinauf und zurück. */
const SWING_CURVE = curveOf((x) => 330 + 230 * Math.sin(x * Math.PI) - 40 * x, 32);
/** Schwindelig: zwei Kreise auf und ab, darüber schnelles Trillern (kreisende Vöglein). */
const DIZZY_CURVE = curveOf((x) => 1050 * (1 + 0.16 * Math.sin(x * Math.PI * 2 * 2)) * (1 + 0.06 * Math.sin(x * Math.PI * 2 * 10)), 128);
/** Donut-Block: sinkt und wackelt dabei (9 Wackler). */
const DONUT_CURVE = curveOf((x) => (340 - 120 * x) * (1 + 0.1 * Math.sin(x * Math.PI * 2 * 4)));

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

  // ---- Kurs Welt 2–4 ----
  // Klon entsteht: zwei helle Töne (Quinte), dann ihr „Klon“ eine Oktave höher und leiser, Glitzer-Rauschen
  clone: (e) => {
    const t = e.now;
    e.noise({ duration: 0.28, filterType: 'bandpass', filterFreq: 1200, filterEnd: 5000, volume: 0.09 });
    [['C6', 0], ['G6', 0.06]].forEach(([n, d]) => {
      e.tone({ type: 'triangle', freq: hz(n), duration: 0.09, volume: 0.22, at: t + d });
      e.tone({ type: 'square', freq: hz(n) * 2, duration: 0.08, volume: 0.06, at: t + d + 0.13 });
    });
    e.bell({ at: t + 0.13, freq: hz('C7'), volume: 0.12, decay: 0.25, ratio: 2, partial: 0.3 });
  },
  // Klon verloren: das Quint-Paar fällt, kurzes „Puff“
  clone_lost: (e) => {
    const t = e.now;
    e.tone({ type: 'triangle', freq: hz('G5'), freqEnd: hz('C5'), duration: 0.2, volume: 0.24 });
    e.tone({ type: 'square', freq: hz('E5'), freqEnd: hz('A4'), duration: 0.18, volume: 0.07, at: t + 0.05 });
    e.noise({ at: t + 0.12, duration: 0.2, filterType: 'bandpass', filterFreq: 3000, filterEnd: 600, volume: 0.16 });
  },
  // Helm auf: metallisches Einrasten (Tek-Klick und dumpfer Schlag), zwei steigende Bestätigungstöne
  helm_on: (e) => {
    const t = e.now;
    e.tek({ freq: 900, volume: 0.4 });
    e.tone({ type: 'sine', freq: 160, freqEnd: 90, duration: 0.08, volume: 0.28 });
    e.tone({ type: 'square', freq: hz('E5'), duration: 0.07, volume: 0.12, at: t + 0.07 });
    e.tone({ type: 'square', freq: hz('A5'), duration: 0.14, volume: 0.12, at: t + 0.14 });
  },
  // Helm ab: Klick, dann zwei fallende Töne
  helm_off: (e) => {
    const t = e.now;
    e.tek({ freq: 700, volume: 0.46 });
    e.tone({ type: 'square', freq: hz('A5'), duration: 0.07, volume: 0.15, at: t + 0.04 });
    e.tone({ type: 'square', freq: hz('E5'), freqEnd: hz('A4'), duration: 0.16, volume: 0.15, at: t + 0.11 });
  },
  // Kanonen-Helm: tiefer Knall (Kick mit langem Fall), Pulverdampf-Rauschen, heller Abschuss-Zischer
  cannon: (e) => {
    e.kick909({ volume: 0.5, pitchStart: 170, pitchEnd: 38, decay: 0.4, click: 0.7 });
    e.noise({ duration: 0.35, filterFreq: 2400, filterEnd: 150, volume: 0.32 });
    e.noise({ duration: 0.12, filterType: 'bandpass', filterFreq: 4000, filterEnd: 1500, volume: 0.12 });
  },
  // Propeller: Schwirren (Sägezahn mit schnell wackelnder, steigender Tonhöhe), steigender Luftzug, Dreieck hinauf
  propeller: (e) => {
    e.tone({ type: 'sawtooth', freq: 180, curve: whirrCurve(180, 420, 16, 0.55), slideTime: 0.55, duration: 0.6, volume: 0.16, attack: 0.04, release: 0.15 });
    e.noise({ duration: 0.6, filterType: 'bandpass', filterFreq: 500, filterEnd: 2500, volume: 0.26 });
    e.tone({ type: 'triangle', freq: 300, freqEnd: 900, duration: 0.5, volume: 0.19, at: e.now + 0.05 });
  },
  // Licht an: heller Glockenschlag, Dur-Arpeggio, Glanz (offene Hat) über warmem Grundton
  light: (e) => {
    const t = e.now;
    e.bell({ freq: hz('E7'), volume: 0.12, decay: 0.4 });
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => e.tone({ type: 'triangle', freq: hz(n), duration: 0.12, volume: 0.13, at: t + 0.03 + i * 0.045 }));
    e.hatOpen({ at: t + 0.05, volume: 0.1, duration: 0.5 });
    e.tone({ type: 'sine', freq: hz('C5'), duration: 0.5, volume: 0.1, attack: 0.08, release: 0.3 });
  },
  // Treibsand: dumpfes Einsinken (Tiefpass-Rauschen und Sinus fallen), drei Blubberblasen
  quicksand: (e) => {
    const t = e.now;
    e.noise({ duration: 0.7, filterFreq: 700, filterEnd: 110, volume: 0.36 });
    e.tone({ type: 'sine', freq: 220, freqEnd: 60, duration: 0.65, volume: 0.26, attack: 0.04 });
    [0.12, 0.3, 0.46].forEach((d, i) => e.pluck({ at: t + d, freq: 300 - i * 50, type: 'sine', volume: 0.16, decay: 0.06, glide: 0.5 }));
  },
  // Sandblock zerbröselt: dumpfer Schlag, dann rieselnde Rauschkörner mit sinkendem Tiefpass
  sand_crumble: (e) => {
    const t = e.now;
    e.tone({ type: 'sine', freq: 150, freqEnd: 70, duration: 0.12, volume: 0.28 });
    [0, 0.05, 0.11, 0.16, 0.24, 0.3].forEach((d, i) => e.noise({ at: t + d, duration: 0.07, filterFreq: 2200 - i * 260, volume: 0.26 - i * 0.025 }));
  },
  // Hackvogel: drei schnelle, trockene Holzschläge (Tek mit fallendem Ping)
  peck: (e) => {
    const t = e.now;
    [0, 0.055, 0.11].forEach((d, i) => e.tek({ at: t + d, freq: 1500 - i * 120, volume: 0.9 }));
  },
  // Projektilkopf abgefeuert: dumpfer Abschuss und anschwellendes Vorbeizischen
  bullet: (e) => {
    e.kick909({ volume: 0.42, pitchStart: 130, pitchEnd: 45, decay: 0.3, click: 0.5 });
    e.noise({ duration: 0.45, filterType: 'bandpass', filterFreq: 400, filterEnd: 2200, volume: 0.24 });
    e.tone({ type: 'sawtooth', freq: 90, freqEnd: 140, duration: 0.4, volume: 0.07, attack: 0.05 });
  },
  // Endgegner getroffen: Kick mit Klick, reibender Stab (kleine Sekunde), Krachen, fallender Rechteck-Ton
  boss_hit: (e) => {
    const t = e.now;
    e.kick909({ volume: 0.45, pitchStart: 220, pitchEnd: 50, decay: 0.3, click: 0.8 });
    e.stab({ notes: chord('C4', 'C#4', 'G4', 'C5'), duration: 0.22, volume: 0.13 });
    e.noise({ duration: 0.25, filterFreq: 3500, filterEnd: 300, volume: 0.24 });
    e.tone({ type: 'square', freq: 520, freqEnd: 130, duration: 0.3, volume: 0.1, at: t + 0.04 });
  },
  // Endgegner wirbelt: Sägezahn in drei Bögen auf und ab, drei Luft-Wirbel
  boss_spin: (e) => {
    const t = e.now;
    e.tone({ type: 'sawtooth', freq: 160, curve: spinCurve(160, 480, 3), duration: 0.8, volume: 0.27, attack: 0.03, release: 0.2 });
    [0, 0.27, 0.54].forEach((d) => e.noise({ at: t + d, duration: 0.26, filterType: 'bandpass', filterFreq: 700, filterEnd: 3200, volume: 0.42 }));
  },
  // Prüfungs-Haus, letzte 3 s: trockener Uhr-Tick mit kurzem hohem Piep (je Sekunde auslösen)
  house_tick: (e) => {
    e.tick({ volume: 0.6 });
    e.tone({ type: 'square', freq: hz('A6'), duration: 0.06, volume: 0.18, at: e.now + 0.005 });
  },
  // Raum geschafft: C-Dur-Stab, Rechteck-Arpeggio hinauf, Piano-Akkord mit Glockenton
  room_clear: (e) => {
    const t = e.now;
    e.stab({ notes: chord('C4', 'E4', 'G4', 'C5'), duration: 0.12, volume: 0.17 });
    ['E5', 'G5', 'C6'].forEach((n, i) => e.tone({ type: 'square', freq: hz(n), duration: 0.07, volume: 0.15, at: t + i * 0.07 }));
    e.ravePiano({ at: t + 0.21, notes: chord('C5', 'E5', 'G5', 'C6'), duration: 0.4, volume: 0.11, oscs: 1 });
    e.bell({ at: t + 0.21, freq: hz('G6'), volume: 0.14, decay: 0.35 });
  },
  // Eis-Rutschen: helles Kratzen (hohes Bandpass-Rauschen fällt), leiser Pfeifton und Eis-Glöckchen
  ice_slide: (e) => {
    e.noise({ duration: 0.45, filterType: 'bandpass', filterFreq: 6000, filterEnd: 2500, volume: 0.42 });
    e.tone({ type: 'triangle', freq: 1800, freqEnd: 1200, duration: 0.4, volume: 0.1, attack: 0.03 });
    e.bell({ freq: hz('B6'), volume: 0.1, decay: 0.25 });
  },
  // Schneeball: weiches „Poff“ (Tiefpass-Rauschen und Sinus-Plumps), Schnee rieselt (Schellen)
  snowball: (e) => {
    e.noise({ duration: 0.18, filterFreq: 1600, filterEnd: 250, volume: 0.38 });
    e.tone({ type: 'sine', freq: 190, freqEnd: 85, duration: 0.14, volume: 0.3 });
    e.jingle({ at: e.now + 0.03, volume: 0.12, duration: 0.2 });
  },
  // Spuk: „Huuu“ – zwei Theremin-Stimmen mit weitem Vibrato, gleiten von unten herein, hauchiges Rauschen
  ghost: (e) => {
    e.whistle({ freq: hz('E5'), duration: 0.75, volume: 0.17, vibrato: 70, rate: 6, slide: 5, attack: 0.12 });
    e.noise({ duration: 0.7, filterType: 'bandpass', filterFreq: 800, filterEnd: 1600, volume: 0.07 });
    e.whistle({ at: e.now + 0.1, freq: hz('B5'), duration: 0.6, volume: 0.07, vibrato: 60, rate: 5.3, slide: 7, attack: 0.15 });
  },
  // Großes Platschen: breites Bandpass-Rauschen, Gischt, tiefer Plumps, aufsteigende Blasen
  splash_big: (e) => {
    const t = e.now;
    e.noise({ duration: 0.7, filterType: 'bandpass', filterFreq: 1800, filterEnd: 350, volume: 0.42 });
    e.noise({ duration: 0.3, filterFreq: 5000, filterEnd: 1500, volume: 0.14 });
    e.tone({ type: 'sine', freq: 140, freqEnd: 50, duration: 0.3, volume: 0.28 });
    [0.15, 0.26, 0.38, 0.5].forEach((d, i) => e.pluck({ at: t + d, freq: 400 + i * 90, type: 'sine', volume: 0.1, decay: 0.05, glide: 1.8, glideTime: 0.05 }));
  },
  // Dampfpfeife: verminderter Dreiklang aus Sinus-Pfeifen, gleitet hinein, Dampf-Rauschen
  train_whistle: (e) => {
    chord('B5', 'D6', 'F6').forEach((f) => e.whistle({ freq: f, duration: 0.85, volume: 0.105, vibrato: 6, rate: 4.5, slide: 2, attack: 0.06 }));
    e.noise({ duration: 0.85, filterType: 'bandpass', filterFreq: 2500, filterEnd: 2000, volume: 0.13 });
  },
  // Piep-Block-Warnton: klarer Sinus-Piep (C6 mit Oktave) – derselbe Klang wie die Warn-Pieps in course_beep
  beep: (e) => e.bell({ freq: hz('C6'), volume: 0.38, decay: 0.09, ratio: 2, partial: 0.3 }),
  // Piep-Blöcke schalten um: höherer Piep (G6, wie in course_beep), kurzer Kipp-Sweep und Klick
  beep_switch: (e) => {
    e.bell({ freq: hz('G6'), volume: 0.31, decay: 0.12, ratio: 2, partial: 0.3 });
    e.tone({ type: 'square', freq: 400, freqEnd: 1300, duration: 0.09, volume: 0.1 });
    e.noise({ duration: 0.05, filterType: 'highpass', filterFreq: 3000, volume: 0.2 });
  },

  // ---- Kurs Welt 6 „Wolkeninseln“ (Bausteine blocks/types/w6_*.js über w6Sfx, teils auch direkt level.sfx) ----
  // Windböe: Luftstoß schwillt an und ab (drei Bandpass-Rauschwellen), ein leiser Pfeifton gleitet hinauf und zurück
  gust: (e) => {
    const t = e.now;
    e.noise({ duration: 0.45, filterType: 'bandpass', filterFreq: 450, filterEnd: 1600, volume: 0.55 });
    e.noise({ at: t + 0.1, duration: 0.55, filterType: 'bandpass', filterFreq: 900, filterEnd: 2600, volume: 0.8 });
    e.noise({ at: t + 0.3, duration: 0.5, filterType: 'bandpass', filterFreq: 2200, filterEnd: 600, volume: 0.6 });
    e.tone({ type: 'sine', freq: 520, curve: GUST_CURVE, slideTime: 0.7, duration: 0.75, volume: 0.14, attack: 0.15, release: 0.3 });
  },
  // Wind-Vorwarnung (Windlinien vor der Böe): leises Säuseln – Pfeife mit weitem Vibrato über hauchigem Rauschen
  wind: (e) => {
    e.whistle({ freq: hz('E6'), duration: 0.55, volume: 0.16, vibrato: 45, rate: 6.5, slide: 5, attack: 0.15 });
    e.noise({ duration: 0.5, filterType: 'bandpass', filterFreq: 700, filterEnd: 1500, volume: 0.55 });
  },
  // Grummeln (Quetschblock-Vorwarnung, Tempel): tiefes, wackelndes Brummen, Tiefpass-Rauschen und drei dumpfe Schläge
  rumble: (e) => {
    const t = e.now;
    e.noise({ duration: 0.6, filterFreq: 300, filterEnd: 90, volume: 0.5 });
    e.tone({ type: 'triangle', freq: 72, curve: whirrCurve(72, 58, 9, 0.55), slideTime: 0.55, duration: 0.6, volume: 0.3, attack: 0.04, release: 0.2 });
    [0, 0.15, 0.31].forEach((d, i) => e.doum({ at: t + d, freq: 74 - i * 6, volume: 0.24 - i * 0.05, decay: 0.2 }));
  },
  // Papier-Schiebetür: „Schhh“ (Bandpass-Rauschen gleitet) und am Anschlag ein hölzernes „Tok-tok“
  door: (e) => {
    const t = e.now;
    e.noise({ duration: 0.32, filterType: 'bandpass', filterFreq: 1800, filterEnd: 900, volume: 0.8 });
    e.tone({ type: 'triangle', freq: 240, freqEnd: 300, duration: 0.28, volume: 0.12, attack: 0.04 });
    e.tek({ at: t + 0.3, freq: 820, volume: 1.2 });
    e.tek({ at: t + 0.37, freq: 620, volume: 0.7 });
  },
  // Puff (Wolke verpufft / erscheint): weiches „Pfff“ mit fallendem Ton und einem Funkel-Glöckchen
  poof: (e) => {
    const t = e.now;
    e.noise({ duration: 0.3, filterFreq: 2400, filterEnd: 250, volume: 0.36 });
    e.tone({ type: 'sine', freq: 420, freqEnd: 160, duration: 0.16, volume: 0.22 });
    e.bell({ at: t + 0.04, freq: hz('A6'), volume: 0.06, decay: 0.18, ratio: 2, partial: 0.3 });
  },
  // Platschen (Floß legt ab, Sprung ins Wasser): kleiner als splash_big – Bandpass-Rauschen, Gischt, Plumps, zwei Bläschen
  splash: (e) => {
    const t = e.now;
    e.noise({ duration: 0.38, filterType: 'bandpass', filterFreq: 2600, filterEnd: 700, volume: 0.38 });
    e.noise({ duration: 0.16, filterFreq: 6000, filterEnd: 2000, volume: 0.1 });
    e.tone({ type: 'sine', freq: 220, freqEnd: 90, duration: 0.14, volume: 0.2 });
    [0.12, 0.22].forEach((d, i) => e.pluck({ at: t + d, freq: 520 + i * 140, type: 'sine', volume: 0.09, decay: 0.04, glide: 1.8, glideTime: 0.04 }));
  },
  // Anstoßen (Ball prallt ab, geht nicht): weiches „Boink“
  bump: (e) => {
    e.tone({ type: 'triangle', freq: 330, freqEnd: 190, duration: 0.1, volume: 0.26 });
    e.tone({ type: 'sine', freq: 150, freqEnd: 95, duration: 0.09, volume: 0.26 });
    e.noise({ duration: 0.035, filterFreq: 1400, volume: 0.12 });
  },
  // Etwas erscheint (Power-up, verstecktes Teil): Funkel-Lauf hinauf (Pentatonik), Glöckchen, Glitzer-Rauschen
  powerup_appear: (e) => {
    const t = e.now;
    ['G5', 'A5', 'C6', 'D6', 'E6', 'G6'].forEach((n, i) => e.tone({ type: i % 2 ? 'triangle' : 'square', freq: hz(n), duration: 0.07, volume: i % 2 ? 0.3 : 0.13, at: t + i * 0.045 }));
    e.bell({ at: t + 0.27, freq: hz('C7'), volume: 0.16, decay: 0.3, ratio: 2, partial: 0.3 });
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 1500, filterEnd: 5000, volume: 0.1 });
  },
  // Gong: tiefer, voller Metallschlag (unharmonische Teiltöne), weicher Schlegel-Anschlag
  gong: (e) => {
    e.bell({ freq: 98, volume: 0.34, decay: 0.72, ratio: 2.76, partial: 0.55 });
    e.bell({ freq: 147, volume: 0.17, decay: 0.6, ratio: 2.4, partial: 0.5 });
    e.bell({ freq: 392, volume: 0.05, decay: 0.45, ratio: 1.47, partial: 0.4 });
    e.noise({ duration: 0.12, filterType: 'bandpass', filterFreq: 900, filterEnd: 300, volume: 0.2 });
    e.kick909({ volume: 0.24, pitchStart: 120, pitchEnd: 60, decay: 0.3, click: 0.2 });
  },

  // ---- Halloween-Welt „Kürbisinsel“ (Bausteine über hwSfx; gruselig-fröhlich, nie erschreckend) ----
  // Türklingel: „Ding-Dong“
  klingel: (e) => {
    e.bell({ freq: hz('E6'), volume: 0.26, decay: 0.32, ratio: 2.76, partial: 0.35 });
    e.bell({ at: e.now + 0.26, freq: hz('C6'), volume: 0.26, decay: 0.42, ratio: 2.76, partial: 0.35 });
  },
  // Tür geht auf: knarrt (wackelnder Sägezahn), dann ein dumpfes Anschlagen
  tuer: (e) => {
    e.tone({ type: 'sawtooth', freq: 260, curve: CREAK_CURVE, slideTime: 0.5, duration: 0.55, volume: 0.11, attack: 0.05, release: 0.12 });
    e.tone({ type: 'square', freq: 520, curve: CREAK_CURVE.map((f) => f * 2), slideTime: 0.5, duration: 0.5, volume: 0.035, attack: 0.05, release: 0.1 });
    e.noise({ duration: 0.5, filterType: 'bandpass', filterFreq: 900, filterEnd: 1400, volume: 0.14 });
    e.doum({ at: e.now + 0.52, freq: 90, volume: 0.45, decay: 0.22 });
  },
  // Alle Türen geschafft: Moll-Lauf hinauf, aufgelöst in einen Dur-Akkord mit Glocke und einem kleinen Spuk-Pfiff
  alle_tueren: (e) => {
    const t = e.now;
    ['A5', 'C6', 'E6'].forEach((n, i) => e.tone({ type: 'triangle', freq: hz(n), duration: 0.09, volume: 0.25, at: t + i * 0.08 }));
    e.stab({ at: t + 0.24, notes: chord('A4', 'C#5', 'E5', 'A5'), duration: 0.3, volume: 0.17 });
    e.bell({ at: t + 0.24, freq: hz('A6'), volume: 0.18, decay: 0.4, ratio: 2, partial: 0.3 });
    e.whistle({ at: t + 0.26, freq: hz('E6'), duration: 0.4, volume: 0.06, vibrato: 50, rate: 6, slide: 3 });
  },
  // Kessel (Sprung auf den Hexenkessel): federndes „Boing“ mit Blubbern
  kessel: (e) => {
    const t = e.now;
    e.tone({ type: 'triangle', freq: 130, curve: springCurve(130, 480, 60), duration: 0.32, volume: 0.24, release: 0.12 });
    [0, 0.07, 0.15].forEach((d, i) => e.pluck({ at: t + d, freq: 260 + i * 70, type: 'sine', volume: 0.12, decay: 0.05, glide: 1.9, glideTime: 0.05 }));
    e.noise({ duration: 0.12, filterFreq: 900, filterEnd: 200, volume: 0.14 });
  },
  // Blase platzt: „Plopp“ (Sinus gleitet hinauf), heller Spritzer
  blase: (e) => {
    e.pluck({ freq: 380, type: 'sine', volume: 0.48, decay: 0.05, glide: 2.6, glideTime: 0.05 });
    e.noise({ duration: 0.04, filterType: 'highpass', filterFreq: 2500, volume: 0.24 });
    e.pluck({ at: e.now + 0.06, freq: 900, type: 'triangle', volume: 0.12, decay: 0.04 });
  },
  // Spinnennetz-Trampolin: elastisches „Twäng“
  netz: (e) => {
    e.tone({ type: 'sawtooth', freq: 110, curve: springCurve(110, 330, 40), duration: 0.3, volume: 0.085, release: 0.1 });
    e.tone({ type: 'triangle', freq: 220, curve: springCurve(220, 660, 80), duration: 0.34, volume: 0.27, release: 0.12 });
    e.noise({ duration: 0.08, filterType: 'bandpass', filterFreq: 1800, volume: 0.12 });
  },
  // Laterne an: warmes „Fwump“, Glöckchen und Dur-Lauf über einem weichen Grundton
  laterne: (e) => {
    const t = e.now;
    e.noise({ duration: 0.25, filterType: 'bandpass', filterFreq: 600, filterEnd: 2400, volume: 0.29 });
    e.bell({ at: t + 0.06, freq: hz('G6'), volume: 0.16, decay: 0.35, ratio: 2, partial: 0.35 });
    ['C6', 'E6', 'G6'].forEach((n, i) => e.tone({ type: 'triangle', freq: hz(n), duration: 0.1, volume: 0.16, at: t + 0.06 + i * 0.05 }));
    e.tone({ type: 'sine', freq: hz('C5'), duration: 0.4, volume: 0.1, attack: 0.06, release: 0.25 });
  },
  // Laterne aus: „Pfff“ und ein fallender Ton
  laterne_aus: (e) => {
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 2000, filterEnd: 400, volume: 0.42 });
    e.tone({ type: 'triangle', freq: hz('G5'), freqEnd: hz('C5'), duration: 0.3, volume: 0.26 });
  },
  // Süßigkeit: heller Dreiklang hinauf, Glanzton und ein Raschel-Schellen (Bonbonpapier)
  suessigkeit: (e) => {
    const t = e.now;
    ['E6', 'G6', 'C7'].forEach((n, i) => e.tone({ type: 'triangle', freq: hz(n), duration: 0.08, volume: 0.24, at: t + i * 0.05 }));
    e.tone({ type: 'square', freq: hz('C7'), duration: 0.05, volume: 0.06, at: t + 0.15 });
    e.jingle({ at: t + 0.1, volume: 0.17, duration: 0.16 });
  },
  // Münzregen: prasselnde Münz-Pings, Schellen, Glöckchen am Ende
  muenzregen: (e) => {
    const t = e.now;
    ['C7', 'G6', 'E7', 'C7', 'G7', 'E7'].forEach((n, i) => e.tone({ type: i % 2 ? 'triangle' : 'square', freq: hz(n), duration: 0.06, volume: i % 2 ? 0.28 : 0.12, at: t + i * 0.06 }));
    e.jingle({ at: t, volume: 0.2, duration: 0.45 });
    e.bell({ at: t + 0.38, freq: hz('C7'), volume: 0.14, decay: 0.3, ratio: 2, partial: 0.3 });
  },
  // „Buh!“ (Gespenst, Kürbling springt heraus): Hauch, dann ein tiefes, wackelndes „Uuh“, das hinabgleitet – eher drollig
  buh: (e) => {
    const t = e.now;
    e.noise({ duration: 0.08, filterType: 'bandpass', filterFreq: 600, volume: 0.28 });
    e.whistle({ at: t + 0.02, freq: hz('F4'), duration: 0.55, volume: 0.2, vibrato: 50, rate: 5.5, slide: -6, attack: 0.03 });
    e.whistle({ at: t + 0.04, freq: hz('C5'), duration: 0.5, volume: 0.07, vibrato: 40, rate: 4.7, slide: -6, attack: 0.04 });
    e.tone({ type: 'triangle', freq: 180, freqEnd: 140, duration: 0.4, volume: 0.1, attack: 0.03 });
  },
  // Grabstein-Schalter: Stein schabt und setzt dumpf auf, dazu ein kleiner Spuk-Pfiff
  grabstein: (e) => {
    const t = e.now;
    e.noise({ duration: 0.35, filterFreq: 700, filterEnd: 200, volume: 0.34 });
    e.tone({ type: 'sine', freq: 110, freqEnd: 70, duration: 0.25, volume: 0.24 });
    e.whistle({ at: t + 0.12, freq: hz('D5'), duration: 0.45, volume: 0.07, vibrato: 60, rate: 5, slide: 4, attack: 0.1 });
  },
  // Kürbis platzt: matschiges „Plopp-Platsch“ (hohe Kick, Bandpass-Rauschen), Kerne hüpfen (fallende Plucks)
  kuerbis_platzt: (e) => {
    const t = e.now;
    e.kick909({ volume: 0.39, pitchStart: 260, pitchEnd: 90, decay: 0.15, click: 0.5 });
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 1400, filterEnd: 300, volume: 0.47 });
    [0.05, 0.1, 0.16, 0.22].forEach((d, i) => e.pluck({ at: t + d, freq: 700 - i * 90, type: 'sine', volume: 0.1, decay: 0.03, glide: 0.6, glideTime: 0.03 }));
  },

  // ---- Ergänzte Kurs-Effekte: vorher stumme Aufrufe (Bestandsaufnahme tests/sfx_namen.mjs) ----
  // Siegespose (Zielmast, Arena, Haus-Raum, Rettung, Weltende): kleine Fanfare „ta-ta-ta-taa“ – drei Rechteck-Töne G–C–E,
  // dann C-Dur-Stab mit Glanzton, Piano-Akkord, Glocke und Glitzer (≈ 0,9 s; in Arena und letztem Haus-Raum läuft
  // course_clear dazu, am Zielmast und bei Rettungen die Level-Musik)
  victory: (e) => {
    const t = e.now;
    ['G5', 'C6', 'E6'].forEach((n, i) => e.tone({ type: 'square', freq: hz(n), duration: 0.075, volume: 0.12, at: t + i * 0.095 }));
    e.stab({ at: t + 0.285, notes: chord('C5', 'E5', 'G5', 'C6'), duration: 0.3, volume: 0.145 });
    e.tone({ type: 'triangle', freq: hz('G6'), duration: 0.5, volume: 0.19, release: 0.32, at: t + 0.285 });
    e.ravePiano({ at: t + 0.285, notes: chord('E6', 'G6', 'C7'), duration: 0.55, volume: 0.08, oscs: 1, cutoff: 6500, cutoffEnd: 2500 });
    e.bell({ at: t + 0.3, freq: hz('C7'), volume: 0.11, decay: 0.3, ratio: 2, partial: 0.3 });
    e.hatOpen({ at: t + 0.285, volume: 0.11, duration: 0.45 });
  },
  // Absturz (Fahrt stürzt ab, Ball fällt in den Abgrund): fallender Pfeifton mit leichtem Wackeln, Fahrtwind
  fall: (e) => {
    e.tone({ type: 'triangle', freq: FALL_CURVE[0], curve: FALL_CURVE, slideTime: 0.62, duration: 0.65, volume: 0.25, attack: 0.02, release: 0.15 });
    e.tone({ type: 'square', freq: FALL_CURVE[0] / 2, curve: FALL_CURVE.map((f) => f / 2), slideTime: 0.62, duration: 0.6, volume: 0.04, attack: 0.02, release: 0.12 });
    e.noise({ duration: 0.55, filterType: 'bandpass', filterFreq: 2200, filterEnd: 500, volume: 0.115 });
  },
  // Schub (Temposchwelle, Sprungfeld, Floß-Strömung, Welle beim Reiten): kurzer Hoover-Riser mit Rauschfeger, oben ein heller „Zing“
  boost: (e) => {
    e.riser({ freq: 200, glide: 3, duration: 0.3, volume: 0.21, noise: 0.165 });
    e.tone({ type: 'triangle', freq: 900, freqEnd: 1500, duration: 0.14, volume: 0.21, at: e.now + 0.22 });
  },
  // Rutschen/Bremsen (Kehrtwende im Lauf, Fahrzeug hält): Reiben (Bandpass-Rauschen fällt) und ein kurzes, leises Quietschen
  skid: (e) => {
    e.noise({ duration: 0.24, filterType: 'bandpass', filterFreq: 2600, filterEnd: 1100, volume: 0.66 });
    e.tone({ type: 'triangle', freq: 1500, curve: [1500, 1620, 1450, 1560, 1380, 1300], duration: 0.16, volume: 0.13, attack: 0.01 });
  },
  // Gleitblatt öffnet (einmal je Gleitflug): weiches Aufschwingen – zwei Luftzüge und ein sanfter Sinus-Bogen
  glide: (e) => {
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 500, filterEnd: 1500, volume: 0.36 });
    e.noise({ at: e.now + 0.1, duration: 0.35, filterType: 'bandpass', filterFreq: 1200, filterEnd: 700, volume: 0.23 });
    e.tone({ type: 'sine', freq: hz('E5'), freqEnd: hz('B5'), duration: 0.42, volume: 0.18, attack: 0.08, release: 0.2 });
  },
  // An der Wand rutschen (Beginn des Wandrutschens): leises Reiben und ein dumpfer Kontakt
  wallslide: (e) => {
    e.noise({ duration: 0.34, filterType: 'bandpass', filterFreq: 1100, filterEnd: 600, volume: 0.47 });
    e.tone({ type: 'sine', freq: 180, freqEnd: 120, duration: 0.07, volume: 0.29 });
  },
  // Schwimmzug (je Zug): weiches Wasser-Rauschen und ein Blubber-Bläschen
  swim: (e) => {
    e.noise({ duration: 0.2, filterType: 'bandpass', filterFreq: 900, filterEnd: 1800, volume: 0.88 });
    e.pluck({ at: e.now + 0.05, freq: 330, type: 'sine', volume: 0.35, decay: 0.05, glide: 1.8, glideTime: 0.05 });
  },
  // Zaun/Gitter greifen (Klettern am Zaun, Hangeln am Deckengitter): metallisches Klirren mit kurzem Nachklirren
  fence: (e) => {
    const t = e.now;
    e.tek({ freq: 1300, volume: 1.05 });
    e.bell({ at: t + 0.01, freq: 1650, volume: 0.12, decay: 0.12, ratio: 2.76, partial: 0.5 });
    e.tek({ at: t + 0.06, freq: 1700, volume: 0.6 });
  },
  // Trapez-Stange greifen: festes „Tapp“ (Hand an der Stange) mit kleinem Holz-Klick
  grab: (e) => {
    e.doum({ freq: 160, volume: 0.37, decay: 0.12 });
    e.tek({ freq: 900, volume: 0.58 });
  },
  // Trapez-Schwung (gleich nach dem Greifen): Luftbogen – Rauschen schwillt hinauf und hinab, ein Dreieck folgt dem Bogen
  swing: (e) => {
    const t = e.now;
    e.noise({ at: t + 0.04, duration: 0.3, filterType: 'bandpass', filterFreq: 450, filterEnd: 1500, volume: 0.54 });
    e.noise({ at: t + 0.25, duration: 0.3, filterType: 'bandpass', filterFreq: 1500, filterEnd: 450, volume: 0.4 });
    e.tone({ type: 'triangle', freq: SWING_CURVE[0], curve: SWING_CURVE, slideTime: 0.55, duration: 0.58, volume: 0.22, attack: 0.08, release: 0.2, at: t + 0.04 });
  },
  // Gegner hüpft (Hüpfmaus springt mit, Münzmarder, Werfer): kleines, helles „Hüpf“ – leiser als der Sprung der Figuren
  hop: (e) => {
    e.pluck({ freq: 420, type: 'triangle', volume: 0.4, decay: 0.07, glide: 1.7, glideTime: 0.07 });
    e.pluck({ freq: 840, type: 'square', volume: 0.06, decay: 0.05, glide: 1.6, glideTime: 0.05 });
  },
  // Vorstoß (Fisch nimmt Anlauf und rammt): Luftzug schwillt an, „Zoom“-Ton hinauf
  dash: (e) => {
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 500, filterEnd: 2800, volume: 0.54 });
    e.tone({ type: 'triangle', freq: 380, freqEnd: 1300, duration: 0.2, volume: 0.27 });
    e.tone({ type: 'sawtooth', freq: 190, freqEnd: 650, duration: 0.18, volume: 0.067 });
  },
  // Kick (Rollpilz angestoßen, rollender Pilz trifft): kurzes, hohles „Dock“ mit Klick
  kick: (e) => {
    e.kick909({ volume: 0.35, pitchStart: 320, pitchEnd: 130, decay: 0.1, click: 0.6 });
    e.tek({ freq: 950, volume: 0.5 });
    e.tone({ type: 'square', freq: 700, freqEnd: 420, duration: 0.05, volume: 0.077 });
  },
  // Schwindelig (Boss besiegt, Wirbelbrocken taumelt): kreisende Vöglein – trillernder Pfeifton zweimal auf und ab,
  // dazu drei Sternchen-Glöckchen
  dizzy: (e) => {
    const t = e.now;
    e.tone({ type: 'triangle', freq: DIZZY_CURVE[0], curve: DIZZY_CURVE, slideTime: 0.85, duration: 0.88, volume: 0.22, attack: 0.03, release: 0.2 });
    ['E7', 'C7', 'G6'].forEach((n, i) => e.bell({ at: t + 0.08 + i * 0.28, freq: hz(n), volume: 0.1, decay: 0.14, ratio: 2, partial: 0.3 }));
  },
  // Bumerang-Wurf: surrend – vier Luft-Wirbel kommen und gehen, darunter ein wackelnder Schwirr-Ton
  boomerang: (e) => {
    const t = e.now;
    [0, 0.12, 0.24, 0.36].forEach((d, i) => e.noise({ at: t + d, duration: 0.11, filterType: 'bandpass', filterFreq: 1100 + i * 120, filterEnd: 700, volume: 0.95 - i * 0.16 }));
    e.tone({ type: 'triangle', freq: 520, curve: whirrCurve(520, 680, 8.5, 0.5), slideTime: 0.5, duration: 0.5, volume: 0.24, attack: 0.03, release: 0.18 });
  },
  // Graben (Schlangenkönig taucht auf / gräbt sich ein): dumpfes Erd-Rumpeln, tiefer Plumps, drei Brocken poltern
  dig: (e) => {
    const t = e.now;
    e.noise({ duration: 0.5, filterFreq: 800, filterEnd: 120, volume: 0.63 });
    e.doum({ freq: 70, volume: 0.45, decay: 0.3 });
    [0.1, 0.2, 0.32].forEach((d, i) => e.noise({ at: t + d, duration: 0.07, filterFreq: 1800 - i * 300, volume: 0.31 - i * 0.056 }));
  },
  // Wurf (Schlangenkönig wirft einen Felsbrocken): kurzer Schwung-Ansatz, dann Wurf-Luftzug
  throw: (e) => {
    e.tone({ type: 'triangle', freq: 260, freqEnd: 180, duration: 0.06, volume: 0.37 });
    e.noise({ at: e.now + 0.03, duration: 0.28, filterType: 'bandpass', filterFreq: 700, filterEnd: 2400, volume: 0.65 });
    e.tone({ type: 'sine', freq: 300, freqEnd: 700, duration: 0.22, volume: 0.18, at: e.now + 0.04 });
  },
  // Zündschnur (Kanonenturm/Riesenprojektil lädt): Zischen (Bandpass-Rauschen um 5 kHz, sinkt leicht) mit knisternden Funken
  fuse: (e) => {
    const t = e.now;
    e.noise({ duration: 0.75, filterType: 'bandpass', filterFreq: 5200, filterEnd: 3800, volume: 0.42 });
    [0.05, 0.17, 0.26, 0.41, 0.55].forEach((d, i) => e.tick({ at: t + d, freq: 3200 - i * 250, volume: 0.075, decay: 0.012 }));
  },
  // Verbrennen/Lava (Gegner fällt in die Lava, Lava speit Brocken): Zischen „Pschhh“, dumpfes „Fwump“, zwei Lava-Blasen
  burn: (e) => {
    const t = e.now;
    e.noise({ duration: 0.45, filterType: 'bandpass', filterFreq: 3500, filterEnd: 900, volume: 0.36 });
    e.tone({ type: 'sine', freq: 170, freqEnd: 65, duration: 0.16, volume: 0.22 });
    [0.14, 0.27].forEach((d, i) => e.pluck({ at: t + d, freq: 200 + i * 60, type: 'sine', volume: 0.1, decay: 0.05, glide: 1.7, glideTime: 0.05 }));
  },
  // Kettenrasseln (Schleuse/Lift fährt an, Kronleuchter fällt): Schellen-Rasseln und fünf metallisch klirrende Glieder
  chain: (e) => {
    const t = e.now;
    e.jingle({ volume: 0.26, duration: 0.28 });
    [[0, 2300], [0.05, 1900], [0.09, 2600], [0.15, 2100], [0.2, 1800]].forEach(([d, f], i) =>
      e.bell({ at: t + d, freq: f, volume: 0.25 - i * 0.03, decay: 0.06, ratio: 2.76, partial: 0.6 }));
  },
  // Entdeckt! (Schleich-Level, Suchlicht): kindgerechter Alarm – heller Glockenschlag, dann zweimal „dü-da“ (Dreieck, mittlere Lage)
  alarm: (e) => {
    const t = e.now;
    e.bell({ freq: hz('E6'), volume: 0.18, decay: 0.2, ratio: 2, partial: 0.3 });
    [0, 0.22].forEach((d) => {
      e.tone({ type: 'triangle', freq: hz('B5'), duration: 0.1, volume: 0.3, at: t + 0.06 + d });
      e.tone({ type: 'square', freq: hz('B4'), duration: 0.1, volume: 0.046, at: t + 0.06 + d });
      e.tone({ type: 'triangle', freq: hz('E5'), duration: 0.11, volume: 0.3, at: t + 0.16 + d });
    });
  },
  // Umklappen (Farbfelder wechseln die Farbe): „Wupp“ hinauf und ein Klack
  flip: (e) => {
    e.tone({ type: 'triangle', freq: 380, freqEnd: 950, duration: 0.09, volume: 0.32 });
    e.noise({ duration: 0.08, filterType: 'bandpass', filterFreq: 1200, filterEnd: 3200, volume: 0.32 });
    e.tek({ at: e.now + 0.08, freq: 1150, volume: 0.88 });
  },
  // Donut-Block wackelt los (beginnt zu fallen): wackelnder, sinkender Ton und leises Rappeln
  donut: (e) => {
    e.tone({ type: 'triangle', freq: DONUT_CURVE[0], curve: DONUT_CURVE, slideTime: 0.42, duration: 0.45, volume: 0.25, attack: 0.01, release: 0.12 });
    e.noise({ duration: 0.3, filterType: 'bandpass', filterFreq: 700, filterEnd: 400, volume: 0.2 });
  },
  // Pfiff des Schaffners („Abfahrt!“): Trillerpfeife – kurz, dann lang, schnelles Trillern, Atem-Rauschen
  pfiff: (e) => {
    e.whistle({ freq: 1760, duration: 0.14, volume: 0.16, vibrato: 70, rate: 28, slide: 1, attack: 0.01 });
    e.whistle({ at: e.now + 0.19, freq: 1760, duration: 0.5, volume: 0.16, vibrato: 70, rate: 28, slide: 1, attack: 0.01 });
    e.noise({ duration: 0.7, filterType: 'bandpass', filterFreq: 2600, filterEnd: 2200, volume: 0.095 });
  },
};

/** Tastenstein-Töne note0 … note7 (blocks/types/w2_space.js, Ton-Index note % 8): C-Dur-Pentatonik – jede Folge klingt. */
const STONE_NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
STONE_NOTES.forEach((n, i) => {
  // Glockenspiel/Marimba: Grundton mit Teilton im Verhältnis 4 (Marimba-Stab), heller Anschlag eine Oktave höher
  SFX[`note${i}`] = (e) => {
    e.bell({ freq: hz(n), volume: 0.33 - i * 0.006, decay: 0.3, ratio: 4, partial: 0.25 });
    e.pluck({ freq: hz(n) * 2, type: 'triangle', volume: 0.1 - i * 0.002, decay: 0.04 });
  };
});

/** Effekt-Namen für Welt 2–4 (Kurs-Vertrag, Abschnitt Audio). */
export const WORLD_SFX = ['clone', 'clone_lost', 'helm_on', 'helm_off', 'cannon', 'propeller', 'light', 'quicksand',
  'sand_crumble', 'peck', 'bullet', 'boss_hit', 'boss_spin', 'house_tick', 'room_clear', 'ice_slide', 'snowball', 'ghost',
  'splash_big', 'train_whistle', 'beep', 'beep_switch'];

/** Effekt-Namen der Welt 6 „Wolkeninseln“ (Bausteine über w6Sfx in blocks/w6kit.js; einige rufen Level-Bausteine direkt). */
export const W6_SFX = ['gust', 'wind', 'rumble', 'door', 'poof', 'splash', 'bump', 'powerup_appear', 'gong'];

/** Effekt-Namen der Halloween-Welt „Kürbisinsel“ (Bausteine über hwSfx in blocks/hwkit.js). */
export const HW_SFX = ['klingel', 'tuer', 'alle_tueren', 'kessel', 'blase', 'netz', 'laterne', 'laterne_aus', 'suessigkeit',
  'muenzregen', 'buh', 'grabstein', 'kuerbis_platzt'];

/** Effekt-Namen aus dem Kurs-Vertrag (docs/KURS-ARCHITEKTUR.md). */
export const COURSE_SFX = ['jump', 'jump2', 'jump3', 'backflip', 'longjump', 'walljump', 'groundpound', 'slide', 'land',
  'coin', 'star', 'stamp', 'powerup', 'powerdown', 'oneup', 'blockhit', 'brickbreak', 'pipe', 'checkpoint', 'goalpole',
  'timewarn', 'claw', 'fireball', 'stomp', 'hurt', 'die', 'switch', 'bounce'];

/**
 * Ergänzte Kurs-Effekte für vorher stumme Aufrufe (Bestandsaufnahme tests/sfx_namen.mjs): Figur (skid, glide, wallslide,
 * swim, fence, grab, swing, victory), Fahrt/Bausteine (fall, boost, chain, alarm, flip, donut, pfiff, note0–note7),
 * Gegner (hop, dash, kick, dizzy, boomerang, dig, throw, fuse, burn).
 */
export const MORE_SFX = ['victory', 'fall', 'boost', 'skid', 'glide', 'wallslide', 'swim', 'fence', 'grab', 'swing', 'hop',
  'dash', 'kick', 'dizzy', 'boomerang', 'dig', 'throw', 'fuse', 'burn', 'chain', 'alarm', 'flip', 'donut', 'pfiff',
  ...STONE_NOTES.map((_, i) => `note${i}`)];

/** Alle Effekt-Namen. */
export const SFX_NAMES = Object.keys(SFX);

/**
 * Drosselung: Mindestabstand (s) zwischen zwei Auslösungen desselben Effekts; dichtere Aufrufe bleiben stumm. Für Klänge,
 * die im Spiel schnell hintereinander kommen (Schwimmzüge, Wandrutschen, mehrere Gegner hüpfen zugleich, Schleusen-Ketten,
 * Lava-Spucker …). Alle übrigen Effekte: SFX_GAP_DEFAULT – derselbe Effekt mehrfach im selben Bild (mehrere Münzen,
 * Gegner, Blöcke gleichzeitig) klingt nur einmal statt übereinander lauter zu werden.
 */
export const SFX_GAP = {
  swim: 0.2, wallslide: 0.35, skid: 0.3, glide: 0.3, hop: 0.15, chain: 0.5, burn: 0.3, fence: 0.25, kick: 0.08,
  donut: 0.12, flip: 0.15, alarm: 0.6, boost: 0.25, fall: 0.5, dizzy: 0.5, boomerang: 0.2, dig: 0.3, throw: 0.15,
  dash: 0.2, fuse: 0.3, grab: 0.15, swing: 0.3, pfiff: 1, victory: 1,
};
export const SFX_GAP_DEFAULT = 0.03;
const lastPlayed = Object.create(null);

/** Sicht auf die Stimmen mit fester Startzeit (alle Teile eines Effekts beziehen sich auf dieselbe Zeit). */
const at = (voices, t) => Object.create(voices, { now: { value: t } });

/** Spielt einen Effekt ab (leise ignoriert, wenn Audio noch nicht freigeschaltet ist, der Name unbekannt ist oder derselbe
 * Effekt gerade erst lief – siehe SFX_GAP). */
export function sfx(name) {
  if (typeof name !== 'string' || !has(SFX, name) || !engine.ready) return;
  const t = engine.now;
  const gap = has(SFX_GAP, name) ? SFX_GAP[name] : SFX_GAP_DEFAULT;
  if (has(lastPlayed, name) && t - lastPlayed[name] < gap && t >= lastPlayed[name]) return;
  lastPlayed[name] = t;
  try { SFX[name](at(engine.voices, t)); } catch (_) { /* nie das Spiel stören */ }
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
