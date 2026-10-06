// Pixel-Art-Frames für Pip (20x20, blickt nach rechts; links wird gespiegelt).
// Jeder Frame ist ein Array aus 20 Strings mit je 20 Zeichen (siehe palette.js).
// Später können diese Daten durch ein echtes Spritesheet ersetzt werden,
// ohne dass sich an Pip.js etwas ändert (gleiche Frame-Namen).


// Helm mit Kuppel, Rand und rotem Busch – überschreibt Spalten 10-19 der Zeilen 2-7
const HELMET = [
  '..BRRB....',
  '.BBRRBB...',
  'BHHHHHHHB.',
  'BHuHHHHHHB',
  'BhhhhhhhhB',
  '.BOOOOOOB.',
];
function applyHelmet(rows) {
  return rows.map((r, i) => (i >= 2 && i <= 7 ? r.slice(0, 10) + HELMET[i - 2] : r));
}

// Oberkörper (Zeilen 0-15) – gemeinsam für Idle/Run/Jump/Fall/Glide
const UPPER = applyHelmet([
  '....................',
  '....................',
  '....BBB.............',
  '...BoooB...BBBBB....',
  '..BooOooB.BHHHHHB...',
  '..BoOOOOB.BHHHHHHB..',
  '.BoOOOOOB.BhhhhhhB..',
  '.BOOOOOOB..BOOOOOB..',
  '.BOOOOOOB..BOWKOOOB.',
  '.BOOOOOBB..BOWKOOOB.',
  '.BOOOOBB..BOOOOOBBB.',
  '..BOOBB..BOOOOOOB...',
  '..BOOBB.BOoooOOOB...',
  '...BBB.BOooooOOB....',
  '.......BOooooOOB....',
  '.......BOOooOOOB....',
]);

// Oberkörper mit Schwanz weit oben (Sprung/Fall) – Schwanz wird nach oben gestreckt
const UPPER_TAIL_UP = applyHelmet([
  '....BBB.............',
  '...BoooB............',
  '..BooOooB...........',
  '..BoOOOOB..BBBBB....',
  '.BoOOOOOB.BHHHHHB...',
  '.BOOOOOOB.BHHHHHHB..',
  '.BOOOOOOB.BhhhhhhB..',
  '.BOOOOOBB..BOOOOOB..',
  '..BOOOOBB..BOWKOOOB.',
  '..BOOOOBB..BOWKOOOB.',
  '...BOOBB..BOOOOOBBB.',
  '...BOOBB.BOOOOOOB...',
  '....BBB.BOoooOOOB...',
  '.......BOooooOOB....',
  '.......BOooooOOB....',
  '.......BOOooOOOB....',
]);

// Oberkörper beim Laufen: Schwanz flacher/nach hinten gestreckt
const UPPER_RUN = applyHelmet([
  '....................',
  '....................',
  '....................',
  '...........BBBBB....',
  'BBBB......BHHHHHB...',
  'BoooBB....BHHHHHHB..',
  'BoOOOOBB..BhhhhhhB..',
  '.BOOOOOOB..BOOOOOB..',
  '.BOOOOOOOB.BOWKOOOB.',
  '..BOOOOOOBBBOWKOOOB.',
  '...BOOOOBBOOOOOOBBB.',
  '....BBBBBOOOOOOOB...',
  '........BOoooOOOB...',
  '.......BOooooOOB....',
  '.......BOooooOOB....',
  '.......BOOooOOOB....',
]);

// Beine-Varianten (Zeilen 16-19)
const LEGS_STAND = [
  '.......BOOOOOOOB....',
  '........BOOBBOOB....',
  '........BbbBBbbB....',
  '........BBB.BBB.....',
];
const LEGS_RUN_A = [
  '.......BOOOOOOOB....',
  '......BOOB..BOOB....',
  '.....BbbB...BbbB....',
  '.....BBB....BBB.....',
];
const LEGS_RUN_B = [
  '.......BOOOOOOOB....',
  '........BOOBOOB.....',
  '........BbbBbbB.....',
  '........BBB.BBB.....',
];
const LEGS_RUN_C = [
  '.......BOOOOOOOB....',
  '........BOOB.BOOB...',
  '.......BbbB...BbbB..',
  '......BBB.....BBB...',
];
const LEGS_JUMP = [
  '.......BOOOOOOOB....',
  '.......BbbOOObbB....',
  '........BBBBBBB.....',
  '....................',
];
const LEGS_FALL = [
  '.......BOOOOOOOB....',
  '......BOOB...BOOB...',
  '.....BbbB.....BbbB..',
  '.....BBB......BBB...',
];
const LEGS_GLIDE = [
  '.......BOOOOOOOB....',
  '........BOOB.BOOB...',
  '........BbbB.BbbB...',
  '........BBB..BBB....',
];

// Sturzflug: Pip kopfüber, Schwanz als Pfeil nach oben
const DIVE = [
  '........BBB.........',
  '.......BoooB........',
  '......BoOOOoB.......',
  '......BOOOOOB.......',
  '......BOOOOOB.......',
  '.......BOOOB........',
  '.......BOOOB........',
  '......BbbBbbB.......',
  '.....BOOOOOOOB......',
  '.....BOoooooOB......',
  '.....BOoooooOB......',
  '.....BOOoooOOB......',
  '.....BOOOOOOOB......',
  '....BOOOOOOOOOB.....',
  '....BOOOOOOWKOB.....',
  '....BhhhhhhhhhB.....',
  '....BHHHHHHHHHB.....',
  '.....BHHHHHHHB......',
  '......BBBBBBB.......',
  '........BRB.........',
];

// Verschiebt einen Frame um dy Zeilen nach oben (für "Hüpfen" im Laufzyklus)
function shiftUp(rows, dy) {
  const empty = '.'.repeat(20);
  const out = rows.slice(dy);
  while (out.length < 20) out.push(empty);
  return out;
}

export const PIP_FRAME_SIZE = 20;

export const PIP_FRAMES = {
  idle0: [...UPPER, ...LEGS_STAND],
  idle1: [...UPPER_TAIL_UP, ...LEGS_STAND],
  run0: [...UPPER_RUN, ...LEGS_RUN_A],
  run1: shiftUp([...UPPER_RUN, ...LEGS_RUN_B], 1),
  run2: [...UPPER_RUN, ...LEGS_RUN_C],
  run3: shiftUp([...UPPER_RUN, ...LEGS_RUN_B], 1),
  jump: [...UPPER_TAIL_UP, ...LEGS_JUMP],
  fall: [...UPPER_TAIL_UP, ...LEGS_FALL],
  glide: [...UPPER, ...LEGS_GLIDE],
  dive: DIVE,
};

// Blätterschirm (22x12), wird über Pip gezeichnet
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
