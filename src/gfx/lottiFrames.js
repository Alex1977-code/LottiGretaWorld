// Pixel-Art-Frames für Lotti (20x20, blickt nach rechts; links wird gespiegelt).
// Dunkelblondes Mädchen mit zwei Zöpfen (Silhouette!), roter Haarspange, blauem Kleid.
// Jeder Frame ist ein Array aus 20 Strings mit je 20 Zeichen (siehe palette.js).
// Später können diese Daten durch ein echtes Spritesheet ersetzt werden,
// ohne dass sich an Lotti.js etwas ändert (gleiche Frame-Namen).

const E = '....................';

// Kopf (Zeilen 0-10): Zöpfe hängen seitlich herab
const HEAD = [
  E,
  '.......BBBBBB.......',
  '.....BB111111BB.....',
  '....B111R2111111B...',
  '...B1111111111111B..',
  '..B31B11444444B11B..',
  '..B31B44K44K44B1B...',
  '..B31B44444444B.B...',
  '..B33B454K5444B.....',
  '...BB.B444444B......',
  '.......BBBBBB.......',
];

// Kopf mit fliegenden Zöpfen (Sprung/Fall): Zöpfe nach oben
const HEAD_UP = [
  '..BB...BBBBBB.......',
  '.B31BBB111111BB..B..',
  '.B31B1111111111BB1B.',
  '.B31B111R21111111B..',
  '.B31B111111111111B..',
  '..BB.B11444444B11B..',
  '.....B44K44K44B1B...',
  '.....B44444444BB....',
  '.....B454K5444B.....',
  '......B444444B......',
  '.......BBBBBB.......',
];

// Kopf beim Laufen: Zöpfe wehen nach hinten
const HEAD_RUN = [
  E,
  '.......BBBBBB.......',
  '.....BB111111BB.....',
  'BBB.B111R2111111B...',
  'B31BB1111111111B1B..',
  'B331B11444444B11B...',
  '.BB.B44K44K44B1B....',
  '....B44444444B......',
  '....B454K5444B......',
  '.....B444444B.......',
  '......BBBBBB........',
];

// Kleid mit Armen unten (Zeilen 11-16)
const DRESS = [
  '......B666666B......',
  '.....B46666664B.....',
  '.....B46666664B.....',
  '.....B76666667B.....',
  '....B7666666667B....',
  '....BBBBBBBBBBBB....',
];
// Kleid mit erhobenen Armen (Schirm halten)
const DRESS_UP = [
  '....B4B666666B4B....',
  '....B4B666666B4B....',
  '.....BB666666BB.....',
  '.....B76666667B.....',
  '....B7666666667B....',
  '....BBBBBBBBBBBB....',
];
// Kleid mit Armen nach vorn (huckepack festhalten)
const DRESS_RIDE = [
  '......B666666B44B...',
  '.....B666666664B....',
  '.....B66666666B.....',
  '.....B76666667B.....',
  '....B7666666667B....',
  '....BBBBBBBBBBBB....',
];

// Beine (Zeilen 17-19)
const LEGS_STAND = ['.......B44.44B......', '.......Bbb.bbB......', '.......BBB.BBB......'];
const LEGS_RUN_A = ['......B44..B44B.....', '.....Bbb....BbbB....', '.....BBB....BBB.....'];
const LEGS_RUN_B = ['.......B4444B.......', '.......BbbbbB.......', '.......BBBBBB.......'];
const LEGS_RUN_C = ['.......B44..B44B....', '......Bbb....BbbB...', '......BBB....BBB....'];
const LEGS_JUMP = ['......Bb4444bB......', '.......BBBBBB.......', E];
const LEGS_FALL = ['......B44...B44B....', '.....Bbb.....BbbB...', '.....BBB.....BBB....'];
const LEGS_GLIDE = ['.......B44.B44B.....', '.......Bbb.BbbB.....', '.......BBB.BBB......'];
const LEGS_RIDE = ['..........B4444B....', '..........BbbbbB....', '..........BBBBBB....'];

// Sturzflug: kopfüber, Zöpfe nach oben, Kleid flattert
const DIVE = [
  '......BBB..BBB......',
  '......Bbb..bbB......',
  '......B44..44B......',
  '.....B77777777B.....',
  '.....B66666666B.....',
  '......B666666B......',
  '......B666666B......',
  '.....B46666664B.....',
  '......B666666B......',
  '.......BBBBBB.......',
  '......B444444B......',
  '.....B44444444B.....',
  '....BBB44K44K4B.....',
  '...B31B44444444B....',
  '...B31B11111111B....',
  '...B31B111111111B...',
  '....B1111111111B....',
  '.....B11R21111B.....',
  '......BB1111BB......',
  '........BBBB........',
];

/** Verschiebt einen Frame um dy Zeilen nach oben (für "Hüpfen" im Laufzyklus). */
function shiftUp(rows, dy) {
  const out = rows.slice(dy);
  while (out.length < 20) out.push(E);
  return out;
}

export const LOTTI_FRAME_SIZE = 20;

export const LOTTI_FRAMES = {
  idle0: [...HEAD, ...DRESS, ...LEGS_STAND],
  idle1: [...shiftUp(HEAD, 1), E, ...DRESS, ...LEGS_STAND].slice(0, 11).concat(DRESS, LEGS_STAND),
  run0: [...HEAD_RUN, ...DRESS, ...LEGS_RUN_A],
  run1: shiftUp([...HEAD_RUN, ...DRESS, ...LEGS_RUN_B], 1),
  run2: [...HEAD_RUN, ...DRESS, ...LEGS_RUN_C],
  run3: shiftUp([...HEAD_RUN, ...DRESS, ...LEGS_RUN_B], 1),
  jump: [...HEAD_UP, ...DRESS, ...LEGS_JUMP],
  fall: [...HEAD_UP, ...DRESS, ...LEGS_FALL],
  glide: [...HEAD, ...DRESS_UP, ...LEGS_GLIDE],
  ride: [...HEAD, ...DRESS_RIDE, ...LEGS_RIDE],
  dive: DIVE,
};

// Blätterschirm (22x12), wird über Lotti gezeichnet
export const LEAF_FRAMES = {
  leaf0: [
    '.........DDDD.........',
    '......DDDLLLLDDD......',
    '....DDLLLlLLLlLLDD....',
    '..DDLLLlLLLLLLLlLLDD..',
    '.DLLLlLLLLLGLLLLLlLLD.',
    'DLLLLLLLLLLGLLLLLLLLLD',
    'DLlLLLLLLLLGLLLLLLLlLD',
    '.DDLLLLLLLLGLLLLLLLDD.',
    '...DDDLLLLLGLLLLDDD...',
    '......DDDDDGDDDDD.....',
    '...........G..........',
    '...........G..........',
  ],
  leaf1: [
    '..........DDDD........',
    '.......DDDLLLLDDD.....',
    '.....DDLLLlLLLlLLDD...',
    '...DDLLLlLLLLLLLlLLDD.',
    '..DLLLlLLLLLGLLLLLlLLD',
    '.DLLLLLLLLLLGLLLLLLLLD',
    '.DLlLLLLLLLLGLLLLLLLlD',
    '..DDLLLLLLLLGLLLLLLDD.',
    '....DDDLLLLLGLLLLDDD..',
    '.......DDDDDGDDDDD....',
    '...........G..........',
    '...........G..........',
  ],
};
