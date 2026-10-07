import { POWER_COLORS } from '../palette.js';

// Pflaume – runder, dicker lila Käfer als Reittier (24x20, blickt nach rechts, Füße auf der untersten Zeile).
// Hitbox allein 14x12 mittig unten. Beim Reiten liegen die Füße der Heldin auf Zeile 7, der Panzerrücken
// (Zeilen 2-6) ist die Sitzfläche. 'Z'/'z' = Panzerflecken, werden je Beeren-Kraft umgefärbt (variants).

const W = 24, H = 20;
const E = '.'.repeat(W);

/** Malt `rows` ('.' = durchsichtig) ab Zeile dy / Spalte dx auf `base`. */
function paint(base, rows, dx = 0, dy = 0) {
  const out = base.map((r) => r.split(''));
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const c = r[x];
      const yy = y + dy, xx = x + dx;
      if (c === '.' || yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
      out[yy][xx] = c;
    }
  });
  return out.map((r) => r.join(''));
}
const compose = (...layers) => layers.reduce((acc, [rows, dx = 0, dy = 0]) => paint(acc, rows, dx, dy), Array(H).fill(E));

// Körper (Zeilen 0-16): Panzer links/mitte, Kopf mit großem Auge vorn rechts, zwei Fühler
//        012345678901234567890123
const BODY = [
  '.................kk...kk', // 0  Fühlerknöpfe
  '..................k...k.', // 1
  '.......kkkkkkk....k...k.', // 2  Panzerrücken (Sitzfläche)
  '.....kkULUUuvvkk..k...k.', // 3
  '....kULLUUuvvvvvk..k.k..', // 4
  '...kULUUuvvvZZvvvk.k.k..', // 5
  '..kUUUuvvvvvZZvvvvkkk...', // 6
  '..kUuuvvvvvvvvvvvkkkkk..', // 7  Kopf: Stirn
  '.kUuvvvvvvvvvvvvvkaAAAk.', // 8
  '.kuvvZZvvvvvvvvvkaAWWWak', // 9  Auge
  '.kuvvZZvvvvvvvZZkaAWKKak', // 10
  '.kuvvvvvvvvvvvZZkaaWKKak', // 11
  '.kVvvvvvvvZZvvvvkaaWWWak', // 12
  '.kVvvvvvvvZZvvvVkapaakak', // 13 Wange, Mund
  '..kVvvvvvvvvvvvVVkaaaak.', // 14
  '...kVVvvvvvvvvVVkkkkkk..', // 15
  '....kkkVVVVVVVkkk.......', // 16
];
// Beine: drei kräftige Beinchen mit Füßen (Zeilen 16-19)
const LEGS_A = [
  '.....kk...kk....kk......', // 16
  '....kk....kk.....kk.....', // 17
  '....kk...kk.......kk....', // 18
  '...kkk..kkk.......kkk...', // 19
];
const LEGS_B = [
  '.....kk...kk....kk......', // 16
  '.....kk..kk.....kk......', // 17
  '......kk.kk....kk.......', // 18
  '.....kkk.kkk..kkk.......', // 19
];
const LEGS_TUCK = [
  '.....kk...kk....kk......', // 16
  '....kkk..kkk...kkk......', // 17
  E, E,
];
const LEGS_PANIC = [
  '....kk....kk.....kk.....', // 16
  '...kk....kk.......kk....', // 17
  '..kk....kk.........kk...', // 18
  '.kkk...kkk.........kkk..', // 19
];

// Panik: Augen weit aufgerissen, Mund offen (Zeilen 7-14)
const PANIC_FACE = [
  '..................kkkk..', // 7
  '.................kAWWWk.', // 8
  '................kAWWWWWk', // 9
  '................kaWWWKWk', // 10
  '................kaWWWWWk', // 11
  '................kaaWWWak', // 12
  '................kaammaak', // 13 Mund offen
  '.................kammak.', // 14
  '..................kkkk..', // 15
];
// Schweißtropfen (Zeilen 1-4)
const SWEAT = [
  '..............II........', // 1
  '.............IJI...II...', // 2
  '..............I...IJI...', // 3
  '...................I....', // 4
];
// Flug: zarte blaue Flügel schräg nach hinten-oben ausgeklappt
const WINGS = [
  'kkkk....................', // 0
  'kJJIkkk.................', // 1
  'kJJJIIIkkk..............', // 2
  'kJIJJIIJIIIkkk..........', // 3
  'kIIJIIJIIIIIIIkk........', // 4
  '.kkIIIIJIIIIIIIkk.......', // 5
  '...kkkIIIIIIIIIkk.......', // 6
  '......kkkkkkkkkk........', // 7
];

const FRAMES = {
  idle0: compose([BODY], [LEGS_A, 0, 16]),
  idle1: compose([BODY, 0, 1], [LEGS_A, 0, 16]),
  walk0: compose([BODY], [LEGS_A, 0, 16]),
  walk1: compose([BODY, 0, -1], [LEGS_B, 0, 16]),
  panic: compose([BODY], [PANIC_FACE, 0, 7], [SWEAT, 0, 1], [LEGS_PANIC, 0, 16]),
  fly: compose([WINGS, 0, -1], [BODY], [LEGS_TUCK, 0, 16]),
};

// k Umriss/Beine · V/v/U/L Panzer (Schatten/Grund/Licht/Glanz) · u Panzer Halbschatten
// Z/z Flecken (Kraftfarbe) · a/A Kopf (Grund/Licht) · W/K Auge · p Wange · m Mund · I/J Flügel & Schweiß
const PALETTE = {
  '.': null,
  'k': '#1e1428',
  'V': '#3b2460', 'v': '#6f52b8', 'u': '#5a3e9a', 'U': '#9b7ae0', 'L': '#d9b8f0',
  'Z': '#b47fe6', 'z': '#d9b8f0',
  'a': '#a98be0', 'A': '#cdb6f0',
  'W': '#ffffff', 'K': '#120a06', 'p': '#ff9fb0', 'm': '#5a1f3a',
  'I': '#6ea8ff', 'J': '#c8e4ff',
};

export const SHEETS = [
  { key: 'pflaume', frameWidth: W, frameHeight: H, frames: FRAMES, palette: PALETTE, variants: POWER_COLORS },
];
