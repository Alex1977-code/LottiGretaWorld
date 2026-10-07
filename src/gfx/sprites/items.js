import { POWER_COLORS } from '../palette.js';

// Sammelobjekte und Level-Elemente: Münze, HUD-Münze, Schlüssel, Tor, Fahne, Dornen, Checkpoint, Herz, Beere, Feuerball.
// Licht von oben links, dunkle Umrisse im jeweiligen Farbton.

// Große Sammelmünze (12x12), 4 Frames Drehung: voll, 3/4, Kante, 3/4 gespiegelt. Blatt-Prägung (I) mit heller Ader (j).
const COIN_FRAMES = {
  coin0: [
    '....iiii....',
    '..iiJJJJii..',
    '.ihjJJJJJIi.',
    '.ijJJJjJJIi.',
    'ijJJJjhjIJIi',
    'iJJJjjhjjIIi',
    'iJJJjjhjjIIi',
    'iJJJJjjjIJIi',
    '.iJJJJjIJIi.',
    '.iJJJJIJIIi.',
    '..iiJJIIii..',
    '....iiii....',
  ],
  coin1: [
    '....iiii....',
    '...ijJJIi...',
    '..ihJJJJIi..',
    '..ijJjJJIi..',
    '..iJjhjIIi..',
    '..iJjhjIIi..',
    '..iJJjIJIi..',
    '..iJJIJJIi..',
    '..iJJJJIIi..',
    '..iJJJJIIi..',
    '...iJJIIi...',
    '....iiii....',
  ],
  coin2: [
    '.....ii.....',
    '....ijIi....',
    '....ijIi....',
    '....ihIi....',
    '....ijIi....',
    '....ijIi....',
    '....ijIi....',
    '....ijIi....',
    '....iJIi....',
    '....iJIi....',
    '....ijIi....',
    '.....ii.....',
  ],
  coin3: [
    '....iiii....',
    '...ijJJIi...',
    '..ihJJJJIi..',
    '..ijJJjJIi..',
    '..iJJjhjIi..',
    '..iJJjhjIi..',
    '..iJJJjIIi..',
    '..iJJJIJIi..',
    '..iJJJJIIi..',
    '..iJJJJIIi..',
    '...iJJIIi...',
    '....iiii....',
  ],
};

// Kleine HUD-Münze (8x8): voll / leer (nur Umriss mit dunklem Schimmer)
const COIN_HUD_FRAMES = {
  full: [
    '..iiii..',
    '.ihJJIi.',
    'iJJjJIIi',
    'iJjhjIIi',
    'iJJjJIIi',
    'iJJJJIIi',
    '.iJJIIi.',
    '..iiii..',
  ],
  empty: [
    '..QQQQ..',
    '.QqqqqQ.',
    'QqqqqqqQ',
    'QqqqqqqQ',
    'QqqqqqqQ',
    'QqqqqqqQ',
    '.QqqqqQ.',
    '..QQQQ..',
  ],
};

// Schlüssel (12x12): altmodisch, Ring oben, Bart unten rechts
const KEY_FRAMES = {
  key: [
    '....iiii....',
    '...ijJJIi...',
    '..ihJiiJIi..',
    '..iJi..iIi..',
    '..iJi..iIi..',
    '..iJJiiIIi..',
    '...iJJIIi...',
    '....ijIi....',
    '....ijIJIi..',
    '....ijIIi...',
    '....ijIJIi..',
    '....iiii....',
  ],
};

// Tor (16x32): Steinbogen mit gefasten Blöcken, Holztür mit Eisenbändern und goldenem Schlüsselschild.
// Unterkante = Boden (Steinschwelle). `open`: Tür steht offen (schmale Kante links), dahinter dunkler Gang mit warmem Schein.
const PILLAR_BLOCK = ['u', 's', 's', 's', 't', 'o']; // ein Steinblock von oben nach unten, 'o' = Fuge
function pillar(row, offset, shadow) {
  const c = PILLAR_BLOCK[(row + offset) % PILLAR_BLOCK.length];
  return shadow && c === 'u' ? 's' : c;
}
const DOOR_PLANKS = 'xwvxwvxwvV';
const DOOR_BAND = ['gHHHHHHHHg', 'gkggkggkgg'];
const DOOR_PLATE = ['IIIIIII', 'IjkkkJI', 'IJkkkJI', 'IJJkJJI', 'IIIIIII'];
function doorRow(r) {
  if (r === 9 || r === 22) return DOOR_BAND[0];
  if (r === 10 || r === 23) return DOOR_BAND[1];
  if (r >= 14 && r <= 18) return 'xw' + DOOR_PLATE[r - 14] + 'V';
  return DOOR_PLANKS;
}
function passageRow(r) {
  const edge = r === 9 || r === 10 || r === 22 || r === 23 ? 'gk' : 'wV'; // offene Tür von der Kante gesehen
  if (r >= 28) return edge + 'NnnnnnnN';
  if (r >= 11) return edge + 'KNnnnNKK';
  return edge + 'KKNNNNKK';
}
function gate(inner) {
  const rows = [
    '.....oooooo.....',
    '...oououuouoo...', // Schlussstein in der Mitte, Fugen daneben
    '..ouuossssosto..',
    `.ouost${inner.top[0]}tsoto.`,
    `ousto${inner.top[1]}otsto`,
    `ouso${inner.top[2]}osto`,
  ];
  for (let r = 6; r < 30; r++) rows.push(`o${pillar(r, 0, false)}o${inner.row(r)}o${pillar(r, 3, true)}o`);
  rows.push('osuuuuuuuuuuuuso', 'oooooooooooooooo');
  return rows;
}
const GATE_FRAMES = {
  closed: gate({ top: ['oVVo', 'VxwvxV', 'VvxwvxwV'], row: doorRow }),
  open: gate({ top: ['oKKo', 'KKKKKK', 'KKKKKKKK'], row: passageRow }),
};

// Zielfahne (16x32): Holzstange mit goldener Kugel, Tuch mit Blattmotiv weht in 3 Frames. Stange unten im Steinsockel.
// Das Tuch ist 12 Spalten breit (4–15) und 9 Zeilen hoch; `profile` verschiebt jede Spalte um -1/0/+1 px (Welle),
// `shade` gibt pro Spalte die Tuchfarbe (l = Licht, L = Grund, D = Schatten).
const LEAF_MOTIF = ['.Y.Y.', 'YYYYY', '.YYY.', '..Y..', '..y..'];
function flagCloth(profile, shade) {
  const rows = Array.from({ length: 11 }, () => Array(12).fill('.')); // Zeilen 4–14
  profile.forEach((p, c) => {
    const top = 1 + p;
    for (let r = top; r <= top + 8; r++) {
      let ch = shade[c];
      if (r === top || r === top + 8 || c === 11) ch = 'R';
      else {
        const mr = r - top - 2, mc = c - 4;
        if (mr >= 0 && mr < 5 && mc >= 0 && mc < 5 && LEAF_MOTIF[mr][mc] !== '.') ch = LEAF_MOTIF[mr][mc];
      }
      rows[r][c] = ch;
    }
  });
  return rows.map((r) => r.join(''));
}
const POLE = '.Vxv............';
function flag(profile, shade) {
  const cloth = flagCloth(profile, shade);
  return [
    '.iiii...........',
    'ihJJIi..........',
    'ijJIIi..........',
    '.iiii...........',
    ...cloth.map((c) => `.Vxv${c}`),
    ...Array(14).fill(POLE),
    'oussso..........',
    'otssto..........',
    'oooooo..........',
  ];
}
const FLAG_FRAMES = {
  flag0: flag([0, 0, 0, -1, -1, -1, 0, 0, 0, 1, 1, 1], 'LLLlllLLLDDD'),
  flag1: flag([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'LLLLlLLLLDLL'),
  flag2: flag([0, 0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1], 'LLLDDDLLLlll'),
};

// Dornenranke (16x8): dunkle Brombeerranken mit hellen, spitzen Dornen. Liegt am Boden.
const THORNS_FRAMES = {
  thorns: [
    '..T.......T.....',
    '.BSB..T..BSB..T.',
    '.BbB.BSB.BbBBBSB',
    'BbcbBBbBBBcbbBbB',
    'BbbbcbbbcbbbbcbB',
    'BBbbbBBbbbBBbbbB',
    '.BBBB.BBBBB.BBBB',
    '..BB....BB...BB.',
  ],
};

// Checkpoint-Pfosten (16x32): Holzpfosten mit Kappe; graue Fahne hängt schlaff (off) / orangener Wimpel weht, Funkeln (on)
const POST = '.....Vxv........';
const POST_TOP = ['....VVVVV.......', '....VxxwV.......'];
const POST_BASE = ['...ousssso......', '...otsssto......', '...ooooooo......'];
const CHECKPOINT_FRAMES = {
  off: [
    ...POST_TOP,
    '.....Vxvooo.....',
    '.....VxvoGGo....',
    '.....VxvoGGGo...',
    '.....Vxv.oGGo...',
    '.....Vxv.oGGo...',
    '.....Vxv.ogGo...',
    '.....Vxv..ogo...',
    '.....Vxv..ogo...',
    '.....Vxv..oo....',
    '.....Vxv........',
    ...Array(17).fill(POST),
    ...POST_BASE,
  ],
  on: [
    ...POST_TOP,
    '.....VxvRRRRRRRR',
    '.....VxvRLlLLLLR',
    '.....VxvRLlLLLR.',
    '.....VxvRLLYLLR.',
    '.....VxvRLLYYR..',
    '.....VxvRLLLLR..',
    '.....VxvRLLLR...',
    '.....VxvRLLR....',
    '.....VxvRRR...h.',
    '.....Vxv.....hjh',
    '.....Vxv......h.',
    ...Array(16).fill(POST),
    ...POST_BASE,
  ],
};

// Herzen (8x8): voll mit Glanz / leer als dunkler Umriss
const HEART_FRAMES = {
  full: [
    '.ee..ee.',
    'eaprrrde',
    'epprrrde',
    'eprrrrde',
    '.errrde.',
    '..erde..',
    '...ee...',
    '........',
  ],
  empty: [
    '.QQ..QQ.',
    'QqqQQqqQ',
    'QqqqqqqQ',
    'QqqqqqqQ',
    '.QqqqqQ.',
    '..QqqQ..',
    '...QQ...',
    '........',
  ],
};

// Beere (8x8): pralle Beere mit Blatt und Glanz. Z/z/X werden je Kraft umgefärbt (Varianten).
const BERRY_FRAMES = {
  berry: [
    '.AA.m...',
    '..CCm...',
    '.EZzZZE.',
    'EZWzZZXE',
    'EZzZZZXE',
    'EZZZZXXE',
    '.EZZXXE.',
    '..EEEE..',
  ],
};
// Schattenton (X) je Kraft ergänzt Grund-/Lichtfarbe (Z/z) aus POWER_COLORS
const BERRY_SHADOW = { none: '#7a48a8', red: '#9a2030', blue: '#2050a0', yellow: '#b88a1c' };
const BERRY_VARIANTS = Object.fromEntries(Object.entries(POWER_COLORS).map(([k, v]) => [k, { ...v, X: BERRY_SHADOW[k] ?? v.Z }]));

// Feuerball (8x8, 2 Frames flackernd): heller Kern, orangene Hülle, Flammenzungen
const FIREBALL_FRAMES = {
  fire0: [
    '..F.....',
    '.OFF.O..',
    '.OfffFO.',
    'OFfWWfFO',
    'OFfWWfFO',
    '.OFfffO.',
    '..OFFO..',
    '...OO...',
  ],
  fire1: [
    '.....F..',
    '..O.FFO.',
    '.OFfffO.',
    'OFfWWfFO',
    'OFfWWfFO',
    '.OfffFO.',
    '..OFFO..',
    '...O....',
  ],
};

const PALETTE = {
  '.': null,
  // Gold (Münze, Schlüssel, Kugel, Schlüsselschild)
  'i': '#7a4e10', 'I': '#b8861c', 'J': '#f2c230', 'j': '#ffe36a', 'h': '#fff6c0',
  // Stein
  'o': '#2e3038', 't': '#5f626b', 's': '#8c8f99', 'u': '#b3b6bf',
  // Holz
  'V': '#4a2a1a', 'v': '#6e4a25', 'w': '#9a6b3a', 'x': '#c9955c',
  // Eisen
  'k': '#1c1a26', 'g': '#5c6b7c', 'H': '#a7b8c8',
  // Durchgang (Tor offen): dunkel mit warmem Schein
  'K': '#120c14', 'N': '#3e2c34', 'n': '#7a5a44',
  // Fahnentuch (Herbst)
  'R': '#5a1e0e', 'D': '#8f3b1f', 'L': '#c7471f', 'l': '#e8862c', 'Y': '#f2c230', 'y': '#c9842a',
  // Graue Fahne (Checkpoint aus; Schatten nutzt Eisen-g)
  'G': '#8a8a92',
  // Dornen
  'B': '#2a1208', 'b': '#5a3416', 'c': '#7a4a24', 'S': '#8a7a60', 'T': '#e0d4bc',
  // Herz voll / leer (q halbtransparent)
  'e': '#5a1020', 'r': '#e03a4a', 'p': '#ff7a84', 'a': '#ffd6dc', 'd': '#a81e32',
  'Q': '#4a1a2a', 'q': '#2a0c1870',
  // Beere (Z/z/X werden umgefärbt), Blatt, Stiel
  'E': '#2c1830', 'Z': '#b47fe6', 'z': '#d9b8f0', 'X': '#7a48a8', 'A': '#74a832', 'C': '#4f7d24', 'm': '#5a3a1a',
  // Feuerball
  'O': '#c0301a', 'F': '#ff8c2a', 'f': '#ffd36a', 'W': '#ffffff',
};

export const SHEETS = [
  { key: 'coin', frameWidth: 12, frameHeight: 12, frames: COIN_FRAMES, palette: PALETTE },
  { key: 'coin_hud', frameWidth: 8, frameHeight: 8, frames: COIN_HUD_FRAMES, palette: PALETTE },
  { key: 'key', frameWidth: 12, frameHeight: 12, frames: KEY_FRAMES, palette: PALETTE },
  { key: 'gate', frameWidth: 16, frameHeight: 32, frames: GATE_FRAMES, palette: PALETTE },
  { key: 'flag', frameWidth: 16, frameHeight: 32, frames: FLAG_FRAMES, palette: PALETTE },
  { key: 'thorns', frameWidth: 16, frameHeight: 8, frames: THORNS_FRAMES, palette: PALETTE },
  { key: 'checkpoint', frameWidth: 16, frameHeight: 32, frames: CHECKPOINT_FRAMES, palette: PALETTE },
  { key: 'heart', frameWidth: 8, frameHeight: 8, frames: HEART_FRAMES, palette: PALETTE },
  { key: 'berry', frameWidth: 8, frameHeight: 8, frames: BERRY_FRAMES, palette: PALETTE, variants: BERRY_VARIANTS },
  { key: 'fireball', frameWidth: 8, frameHeight: 8, frames: FIREBALL_FRAMES, palette: PALETTE },
];
