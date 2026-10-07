import { POWER_COLORS } from '../palette.js';

// Pflaume – runder lila Käfer als Reittier (20x16, blickt nach rechts).
// Füße auf der untersten Zeile. 'Z'/'z' werden je nach Beeren-Kraft umgefärbt (Varianten _none/_red/_blue/_yellow).

const PFLAUME_BODY = [
  '..................k.',
  '.................k..',
  '......VVVVVVV....k..',
  '....VVvvvvvvvVV..k..',
  '...VvvvZZvvvvvvVVk..',
  '..VvvvZZZZvvvvvvvVV.',
  '..VvvvvZZvvvvvvvAAV.',
  '.VvvvvvvvvvvvvvAAWKV',
  '.VvvvvvvvvvvvvvAAWKV',
  '.VvvvvvvZZvvvvvvAAAV',
  '.VvvvvvZZZvvvvvvvApV',
  '..VvvvvvZvvvvvvvvAV.',
  '..VVvvvvvvvvvvvvVVV.',
  '....VVVVVVVVVVVVV...',
];
const LEGS_A = ['....k..k....k..k....', '...k..k......k..k...'];
const LEGS_B = ['.....k..k..k..k.....', '....k..k....k..k....'];
const LEGS_TUCK = ['.....kk......kk.....', '....................'];

// Panik: Augen weit, Schweißtropfen
const PFLAUME_PANIC = PFLAUME_BODY.map((r, i) => {
  if (i === 6) return '..VvvvvZZvvvvvvvWWV.';
  if (i === 7) return '.VvvvvvvvvvvvvvAWWKV';
  if (i === 8) return '.VvvvvvvvvvvvvvAWKKV';
  if (i === 3) return '....VVvvvvvvvVV.IkI.';
  return r;
});

// Flug (blaue Beere): Flügel über dem Panzer
const PFLAUME_FLY = [
  '...II.......II....k.',
  '..IIII.....IIII..k..',
  '..IIIIVVVVVVVIII.k..',
  '....VVvvvvvvvVV..k..',
  ...PFLAUME_BODY.slice(4),
];

const FRAMES = {
  idle0: [...PFLAUME_BODY, ...LEGS_A],
  idle1: ['.'.repeat(20), ...PFLAUME_BODY.slice(0, 13), ...LEGS_A],
  walk0: [...PFLAUME_BODY, ...LEGS_A],
  walk1: [...PFLAUME_BODY, ...LEGS_B],
  panic: [...PFLAUME_PANIC, ...LEGS_B],
  fly: [...PFLAUME_FLY, ...LEGS_TUCK],
};


const PALETTE = {
  '.': null,
  'V': '#3b2460', 'v': '#8a4fc9', 'Z': '#b47fe6', 'z': '#d9b8f0', 'A': '#e2c8f5', 'p': '#ff9fb0',
  'I': '#6ea8ff', 'k': '#1c1a26', 'W': '#ffffff', 'K': '#120a06',
};

export const SHEETS = [
  { key: 'pflaume', frameWidth: 20, frameHeight: 16, frames: FRAMES, palette: PALETTE, variants: POWER_COLORS },
];
