// Step-Sequencer mit Vorausplanung (Lookahead), spielt die Themen aus themes.js.
//
// Spuren eines Themas (jede darf fehlen oder leer sein): lead (Hoover), stabs, piano, pad, bass,
// energy (Energie-Ebene beim Reiten) und drums. Tonale Spuren sind Takt-Strings aus Token
// "Note:Dauer" (Dauer in Sechzehnteln), Akkorde mit "+" verkettet ("C4+Eb4+G4:2"), "-" = Pause.
// Drums: je Takt ein String mit 16 Zeichen oder ein Array solcher Ebenen (Kick und Hat gleichzeitig):
// k Kick, c Clap, s Snare, h Hat geschlossen, o Hat offen, r Crash, "." nichts.
//
// Die Drums laufen im Level immer. `setDrums(on)` blendet die Energie-Ebene ein/aus (Pflaume):
// Lead-Doppelung eine Oktave höher plus die `energy`-Spur (Offbeat-Stabs).
//
// Der Sequencer ist in Kontext und Zeitbasis parametrisierbar: im Spiel läuft er auf dem
// Live-Kontext, `renderTheme()` schreibt ein Thema über einen OfflineAudioContext in einen Puffer.

import { engine, Voices, createMusicChain, MUSIC_LEVEL } from './AudioEngine.js';
import { THEMES } from './themes.js';

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEPS_PER_BAR = 16;
const MAX_OSC_PER_STEP = 10; // Polyphonie-Budget je Sechzehntel (Handy-CPU)
const TONAL_TRACKS = ['lead', 'energy', 'stabs', 'piano', 'pad', 'bass'];

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

/** Trommelspur → Events {step, kind, run, off}; run = Zahl direkt vorangehender gleicher Schläge (Wirbel), off = ungerades Sechzehntel. */
export function parseDrums(bars, where = 'drums', report = () => {}) {
  const events = [];
  bars.forEach((bar, i) => {
    const layers = Array.isArray(bar) ? bar : [bar];
    for (const layer of layers) {
      if (layer.length !== STEPS_PER_BAR) report(`${where}, Takt ${i + 1}: Ebene "${layer}" hat ${layer.length} statt ${STEPS_PER_BAR} Zeichen`);
      let run = 0;
      for (let s = 0; s < layer.length; s++) {
        const ch = layer[s];
        if (ch === '.') { run = 0; continue; }
        if (!'kcshor'.includes(ch)) { report(`${where}, Takt ${i + 1}: unbekanntes Zeichen "${ch}"`); run = 0; continue; }
        run = s > 0 && layer[s - 1] === ch ? run + 1 : 0;
        events.push({ step: i * STEPS_PER_BAR + s, kind: ch, run, off: s % 2 === 1 });
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
    tracks,
    byStep,
  };
}

/**
 * Spielt ein kompiliertes Thema Schritt für Schritt über die übergebenen Stimmen.
 * Zeitbasis und Kontext kommen von außen (Live oder Offline).
 */
export class Sequencer {
  constructor({ voices, dest, energyGain, theme, startTime, energy = false }) {
    this.voices = voices;
    this.dest = dest;
    this.energyGain = energyGain;
    this.theme = theme;
    this.step = 0;
    this.time = startTime;
    this.energy = energy;
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
    const v = this.voices, th = this.theme, sd = th.stepDur, bus = this.dest;
    const at = th.byStep[step];
    let oscs = 0;
    // Polyphonie-Budget: volle Besetzung, wenn sie ins Budget passt, sonst die schlanke
    const fit = (want, lean) => (oscs + want <= MAX_OSC_PER_STEP ? want : lean);
    const perNote = (notes) => (oscs + notes.length * 2 <= MAX_OSC_PER_STEP ? 2 : 1); // Oszillatoren je Akkordton

    for (const ev of at.drums ?? []) {
      if (ev.kind === 'k') oscs += v.kick909({ at: t, bus });
      else if (ev.kind === 'c') v.clap({ at: t, bus });
      else if (ev.kind === 's') oscs += v.snare({ at: t, bus, volume: 0.28 * Math.min(2, 1 + ev.run * 0.12) }); // Wirbel schwillt an
      else if (ev.kind === 'h') v.hatClosed({ at: t, bus, volume: ev.off ? 0.18 : 0.3 });
      else if (ev.kind === 'o') v.hatOpen({ at: t, bus });
      else if (ev.kind === 'r') v.crash({ at: t, bus });
    }
    for (const ev of at.bass ?? []) oscs += v.bass({ at: t, bus, freq: freqOf(ev.notes[0]), duration: ev.dur * sd * 0.7 });
    for (const ev of at.lead ?? []) {
      const f = freqOf(ev.notes[0]), dur = ev.dur * sd * 0.95;
      oscs += v.hoover({ at: t, bus, freq: f, duration: dur, voices: fit(5, 3) });
      if (this.energy && th.energyDouble) {
        oscs += v.hoover({ at: t, bus: this.energyGain, freq: f * Math.pow(2, th.energyDouble), duration: dur, voices: 3, volume: 0.06, cutoff: 4500 });
      }
    }
    for (const ev of at.stabs ?? []) oscs += v.stab({ at: t, bus, notes: ev.notes.map(freqOf), duration: ev.dur * sd });
    for (const ev of at.piano ?? []) oscs += v.ravePiano({ at: t, bus, notes: ev.notes.map(freqOf), duration: ev.dur * sd, oscs: perNote(ev.notes) });
    for (const ev of at.pad ?? []) oscs += v.pad({ at: t, bus, notes: ev.notes.map(freqOf), duration: ev.dur * sd, oscs: perNote(ev.notes) });
    if (this.energy) {
      for (const ev of at.energy ?? []) {
        const freqs = ev.notes.map(freqOf);
        if (freqs.length > 1) oscs += v.stab({ at: t, bus: this.energyGain, notes: freqs, duration: ev.dur * sd, volume: 0.08 });
        else oscs += v.hoover({ at: t, bus: this.energyGain, freq: freqs[0], duration: ev.dur * sd * 0.95, voices: 3, volume: 0.07 });
      }
    }
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
    this.pending = null;
    this.lookahead = 0.12;    // Sekunden
    this.interval = 30;       // ms
  }

  /** Thema starten (Neustart nur bei Wechsel). */
  play(name) {
    if (!engine.ready) { this.pending = name; return; }
    if (this.current === name && this.timer) return;
    this.stop();
    if (!THEMES[name]) return;
    this.theme = compileTheme(name, THEMES[name]);
    this.current = name;
    if (!this.energyGain) {
      this.energyGain = engine.ctx.createGain();
      this.energyGain.gain.value = this.drums ? 1 : 0;
      this.energyGain.connect(engine.musicIn);
    }
    this.seq = new Sequencer({
      voices: engine.voices,
      dest: engine.musicIn,
      energyGain: this.energyGain,
      theme: this.theme,
      startTime: engine.now + 0.05,
      energy: this.drums,
    });
    this.timer = setInterval(() => this.schedule(), this.interval);
    this.schedule();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.seq = null;
    this.current = null;
  }

  /** Energie-Ebene ein-/ausblenden (Reiten auf Pflaume); die Drums laufen immer. */
  setDrums(on) {
    this.drums = on;
    if (this.seq) this.seq.energy = on;
    if (this.energyGain && engine.ctx) this.energyGain.gain.setTargetAtTime(on ? 1 : 0, engine.now, 0.08);
  }

  /** Falls das Thema vor der Audio-Freischaltung angefordert wurde. */
  resumePending() {
    if (this.pending && engine.ready) { const p = this.pending; this.pending = null; this.play(p); }
  }

  schedule() {
    if (!engine.ready || !this.seq) return;
    if (!this.seq.advance(engine.now + this.lookahead)) this.stop();
  }

  /** Alle Themen prüfen; liefert die Fehlermeldungen (leer = alles konsistent). */
  validateThemes() {
    const msgs = [];
    for (const [name, theme] of Object.entries(THEMES)) compileTheme(name, theme, (m) => msgs.push(`${name}: ${m}`));
    return msgs;
  }

  /**
   * Thema offline rendern (Test/Messung): Sequencer auf einem OfflineAudioContext, Musik-Kette mit
   * Pegel `level` (Standard 1 = der Mix hinter dem Kompressor; im Spiel skaliert MUSIC_LEVEL ihn).
   * @returns {Promise<{buffer: AudioBuffer, sampleRate, seconds, bpm, level, inGameLevel, stats, nodesPerSecond}>}
   */
  async renderTheme(name, seconds = 8, { energy = false, sampleRate = 44100, level = 1 } = {}) {
    if (!THEMES[name]) throw new Error(`Unbekanntes Thema: ${name}`);
    const theme = compileTheme(name, THEMES[name]);
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctx(1, Math.ceil(seconds * sampleRate), sampleRate);
    const chain = createMusicChain(ctx, ctx.destination, level);
    const voices = new Voices(ctx, chain.input, 7);
    const energyGain = ctx.createGain();
    energyGain.gain.value = 1;
    energyGain.connect(chain.input);
    const seq = new Sequencer({ voices, dest: chain.input, energyGain, theme, startTime: 0.02, energy });
    seq.advance(seconds);
    const buffer = await ctx.startRendering();
    return {
      buffer, sampleRate, seconds, bpm: theme.bpm, bars: theme.bars, level, inGameLevel: MUSIC_LEVEL,
      stats: { ...voices.stats }, nodesPerSecond: voices.stats.nodes / seconds, oscillatorsPerSecond: voices.stats.oscillators / seconds,
    };
  }
}

export const music = new Music();
