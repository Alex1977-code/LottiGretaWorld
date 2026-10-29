// Web-Audio-Grundlage: AudioContext (wird bei der ersten Berührung freigeschaltet),
// Busse für Effekte und Musik (Musik läuft über eine Kompressor/Limiter-Stufe) und die
// Synth-Bausteine im Stil der 90er-Eurodance-Zeit: 909-Kick, Clap, Snare, Hi-Hats, Crash, Tom,
// Hoover-/Supersaw-Lead, Brass-Stabs, Rave-Piano, Oktav-Bass, Pad, Rechteck-Orgel, Pluck (Arpeggien,
// Echo-Noten) und Hoover-Riser; seit Welt 2 außerdem Glocke (Glockenspiel, Piep), Pfeife/Theremin
// (Sinus mit Vibrato), Darbuka (Doum/Tek), Uhr-Tick und Schellen. Optionen der Stimmen haben
// Standardwerte, mit denen die älteren Themen unverändert klingen; die Kurs-Themen färben über sie
// (z.B. weiche Kick, gedämpfte Leads).
//
// Die Bausteine stecken in der Klasse `Voices`, die an einen beliebigen Kontext gebunden wird:
// im Spiel an den Live-AudioContext, im Test an einen OfflineAudioContext (messbarer Mix).

const MUTE_KEY = 'lotti-greta-muted';

/** Gesamtpegel der Musik hinter dem Kompressor (Effekte liegen bei 0,5). */
export const MUSIC_LEVEL = 0.26;

/** Deterministischer Zufall (Mulberry32): Rauschpuffer und Hat-Variationen bleiben reproduzierbar. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RBJ-Biquad direkt auf Samples – für vorgefilterte Rauschpuffer (spart pro Schlag einen Filterknoten). */
function biquadInPlace(d, type, f0, Q, sr) {
  const w0 = 2 * Math.PI * f0 / sr, cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * Q);
  let b0, b1, b2;
  if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; } // Bandpass mit 0 dB Spitze
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y;
  }
}

function normalize(d) {
  let p = 0;
  for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i]));
  if (p > 0) for (let i = 0; i < d.length; i++) d[i] /= p;
}

/** Rauschpuffer (1 s): weiß, Hi-Hat (Hochpass ~8 kHz), Clap (Bandpass 1,5 kHz), Snare (Hochpass 1,2 kHz). */
function makeNoiseBuffers(ctx, rand) {
  const sr = ctx.sampleRate, len = sr;
  const white = ctx.createBuffer(1, len, sr);
  const w = white.getChannelData(0);
  for (let i = 0; i < len; i++) w[i] = rand() * 2 - 1;
  const derive = (fn) => {
    const b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    d.set(w); fn(d); normalize(d);
    return b;
  };
  return {
    white,
    hat: derive((d) => { biquadInPlace(d, 'highpass', 8000, 0.7, sr); biquadInPlace(d, 'highpass', 7000, 0.7, sr); }),
    clap: derive((d) => { biquadInPlace(d, 'bandpass', 1500, 1.2, sr); biquadInPlace(d, 'bandpass', 1500, 1.2, sr); }),
    snare: derive((d) => biquadInPlace(d, 'highpass', 1200, 0.7, sr)),
  };
}

/** Feste Nachjustierung hinter dem Kompressor (dessen Auto-Makeup hebt den Mix an). */
export const MIX_TRIM = 0.8;

/**
 * Musik-Kette: Summe → Kompressor/Limiter → Trim → Pegel → Ziel.
 * Die Stimmen hängen an `input`; `level` ist der Gesamtpegel (im Spiel MUSIC_LEVEL, im Test 1).
 */
export function createMusicChain(ctx, dest, level = MUSIC_LEVEL) {
  const input = ctx.createGain();
  input.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -8;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  const trim = ctx.createGain();
  trim.gain.value = MIX_TRIM;
  const out = ctx.createGain();
  out.gain.value = level;
  input.connect(comp);
  comp.connect(trim);
  trim.connect(out);
  out.connect(dest);
  return { input, comp, trim, level: out };
}

const MIN = 0.0001; // Zielwert für exponentielle Ausklänge (0 ist nicht erlaubt)

/**
 * Synth-Bausteine, an einen Kontext gebunden. Jede Stimme nimmt `at` (Startzeit in Kontext-Sekunden)
 * und `bus` (Zielknoten, Standard: `dest`) entgegen und zählt die erzeugten Knoten in `stats`
 * (CPU-Kontrolle: Knoten je Sekunde). Rückgabe der Stimmen: Zahl der gestarteten Oszillatoren.
 */
export class Voices {
  constructor(ctx, dest, seed = 1) {
    this.ctx = ctx;
    this.dest = dest;
    this.stats = { nodes: 0, oscillators: 0 };
    this.rand = mulberry32(seed);
    this.buffers = makeNoiseBuffers(ctx, this.rand);
  }

  get now() { return this.ctx.currentTime; }

  // ---- Knoten-Fabrik (zählt mit) ----
  osc(type, freq, t, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.value = detune;
    this.stats.nodes++; this.stats.oscillators++;
    return o;
  }
  gain(v, t) {
    const g = this.ctx.createGain();
    // auch der Grundwert: vor dem ersten Automationsereignis gälte sonst 1,0 – eine Rauschquelle, deren erstes
    // Sample einen Frame vor `t` liegt, ginge dann mit voller Stärke durch (Knackser bis 2,0 im Mix)
    g.gain.value = v;
    g.gain.setValueAtTime(v, t);
    this.stats.nodes++;
    return g;
  }
  filter(type, freq, q, t) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    this.stats.nodes++;
    return f;
  }
  /** Rauschquelle aus einem der Puffer; zufälliger Startpunkt, damit Schläge nicht identisch klingen. */
  source(buffer, t, dur, loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = loop;
    this.stats.nodes++;
    const offset = loop ? 0 : this.rand() * Math.max(0, buffer.duration - dur - 0.05);
    s.start(t, offset);
    s.stop(t + dur + 0.02);
    return s;
  }
  /** Hüllkurve Anschlag – Halten – Ausklang (exponentiell). */
  envelope(g, t, vol, dur, attack, release) {
    const a = Math.min(attack, dur * 0.5);
    const r = Math.min(release, dur * 0.5);
    g.gain.setValueAtTime(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
  }

  // ---- Allgemeine Bausteine (Effekte) ----

  /**
   * Einzelner Ton mit Hüllkurve.
   * @param {object} o { type, freq, freqEnd, slideTime, curve ([Hz…] Tonhöhenverlauf über slideTime/Dauer),
   *                     duration, attack, release, volume, at, bus, detune }
   */
  tone(o) {
    const t0 = o.at ?? this.now;
    const dur = o.duration ?? 0.1;
    const osc = this.osc(o.type ?? 'square', o.freq, t0, o.detune ?? 0);
    if (o.curve) osc.frequency.setValueCurveAtTime(Float32Array.from(o.curve), t0 + 0.001, (o.slideTime ?? dur) - 0.002);
    else if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t0 + (o.slideTime ?? dur));
    const g = this.gain(MIN, t0);
    this.envelope(g, t0, o.volume ?? 0.3, dur, o.attack ?? 0.005, o.release ?? 0.04);
    osc.connect(g);
    g.connect(o.bus ?? this.dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return 1;
  }

  /** Rauschen mit Filter (Treffer, Staub, Wind). */
  noise(o) {
    const t0 = o.at ?? this.now;
    const dur = o.duration ?? 0.08;
    const src = this.source(this.buffers.white, t0, dur, true);
    const filter = this.filter(o.filterType ?? 'lowpass', o.filterFreq ?? 1200, 1, t0);
    if (o.filterEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterEnd), t0 + dur);
    const g = this.gain(o.volume ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(o.bus ?? this.dest);
    return 0;
  }

  // ---- Schlagzeug ----

  /**
   * 909-artige Kick: Sinus mit schnellem Pitch-Drop (160 → 45 Hz) plus kurzer Klick.
   * @param {object} o { at, bus, volume, pitchStart, pitchEnd, decay (s), click (Anteil, 0 = ohne Klick) }
   */
  kick909(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.55;
    const decay = o.decay ?? 0.24, click = o.click ?? 0.4;
    const osc = this.osc('sine', o.pitchStart ?? 160, t);
    osc.frequency.exponentialRampToValueAtTime(o.pitchEnd ?? 48, t + 0.06);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.08);
    g.gain.exponentialRampToValueAtTime(MIN, t + decay);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + decay + 0.02);
    if (click > 0) {
      const src = this.source(this.buffers.white, t, 0.012);
      const cg = this.gain(vol * click, t);
      cg.gain.exponentialRampToValueAtTime(MIN, t + 0.012);
      src.connect(cg); cg.connect(bus);
    }
    return 1;
  }

  /** 909-Tom: Sinus mit Pitch-Drop (1,5 × → 1 × freq), 0,25 s Ausklang. Für Fills (Tonhöhe je Schlag fallend). */
  tom(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.4, f = o.freq ?? 180;
    const osc = this.osc('sine', f * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.25);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + 0.27);
    return 1;
  }

  /** Clap: vier Rauschimpulse (Bandpass 1,5 kHz) im 10-ms-Abstand, dann Ausklang. */
  clap(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.4;
    const src = this.source(this.buffers.clap, t, 0.22);
    const g = this.gain(vol, t);
    for (let i = 1; i <= 3; i++) {
      g.gain.exponentialRampToValueAtTime(vol * 0.12, t + i * 0.01 - 0.001);
      g.gain.setValueAtTime(vol, t + i * 0.01);
    }
    g.gain.setValueAtTime(vol * 0.9, t + 0.04);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.22);
    src.connect(g); g.connect(bus);
    return 0;
  }

  /** Snare: Rauschen (Hochpass) plus Sinus-Körper um 180 Hz. */
  snare(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.35;
    const src = this.source(this.buffers.snare, t, 0.16);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.16);
    src.connect(g); g.connect(bus);
    const body = this.osc('sine', 220, t);
    body.frequency.exponentialRampToValueAtTime(180, t + 0.04);
    const bg = this.gain(vol * 0.7, t);
    bg.gain.exponentialRampToValueAtTime(MIN, t + 0.1);
    body.connect(bg); bg.connect(bus);
    body.start(t); body.stop(t + 0.12);
    return 1;
  }

  /** Geschlossene Hi-Hat (Hochpass-Rauschen, 40 ms). */
  hatClosed(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.34;
    const src = this.source(this.buffers.hat, t, 0.045);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.045);
    src.connect(g); g.connect(bus);
    return 0;
  }

  /** Offene Hi-Hat (0,18 s mit Ausklang). */
  hatOpen(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.3;
    const dur = o.duration ?? 0.18;
    const src = this.source(this.buffers.hat, t, dur);
    const g = this.gain(vol, t);
    g.gain.setValueAtTime(vol * 0.8, t + 0.03);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    src.connect(g); g.connect(bus);
    return 0;
  }

  /** Crash/Ride: breites Rauschen mit langem Ausklang. */
  crash(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.18;
    const w = this.source(this.buffers.white, t, 0.9, true);
    const wg = this.gain(vol, t);
    wg.gain.exponentialRampToValueAtTime(MIN, t + 0.9);
    w.connect(wg); wg.connect(bus);
    const h = this.source(this.buffers.hat, t, 1.2, true);
    const hg = this.gain(vol * 0.8, t);
    hg.gain.exponentialRampToValueAtTime(MIN, t + 1.2);
    h.connect(hg); hg.connect(bus);
    return 0;
  }

  // ---- Tonale Stimmen ----

  /**
   * Hoover-/Supersaw-Lead: 3 oder 5 verstimmte Sägezähne (einer eine Oktave tiefer), Tiefpass mit
   * Filter-Sweep, leichter Pitch-Slide vom Tonanfang. Mit `sub: false` (ohne Oktave darunter) und `bend`
   * nahe 1 (kaum Slide) klingt er als klarer Lead-Synth (Melodie ab Welt 2; der Hoover bleibt Akzent).
   * @param {object} o { at, bus, freq, duration, volume, voices (3|5), detune (Cent), cutoff, q,
   *                     sub (Oktave darunter, Standard true), bend (Start-Tonhöhenfaktor, Standard 0,94) }
   */
  hoover(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const dur = Math.max(0.06, o.duration ?? 0.2), vol = o.volume ?? 0.17;
    const n = o.voices ?? 5, spread = o.detune ?? 14, cutoff = o.cutoff ?? 4500, bend = o.bend ?? 0.94;
    const filt = this.filter('lowpass', 500, o.q ?? 3, t);
    filt.frequency.exponentialRampToValueAtTime(cutoff, t + 0.05);
    filt.frequency.exponentialRampToValueAtTime(Math.max(800, cutoff * 0.5), t + dur);
    const g = this.gain(MIN, t);
    this.envelope(g, t, vol, dur, 0.01, 0.05);
    filt.connect(g); g.connect(bus);
    const dets = n >= 5 ? [-spread, -spread / 3, spread / 3, spread] : [-spread, spread];
    const freqs = dets.map((d) => [f, d]);
    if (o.sub !== false) freqs.push([f / 2, 0]); // eine Oktave tiefer: das Brummen des Hoovers
    freqs.forEach(([fr, d], i) => {
      const osc = this.osc('sawtooth', fr * bend, t, d);
      osc.frequency.exponentialRampToValueAtTime(fr, t + 0.05);
      osc.connect(filt);
      osc.start(t + i * 0.002); // leicht versetzt: keine Phasen-Spitze beim gemeinsamen Start
      osc.stop(t + dur + 0.02);
    });
    return freqs.length;
  }

  /**
   * Brass-/Orchestra-Stab: Akkord aus Sägezähnen mit schnellem Decay, Hochpass und zufallendem Tiefpass.
   * @param {object} o { at, bus, notes: [Hz...], duration, volume, cutoff (Tiefpass-Start), cutoffEnd }
   */
  stab(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const dur = Math.min(0.3, Math.max(0.1, o.duration ?? 0.16)), vol = o.volume ?? 0.15;
    const hp = this.filter('highpass', 220, 0.7, t);
    const lp = this.filter('lowpass', o.cutoff ?? 6000, 1, t);
    lp.frequency.exponentialRampToValueAtTime(o.cutoffEnd ?? 1200, t + dur);
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    hp.connect(lp); lp.connect(g); g.connect(bus);
    o.notes.forEach((f, i) => {
      const osc = this.osc('sawtooth', f * 1.03, t, i % 2 ? 6 : -6);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      osc.connect(hp);
      osc.start(t + i * 0.0015); osc.stop(t + dur + 0.02);
    });
    return o.notes.length;
  }

  /**
   * Rave-Piano: Akkord aus Sägezahn + Rechteck je Ton, schnelle Attack, mittleres Decay, Tiefpass.
   * @param {object} o { at, bus, notes: [Hz...], duration, volume, oscs (1|2 je Ton), cutoff, cutoffEnd }
   */
  ravePiano(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const dur = Math.max(0.12, o.duration ?? 0.4), vol = o.volume ?? 0.12, per = o.oscs ?? 2;
    const lp = this.filter('lowpass', o.cutoff ?? 5000, 0.8, t);
    lp.frequency.exponentialRampToValueAtTime(o.cutoffEnd ?? 1500, t + dur);
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    const decayEnd = t + Math.min(0.25, dur * 0.6);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, decayEnd);
    g.gain.setValueAtTime(vol * 0.35, Math.max(decayEnd, t + dur - 0.04));
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    lp.connect(g); g.connect(bus);
    let count = 0;
    for (const f of o.notes) {
      const saw = this.osc('sawtooth', f, t, -5);
      saw.connect(lp); saw.start(t + count * 0.0015); saw.stop(t + dur + 0.02); count++;
      if (per >= 2) {
        const sq = this.osc('square', f, t, 5);
        sq.connect(lp); sq.start(t + count * 0.0015); sq.stop(t + dur + 0.02); count++;
      }
    }
    return count;
  }

  /**
   * Pumpender Bass: Sägezahn durch Tiefpass (900 → 400 Hz) plus Sub-Sinus auf gleicher Tonhöhe.
   * @param {object} o { at, bus, freq, duration, volume, cutoff (Tiefpass-Start; Ende = 4/9 davon) }
   */
  bass(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const dur = Math.max(0.06, o.duration ?? 0.15), vol = o.volume ?? 0.18, cut = o.cutoff ?? 900;
    const lp = this.filter('lowpass', cut, 2, t);
    lp.frequency.exponentialRampToValueAtTime(cut * 4 / 9, t + dur);
    const g = this.gain(MIN, t);
    this.envelope(g, t, vol, dur, 0.004, 0.04);
    lp.connect(g); g.connect(bus);
    const saw = this.osc('sawtooth', f, t);
    saw.connect(lp); saw.start(t); saw.stop(t + dur + 0.02);
    const sub = this.osc('sine', f, t);
    sub.connect(g); sub.start(t); sub.stop(t + dur + 0.02);
    return 2;
  }

  /**
   * Pad (Weltkarte): Dreieck je Ton plus Rechteck eine Oktave tiefer, langsamer Anschlag, Tiefpass.
   * @param {object} o { at, bus, notes: [Hz...], duration, volume, oscs (1|2 je Ton), bright (Faktor auf den Filterverlauf) }
   */
  pad(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const dur = Math.max(0.3, o.duration ?? 1.5), vol = o.volume ?? 0.05, per = o.oscs ?? 2, br = o.bright ?? 1;
    const lp = this.filter('lowpass', 800 * br, 0.7, t);
    lp.frequency.linearRampToValueAtTime(1800 * br, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(900 * br, t + dur);
    const g = this.gain(MIN, t);
    this.envelope(g, t, vol, dur, Math.min(0.5, dur * 0.3), Math.min(0.6, dur * 0.3));
    lp.connect(g); g.connect(bus);
    let count = 0;
    for (const f of o.notes) {
      const tri = this.osc('triangle', f, t, -6);
      tri.connect(lp); tri.start(t); tri.stop(t + dur + 0.02); count++;
      if (per >= 2) {
        const sq = this.osc('square', f / 2, t, 6);
        sq.connect(lp); sq.start(t); sq.stop(t + dur + 0.02); count++;
      }
    }
    return count;
  }

  /**
   * Rechteck-Orgel (Kirmes-/House-Orgel): je Ton zwei Rechtecke (Grundton + Oktave, leicht verstimmt),
   * Tiefpass, Orgel-Hüllkurve (kurzer Perkussions-Buckel, dann gehalten).
   * @param {object} o { at, bus, notes: [Hz...], duration, volume, cutoff, octave (false = nur Grundton) }
   */
  organ(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const dur = Math.max(0.06, o.duration ?? 0.2), vol = o.volume ?? 0.05;
    const bump = t + Math.min(0.06, dur * 0.5);
    const lp = this.filter('lowpass', o.cutoff ?? 3200, 0.7, t);
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol * 1.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(vol, bump);
    g.gain.setValueAtTime(vol, Math.max(bump, t + dur - 0.03));
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    lp.connect(g); g.connect(bus);
    let count = 0;
    for (const f of o.notes) {
      for (const [fr, det] of o.octave === false ? [[f, 0]] : [[f, -4], [f * 2, 4]]) {
        const sq = this.osc('square', fr, t, det);
        sq.connect(lp); sq.start(t + count * 0.001); sq.stop(t + dur + 0.02); count++;
      }
    }
    return count;
  }

  /**
   * Pluck (Arpeggien, Echo-Noten, Tropfen): ein Oszillator mit schnellem Anschlag und kurzem Ausklang –
   * zwei Knoten je Ton. Klangfarbe über `type` und den dauerhaften Spur-Tiefpass des Themas (fx.lowpass).
   * @param {object} o { at, bus, freq, duration, volume, type ('square'|'sawtooth'|'triangle'|'sine'), decay (s), detune,
   *                     glide (Tonhöhen-Faktor, z.B. 1,6 = Blubbern aufwärts), glideTime (s) }
   */
  pluck(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const vol = o.volume ?? 0.08, decay = o.decay ?? 0.12;
    const end = t + Math.max(0.05, Math.min(o.duration ?? decay * 2, decay * 2.5));
    const osc = this.osc(o.type ?? 'square', o.freq, t, o.detune ?? 0);
    // Tonhöhen-Gleiten (Blubbern aufwärts, Gifttropfen abwärts): Faktor über `glideTime` (Standard: decay)
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq * o.glide), t + Math.min(o.glideTime ?? decay, end - t));
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(vol * 0.3, t + Math.max(0.01, Math.min(decay, end - t - 0.01)));
    g.gain.exponentialRampToValueAtTime(MIN, end);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(end + 0.02);
    return 1;
  }

  /**
   * Hoover-Riser: drei verstimmte Sägezähne (einer eine Oktave tiefer) gleiten über die Dauer um den
   * Faktor `glide` (2 = Oktave aufwärts, 0,5 = abwärts), der Tiefpass öffnet (bzw. schließt) mit, dazu ein
   * Rauschfeger (Bandpass). Aufwärts schwillt er an, abwärts klingt er aus.
   * @param {object} o { at, bus, freq, duration, volume, glide, noise (Pegel des Rauschens, 0 = ohne) }
   */
  riser(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const dur = Math.max(0.1, o.duration ?? 1), vol = o.volume ?? 0.1, glide = o.glide ?? 2;
    const up = glide >= 1;
    const lp = this.filter('lowpass', up ? 600 : 5000, 2, t);
    lp.frequency.exponentialRampToValueAtTime(up ? 6000 : 500, t + dur);
    const g = this.gain(MIN, t);
    if (up) {
      g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.92);
    } else {
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.setValueAtTime(vol, t + dur * 0.4);
    }
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    lp.connect(g); g.connect(bus);
    const parts = [[f, -12], [f, 12], [f / 2, 0]];
    parts.forEach(([fr, d], i) => {
      const osc = this.osc('sawtooth', fr, t, d);
      osc.frequency.exponentialRampToValueAtTime(fr * glide, t + dur);
      osc.connect(lp);
      osc.start(t + i * 0.002); osc.stop(t + dur + 0.02);
    });
    const nv = o.noise ?? vol * 0.5;
    if (nv > 0) {
      const src = this.source(this.buffers.white, t, dur, true);
      const bp = this.filter('bandpass', up ? 500 : 5000, 1.2, t);
      bp.frequency.exponentialRampToValueAtTime(up ? 7000 : 400, t + dur);
      const ng = this.gain(MIN, t);
      ng.gain.exponentialRampToValueAtTime(nv, t + dur * (up ? 0.95 : 0.1));
      ng.gain.exponentialRampToValueAtTime(MIN, t + dur);
      src.connect(bp); bp.connect(ng); ng.connect(bus);
    }
    return parts.length;
  }

  // ---- Stimmen seit Welt 2 ----

  /**
   * Glocke (Glockenspiel, Schlittenglöckchen, Piep): Sinus-Grundton plus ein Teilton im Verhältnis `ratio`
   * (2,76 = unharmonischer Metallstab; 2 = Oktave, klarer „Piep“), der schneller verklingt. Harter Anschlag,
   * exponentieller Ausklang über `decay` (auf −20 dB) und noch einmal so lang bis zur Stille. Vier Knoten.
   * @param {object} o { at, bus, freq, volume, decay (s), ratio, partial (Pegel des Teiltons relativ), type (Grundton) }
   */
  bell(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const vol = o.volume ?? 0.07, decay = Math.max(0.03, o.decay ?? 0.5), ratio = o.ratio ?? 2.76, part = o.partial ?? 0.45;
    const end = t + decay * 2;
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(vol * 0.1, t + decay);
    g.gain.exponentialRampToValueAtTime(MIN, end);
    g.connect(bus);
    const osc = this.osc(o.type ?? 'sine', f, t);
    osc.connect(g); osc.start(t); osc.stop(end + 0.02);
    const pg = this.gain(MIN, t);
    pg.gain.linearRampToValueAtTime(part, t + 0.002);
    pg.gain.exponentialRampToValueAtTime(MIN, t + Math.max(0.02, decay * 0.6));
    pg.connect(g);
    const p = this.osc('sine', f * ratio, t);
    p.connect(pg); p.start(t); p.stop(t + decay * 0.6 + 0.02);
    return 2;
  }

  /**
   * Pfeife/Theremin: Sinus (oder Dreieck), gleitet aus `slide` Halbtönen darunter in den Ton, Vibrato über
   * einen LFO auf `detune`, das verzögert einsetzt (Western-Pfiff: wenig, Spuk-Theremin: viel). Vier Knoten.
   * @param {object} o { at, bus, freq, duration, volume, type, vibrato (Cent), rate (Hz), slide (Halbtöne), attack }
   */
  whistle(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const dur = Math.max(0.08, o.duration ?? 0.3), vol = o.volume ?? 0.09;
    const osc = this.osc(o.type ?? 'sine', f * Math.pow(2, -(o.slide ?? 1) / 12), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.07, dur * 0.3));
    const lfo = this.osc('sine', o.rate ?? 5.5, t);
    const depth = this.gain(0, t);
    depth.gain.linearRampToValueAtTime(o.vibrato ?? 15, t + Math.min(0.3, dur * 0.6));
    lfo.connect(depth); depth.connect(osc.detune);
    const g = this.gain(MIN, t);
    this.envelope(g, t, vol, dur, o.attack ?? 0.03, 0.06);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + dur + 0.02);
    lfo.start(t); lfo.stop(t + dur + 0.02);
    return 2;
  }

  /** Darbuka „Doum“: tiefer, runder Schlag in der Fellmitte – Sinus mit schnellem Tonhöhen-Fall. Zwei Knoten. */
  doum(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.42, f = o.freq ?? 105, decay = o.decay ?? 0.3;
    const osc = this.osc('sine', f * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.05);
    g.gain.exponentialRampToValueAtTime(MIN, t + decay);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + decay + 0.02);
    return 1;
  }

  /** Darbuka „Tek“: heller Randschlag – Bandpass-Rauschen (Clap-Puffer) mit kurzem Ping. Vier Knoten. */
  tek(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.24, f = o.freq ?? 720;
    const src = this.source(this.buffers.clap, t, 0.05);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.05);
    src.connect(g); g.connect(bus);
    const osc = this.osc('triangle', f * 1.25, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.012);
    const og = this.gain(vol * 0.6, t);
    og.gain.exponentialRampToValueAtTime(MIN, t + 0.07);
    osc.connect(og); og.connect(bus);
    osc.start(t); osc.stop(t + 0.09);
    return 1;
  }

  /** Uhr-Ticken: trockener Klick (Rechteck mit sehr schnellem Tonhöhen-Fall); `tock` klingt tiefer. Zwei Knoten. */
  tick(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.12;
    const f = (o.freq ?? 2600) * (o.tock ? 0.72 : 1);
    const osc = this.osc('square', f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.014);
    const g = this.gain(vol, t);
    g.gain.exponentialRampToValueAtTime(MIN, t + (o.decay ?? 0.03));
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + (o.decay ?? 0.03) + 0.02);
    return 1;
  }

  /** Schellen (Schlitten-/Schellenkranz): Hi-Hat-Rauschen mit weichem Anschlag und kurzem Rasseln. Zwei Knoten. */
  jingle(o = {}) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, vol = o.volume ?? 0.2, dur = o.duration ?? 0.14;
    const src = this.source(this.buffers.hat, t, dur);
    const g = this.gain(MIN, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.007);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.03);
    g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.045);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    src.connect(g); g.connect(bus);
    return 0;
  }
}

/**
 * Dauerhafte Effekt-Busse eines Themas (einmal je Themenstart, nicht je Note):
 *  - `fx.lowpass: { spur: Hz }` – fester Tiefpass auf einer Spur (z.B. gedämpfte Leads in der Höhle).
 *  - `fx.delay: { steps: [3, 4], feedback, lowpass, wet, send: { spur: Anteil } }` – Echo/Hall-Bus:
 *    Hochpass (250 Hz) → je Abgriff eine Verzögerung (Länge in Sechzehnteln, tempo-synchron) mit
 *    Rückkopplung über einen Tiefpass im Rückweg (jedes Echo dunkler) → Nass-Pegel → Musik-Eingang.
 * Spuren sind die tonalen Spuren (lead, piano, arp, echo …) oder Schlagzeug-Teile (kick, clap, snare,
 * hat, tom, crash). Ohne `fx` liefert die Funktion keine Busse – alle Stimmen gehen direkt auf `dest`.
 * `destOf(spur)` (optional, Klang-Varianten) wählt das Ziel je Spur-Bus; ohne gehen alle auf `dest`.
 * @returns {{ buses: Object<string, AudioNode>, nodes: AudioNode[], tail: number }}
 */
export function createThemeBus(ctx, fx, stepDur, dest, destOf = null) {
  const buses = {}, nodes = [];
  let tail = 0;
  if (!fx) return { buses, nodes, tail };
  const track = (name) => {
    if (!buses[name]) {
      const g = ctx.createGain();
      g.connect(destOf ? destOf(name) : dest); // destOf: Ziel je Spur (Klang-Variante, z.B. Melodie-Weg)
      nodes.push(g);
      buses[name] = g;
    }
    return buses[name];
  };
  for (const [name, hz] of Object.entries(fx.lowpass ?? {})) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = hz;
    f.Q.value = 0.7;
    f.connect(track(name));
    nodes.push(f);
    buses[name] = f; // Stimmen gehen in den Filter, der Filter in den Spur-Bus
  }
  const d = fx.delay;
  if (d && d.send) {
    const input = ctx.createBiquadFilter();
    input.type = 'highpass';
    input.frequency.value = 250;
    const wet = ctx.createGain();
    wet.gain.value = d.wet ?? 0.5;
    wet.connect(dest);
    nodes.push(input, wet);
    // Mehrere Abgriffe bilden ein kleines Rückkopplungsnetz: jede Leitung speist alle Leitungen mit
    // feedback/n zurück (Schleifenverstärkung = feedback < 1, stabil); die Echos fallen dadurch auf alle
    // Summen der Abgriffslängen (3, 4, 6, 7, 8 … Sechzehntel) – dichter und hallartiger als ein Einzel-Echo.
    const fb = Math.min(0.85, d.feedback ?? 0.4);
    const taps = Array.isArray(d.steps) ? d.steps : [d.steps ?? 3];
    const lines = taps.map((steps) => {
      const time = steps * stepDur;
      const line = ctx.createDelay(Math.max(1, time + 0.1));
      line.delayTime.value = time;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = d.lowpass ?? 2000;
      input.connect(line); line.connect(lp); lp.connect(wet);
      nodes.push(line, lp);
      return { line, lp, time };
    });
    for (const from of lines) {
      for (const to of lines) {
        const back = ctx.createGain();
        back.gain.value = fb / lines.length;
        from.lp.connect(back); back.connect(to.line);
        nodes.push(back);
      }
    }
    const avg = lines.reduce((s, l) => s + l.time, 0) / lines.length;
    tail = avg * Math.log(0.001) / Math.log(Math.max(0.05, fb));
    for (const [name, amount] of Object.entries(d.send)) {
      const out = buses[name] ?? track(name);
      const send = ctx.createGain();
      send.gain.value = amount;
      out.connect(send); send.connect(input);
      nodes.push(send);
    }
  }
  return { buses, nodes, tail };
}

/** Effekt-Busse eines Themas nach dem Ausklingen lösen (der Hall darf nach `stop()` noch nachklingen). */
export function releaseThemeBus(bus) {
  if (!bus || !bus.nodes.length) return;
  setTimeout(() => { for (const n of bus.nodes) { try { n.disconnect(); } catch (_) { /* egal */ } } }, (Math.min(bus.tail, 6) + 0.5) * 1000);
}

// ---------------------------------------------------------------- Klang-Varianten ----

/**
 * Klang-Varianten des Musiksystems (Remix-Welten Pilz und Blume): dieselbe Komposition, nur Klangbearbeitung bzw. Tempo.
 * `music.play(thema, { variant })` – ohne Variante entsteht kein einziger zusätzlicher Knoten (Klang wie bisher).
 *   tempo   Faktor auf das Tempo (die Taktuhr läuft mit)
 *   fx      Faktoren auf das Echo/den Hall des Themas ({ wet, feedback } für fx.delay)
 *   tracks  Pegel je Spur bzw. Schlagzeug-Teil (vor dem Effekt-Bus des Themas, z.B. { bell: 0.55, hat: 0.6 })
 *   filters Filterkette auf die Summe: [Typ, Hz, Q, dB] (Biquad: lowpass, highpass, lowshelf, highshelf, peaking)
 *   melody  eigener, milderer Weg für die Melodie-Spuren { tracks, lowpass, gain } – die Hook bleibt hörbar
 *   reverb  Hall (Faltung mit erzeugter Impulsantwort): { seconds (Nachhallzeit), damp (Hz), wet, dry }
 *   rumble  tiefes Brummen (gefiltertes Rauschen, langsam schwellend): { freq, level }
 *   crackle leises Knistern (Pegel), drive Sättigung (altes Radio), mono Monosumme
 *   birds   Vogel-Zwitschern (Tupfer im Takt der Musik), gain Ausgleichspegel (Lautheit wie ohne Variante)
 */
export const MUSIC_VARIANTS = {
  // Nacht: Tiefpass, mehr Hall, weicheres Schlagzeug (Hats, Becken, Clap leiser), Glitzer-Glöckchen leiser
  nacht: {
    filters: [['lowpass', 2300, 0.6]],
    melody: { tracks: ['lead', 'whistle', 'organ'], lowpass: 4000, gain: 1 },
    tracks: { bell: 0.55, echo: 0.6, jingle: 0.6, hat: 0.55, crash: 0.6, clap: 0.8, snare: 0.8, tek: 0.8 },
    reverb: { seconds: 2.6, damp: 2600, wet: 0.45, dry: 0.95 },
    gain: 1.1,
  },
  // Abend: warm (Tiefen leicht angehoben), gedämpfte Höhen, sanfter Hall
  abend: {
    filters: [['lowshelf', 220, 0.7, 2.5], ['highshelf', 3200, 0.7, -6], ['lowpass', 7500, 0.6]],
    tracks: { hat: 0.85, crash: 0.8 },
    reverb: { seconds: 1.8, damp: 3200, wet: 0.3, dry: 1 },
    gain: 0.9,
  },
  // Morgen: hell und luftig (Höhen angehoben, Tiefen etwas leichter), kurzer heller Hall, Glöckchen vorn, Vogel-Zwitschern
  morgen: {
    filters: [['lowshelf', 140, 0.7, -2], ['highshelf', 5000, 0.7, 5]],
    tracks: { bell: 1.3, echo: 1.25, arp: 1.12 },
    reverb: { seconds: 1.3, damp: 7000, wet: 0.24, dry: 1 },
    birds: 0.04,
    gain: 1.1,
  },
  // Tag: hell und trocken (Höhen leicht angehoben, Echo/Hall des Themas zurückgenommen)
  tag: {
    filters: [['highshelf', 6000, 0.7, 3]],
    fx: { wet: 0.4, feedback: 0.7 },
    gain: 1,
  },
  // Dunkel: starker Tiefpass, tiefes Brummen, sehr viel Hall – die Melodie nimmt einen milderen Weg und bleibt hörbar
  dunkel: {
    filters: [['lowpass', 950, 0.7], ['lowpass', 950, 0.7], ['lowshelf', 120, 0.7, 4]],
    melody: { tracks: ['lead', 'whistle', 'bell', 'organ'], lowpass: 2000, gain: 1.3 },
    tracks: { hat: 0.5, crash: 0.5, jingle: 0.5, arp: 0.75, stabs: 0.75, pad: 0.8, echo: 0.7 },
    reverb: { seconds: 3.4, damp: 1400, wet: 0.95, dry: 0.85 },
    rumble: { freq: 110, level: 0.06 },
    gain: 0.85,
  },
  // Schnell: Tempo +8 %, sonst unverändert (Taktuhr entsprechend schneller)
  schnell: { tempo: 1.08 },
  // Schwarz-Weiß: altes Radio – Bandpass (300 Hz – 3 kHz, nasal), leichte Sättigung, leises Knistern, Mono
  schwarzweiss: {
    filters: [['highpass', 320, 0.7], ['highpass', 320, 0.7], ['peaking', 1400, 1, 4], ['lowpass', 3000, 0.7], ['lowpass', 3000, 0.7]],
    drive: 1.8,
    crackle: 0.05,
    mono: true,
    gain: 1.05,
  },
};
export const VARIANT_NAMES = Object.keys(MUSIC_VARIANTS);

/** Braucht die Variante eine Klangkette (sonst nur Tempo/Themen-Daten)? */
export function variantHasChain(name) {
  const v = MUSIC_VARIANTS[name];
  return !!v && !!(v.filters || v.melody || v.tracks || v.reverb || v.rumble || v.crackle || v.drive || v.mono || v.birds || (v.gain && v.gain !== 1));
}

const IR_CACHE = new WeakMap(); // Kontext → Impulsantworten (Live-Kontext: einmal je Variante erzeugen)

/**
 * Impulsantwort für den Hall: zwei unkorrelierte Rausch-Kanäle (Breite), exponentiell auf −60 dB nach `seconds`, mit der
 * Zeit dunkler (Tiefpass fällt von 2·damp auf 0,4·damp), 12 ms Vorverzögerung, kurzes Einblenden. Normiert auf Verstärkung
 * ≈ 1 im Durchlassbereich (Energie π·1,2·damp/sr je Kanal): `wet` ist dann der Hall-Anteil eines gehaltenen Tons.
 */
function reverbImpulse(ctx, { seconds, damp }, seed) {
  let cache = IR_CACHE.get(ctx);
  if (!cache) { cache = new Map(); IR_CACHE.set(ctx, cache); }
  const key = `${seconds}:${damp}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate, len = Math.ceil((seconds + 0.05) * sr), pre = Math.round(0.012 * sr), fade = Math.round(0.004 * sr);
  const buf = ctx.createBuffer(2, len, sr);
  let energy = 0;
  for (let ch = 0; ch < 2; ch++) {
    const rand = mulberry32(seed * 977 + ch * 7919 + 1), d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const fc = damp * (0.4 + 1.6 * Math.exp(-3 * t / seconds));
      lp += (1 - Math.exp(-2 * Math.PI * fc / sr)) * ((rand() * 2 - 1) - lp);
      d[i] = lp * Math.exp(-6.9 * t / seconds) * Math.min(1, (i - pre) / fade);
      energy += d[i] * d[i];
    }
  }
  const k = Math.sqrt(Math.min(1, Math.PI * 1.2 * damp / sr) / (energy / 2 || 1));
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] *= k; }
  cache.set(key, buf);
  return buf;
}

/** Tiefes Brummen: braunes Rauschen (2 s, im Loop), Spitze 1. */
function rumbleBuffer(ctx, seed) {
  const sr = ctx.sampleRate, len = 2 * sr, b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), rand = mulberry32(seed);
  let y = 0;
  for (let i = 0; i < len; i++) { y = 0.985 * y + 0.12 * (rand() * 2 - 1); d[i] = y; }
  // Loop-Naht glätten: die ersten und letzten 50 ms überblenden
  const x = Math.round(0.05 * sr);
  for (let i = 0; i < x; i++) { const w = i / x; d[i] = d[i] * w + d[len - x + i] * (1 - w); }
  normalize(d);
  return b;
}

/** Knistern alter Radios/Platten: leises Rauschen plus unregelmäßige kurze Knackser (3 s, im Loop), Spitze 1. */
function crackleBuffer(ctx, seed) {
  const sr = ctx.sampleRate, len = 3 * sr, b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), rand = mulberry32(seed);
  for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * 0.05;
  const clicks = 66, w = Math.max(8, Math.round(0.0006 * sr));
  for (let c = 0; c < clicks; c++) {
    const p = Math.floor(rand() * (len - w)), a = (0.2 + 0.8 * rand() ** 3) * (rand() < 0.5 ? -1 : 1);
    for (let j = 0; j < w; j++) d[p + j] += a * Math.exp(-j / (w / 4)) * (j % 2 ? -0.7 : 1);
  }
  normalize(d);
  return b;
}

/** Weiche Sättigung (tanh): leise Signale unverändert (Steigung 1), laute Spitzen werden rund abgeflacht. */
function softClip(drive) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(drive * x) / drive; }
  return c;
}

// Vogel-Zwitschern (Variante `morgen`): Schritt im 8-Takt-Zyklus → [Hz, Gleiten]; kurze Sinus-Tupfer, die hinauf (oder
// hinab) gleiten – leise, zwischen den Zählzeiten
const BIRDS = { 6: [3400, 1.35], 7: [4100, 1.3], 38: [3700, 0.8], 70: [3200, 1.4], 71: [3900, 1.35], 72: [4400, 1.25], 102: [3600, 0.8], 118: [3100, 1.4], 119: [3800, 1.3] };

/**
 * Klangkette einer Variante zwischen den Stimmen eines Themas und `dest` (Musik-Eingang vor dem Kompressor):
 *   input ─ Filterkette ─┐                     ┌─ trocken ─┐
 *   melodyIn ─ Tiefpass ─┴─ pre ───────────────┤           ├─ post ─ (Sättigung) ─ Pegel (mono) ─ dest
 *                                              └─ Hall ────┘   ↑ Brummen, Knistern
 * `wire(themeBuses)` legt die Spur-Pegel vor die Effekt-Busse des Themas und liefert die Bus-Tabelle für den Sequencer;
 * `destOf(spur)` ist das Ziel der Spur-Busse (Melodie-Weg oder input); `extra(step, t, voices)` spielt Zusätze im Takt
 * (Vogel-Zwitschern). Alle Knoten stehen in `nodes` (lösen mit releaseVariantChain), Dauerquellen in `sources`.
 */
export function createVariantChain(ctx, name, dest, seed = 11) {
  const v = MUSIC_VARIANTS[name];
  const nodes = [], sources = [], t0 = ctx.currentTime;
  const keep = (n) => { nodes.push(n); return n; };
  const gainOf = (value) => { const g = keep(ctx.createGain()); g.gain.value = value; return g; };
  const biquad = ([type, freq, q = 0.7, db = 0]) => { const f = keep(ctx.createBiquadFilter()); f.type = type; f.frequency.value = freq; f.Q.value = q; f.gain.value = db; return f; };
  const series = (from, specs) => specs.reduce((prev, s) => { const f = biquad(s); prev.connect(f); return f; }, from);
  const loopSource = (buffer) => { const s = keep(ctx.createBufferSource()); s.buffer = buffer; s.loop = true; s.start(t0); sources.push(s); return s; };

  const input = gainOf(1), pre = gainOf(1), post = gainOf(1);
  series(input, v.filters ?? []).connect(pre);
  let melodyIn = null;
  if (v.melody) { melodyIn = gainOf(v.melody.gain ?? 1); series(melodyIn, [['lowpass', v.melody.lowpass, 0.7]]).connect(pre); }
  let tail = 0.2;
  if (v.reverb) {
    const dry = gainOf(v.reverb.dry ?? 1), wet = gainOf(v.reverb.wet), send = biquad(['highpass', 220, 0.7]); // Kick/Bass bleiben trocken
    const conv = keep(ctx.createConvolver());
    conv.normalize = false;
    conv.buffer = reverbImpulse(ctx, v.reverb, seed);
    pre.connect(dry); dry.connect(post);
    pre.connect(send); send.connect(conv); conv.connect(wet); wet.connect(post);
    tail = v.reverb.seconds + 0.1;
  } else pre.connect(post);
  if (v.rumble) {
    const lp = biquad(['lowpass', v.rumble.freq, 0.7]), g = gainOf(v.rumble.level);
    loopSource(rumbleBuffer(ctx, seed + 3)).connect(lp); lp.connect(g); g.connect(post);
    const lfo = keep(ctx.createOscillator()), depth = gainOf(v.rumble.level * 0.6);
    lfo.frequency.value = 0.11; lfo.connect(depth); depth.connect(g.gain); lfo.start(t0); sources.push(lfo);
  }
  if (v.crackle) {
    const hp = biquad(['highpass', 900, 0.7]), g = gainOf(v.crackle);
    loopSource(crackleBuffer(ctx, seed + 5)).connect(hp); hp.connect(g); g.connect(post);
  }
  let last = post;
  if (v.drive) { const ws = keep(ctx.createWaveShaper()); ws.curve = softClip(v.drive); post.connect(ws); last = ws; }
  const out = gainOf(v.gain ?? 1);
  if (v.mono) { out.channelCount = 1; out.channelCountMode = 'explicit'; out.channelInterpretation = 'speakers'; }
  last.connect(out);
  out.connect(dest);

  const melodic = new Set(v.melody?.tracks ?? []);
  const destOf = (track) => (melodyIn && melodic.has(track) ? melodyIn : input);
  const wire = (themeBuses = {}) => {
    const buses = { ...themeBuses };
    for (const k of new Set([...Object.keys(v.tracks ?? {}), ...melodic])) {
      const target = themeBuses[k] ?? destOf(k);
      if (v.tracks?.[k] === undefined) { buses[k] = target; continue; }
      const g = gainOf(v.tracks[k]);
      g.connect(target);
      buses[k] = g;
    }
    return buses;
  };
  const extra = v.birds ? (step, t, voices) => {
    const b = BIRDS[step % 128];
    return b ? voices.pluck({ at: t, bus: input, freq: b[0], type: 'sine', volume: v.birds, decay: 0.03, duration: 0.07, glide: b[1], glideTime: 0.045 }) : 0;
  } : null;
  return { name, input, melodyIn, out, nodes, sources, tail, destOf, wire, extra, mono: !!v.mono };
}

/** Klangkette nach dem Ausklingen lösen (`after`: Nachklang davor liegender Busse, z.B. das Echo des Themas). */
export function releaseVariantChain(chain, after = 0) {
  if (!chain) return;
  const wait = Math.min(8, chain.tail + after) + 0.5;
  const ctx = chain.input.context;
  for (const s of chain.sources) { try { s.stop(ctx.currentTime + wait); } catch (_) { /* egal */ } }
  setTimeout(() => { for (const n of chain.nodes) { try { n.disconnect(); } catch (_) { /* egal */ } } }, wait * 1000 + 100);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicIn = null;    // Summe der Musikstimmen (vor dem Kompressor)
    this.musicComp = null;  // Kompressor/Limiter der Musik
    this.musicBus = null;   // Gesamtpegel der Musik (MUSIC_LEVEL)
    this.voices = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { /* egal */ }
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
        const chain = createMusicChain(this.ctx, this.master, MUSIC_LEVEL);
        this.musicIn = chain.input;
        this.musicComp = chain.comp;
        this.musicBus = chain.level;
        this.voices = new Voices(this.ctx, this.sfxBus, 1);
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

  /**
   * Kontextzeit, die gerade aus dem Lautsprecher kommt: `currentTime` ist die Zeit des nächsten zu
   * rechnenden Blocks, hörbar wird er erst nach Verarbeitungs- und Ausgabelatenz. Bevorzugt über
   * `getOutputTimestamp()` (Kontextzeit ↔ performance.now() des Ausgabezeitpunkts, fortgeschrieben),
   * sonst `currentTime − baseLatency − outputLatency`. Läuft der Kontext nicht, steht die Zeit.
   */
  audibleTime() {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const now = ctx.currentTime;
    let t = now - (ctx.baseLatency || 0) - (ctx.outputLatency || 0);
    if (ctx.state === 'running' && typeof ctx.getOutputTimestamp === 'function') {
      try {
        const ts = ctx.getOutputTimestamp();
        if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
          const est = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
          if (est <= now + 0.005 && est > now - 1) t = est; // plausibel: nie vor dem Rechenstand, höchstens 1 s Latenz
        }
      } catch (_) { /* ältere Browser */ }
    }
    return Math.max(0, Math.min(now, t));
  }

  /** Zähler der erzeugten Knoten/Oszillatoren (Live-Kontext, Effekte und Musik zusammen). */
  get stats() { return this.voices ? this.voices.stats : { nodes: 0, oscillators: 0 }; }

  /** Einzelner Ton mit Hüllkurve (siehe Voices.tone); Ziel standardmäßig der Effekt-Bus. */
  tone(o) { if (this.ready) this.voices.tone(o); }

  /** Rauschen mit Filter (siehe Voices.noise). */
  noise(o) { if (this.ready) this.voices.noise(o); }
}

export const engine = new AudioEngine();
