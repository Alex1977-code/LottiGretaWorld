// Pixel-Art für Greta (20x20, blickt nach rechts), Beeren (8x8) und Feuerball (8x8).
// Greta: hellblondes Mädchen mit langen Haaren; ihr Kleid ('Z'/'z') nimmt die Farbe
// der gefressenen Beere an. Sie trägt Lotti huckepack.

const E = '....................';

const GRETA_UPPER = [
  '.......BBBBBB.......',
  '.....BB888888BB.....',
  '....B8899888888B....',
  '...B888888888888B...',
  '..B8888B444448B88B..',
  '..B888B44K44K4B88B..',
  '..B888B4444444B88B..',
  '..B088B454K544B880B.',
  '..B088BB44444BB880B.',
  '..B008B.BBBBB.B800B.',
  '..B00B4BZZZZZB4B00B.',
  '...BB.BZZzZZZZB.BB..',
  '......BZZzZZZZB.....',
  '.....BZZZZZZZZZB....',
  '.....BZZZZZZZZZB....',
  '....BZZZZZZZZZZZB...',
  '....BBBBBBBBBBBBB...',
];
const LEGS_A = ['......B44...44B.....', '......Bbb...bbB.....', '......BBB...BBB.....'];
const LEGS_B = ['.......B44.44B......', '.......Bbb.bbB......', '.......BBB.BBB......'];
const LEGS_TUCK = ['.......B4444B.......', '.......BbbbbB.......', '.......BBBBBB.......'];

// Panik: Augen weit, Mund offen, Haare fliegen
const GRETA_PANIC = GRETA_UPPER.map((r, i) => {
  if (i === 1) return '..B..BB888888BB..B..';
  if (i === 2) return '..B8B8899888888B8B..';
  if (i === 3) return '..B8888888888888888B';
  if (i === 5) return '..B888BWWK4WWKB88B..';
  if (i === 7) return '..B088B44KKK44B880B.';
  return r;
});

// Flug (blaue Beere): Zauberflügel seitlich
const GRETA_FLY = GRETA_UPPER.map((r, i) => {
  if (i === 9) return 'II' + r.slice(2, 18) + 'II';
  if (i === 10) return 'III' + r.slice(3, 17) + 'III';
  if (i === 11) return 'III' + r.slice(3, 17) + 'III';
  if (i === 12) return '.II' + r.slice(3, 17) + 'II.';
  return r;
});

export const GRETA_FRAMES = {
  idle0: [...GRETA_UPPER, ...LEGS_A],
  idle1: [E, ...GRETA_UPPER.slice(0, 16), ...LEGS_A],
  walk0: [...GRETA_UPPER, ...LEGS_A],
  walk1: [...GRETA_UPPER, ...LEGS_B],
  panic: [...GRETA_PANIC, ...LEGS_A],
  fly: [...GRETA_FLY, ...LEGS_TUCK],
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
