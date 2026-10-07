// Step-Sequencer mit Vorausplanung (Lookahead), spielt die Themen aus themes.js.
// Trommelspur kann zur Laufzeit ein-/ausgeblendet werden (Pflaume).

import { engine } from './AudioEngine.js';
import { THEMES } from './themes.js';

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "Bb4" → MIDI-Nummer */
function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}
const freqOf = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Pattern-Takte in Events {step, dur, note} umwandeln. */
function parseTrack(bars) {
  const events = [];
  let step = 0;
  for (const bar of bars) {
    for (const tok of bar.trim().split(/\s+/)) {
      const [name, d] = tok.split(':');
      const dur = parseInt(d, 10);
      if (name !== '-') events.push({ step, dur, note: midi(name) });
      step += dur;
    }
  }
  return { events, length: step };
}

function parseDrums(bars) {
  const events = [];
  let step = 0;
  for (const bar of bars) {
    for (const ch of bar) {
      if (ch !== '.') events.push({ step, kind: ch });
      step++;
    }
  }
  return { events, length: step };
}

class Music {
  constructor() {
    this.current = null;      // Name des Themas
    this.timer = null;
    this.drums = false;
    this.drumGain = null;
    this.lookahead = 0.12;    // Sekunden
    this.interval = 30;       // ms
  }

  /** Thema starten (Neustart nur bei Wechsel). */
  play(name) {
    if (!engine.ready) { this.pending = name; return; }
    if (this.current === name && this.timer) return;
    this.stop();
    const theme = THEMES[name];
    if (!theme) return;
    this.current = name;
    this.theme = theme;
    this.tracks = {
      lead: parseTrack(theme.lead),
      arp: parseTrack(theme.arp),
      bass: parseTrack(theme.bass),
      drums: parseDrums(theme.drums),
    };
    this.length = this.tracks.lead.length;
    this.stepDur = 60 / theme.bpm / 4;
    this.nextStep = 0;
    this.nextTime = engine.now + 0.05;
    this.loop = theme.loop !== false;
    if (!this.drumGain) {
      this.drumGain = engine.ctx.createGain();
      this.drumGain.gain.value = this.drums ? 1 : 0;
      this.drumGain.connect(engine.musicBus);
    }
    this.timer = setInterval(() => this.schedule(), this.interval);
    this.schedule();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  /** Trommelspur ein-/ausblenden. */
  setDrums(on) {
    this.drums = on;
    if (this.drumGain && engine.ctx) this.drumGain.gain.setTargetAtTime(on ? 1 : 0, engine.now, 0.08);
  }

  /** Falls das Thema vor der Audio-Freischaltung angefordert wurde. */
  resumePending() {
    if (this.pending && engine.ready) { const p = this.pending; this.pending = null; this.play(p); }
  }

  schedule() {
    if (!engine.ready) return;
    while (this.nextTime < engine.now + this.lookahead) {
      const step = this.nextStep;
      this.playStep(step, this.nextTime);
      this.nextStep++;
      this.nextTime += this.stepDur;
      if (this.nextStep >= this.length) {
        if (!this.loop) { this.stop(); return; }
        this.nextStep = 0;
      }
    }
  }

  playStep(step, t) {
    const bus = engine.musicBus;
    for (const ev of this.tracks.lead.events) {
      if (ev.step === step) engine.tone({ type: 'square', freq: freqOf(ev.note), duration: ev.dur * this.stepDur * 0.9, volume: 0.16, attack: 0.01, release: 0.05, at: t, bus });
    }
    for (const ev of this.tracks.arp.events) {
      if (ev.step === step) engine.tone({ type: 'square', freq: freqOf(ev.note), duration: ev.dur * this.stepDur * 0.6, volume: 0.05, attack: 0.005, release: 0.03, at: t, bus, detune: 4 });
    }
    for (const ev of this.tracks.bass.events) {
      if (ev.step === step) engine.tone({ type: 'triangle', freq: freqOf(ev.note), duration: ev.dur * this.stepDur * 0.85, volume: 0.3, attack: 0.01, release: 0.05, at: t, bus });
    }
    for (const ev of this.tracks.drums.events) {
      if (ev.step !== step) continue;
      if (ev.kind === 'k') engine.tone({ type: 'sine', freq: 150, freqEnd: 40, slideTime: 0.08, duration: 0.12, volume: 0.6, at: t, bus: this.drumGain });
      else if (ev.kind === 's') engine.noise({ duration: 0.1, filterType: 'highpass', filterFreq: 1200, volume: 0.35, at: t, bus: this.drumGain });
      else if (ev.kind === 'h') engine.noise({ duration: 0.03, filterType: 'highpass', filterFreq: 6000, volume: 0.18, at: t, bus: this.drumGain });
    }
  }
}

export const music = new Music();
