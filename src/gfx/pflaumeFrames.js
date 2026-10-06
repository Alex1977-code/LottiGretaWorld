// Pixel-Art für Pflaume (20x16, blickt nach rechts), Beeren (8x8) und Feuerball (8x8).

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

export const PFLAUME_FRAMES = {
  idle0: [...PFLAUME_BODY, ...LEGS_A],
  idle1: ['.'.repeat(20), ...PFLAUME_BODY.slice(0, 13), ...LEGS_A],
  walk0: [...PFLAUME_BODY, ...LEGS_A],
  walk1: [...PFLAUME_BODY, ...LEGS_B],
  panic: [...PFLAUME_PANIC, ...LEGS_B],
  fly: [...PFLAUME_FLY, ...LEGS_TUCK],
};

// Beere (8x8)
export const BERRY_FRAMES = {
  berry: [
    '....G...',
    '...GG...',
    '.ZZZZZ..',
    'ZzZZZZZ.',
    'ZzZZZZZ.',
    'ZZZZZZZ.',
    '.ZZZZZ..',
    '..ZZZ...',
  ],
};

// Feuerball (8x8, 2 Frames)
export const FIREBALL_FRAMES = {
  fire0: [
    '........',
    '...FF...',
    '..FffF..',
    '.FfWWfF.',
    '.FfWWfF.',
    '..FffF..',
    '...FF...',
    '........',
  ],
  fire1: [
    '........',
    '..F..F..',
    '..FffF..',
    '.FfffF..',
    '.FfWWfF.',
    '..FffFF.',
    '...FF...',
    '........',
  ],
};
