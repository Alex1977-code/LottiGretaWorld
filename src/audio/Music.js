// Step-Sequencer mit Vorausplanung (Lookahead), spielt die Themen aus themes.js.
//
// Spuren eines Themas (jede darf fehlen oder leer sein): lead (Hoover), stabs, piano, pad, bass,
// organ (Rechteck-Orgel), arp (Pluck-Arpeggio), echo (leise Verzögerungs-Noten), riser (Hoover-Riser),
// energy (Energie-Ebene beim Reiten) und drums. Tonale Spuren sind Takt-Strings aus Token
// "Note:Dauer" (Dauer in Sechzehnteln), Akkorde mit "+" verkettet ("C4+Eb4+G4:2"), "-" = Pause.
// Drums: je Takt ein String mit 16 Zeichen oder ein Array solcher Ebenen (Kick und Hat gleichzeitig):
// k Kick, c Clap, s Snare, h Hat geschlossen, o Hat offen, r Crash, t Tom (Fill: fällt je Schlag), "." nichts.
//
// Klangfarbe je Thema (alles optional, ohne Angabe klingen die Stimmen wie bisher):
//   voice: { spur: {Optionen der Stimme} }   z.B. { lead: { cutoff: 1400, voices: 3 }, arp: { type: 'triangle' } }
//   kit:   { kick|clap|snare|hat|open|crash|tom: {Optionen} }   z.B. { kick: { pitchStart: 115, click: 0.08 } }
//   fx:    { lowpass: { spur: Hz }, delay: { steps, feedback, lowpass, wet, send: { spur: Anteil } } }
//          (siehe createThemeBus in AudioEngine.js)
//
// Die Drums laufen im Level immer. `setDrums(on)` blendet die Energie-Ebene ein/aus (Pflaume):
// Lead-Doppelung eine Oktave höher plus die `energy`-Spur (Offbeat-Stabs).
//
// Der Sequencer ist in Kontext und Zeitbasis parametrisierbar: im Spiel läuft er auf dem
// Live-Kontext, `renderTheme()` schreibt ein Thema über einen OfflineAudioContext in einen Puffer.

import { engine, Voices, createMusicChain, createThemeBus, releaseThemeBus, MUSIC_LEVEL } from './AudioEngine.js';
import { THEMES } from './themes.js';

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEPS_PER_BAR = 16;
const MAX_OSC_PER_STEP = 10; // Polyphonie-Budget je Sechzehntel (Handy-CPU)
const TONAL_TRACKS = ['lead', 'energy', 'stabs', 'piano', 'pad', 'bass', 'organ', 'arp', 'echo', 'riser'];
const DRUM_KINDS = 'kcshort';
const KIT_PARTS = ['kick', 'clap', 'snare', 'hat', 'open', 'crash', 'tom'];
/** Gibt es das Thema? (eigene Eigenschaft – "toString" & Co. sind keine Themen; ohne Object.hasOwn für ältere Safari) */
const isTheme = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(THEMES, name);
/** Schlagzeug-Teil → Bus-Name (offene und geschlossene Hats teilen sich einen Bus). */
const DRUM_BUS = { k: 'kick', c: 'clap', s: 'snare', h: 'hat', o: 'hat', r: 'crash', t: 'tom' };

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
        if (!DRUM_KINDS.includes(ch)) { report(`${where}, Takt ${i + 1}: unbekanntes Zeichen "${ch}"`); run = 0; continue; }
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
  if (!(theme.bpm > 30 && theme.bpm < 240)) report(`unplausibles Tempo ${theme.bpm}`);
  // Klangfarben-Angaben: nur bekannte Spuren/Schlagzeug-Teile (Tippfehler fielen sonst still unter den Tisch)
  const busNames = [...TONAL_TRACKS, ...KIT_PARTS];
  for (const k of Object.keys(theme.voice ?? {})) if (!TONAL_TRACKS.includes(k)) report(`voice: unbekannte Spur "${k}"`);
  for (const k of Object.keys(theme.kit ?? {})) if (!KIT_PARTS.includes(k)) report(`kit: unbekannter Teil "${k}"`);
  for (const k of Object.keys(theme.fx?.lowpass ?? {})) if (!busNames.includes(k)) report(`fx.lowpass: unbekannte Spur "${k}"`);
  for (const k of Object.keys(theme.fx?.delay?.send ?? {})) if (!busNames.includes(k)) report(`fx.delay.send: unbekannte Spur "${k}"`);
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
    tracks,
    byStep,
  };
}

/**
 * Spielt ein kompiliertes Thema Schritt für Schritt über die übergebenen Stimmen.
 * Zeitbasis und Kontext kommen von außen (Live oder Offline).
 */
export class Sequencer {
  constructor({ voices, dest, energyGain, theme, startTime, energy = false, buses = {} }) {
    this.voices = voices;
    this.dest = dest;
    this.energyGain = energyGain;
    this.theme = theme;
    this.step = 0;
    this.time = startTime;
    this.energy = energy;
    this.buses = buses; // Spur → Effekt-Bus (createThemeBus); fehlende Spuren gehen direkt auf dest
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
    this.fx = null;           // Effekt-Busse des laufenden Themas (createThemeBus)
    this.pending = null;
    this.lookahead = 0.12;    // Sekunden
    this.interval = 30;       // ms
  }

  /** Thema starten (Neustart nur bei Wechsel). */
  play(name) {
    if (!engine.ready) { this.pending = name; return; }
    if (this.current === name && this.timer) return;
    this.stop();
    if (!isTheme(name)) return; // unbekanntes Thema: Stille statt Fehler
    this.theme = compileTheme(name, THEMES[name]);
    this.current = name;
    if (!this.energyGain) {
      this.energyGain = engine.ctx.createGain();
      this.energyGain.gain.value = this.drums ? 1 : 0;
      this.energyGain.connect(engine.musicIn);
    }
    this.fx = createThemeBus(engine.ctx, this.theme.fx, this.theme.stepDur, engine.musicIn);
    engine.voices.stats.nodes += this.fx.nodes.length;
    this.seq = new Sequencer({
      voices: engine.voices,
      dest: engine.musicIn,
      energyGain: this.energyGain,
      theme: this.theme,
      startTime: engine.now + 0.05,
      energy: this.drums,
      buses: this.fx.buses,
    });
    this.timer = setInterval(() => this.schedule(), this.interval);
    this.schedule();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.seq = null;
    this.current = null;
    releaseThemeBus(this.fx); // Hall/Echo klingt noch aus, dann werden die Busse gelöst
    this.fx = null;
  }

  /** Namen aller Themen. */
  listThemes() { return Object.keys(THEMES); }

  /** Eckdaten eines Themas (Test/Debug): Tempo, Takte, Loop, Länge in Sekunden, Spuren, Effekte. */
  themeInfo(name) {
    if (!isTheme(name)) return null;
    const th = compileTheme(name, THEMES[name], () => {});
    return {
      name, bpm: th.bpm, bars: th.bars, loop: th.loop, seconds: th.length * th.stepDur,
      tracks: Object.entries(th.tracks).filter(([, t]) => t.events.length).map(([k]) => k),
      drumKinds: [...new Set(th.tracks.drums.events.map((d) => d.kind))].sort().join(''),
      fx: th.fx ? Object.keys(th.fx) : [], energy: th.tracks.energy.events.length > 0 || th.energyDouble > 0,
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
    if (this.pending && engine.ready) { const p = this.pending; this.pending = null; this.play(p); }
  }

  schedule() {
    if (!engine.ready || !this.seq) return;
    if (!this.seq.advance(engine.now + this.lookahead)) this.stop();
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
   * `theme` (optional) rendert statt des benannten ein übergebenes Themen-Objekt (Experimente, Tests).
   * @returns {Promise<{buffer: AudioBuffer, sampleRate, seconds, bpm, level, inGameLevel, stats, nodesPerSecond}>}
   */
  async renderTheme(name, seconds = 8, { energy = false, sampleRate = 44100, level = 1, theme: custom = null } = {}) {
    if (!custom && !isTheme(name)) throw new Error(`Unbekanntes Thema: ${name}`);
    const theme = compileTheme(name, custom ?? THEMES[name]);
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctx(1, Math.ceil(seconds * sampleRate), sampleRate);
    const chain = createMusicChain(ctx, ctx.destination, level);
    const voices = new Voices(ctx, chain.input, 7);
    const energyGain = ctx.createGain();
    energyGain.gain.value = 1;
    energyGain.connect(chain.input);
    const fx = createThemeBus(ctx, theme.fx, theme.stepDur, chain.input);
    voices.stats.nodes += fx.nodes.length;
    const seq = new Sequencer({ voices, dest: chain.input, energyGain, theme, startTime: 0.02, energy, buses: fx.buses });
    seq.advance(seconds);
    const buffer = await ctx.startRendering();
    return {
      buffer, sampleRate, seconds, bpm: theme.bpm, bars: theme.bars, loop: theme.loop, loopSeconds: theme.length * theme.stepDur, level, inGameLevel: MUSIC_LEVEL,
      stats: { ...voices.stats }, nodesPerSecond: voices.stats.nodes / seconds, oscillatorsPerSecond: voices.stats.oscillators / seconds,
    };
  }
}

export const music = new Music();
