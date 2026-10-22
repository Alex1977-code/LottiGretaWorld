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
