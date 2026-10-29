// Step-Sequencer mit Vorausplanung (Lookahead), spielt die Themen aus themes.js – und die Taktuhr der Musik.
//
// Spuren eines Themas (jede darf fehlen oder leer sein): lead (Hoover), stabs, piano, pad, bass,
// organ (Rechteck-Orgel), arp (Pluck-Arpeggio), echo (leise Verzögerungs-Noten), riser (Hoover-Riser),
// bell (Glocke/Glockenspiel/Piep), whistle (Pfeife/Theremin), energy (Energie-Ebene beim Reiten) und drums.
// Tonale Spuren sind Takt-Strings aus Token "Note:Dauer" (Dauer in Sechzehnteln), Akkorde mit "+" verkettet
// ("C4+Eb4+G4:2"), "-" = Pause. Drums: je Takt ein String mit 16 Zeichen oder ein Array solcher Ebenen (Kick
// und Hat gleichzeitig): k Kick, c Clap, s Snare, h Hat geschlossen, o Hat offen, r Crash, t Tom (Fill: fällt
// je Schlag), d Darbuka-Doum (tief), p Darbuka-Tek (hell), x Uhr-Tick (Tick/Tack im Wechsel), j Schellen,
// "." nichts.
//
// Klangfarbe je Thema (alles optional, ohne Angabe klingen die Stimmen wie bisher):
//   voice: { spur: {Optionen der Stimme} }   z.B. { lead: { cutoff: 1400, voices: 3 }, arp: { type: 'triangle' } }
//   kit:   { kick|clap|snare|hat|open|crash|tom|doum|tek|tick|jingle: {Optionen} }   z.B. { kick: { pitchStart: 115 } }
//   fx:    { lowpass: { spur: Hz }, delay: { steps, feedback, lowpass, wet, send: { spur: Anteil } } }
//          (siehe createThemeBus in AudioEngine.js)
//   sync:  { switchEvery, warnBeats } – Spiel-Takt (z.B. Piep-Blöcke): Umschalten alle `switchEvery`
//          Zählzeiten, die letzten `warnBeats` davor piept es (themeInfo(name).sync)
//
// Die Drums laufen im Level immer. `setDrums(on)` blendet die Energie-Ebene ein/aus (Pflaume):
// Lead-Doppelung eine Oktave höher plus die `energy`-Spur (Offbeat-Stabs).
//
// Taktuhr: `music.beat()` → { bpm, beat, bar, phase, playing, … } und `music.onBeat(fn)` → Abmelden-Funktion,
// synchron zur hörbaren Musik (Ausgabelatenz berücksichtigt). Ohne Freischaltung des AudioContext (oder wenn er
// angehalten ist) läuft eine Ersatzuhr mit dem Tempo des angeforderten Themas über performance.now(); bei der
// Freischaltung steigt die Musik im Takt dieser Uhr ein (die Zählzeit springt nicht). Stummschalten ändert nichts
// an der Uhr. Testhaken: `setManualClock(true)` + `advanceClock(s)` (virtuelle, deterministische Zeit).
//
// Der Sequencer ist in Kontext und Zeitbasis parametrisierbar: im Spiel läuft er auf dem
// Live-Kontext, `renderTheme()` schreibt ein Thema über einen OfflineAudioContext in einen Puffer.
//
// Klang-Varianten (Remix-Welten): `music.play(name, { variant })` bzw. `music.play({ theme, variant })` mit `variant` aus
// VARIANT_NAMES (nacht, abend, morgen, tag, dunkel, schnell, schwarzweiss; MUSIC_VARIANTS in AudioEngine.js) – dieselbe
// Komposition mit anderer Klangbearbeitung bzw. Tempo (`schnell` +8 %, die Taktuhr läuft mit). Ohne (oder mit unbekannter)
// Variante entsteht genau der bisherige Klang ohne zusätzliche Knoten. `music.variant` = Variante des laufenden bzw.
// vorgemerkten Themas (sonst null); ein Wechsel nur der Variante startet das Thema neu (Zählzeit beginnt bei 0).

import {
  engine, Voices, createMusicChain, createThemeBus, releaseThemeBus, MUSIC_LEVEL,
  MUSIC_VARIANTS, VARIANT_NAMES, variantHasChain, createVariantChain, releaseVariantChain,
} from './AudioEngine.js';
import { THEMES } from './themes.js';

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEPS_PER_BAR = 16;
const MAX_OSC_PER_STEP = 10; // Polyphonie-Budget je Sechzehntel (Handy-CPU)
const TONAL_TRACKS = ['lead', 'energy', 'stabs', 'piano', 'pad', 'bass', 'organ', 'arp', 'echo', 'riser', 'bell', 'whistle'];
const DRUM_KINDS = 'kcshortdpxj';
const KIT_PARTS = ['kick', 'clap', 'snare', 'hat', 'open', 'crash', 'tom', 'doum', 'tek', 'tick', 'jingle'];
const BEATS_PER_BAR = 4;
const MAX_CATCHUP = 8;     // Zählzeiten, die onBeat nach einer Pause (Hintergrund-Tab) höchstens nachholt
const BEAT_GRACE = 0.012;  // s: wer sich so kurz nach einer Zählzeit anmeldet, bekommt sie noch
/** Sekunden der Echtzeit-Uhr (performance.now; Date als Rückfall). */
const perfSeconds = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000;
/** Gibt es das Thema? (eigene Eigenschaft – "toString" & Co. sind keine Themen; ohne Object.hasOwn für ältere Safari) */
const isTheme = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(THEMES, name);
/** Klang-Variante normalisieren: bekannter Name (auch „Schwarz-Weiß“) → Name, sonst null (= ohne Variante). */
export function variantOf(v) {
  if (typeof v !== 'string') return null;
  const k = v.trim().toLowerCase().replace(/ß/g, 'ss').replace(/[-_\s]/g, '');
  return Object.prototype.hasOwnProperty.call(MUSIC_VARIANTS, k) ? k : null;
}
/** Schlagzeug-Teil → Bus-Name (offene und geschlossene Hats teilen sich einen Bus). */
const DRUM_BUS = { k: 'kick', c: 'clap', s: 'snare', h: 'hat', o: 'hat', r: 'crash', t: 'tom', d: 'doum', p: 'tek', x: 'tick', j: 'jingle' };

/** "Bb4" → MIDI-Nummer (null bei ungültigem Namen). */
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  const n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}
export const freqOf = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Tonale Spur → Events {step, dur, notes:[midi...]}; meldet Takte, die nicht 16 Sechzehntel lang sind. */
export function parseTrack(bars, where = 'Spur', report = () => {}) {
  const events = [];
  let step = 0;
  bars.forEach((bar, i) => {
    let inBar = 0;
    for (const tok of bar.trim().split(/\s+/)) {
      if (!tok) continue;
      const m = /^([^:]+):(\d+)$/.exec(tok);
      if (!m) { report(`${where}, Takt ${i + 1}: ungültiges Token "${tok}"`); continue; }
      const dur = parseInt(m[2], 10);
      if (m[1] !== '-') {
        const notes = m[1].split('+').map(midi);
        if (notes.some((n) => n === null)) report(`${where}, Takt ${i + 1}: unbekannte Note in "${tok}"`);
        else events.push({ step, dur, notes });
      }
      step += dur;
      inBar += dur;
    }
    if (inBar !== STEPS_PER_BAR) report(`${where}, Takt ${i + 1}: ${inBar} statt ${STEPS_PER_BAR} Sechzehntel`);
  });
  return { events, length: step };
}

/**
 * Trommelspur → Events {step, kind, run, off, nth}; run = Zahl direkt vorangehender gleicher Schläge (Wirbel),
 * off = ungerades Sechzehntel, nth = laufende Nummer dieses Zeichens in seiner Ebene und seinem Takt (Tick/Tack).
 */
export function parseDrums(bars, where = 'drums', report = () => {}) {
  const events = [];
  bars.forEach((bar, i) => {
    const layers = Array.isArray(bar) ? bar : [bar];
    for (const layer of layers) {
      if (layer.length !== STEPS_PER_BAR) report(`${where}, Takt ${i + 1}: Ebene "${layer}" hat ${layer.length} statt ${STEPS_PER_BAR} Zeichen`);
      let run = 0;
      const nth = {};
      for (let s = 0; s < layer.length; s++) {
        const ch = layer[s];
        if (ch === '.') { run = 0; continue; }
        if (!DRUM_KINDS.includes(ch)) { report(`${where}, Takt ${i + 1}: unbekanntes Zeichen "${ch}"`); run = 0; continue; }
        run = s > 0 && layer[s - 1] === ch ? run + 1 : 0;
        nth[ch] = (nth[ch] ?? -1) + 1;
        events.push({ step: i * STEPS_PER_BAR + s, kind: ch, run, off: s % 2 === 1, nth: nth[ch] });
      }
    }
  });
  return { events, length: bars.length * STEPS_PER_BAR };
}

/**
 * Thema in spielbare Form bringen: Spuren parsen, Längen prüfen, Events nach Schritt indizieren.
 * Fehler (ungleich lange Spuren, krumme Takte, unbekannte Noten) werden über `report` gemeldet.
 */
export function compileTheme(name, theme, report = (msg) => console.error(`[Musik] ${name}: ${msg}`)) {
  const tracks = {};
  for (const k of TONAL_TRACKS) tracks[k] = parseTrack(theme[k] ?? [], k, report);
  tracks.drums = parseDrums(theme.drums ?? [], 'drums', report);
  const lengths = Object.entries(tracks).filter(([, t]) => t.length > 0);
  const length = lengths.reduce((m, [, t]) => Math.max(m, t.length), 0);
  const odd = lengths.filter(([, t]) => t.length !== length);
  if (odd.length) report(`Spuren unterschiedlich lang: ${odd.map(([k, t]) => `${k}=${t.length}`).join(', ')} (erwartet ${length})`);
  if (length === 0) report('leeres Thema');
  if (!(theme.bpm > 30 && theme.bpm < 240)) report(`unplausibles Tempo ${theme.bpm}`);
  // Klangfarben-Angaben: nur bekannte Spuren/Schlagzeug-Teile (Tippfehler fielen sonst still unter den Tisch)
  const busNames = [...TONAL_TRACKS, ...KIT_PARTS];
  for (const k of Object.keys(theme.voice ?? {})) if (!TONAL_TRACKS.includes(k)) report(`voice: unbekannte Spur "${k}"`);
  for (const k of Object.keys(theme.kit ?? {})) if (!KIT_PARTS.includes(k)) report(`kit: unbekannter Teil "${k}"`);
  for (const k of Object.keys(theme.fx?.lowpass ?? {})) if (!busNames.includes(k)) report(`fx.lowpass: unbekannte Spur "${k}"`);
  for (const k of Object.keys(theme.fx?.delay?.send ?? {})) if (!busNames.includes(k)) report(`fx.delay.send: unbekannte Spur "${k}"`);
  if (theme.sync) {
    const { switchEvery: ev, warnBeats: wb } = theme.sync;
    if (!(Number.isInteger(ev) && ev > 0 && Number.isInteger(wb) && wb >= 0 && wb < ev)) report(`sync: unplausibel (switchEvery ${ev}, warnBeats ${wb})`);
    else if (length && (length / 4) % ev !== 0) report(`sync: Loop (${length / 4} Zählzeiten) ist kein Vielfaches von switchEvery ${ev}`);
  }
  // Index: Schritt → Events je Spur
  const byStep = new Array(length);
  for (let s = 0; s < length; s++) byStep[s] = {};
  for (const [k, t] of Object.entries(tracks)) {
    for (const ev of t.events) {
      if (ev.step >= length) continue;
      (byStep[ev.step][k] ??= []).push(ev);
    }
  }
  return {
    name,
    bpm: theme.bpm,
    loop: theme.loop !== false,
    length,
    bars: length / STEPS_PER_BAR,
    stepDur: 60 / theme.bpm / 4,
    energyDouble: theme.energyDouble ?? 0, // Lead-Doppelung in der Energie-Ebene (Oktaven)
    voice: theme.voice ?? {},              // Stimmen-Optionen je Spur
    kit: theme.kit ?? {},                  // Schlagzeug-Optionen je Teil
    fx: theme.fx ?? null,                  // dauerhafte Effekt-Busse (Tiefpass, Echo/Hall)
    sync: theme.sync ?? null,              // Spiel-Takt (Piep-Blöcke): { switchEvery, warnBeats }
    tracks,
    byStep,
  };
}

/**
 * Kompiliertes Thema mit Klang-Variante: Tempo-Faktor (Schrittdauer, Echo-Längen und Taktuhr folgen), Echo/Hall des
 * Themas skaliert (fx-Faktoren), `variant` gesetzt. Unbekannte Variante → unverändert.
 */
export function applyVariant(theme, name) {
  const v = MUSIC_VARIANTS[name];
  if (!v) return theme;
  const bpm = theme.bpm * (v.tempo ?? 1);
  let fx = theme.fx;
  if (v.fx && fx?.delay) fx = { ...fx, delay: { ...fx.delay, wet: (fx.delay.wet ?? 0.5) * (v.fx.wet ?? 1), feedback: (fx.delay.feedback ?? 0.4) * (v.fx.feedback ?? 1) } };
  return { ...theme, bpm, baseBpm: theme.bpm, stepDur: 60 / bpm / 4, fx, variant: name };
}

/**
 * Knoten zwischen Stimmen und `dest` für ein Thema: Effekt-Busse des Themas, mit Variante davor deren Klangkette.
 * Ohne Variante (oder Variante nur mit Tempo) genau wie bisher: createThemeBus direkt auf `dest`, `energyGain` (falls
 * übergeben) vorher an `dest`.
 * @returns {{ fx, chain, buses, input, extra, nodes: number }} input = Ziel der Stimmen (Sequencer-dest)
 */
export function themeGraph(ctx, theme, dest, energyGain = null) {
  if (!theme.variant || !variantHasChain(theme.variant)) {
    if (energyGain) energyGain.connect(dest);
    const fx = createThemeBus(ctx, theme.fx, theme.stepDur, dest);
    return { fx, chain: null, buses: fx.buses, input: dest, extra: null, nodes: fx.nodes.length };
  }
  const chain = createVariantChain(ctx, theme.variant, dest);
  if (energyGain) energyGain.connect(chain.input);
  const fx = createThemeBus(ctx, theme.fx, theme.stepDur, chain.input, chain.destOf);
  const buses = chain.wire(fx.buses);
  return { fx, chain, buses, input: chain.input, extra: chain.extra, nodes: fx.nodes.length + chain.nodes.length };
}

/**
 * Spielt ein kompiliertes Thema Schritt für Schritt über die übergebenen Stimmen.
 * Zeitbasis und Kontext kommen von außen (Live oder Offline).
 */
export class Sequencer {
  constructor({ voices, dest, energyGain, theme, startTime, energy = false, buses = {}, step = 0, extra = null }) {
    this.voices = voices;
    this.dest = dest;
    this.energyGain = energyGain;
    this.theme = theme;
    this.step = step; // Einstieg mitten im Stück (Taktuhr: Freischaltung im Takt der Ersatzuhr)
    this.time = startTime;
    this.energy = energy;
    this.buses = buses; // Spur → Effekt-Bus (createThemeBus); fehlende Spuren gehen direkt auf dest
    this.extra = extra; // Zusätze je Schritt (Klang-Variante, z.B. Vogel-Zwitschern): extra(step, t, voices) → Oszillatoren
  }

  /** Plant alle Schritte bis zur Kontextzeit `until`. Liefert false, wenn das Stück zu Ende ist (kein Loop). */
  advance(until) {
    const th = this.theme;
    if (th.length === 0) return false;
    while (this.time < until) {
      this.playStep(this.step, this.time);
      this.step++;
      this.time += th.stepDur;
      if (this.step >= th.length) {
        if (!th.loop) return false;
        this.step = 0;
      }
    }
    return true;
  }

  playStep(step, t) {
    const v = this.voices, th = this.theme, sd = th.stepDur;
    const at = th.byStep[step];
    const vo = th.voice, kit = th.kit;
    const out = (name) => this.buses[name] ?? this.dest;
    let oscs = 0;
    // Polyphonie-Budget: volle Besetzung, wenn sie ins Budget passt, sonst die schlanke
    const fit = (want, lean) => (oscs + want <= MAX_OSC_PER_STEP ? want : lean);
    const perNote = (notes) => (oscs + notes.length * 2 <= MAX_OSC_PER_STEP ? 2 : 1); // Oszillatoren je Akkordton

    for (const ev of at.drums ?? []) {
      const bus = out(DRUM_BUS[ev.kind]);
      if (ev.kind === 'k') oscs += v.kick909({ ...kit.kick, at: t, bus });
      else if (ev.kind === 'c') v.clap({ ...kit.clap, at: t, bus });
      else if (ev.kind === 's') oscs += v.snare({ at: t, bus, volume: (kit.snare?.volume ?? 0.28) * Math.min(2, 1 + ev.run * 0.12) }); // Wirbel schwillt an
      else if (ev.kind === 'h') v.hatClosed({ at: t, bus, volume: ev.off ? (kit.hat?.off ?? 0.18) : (kit.hat?.volume ?? 0.3) });
      else if (ev.kind === 'o') v.hatOpen({ ...kit.open, at: t, bus });
      else if (ev.kind === 'r') v.crash({ ...kit.crash, at: t, bus });
      else if (ev.kind === 't') oscs += v.tom({ ...kit.tom, at: t, bus, freq: (kit.tom?.freq ?? 190) * Math.pow(0.84, ev.run % 4) }); // Fill fällt
      else if (ev.kind === 'd') oscs += v.doum({ ...kit.doum, at: t, bus });
      else if (ev.kind === 'p') oscs += v.tek({ ...kit.tek, at: t, bus, volume: (kit.tek?.volume ?? 0.24) * (ev.off ? (kit.tek?.off ?? 0.7) : 1) }); // Zwischenschläge leiser
      else if (ev.kind === 'x') oscs += v.tick({ ...kit.tick, at: t, bus, tock: ev.nth % 2 === 1 });
      else if (ev.kind === 'j') v.jingle({ ...kit.jingle, at: t, bus, volume: ev.off ? (kit.jingle?.off ?? 0.12) : (kit.jingle?.volume ?? 0.2) });
    }
    for (const ev of at.bass ?? []) oscs += v.bass({ ...vo.bass, at: t, bus: out('bass'), freq: freqOf(ev.notes[0]), duration: ev.dur * sd * 0.7 });
    for (const ev of at.lead ?? []) {
      const f = freqOf(ev.notes[0]), dur = ev.dur * sd * 0.95;
      oscs += v.hoover({ ...vo.lead, at: t, bus: out('lead'), freq: f, duration: dur, voices: fit(vo.lead?.voices ?? 5, 3) });
      if (this.energy && th.energyDouble) {
        oscs += v.hoover({ at: t, bus: this.energyGain, freq: f * Math.pow(2, th.energyDouble), duration: dur, voices: 3, volume: 0.06, cutoff: 4500 });
      }
    }
    for (const ev of at.stabs ?? []) oscs += v.stab({ ...vo.stabs, at: t, bus: out('stabs'), notes: ev.notes.map(freqOf), duration: ev.dur * sd });
    for (const ev of at.piano ?? []) oscs += v.ravePiano({ ...vo.piano, at: t, bus: out('piano'), notes: ev.notes.map(freqOf), duration: ev.dur * sd, oscs: Math.min(vo.piano?.oscs ?? 2, perNote(ev.notes)) });
    for (const ev of at.pad ?? []) oscs += v.pad({ ...vo.pad, at: t, bus: out('pad'), notes: ev.notes.map(freqOf), duration: ev.dur * sd, oscs: Math.min(vo.pad?.oscs ?? 2, perNote(ev.notes)) });
    for (const ev of at.organ ?? []) oscs += v.organ({ ...vo.organ, at: t, bus: out('organ'), notes: ev.notes.map(freqOf), duration: ev.dur * sd * (vo.organ?.gate ?? 0.85), octave: perNote(ev.notes) === 2 && vo.organ?.octave !== false });
    for (const k of ['arp', 'echo']) {
      for (const ev of at[k] ?? []) {
        for (const n of ev.notes) oscs += v.pluck({ ...(k === 'echo' ? { volume: 0.035, type: 'triangle' } : null), ...vo[k], at: t, bus: out(k), freq: freqOf(n), duration: ev.dur * sd });
      }
    }
    for (const ev of at.riser ?? []) oscs += v.riser({ ...vo.riser, at: t, bus: out('riser'), freq: freqOf(ev.notes[0]), duration: ev.dur * sd });
    for (const ev of at.bell ?? []) for (const n of ev.notes) oscs += v.bell({ ...vo.bell, at: t, bus: out('bell'), freq: freqOf(n) });
    for (const ev of at.whistle ?? []) oscs += v.whistle({ ...vo.whistle, at: t, bus: out('whistle'), freq: freqOf(ev.notes[0]), duration: ev.dur * sd * (vo.whistle?.gate ?? 0.92) });
    if (this.energy) {
      for (const ev of at.energy ?? []) {
        const freqs = ev.notes.map(freqOf);
        if (freqs.length > 1) oscs += v.stab({ at: t, bus: this.energyGain, notes: freqs, duration: ev.dur * sd, volume: 0.08 });
        else oscs += v.hoover({ at: t, bus: this.energyGain, freq: freqs[0], duration: ev.dur * sd * 0.95, voices: 3, volume: 0.07 });
      }
    }
    if (this.extra) oscs += this.extra(step, t, v) || 0;
    return oscs;
  }
}

class Music {
  constructor() {
    this.current = null;      // Name des Themas
    this.theme = null;        // kompiliertes Thema
    this.seq = null;
    this.timer = null;
    this.drums = false;       // Energie-Ebene an (Reiten) – Name aus Kompatibilität
    this.energyGain = null;
    this.fx = null;           // Effekt-Busse des laufenden Themas (createThemeBus)
    this.chain = null;        // Klangkette der Variante des laufenden Themas (createVariantChain) oder null
    this.curVariant = null;   // Variante des laufenden Themas
    this.pending = null;
    this.pendingVariant = null; // Variante des vorgemerkten Themas (vor der Freischaltung)
    this.energyDest = null;   // Ziel der Energie-Ebene (Musik-Eingang bzw. Eingang der Klangkette)
    this.lookahead = 0.12;    // Sekunden
    this.interval = 30;       // ms
    // Taktuhr (beat(), onBeat()): Zählzeit = b0 + (Zeit − t0) · bpm/60 auf der Zeitbasis `src`
    // ('audio' = hörbare Kontextzeit, 'ersatz' = performance.now() bzw. virtuelle Testzeit)
    this.clock = null;        // { theme, bpm, loop, beats, src, t0, b0, waiting, stopped, frozen }
    this.shownBeat = 0;       // zuletzt gemeldete Zählzeit (beat() fällt nie zurück)
    this.firedBeat = -1;      // letzte an onBeat gemeldete ganze Zählzeit
    this.beatListeners = new Set();
    this.beatTimer = null;
    this.manualTime = null;   // Testhaken: virtuelle Zeit in Sekunden (null = Echtzeit)
    this.lastHeard = null;    // letzte Ablesung der hörbaren Uhr { perf (s), beat } – Anschluss für die Ersatzuhr
  }

  /**
   * Thema starten (Neustart nur bei Wechsel von Thema oder Variante). Vor der Freischaltung läuft die Taktuhr als Ersatzuhr an.
   * @param {string|{theme: string, variant?: string}} name Thema (oder { theme, variant }, z.B. LEVEL.music eines Remix-Levels)
   * @param {{variant?: string}} [opts] Klang-Variante (VARIANT_NAMES); ohne bzw. unbekannt: Klang wie bisher
   */
  play(name, opts = null) {
    if (name && typeof name === 'object') { opts = { ...name, ...(opts ?? {}) }; name = name.theme ?? name.name; }
    const variant = variantOf(opts?.variant);
    if (!engine.ready) {
      this.pending = name;
      this.pendingVariant = variant;
      const c = this.clock;
      if (!isTheme(name)) this._stopClock();
      else if (!c || c.theme !== name || c.variant !== variant || c.stopped) this._startClock(this._compile(name, variant, () => {}), 'ersatz', this._now(), 0, true);
      return;
    }
    this.pending = null;
    this.pendingVariant = null;
    if (this.current === name && this.curVariant === variant && this.timer) return;
    const c = this.clock;
    const waitingSame = !!c && c.theme === name && c.variant === variant && !c.stopped && c.waiting;
    const join = waitingSame && this.manualTime === null; // Ersatzuhr lief schon: im Takt einsteigen
    this._halt();
    if (!isTheme(name)) { this._stopClock(); return; }
    const theme = this._compile(name, variant);
    let startTime = engine.now + 0.05, beat0 = 0;
    if (join) {
      const p = this._joinPoint();
      if (!theme.loop && p.beat * 4 >= theme.length) return; // kurzes Stück ist auf der Ersatzuhr schon vorbei
      startTime = p.startTime; beat0 = p.beat;
    }
    this.theme = theme;
    this.current = name;
    this.curVariant = theme.variant ?? null;
    if (!this.energyGain) {
      this.energyGain = engine.ctx.createGain();
      this.energyGain.gain.value = this.drums ? 1 : 0;
      this.energyGain.connect(engine.musicIn);
      this.energyDest = engine.musicIn;
    }
    const g = themeGraph(engine.ctx, theme, engine.musicIn);   // ohne Variante: nur die Effekt-Busse wie bisher
    this.fx = g.fx;
    this.chain = g.chain;
    engine.voices.stats.nodes += g.nodes;
    if (this.energyDest !== g.input) { this.energyGain.disconnect(); this.energyGain.connect(g.input); this.energyDest = g.input; }
    this.seq = new Sequencer({
      voices: engine.voices,
      dest: g.input,
      energyGain: this.energyGain,
      theme,
      startTime,
      energy: this.drums,
      buses: g.buses,
      step: (beat0 * 4) % theme.length,
      extra: g.extra,
    });
    if (join) Object.assign(this.clock, { src: 'audio', t0: startTime, b0: beat0, waiting: false });
    else if (this.manualTime !== null) { if (!waitingSame) this._startClock(theme, 'ersatz', this.manualTime, 0); }
    else this._startClock(theme, 'audio', startTime, 0);
    this.timer = setInterval(() => this.schedule(), this.interval);
    this.schedule();
  }

  /** Musik anhalten (die Taktuhr steht dann still: playing = false). */
  stop() {
    this._halt();
    this._stopClock();
  }

  /** Sequencer anhalten, Taktuhr unberührt (Themenwechsel, natürliches Ende eines kurzen Stücks). */
  _halt() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.seq = null;
    this.current = null;
    this.curVariant = null;
    releaseVariantChain(this.chain, this.fx ? Math.min(this.fx.tail, 6) : 0); // Hall der Variante klingt nach dem Echo aus
    this.chain = null;
    releaseThemeBus(this.fx); // Hall/Echo klingt noch aus, dann werden die Busse gelöst
    this.fx = null;
  }

  /** Thema kompilieren, mit Variante (Tempo, Echo-Faktoren). */
  _compile(name, variant, report) {
    const th = compileTheme(name, THEMES[name], report);
    return variant ? applyVariant(th, variant) : th;
  }

  /** Namen aller Themen. */
  listThemes() { return Object.keys(THEMES); }

  /** Namen der Klang-Varianten (für `play(name, { variant })`). */
  listVariants() { return [...VARIANT_NAMES]; }

  /** Klang-Variante des laufenden bzw. (vor der Freischaltung) vorgemerkten Themas, sonst null. */
  get variant() { return this.current ? this.curVariant : (this.pending ? this.pendingVariant : null); }

  /**
   * Eckdaten eines Themas (Test/Debug): Tempo, Takte, Loop, Länge in Sekunden, Spuren, Effekte, Spiel-Takt; mit
   * `{ variant }` Tempo und Länge der Variante (baseBpm = Tempo ohne Variante).
   */
  themeInfo(name, { variant = null } = {}) {
    if (!isTheme(name)) return null;
    const v = variantOf(variant);
    const th = this._compile(name, v, () => {});
    return {
      name, bpm: th.bpm, bars: th.bars, loop: th.loop, seconds: th.length * th.stepDur,
      tracks: Object.entries(th.tracks).filter(([, t]) => t.events.length).map(([k]) => k),
      drumKinds: [...new Set(th.tracks.drums.events.map((d) => d.kind))].sort().join(''),
      fx: th.fx ? Object.keys(th.fx) : [], energy: th.tracks.energy.events.length > 0 || th.energyDouble > 0,
      sync: th.sync ? { ...th.sync } : null,
      ...(v ? { variant: v, baseBpm: th.baseBpm } : null),
    };
  }

  /** Energie-Ebene ein-/ausblenden (Reiten auf Pflaume); die Drums laufen immer. */
  setDrums(on) {
    this.drums = on;
    if (this.seq) this.seq.energy = on;
    if (this.energyGain && engine.ctx) this.energyGain.gain.setTargetAtTime(on ? 1 : 0, engine.now, 0.08);
  }

  /** Falls das Thema vor der Audio-Freischaltung angefordert wurde. */
  resumePending() {
    if (this.pending && engine.ready) { const p = this.pending, variant = this.pendingVariant; this.pending = null; this.play(p, { variant }); }
  }

  schedule() {
    if (!this.seq) return;
    if (!engine.ready) { this._checkSource(); return; } // Kontext angehalten: Ersatzuhr übernimmt
    if (this.pending) { this.resumePending(); return; }  // während der Pause angefordertes Thema nachholen
    const c = this.clock;
    // Kontext läuft wieder (oder Testuhr aus): Musik springt an die Stelle der Uhr
    if (c && c.src === 'ersatz' && !c.stopped && this.manualTime === null && c.theme === this.current && c.variant === this.curVariant) this._resync();
    if (this.seq && !this.seq.advance(engine.now + this.lookahead)) this._halt();
    if (this.clock && this.clock.src === 'audio') this._raw(); // Ablesung merken (Anschluss beim Anhalten)
    this._pumpBeats(false);
  }

  // ---------------------------------------------------------------- Taktuhr ----

  /**
   * Taktuhr der Musik, synchron zu dem, was gerade zu hören ist (Ausgabelatenz abgezogen).
   * @returns {{ bpm: number, beat: number, bar: number, phase: number, playing: boolean,
   *             inBar: number, theme: string|null, loopBeats: number, source: 'audio'|'ersatz'|'none' }}
   *   beat = fortlaufende Zählzeit (Viertel) seit Themenstart als Kommazahl, nie fallend; bar = ganze Takte (4/4);
   *   phase = 0..1 innerhalb der Zählzeit; playing = ein Thema läuft (hörbar oder über die Ersatzuhr);
   *   inBar = Zählzeit im Takt (0–3); loopBeats = Länge des Loops in Zählzeiten. Ohne Thema: bpm 0, playing false.
   *   variant = Klang-Variante (bpm ist das Tempo mit Variante, z.B. `schnell` +8 %).
   */
  beat() {
    const c = this.clock;
    if (!c) return { bpm: 0, beat: 0, bar: 0, phase: 0, playing: false, inBar: 0, theme: null, loopBeats: 0, source: 'none', variant: null };
    this._checkSource();
    let b = this._shown(), playing = !c.stopped;
    if (!c.loop && b >= c.beats) { b = c.beats; playing = false; }
    const whole = Math.floor(b);
    return { bpm: c.bpm, beat: b, bar: Math.floor(b / BEATS_PER_BAR), phase: b - whole, playing, inBar: whole % BEATS_PER_BAR, theme: c.theme, loopBeats: c.beats, source: c.src, variant: c.variant };
  }

  /**
   * Rückruf je Zählzeit, wenn sie hörbar wird (bzw. auf der Ersatzuhr erreicht ist):
   * fn({ beat, bar, inBar, bpm, theme, late }) – late = Sekunden seit der Zählzeit (Timer-Verzug).
   * Neue Zuhörer bekommen die künftigen Zählzeiten; bei einem Themenwechsel beginnt die Zählung bei 0.
   * Nach langen Pausen (Hintergrund-Tab) wird von vielen verpassten Zählzeiten nur die letzte nachgereicht.
   * @returns {() => void} Abmelden
   */
  onBeat(fn) {
    if (typeof fn !== 'function') return () => {};
    const c = this.clock;
    if (!this.beatListeners.size && c && !c.stopped) {
      this.firedBeat = Math.max(this.firedBeat, Math.ceil(this._raw() - BEAT_GRACE * c.bpm / 60) - 1);
    }
    const entry = { fn };
    this.beatListeners.add(entry);
    this._kickTicker();
    return () => { if (this.beatListeners.delete(entry) && !this.beatListeners.size) this._kickTicker(); };
  }

  /** Läuft die Taktuhr auf virtueller Testzeit? */
  get manualClock() { return this.manualTime !== null; }

  /**
   * Testhaken: Taktuhr auf eine virtuelle Zeit umstellen, die nur `advanceClock()` vorrückt – deterministisch,
   * unabhängig von Audio und Echtzeit (die hörbare Musik läuft weiter, ist aber nicht mehr maßgeblich).
   * `false` kehrt zur Echtzeit zurück; die Zählzeit läuft stetig weiter, laufende Musik springt an ihre Stelle.
   */
  setManualClock(on = true) {
    const c = this.clock;
    if (on && this.manualTime === null) {
      const b = c ? this._shown() : 0;
      this.manualTime = 0;
      if (c && !c.stopped) Object.assign(c, { src: 'ersatz', t0: 0, b0: b });
    } else if (!on && this.manualTime !== null) {
      const b = c ? this._shown() : 0;
      this.manualTime = null;
      if (c && !c.stopped) {
        Object.assign(c, { src: 'ersatz', t0: perfSeconds(), b0: b });
        if (engine.ready && this.seq && c.theme === this.current) this._resync();
      }
    }
    this._kickTicker();
    return this.manualTime !== null;
  }

  /** Testhaken: virtuelle Uhr um `seconds` vorspulen (schaltet sie bei Bedarf ein); meldet alle überschrittenen Zählzeiten. */
  advanceClock(seconds) {
    if (this.manualTime === null) this.setManualClock(true);
    this.manualTime += Math.max(0, Number(seconds) || 0);
    this._pumpBeats(true);
    return this.beat();
  }

  /** Zeit der Ersatzuhr in Sekunden (virtuell im Testmodus). */
  _now() { return this.manualTime ?? perfSeconds(); }

  _startClock(theme, src, t0, b0 = 0, waiting = false) {
    this.clock = { theme: theme.name, variant: theme.variant ?? null, bpm: theme.bpm, loop: theme.loop, beats: theme.length / 4, src, t0, b0, waiting, stopped: false, frozen: 0 };
    this.shownBeat = b0;
    this.firedBeat = Math.ceil(b0) - 1;
    this._kickTicker();
  }

  _stopClock() {
    const c = this.clock;
    if (c && !c.stopped) { c.frozen = this._shown(); c.stopped = true; }
    this._kickTicker();
  }

  /** Zählzeit roh (ungeklemmt, darf vor dem Themenstart negativ sein). */
  _raw() {
    const c = this.clock;
    if (!c) return 0;
    if (c.stopped) return c.frozen;
    if (c.src !== 'audio') return c.b0 + (this._now() - c.t0) * c.bpm / 60;
    const b = c.b0 + (engine.audibleTime() - c.t0) * c.bpm / 60;
    if (engine.ready) this.lastHeard = { perf: perfSeconds(), beat: b, clock: c };
    return b;
  }

  /** Zählzeit für beat(): ab 0, nie fallend (glättet Zeitstempel-Zittern). */
  _shown() {
    const b = Math.max(0, this._raw(), this.shownBeat);
    this.shownBeat = b;
    return b;
  }

  /** Hörbare Uhr steht (Kontext angehalten/geschlossen): stetig auf die Ersatzuhr wechseln. */
  _checkSource() {
    const c = this.clock;
    if (c && c.src === 'audio' && !c.stopped && !engine.ready) {
      // von der letzten Ablesung der hörbaren Uhr in Echtzeit fortschreiben: der Takt bleibt stetig, auch wenn
      // das Anhalten erst später bemerkt wird (die stehende Kontextzeit würde ihn sonst zurückhalten)
      const h = this.lastHeard && this.lastHeard.clock === c ? this.lastHeard : null;
      const b = Math.max(h ? h.beat + (perfSeconds() - h.perf) * c.bpm / 60 : this._raw(), this.shownBeat);
      Object.assign(c, { src: 'ersatz', t0: this._now(), b0: b, waiting: false });
    }
  }

  /**
   * Einstiegspunkt für die hörbare Musik passend zur Ersatzuhr: die nächste ganze Zählzeit, die sich noch
   * mit `minLead` Vorlauf planen lässt, und ihre Kontextzeit (so, dass sie hörbar wird, wenn die Uhr sie erreicht).
   */
  _joinPoint(minLead = 0.06) {
    const c = this.clock, spb = 60 / c.bpm;
    const audible = engine.audibleTime(), now = engine.now;
    const b = Math.max(this._raw(), this.shownBeat);
    const beat = Math.max(0, Math.ceil(b + (now + minLead - audible) / spb - 1e-9));
    return { startTime: audible + (beat - b) * spb, beat };
  }

  /** Laufenden Sequencer an die Stelle der Ersatzuhr setzen und die Uhr wieder an die hörbare Zeit binden. */
  _resync() {
    const c = this.clock, th = this.theme, p = this._joinPoint();
    if (!th.loop && p.beat * 4 >= th.length) { this._halt(); return; }
    this.seq.step = (p.beat * 4) % th.length;
    this.seq.time = p.startTime;
    Object.assign(c, { src: 'audio', t0: p.startTime, b0: p.beat, waiting: false });
  }

  /** Erreichte ganze Zählzeiten an onBeat melden (`all`: ohne Nachhol-Grenze, für den Testhaken). */
  _pumpBeats(all) {
    const c = this.clock;
    if (!c || c.stopped || !this.beatListeners.size) return;
    this._checkSource();
    const raw = this._raw();
    let upto = Math.floor(raw);
    if (!c.loop) upto = Math.min(upto, Math.ceil(c.beats) - 1);
    if (upto <= this.firedBeat) return;
    if (!all && upto - this.firedBeat > MAX_CATCHUP) this.firedBeat = upto - 1;
    const spb = 60 / c.bpm;
    while (this.firedBeat < upto) {
      const n = ++this.firedBeat;
      const ev = { beat: n, bar: Math.floor(n / BEATS_PER_BAR), inBar: n % BEATS_PER_BAR, bpm: c.bpm, theme: c.theme, late: Math.max(0, (raw - n) * spb) };
      for (const l of [...this.beatListeners]) {
        if (!this.beatListeners.has(l)) continue;
        try { l.fn(ev); } catch (err) { setTimeout(() => { throw err; }, 0); } // Fehler melden, Takt nicht stören
      }
      if (this.clock !== c || c.stopped) return; // ein Zuhörer hat das Thema gewechselt oder angehalten
    }
  }

  /** Echtzeit-Melder: Timer genau auf die nächste Zählzeit (höchstens 250 ms, damit Quellenwechsel auffallen). */
  _kickTicker() {
    if (this.beatTimer) { clearTimeout(this.beatTimer); this.beatTimer = null; }
    if (this.manualTime !== null || !this.beatListeners.size || !this.clock || this.clock.stopped) return;
    this._pumpBeats(false);
    const c = this.clock;
    if (this.beatTimer) { clearTimeout(this.beatTimer); this.beatTimer = null; } // ein Zuhörer hat neu gestartet
    if (this.manualTime !== null || !this.beatListeners.size || !c || c.stopped) return;
    if (!c.loop && this.firedBeat >= Math.ceil(c.beats) - 1) return;
    const wait = (this.firedBeat + 1 - this._raw()) * 60 / c.bpm;
    this.beatTimer = setTimeout(() => { this.beatTimer = null; this._kickTicker(); }, Math.max(4, Math.min(250, wait * 1000)));
  }

  /** Alle Themen prüfen; liefert die Fehlermeldungen (leer = alles konsistent). */
  validateThemes(themes = THEMES) {
    const msgs = [];
    for (const [name, theme] of Object.entries(themes)) compileTheme(name, theme, (m) => msgs.push(`${name}: ${m}`));
    return msgs;
  }

  /**
   * Thema offline rendern (Test/Messung): Sequencer auf einem OfflineAudioContext, Musik-Kette mit
   * Pegel `level` (Standard 1 = der Mix hinter dem Kompressor; im Spiel skaliert MUSIC_LEVEL ihn).
   * `theme` (optional) rendert statt des benannten ein übergebenes Themen-Objekt (Experimente, Tests);
   * `variant` mit Klang-Variante (bpm = Tempo der Variante), `channels` 1 (Standard) oder 2 (Stereo, z.B. Hall-Breite).
   * @returns {Promise<{buffer: AudioBuffer, sampleRate, seconds, bpm, level, inGameLevel, stats, nodesPerSecond}>}
   */
  async renderTheme(name, seconds = 8, { energy = false, sampleRate = 44100, level = 1, theme: custom = null, variant = null, channels = 1 } = {}) {
    if (!custom && !isTheme(name)) throw new Error(`Unbekanntes Thema: ${name}`);
    const v = variantOf(variant);
    let theme = compileTheme(name, custom ?? THEMES[name]);
    if (v) theme = applyVariant(theme, v);
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctx(channels, Math.ceil(seconds * sampleRate), sampleRate);
    const chain = createMusicChain(ctx, ctx.destination, level);
    const voices = new Voices(ctx, chain.input, 7);
    const energyGain = ctx.createGain();
    energyGain.gain.value = 1;
    const g = themeGraph(ctx, theme, chain.input, energyGain);   // ohne Variante: Energie-Ebene und Effekt-Busse wie bisher
    voices.stats.nodes += g.nodes;
    const seq = new Sequencer({ voices, dest: g.input, energyGain, theme, startTime: 0.02, energy, buses: g.buses, extra: g.extra });
    seq.advance(seconds);
    const buffer = await ctx.startRendering();
    return {
      buffer, sampleRate, seconds, bpm: theme.bpm, bars: theme.bars, loop: theme.loop, loopSeconds: theme.length * theme.stepDur, level, inGameLevel: MUSIC_LEVEL,
      variant: v, baseBpm: theme.baseBpm ?? theme.bpm,
      stats: { ...voices.stats }, nodesPerSecond: voices.stats.nodes / seconds, oscillatorsPerSecond: voices.stats.oscillators / seconds,
    };
  }
}

export const music = new Music();
// Test-/Debug-Zugriff auf die Bausteine (tests/audio.mjs baut damit die Kette ohne Variante nach – Gegenprobe)
music.parts = { compileTheme, applyVariant, themeGraph, Sequencer, Voices, createMusicChain, createThemeBus, THEMES, MUSIC_VARIANTS };
