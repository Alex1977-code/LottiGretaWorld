// Web-Audio-Grundlage: AudioContext (wird bei der ersten Berührung freigeschaltet),
// Busse für Effekte und Musik (Musik läuft über eine Kompressor/Limiter-Stufe) und die
// Synth-Bausteine im Stil der 90er-Eurodance-Zeit: 909-Kick, Clap, Snare, Hi-Hats, Crash, Tom,
// Hoover-/Supersaw-Lead, Brass-Stabs, Rave-Piano, Oktav-Bass, Pad, Rechteck-Orgel, Pluck (Arpeggien,
// Echo-Noten) und Hoover-Riser. Optionen der Stimmen haben Standardwerte, mit denen die älteren Themen
// unverändert klingen; die Kurs-Themen färben über sie (z.B. weiche Kick, gedämpfte Leads).
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
   * Filter-Sweep, leichter Pitch-Slide vom Tonanfang.
   * @param {object} o { at, bus, freq, duration, volume, voices (3|5), detune (Cent), cutoff }
   */
  hoover(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest, f = o.freq;
    const dur = Math.max(0.06, o.duration ?? 0.2), vol = o.volume ?? 0.17;
    const n = o.voices ?? 5, spread = o.detune ?? 14, cutoff = o.cutoff ?? 4500;
    const filt = this.filter('lowpass', 500, o.q ?? 3, t);
    filt.frequency.exponentialRampToValueAtTime(cutoff, t + 0.05);
    filt.frequency.exponentialRampToValueAtTime(Math.max(800, cutoff * 0.5), t + dur);
    const g = this.gain(MIN, t);
    this.envelope(g, t, vol, dur, 0.01, 0.05);
    filt.connect(g); g.connect(bus);
    const dets = n >= 5 ? [-spread, -spread / 3, spread / 3, spread] : [-spread, spread];
    const freqs = dets.map((d) => [f, d]);
    freqs.push([f / 2, 0]); // eine Oktave tiefer: das Brummen des Hoovers
    freqs.forEach(([fr, d], i) => {
      const osc = this.osc('sawtooth', fr * 0.94, t, d);
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
   * @param {object} o { at, bus, freq, duration, volume, type ('square'|'sawtooth'|'triangle'|'sine'), decay (s), detune }
   */
  pluck(o) {
    const t = o.at ?? this.now, bus = o.bus ?? this.dest;
    const vol = o.volume ?? 0.08, decay = o.decay ?? 0.12;
    const end = t + Math.max(0.05, Math.min(o.duration ?? decay * 2, decay * 2.5));
    const osc = this.osc(o.type ?? 'square', o.freq, t, o.detune ?? 0);
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
}

/**
 * Dauerhafte Effekt-Busse eines Themas (einmal je Themenstart, nicht je Note):
 *  - `fx.lowpass: { spur: Hz }` – fester Tiefpass auf einer Spur (z.B. gedämpfte Leads in der Höhle).
 *  - `fx.delay: { steps: [3, 4], feedback, lowpass, wet, send: { spur: Anteil } }` – Echo/Hall-Bus:
 *    Hochpass (250 Hz) → je Abgriff eine Verzögerung (Länge in Sechzehnteln, tempo-synchron) mit
 *    Rückkopplung über einen Tiefpass im Rückweg (jedes Echo dunkler) → Nass-Pegel → Musik-Eingang.
 * Spuren sind die tonalen Spuren (lead, piano, arp, echo …) oder Schlagzeug-Teile (kick, clap, snare,
 * hat, tom, crash). Ohne `fx` liefert die Funktion keine Busse – alle Stimmen gehen direkt auf `dest`.
 * @returns {{ buses: Object<string, AudioNode>, nodes: AudioNode[], tail: number }}
 */
export function createThemeBus(ctx, fx, stepDur, dest) {
  const buses = {}, nodes = [];
  let tail = 0;
  if (!fx) return { buses, nodes, tail };
  const track = (name) => {
    if (!buses[name]) {
      const g = ctx.createGain();
      g.connect(dest);
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

  /** Zähler der erzeugten Knoten/Oszillatoren (Live-Kontext, Effekte und Musik zusammen). */
  get stats() { return this.voices ? this.voices.stats : { nodes: 0, oscillators: 0 }; }

  /** Einzelner Ton mit Hüllkurve (siehe Voices.tone); Ziel standardmäßig der Effekt-Bus. */
  tone(o) { if (this.ready) this.voices.tone(o); }

  /** Rauschen mit Filter (siehe Voices.noise). */
  noise(o) { if (this.ready) this.voices.noise(o); }
}

export const engine = new AudioEngine();
