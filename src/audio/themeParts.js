// Bausteine für die Kurs-Themen ab Welt 2 (Takt-Strings im Format von themes.js: "Note:Dauer", Dauer in
// Sechzehnteln, Akkorde mit "+", "-" = Pause; Drums 16 Zeichen je Ebene).
//
// Schreibweise mit Rhythmus-Raster (Leerzeichen und | im Raster dienen nur der Lesbarkeit):
//   mel('D5 Eb5 F#5', 'x_x. x___ ....  ....')  x = nächster Ton (Akkord mit +), _ = halten, . = Pause
//   hit('D4+F#4+A4', '..x_ ..x_ ..x_ ..x_') derselbe Akkord auf allen x
//   pat(['E5', 'G#5', 'B5'], '0120 1201 ....')  Ziffern wählen Töne aus der Liste (Arpeggien)
//   dr('k... k... k... k...')                   Drum-Ebene mit Lesehilfe
// Fehler (zu wenige/zu viele Töne, unbekannte Zeichen) erzeugen ungültige Tokens – die Themen-Validierung
// (music.validateThemes, tests/audio.mjs) meldet sie.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const clean = (r) => r.replace(/[\s|]/g, '');

// ---- Drum-Ebenen ----
export const dr = (s) => clean(s);
export const K4 = dr('k... k... k... k...');   // Four-on-the-floor
export const KH = dr('k... .... k... ....');   // Kick auf 1 und 3 (halbes Tempo-Gefühl)
export const CL = dr('.... c... .... c...');   // Clap auf 2 und 4
export const CL4 = dr('.... .... .... c...');  // Clap nur auf 4
export const HH = dr('hhoh hhoh hhoh hhoh');   // Sechzehntel-Hats, offen auf der „und“
export const H8 = dr('h.h. h.h. h.h. h.h.');   // Achtel-Hats
export const H8O = dr('h.h. h.h. h.h. h.o.');  // Achtel-Hats, offen auf 4+
export const HOF = dr('h.o. h.o. h.o. h.o.');  // zu auf dem Schlag, offen auf der „und“
export const HUP = dr('..h. ..h. ..h. ..h.');  // nur die „und“ (Offbeat)
export const CR = dr('r... .... .... ....');   // Crash auf der Eins

/** n gleiche Elemente (Takte, Ebenen-Arrays). */
export const rep = (n, x) => Array(n).fill(x);
/** n Pausentakte. */
export const rest = (n) => rep(n, '-:16');

/** Melodie über ein Rhythmus-Raster (siehe Kopf). */
export function mel(notes, rhythm) {
  const ns = Array.isArray(notes) ? notes : notes.trim().split(/\s+/).filter(Boolean);
  const out = [];
  let i = 0;
  for (const ch of clean(rhythm)) {
    const last = out[out.length - 1];
    if (ch === 'x') out.push([ns[i++] ?? 'FEHLT', 1]);
    else if (ch === '_' && last) last[1]++;
    else if ((ch === '.' || ch === '-' || ch === '_') && last && last[0] === '-') last[1]++;
    else if (ch === '.' || ch === '-' || ch === '_') out.push(['-', 1]);
    else out.push([`Zeichen${ch}`, 1]);
  }
  if (i < ns.length) out.push([`UEBRIG${ns.length - i}`, 0]);
  return out.map(([n, d]) => `${n}:${d}`).join(' ');
}

/** Derselbe Akkord (oder Ton) auf allen x des Rasters. */
export const hit = (ch, rhythm) => mel(rep((clean(rhythm).match(/x/g) ?? []).length, ch), rhythm);

/** Arpeggio-Muster: Ziffern 0–9 wählen Töne aus `notes`, _ hält, . Pause. */
export function pat(notes, rhythm) {
  const r = clean(rhythm);
  const picked = [...r].filter((c) => c >= '0' && c <= '9').map((c) => notes[+c] ?? 'FEHLT');
  return mel(picked, r.replace(/[0-9]/g, 'x'));
}

/** "C#5" ↔ MIDI (nur für die Bausteine). */
function toMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  return NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
}
const toName = (n, flats) => `${(flats ? FLAT : SHARP)[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

/** Einzeltöne in Oktaven verdoppeln (Rave-Piano-Riff: „B4:3“ → „B4+B5:3“), Akkorde bleiben. */
export const octaves = (bars) => bars.map((bar) => bar.trim().split(/\s+/).map((tok) => {
  const [n, d] = tok.split(':');
  const m = toMidi(n);
  return m === null ? tok : `${n}+${toName(m + 12, n.includes('b'))}:${d}`;
}).join(' '));

/** Takte transponieren (Halbtöne); `flats` schreibt Versetzungen als b. */
export function tr(bars, semis, flats = false) {
  return bars.map((bar) => bar.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    if (n === '-') return tok;
    return `${n.split('+').map((x) => { const m = toMidi(x); return m === null ? x : toName(m + semis, flats || x.includes('b')); }).join('+')}:${d}`;
  }).join(' '));
}

/**
 * Takte um `steps` Sechzehntel verschieben (Kanon, Schatten-Echo). Was hinten hinausfällt, beginnt vorn
 * (`wrap`, Loop) oder entfällt; Töne über eine Taktgrenze werden dort abgeschnitten.
 */
export function shift(bars, steps, wrap = true) {
  const total = bars.length * 16, ev = [];
  let pos = 0;
  for (const bar of bars) {
    for (const tok of bar.trim().split(/\s+/)) {
      const [n, d] = tok.split(':');
      if (n !== '-') ev.push([pos, +d, n]);
      pos += +d;
    }
  }
  const moved = ev.map(([p, d, n]) => [wrap ? (p + steps) % total : p + steps, d, n]).filter(([p]) => p < total).sort((a, b) => a[0] - b[0]);
  return bars.map((_, b) => {
    const start = b * 16, end = start + 16, toks = [];
    let t = start;
    for (const [p, d, n] of moved) {
      if (p < start || p >= end || p < t) continue;
      if (p > t) toks.push(`-:${p - t}`);
      const len = Math.min(d, end - p);
      toks.push(`${n}:${len}`);
      t = p + len;
    }
    if (t < end) toks.push(`-:${end - t}`);
    return toks.join(' ');
  });
}

// ---- Akkorde (Liedform: Akkordfolge je Takt → Begleitspuren) ----
// Akkordsymbole: Grundton + Art + optional Slash-Bass, z.B. 'Am', 'F', 'G7', 'Cmaj7', 'Dsus4', 'E/G#'.
// Ein Takt mit zwei Akkorden wird als 'F G' geschrieben (Wechsel zur Takthälfte).
const QUALITY = [['maj7', [0, 4, 7, 11]], ['madd9', [0, 3, 7, 14]], ['add9', [0, 4, 7, 14]], ['m7', [0, 3, 7, 10]],
  ['m6', [0, 3, 7, 9]], ['sus4', [0, 5, 7]], ['sus2', [0, 2, 7]], ['dim', [0, 3, 6]], ['aug', [0, 4, 8]],
  ['m', [0, 3, 7]], ['7', [0, 4, 7, 10]], ['6', [0, 4, 7, 9]], ['', [0, 4, 7]]];
const pcOf = (s) => NOTE_INDEX[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);

/** Akkordsymbol → { root, pcs (Tonklassen ab Grundton), bass (Tonklasse), flats } */
export function chordOf(sym) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym.trim());
  if (!m) return { root: 0, pcs: [0], bass: 0, flats: false, bad: true };
  const q = QUALITY.find(([k]) => k === m[2]);
  const root = (pcOf(m[1]) + 12) % 12;
  return { root, pcs: (q ? q[1] : [0]).map((i) => root + i), bass: m[3] ? (pcOf(m[3]) + 12) % 12 : root, flats: /b/.test(sym), bad: !q };
}

/** Enge Lage: alle Akkordtöne im Oktavfenster ab `lo` (z.B. voicing('Am', 'G3') → 'A3+C4+E4'). */
export function voicing(sym, lo = 'G3') {
  const c = chordOf(sym), l = toMidi(lo);
  if (c.bad) return `Akkord?${sym}`;
  const ns = c.pcs.map((p) => l + ((((p - l) % 12) + 12) % 12));
  return [...new Set(ns)].sort((a, b) => a - b).map((n) => toName(n, c.flats)).join('+');
}

/** Basston (Grundton bzw. Slash-Bass) zwischen E1 und D#2, `up` Oktaven höher. */
export function bassNote(sym, up = 0) {
  const c = chordOf(sym);
  const n = 28 + ((((c.bass - 28) % 12) + 12) % 12) + 12 * up;
  return toName(n, c.flats);
}

/** Akkorde eines Takts: 'F' oder 'F G' (Wechsel zur Takthälfte) → Akkord je Sechzehntel-Position. */
const chordAt = (syms, i) => { const p = syms.trim().split(/\s+/); return p[Math.min(p.length - 1, Math.floor(i * p.length / 16))]; };

/** Akkord-Takt im Rhythmus-Raster (x = Anschlag, _ halten, . Pause), Lage ab `lo`. */
export function chordBar(syms, rhythm, lo = 'G3') {
  const r = clean(rhythm), ns = [];
  [...r].forEach((ch, i) => { if (ch === 'x') ns.push(voicing(chordAt(syms, i), lo)); });
  return mel(ns, r);
}

/**
 * Bass-Takt nach Muster: L = Grundton tief, H = Oktave darüber, F = Quinte darüber, _ halten, . Pause;
 * Akkordwechsel zur Takthälfte bei 'F G'. Beispiel: bassBar('Am', 'L__H L_H_ L__H L_H_') = hüpfender Oktav-Bass.
 */
export function bassBar(syms, pattern) {
  const r = clean(pattern), ns = [];
  [...r].forEach((ch, i) => {
    const sym = chordAt(syms, i);
    if (ch === 'L') ns.push(bassNote(sym));
    else if (ch === 'H') ns.push(bassNote(sym, 1));
    else if (ch === 'F') { // Quinte des Grundtons über dem Basston
      const c = chordOf(sym), lo = toMidi(bassNote(sym));
      ns.push(toName(lo + 1 + ((((c.root + 7 - lo - 1) % 12) + 12) % 12), c.flats));
    }
  });
  return mel(ns, r.replace(/[LHF]/g, 'x'));
}

/** Pad-Takt: ein liegender Akkord (oder zwei Halbtakt-Akkorde), Lage ab `lo`. */
export const padBar = (syms, lo = 'E3') => syms.trim().split(/\s+/).map((s, _, a) => `${voicing(s, lo)}:${16 / a.length}`).join(' ');

/** Bass-Muster (für bassBar) */
export const B_BOUNCE = 'L__H L_H_ L__H L_H_';  // hüpfender Oktav-Bass (Welt 1)
export const B_PUMP = 'L_H_ L_H_ L_H_ L_H_';    // Oktav-Pump in Achteln
export const B_GALLOP = 'L.H_ L.H_ L.H_ L.H_';  // Galopp
export const B_DRIVE = 'L.LH L.LH L.LH L.LH';   // treibend (tief-tief-hoch)
export const B_HALF = 'L___ ..L_ F___ ..L_';    // ruhig, halbtaktig (Karten, Breakdown)

/** Takte einer Akkordfolge mit einer Funktion füllen (Kurzform für Begleitspuren). */
export const each = (prog, fn) => prog.map((c, i) => fn(c, i));

/**
 * Liedform: `form({ intro: 4, verse: 8, chorus: 8, bridge: 4 })` → Funktion Takt-Index → Abschnittsname.
 * `bySection(prog, sec, { verse: (c) => …, chorus: '…' })` füllt je Abschnitt (fehlend = Pausentakt).
 */
export function form(bounds) {
  const list = [];
  for (const [k, n] of Object.entries(bounds)) for (let i = 0; i < n; i++) list.push(k);
  const sec = (i) => list[i];
  sec.bars = list.length;
  sec.start = (name) => list.indexOf(name);
  return sec;
}
export const bySection = (prog, sec, map) => prog.map((c, i) => {
  const f = map[sec(i)];
  return typeof f === 'function' ? f(c, i - sec.start(sec(i))) : (f ?? '-:16');
});

/** Schlagzeug eines Abschnitts: n Takte Grundmuster (Crash auf der Eins), der letzte Takt ist `fill`. */
export const groove = (n, base, fill = base, crash = true) => [crash ? [...base, CR] : base, ...rep(Math.max(0, n - 2), base), fill].slice(0, n);

// ---- Bass-Figuren ----
/** Oktav-Pump in Achteln (tief/hoch). */
export const pump = (lo, hi) => mel(rep(4, `${lo} ${hi}`).join(' '), 'x_x_ x_x_ x_x_ x_x_');
/** Galopp: Grundton kurz auf dem Schlag, Oktave auf der „und“. */
export const gallop = (lo, hi) => mel(rep(4, `${lo} ${hi}`).join(' '), 'x.x_ x.x_ x.x_ x.x_');
/** Hüpfend (punktiert): tief 3, hoch 1, tief 2, hoch 2 – zweimal. */
export const bounce = (lo, hi) => mel(rep(4, `${lo} ${hi}`).join(' '), 'x__x x_x_ x__x x_x_');
/** Laufender Viertel-Bass, kurz gestoßen (Pizzicato-Gefühl). */
export const walk = (a, b, c, d) => mel(`${a} ${b} ${c} ${d}`, 'x_.. x_.. x_.. x_..');
/** Offbeat-Akkorde auf jeder Achtel-„und“. */
export const offbeat = (ch) => hit(ch, '..x_ ..x_ ..x_ ..x_');
/** Rave-Piano im 3-3-2-Muster. */
export const p332 = (ch) => hit(ch, 'x__x __x_ x__x __x_');
