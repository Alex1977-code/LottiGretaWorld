// Web-Audio-Grundlage: AudioContext (wird bei der ersten Berührung freigeschaltet),
// Lautstärke-Busse für Effekte und Musik, einfache Synth-Bausteine (Ton, Rauschen).

const MUTE_KEY = 'pip-pflaume-muted';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { /* egal */ }
    this.noiseBuffer = null;
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  /** Muss aus einer Nutzergeste heraus aufgerufen werden (Touch/Taste). */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.5;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.22;
        this.musicBus.connect(this.master);
        this.noiseBuffer = this.makeNoiseBuffer();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (_) { /* Audio nicht verfügbar */ }
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (_) { /* egal */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  toggleMuted() { this.setMuted(!this.muted); return this.muted; }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  makeNoiseBuffer() {
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /**
   * Einzelner Ton mit Hüllkurve.
   * @param {object} o { type, freq, freqEnd, slideTime, duration, attack, release, volume, at, bus, detune }
   */
  tone(o) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = o.at ?? ctx.currentTime;
    const dur = o.duration ?? 0.1;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t0 + (o.slideTime ?? dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const vol = o.volume ?? 0.3;
    const a = Math.min(o.attack ?? 0.005, dur * 0.5);
    const r = Math.min(o.release ?? 0.04, dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    g.gain.setValueAtTime(vol, Math.max(t0 + a, t0 + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.bus ?? this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Rauschen (Treffer, Staub, Snare, Hi-Hat). */
  noise(o) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = o.at ?? ctx.currentTime;
    const dur = o.duration ?? 0.08;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filterType ?? 'lowpass';
    filter.frequency.setValueAtTime(o.filterFreq ?? 1200, t0);
    if (o.filterEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterEnd), t0 + dur);
    const g = ctx.createGain();
    const vol = o.volume ?? 0.2;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(o.bus ?? this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }
}

export const engine = new AudioEngine();
