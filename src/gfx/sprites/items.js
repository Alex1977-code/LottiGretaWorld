import { POWER_COLORS } from '../palette.js';

// Sammelobjekte und Level-Elemente: Münze, HUD-Münze, Schlüssel, Tor, Fahne, Dornen, Checkpoint, Herz, Beere, Feuerball.

// Große Sammelmünze (12x12), 4 Frames Drehung
const COIN_FRAMES = {
  coin0: [
    '....iiii....',
    '..iiJJJJii..',
    '.iJJjjJJJJi.',
    '.iJjJJJJJJi.',
    'iJJjJJGJJJJi',
    'iJJJJGGGJJJi',
    'iJJJJJGJJJJi',
    'iJJJJJGJJJJi',
    '.iJJJJJJJJi.',
    '.iJJJJJJJJi.',
    '..iiJJJJii..',
    '....iiii....',
  ],
  coin1: [
    '.....iii....',
    '...iiJJii...',
    '...iJjJJi...',
    '..iJjJJJJi..',
    '..iJjJGJJi..',
    '..iJJGGGJi..',
    '..iJJJGJJi..',
    '..iJJJGJJi..',
    '..iJJJJJJi..',
    '...iJJJJi...',
    '...iiJJii...',
    '.....iii....',
  ],
  coin2: [
    '.....ii.....',
    '.....ii.....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '....iJJi....',
    '.....ii.....',
    '.....ii.....',
  ],
  coin3: [
    '....iii.....',
    '...iiJJii...',
    '...iJJjJi...',
    '..iJJJJjJi..',
    '..iJJGJjJi..',
    '..iJGGGJJi..',
    '..iJJGJJJi..',
    '..iJJGJJJi..',
    '..iJJJJJJi..',
    '...iJJJJi...',
    '...iiJJii...',
    '.....iii....',
  ],
};

// Kleine HUD-Münze (8x8): voll / leer
const COIN_HUD_FRAMES = {
  full: [
    '..iiii..',
    '.iJJJJi.',
    'iJjJJJJi',
    'iJjJGJJi',
    'iJJGGGJi',
    'iJJJGJJi',
    '.iJJJJi.',
    '..iiii..',
  ],
  empty: [
    '..QQQQ..',
    '.Q....Q.',
    'Q......Q',
    'Q......Q',
    'Q......Q',
    'Q......Q',
    '.Q....Q.',
    '..QQQQ..',
  ],
};

// Schlüssel (12x12)
const KEY_FRAMES = {
  key: [
    '....iiii....',
    '...iJjjJi...',
    '...iJiiJi...',
    '...iJiiJi...',
    '...iJjjJi...',
    '....iJJi....',
    '....iJi.....',
    '....iJi.....',
    '....iJJi....',
    '....iJi.....',
    '....iJJi....',
    '.....ii.....',
  ],
};

// Tor (16x32): Steinbogen mit Holztür, zu / offen
const ARCH_TOP = [
  '.....ssssss.....',
  '...sstuuuutss...',
  '..stuusssuuuts..',
  '.stussssssssuts.',
  '.suss......ssus.',
  'stus........suts',
];
const GATE_FRAMES = {
  closed: [
    ...ARCH_TOP,
    'stusvwwwwwwwwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwiiiwsuts'.slice(0, 16),
    'stuswwxwwiJiwsuts'.slice(0, 16),
    'stuswwxwwiiiwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stuswwxwwwwvwsuts'.slice(0, 16),
    'stusvwwwwwwwwsuts'.slice(0, 16),
    'sttttttttttttttts'.slice(0, 16),
    'ssssssssssssssss',
    'tttttttttttttttt',
    'tttttttttttttttt',
    'tttttttttttttttt',
    'tttttttttttttttt',
  ],
  open: [
    ...ARCH_TOP,
    ...Array(20).fill('stusKKKKKKKKKsuts'.slice(0, 16)),
    'sttttttttttttttts'.slice(0, 16),
    'ssssssssssssssss',
    'tttttttttttttttt',
    'tttttttttttttttt',
    'tttttttttttttttt',
    'tttttttttttttttt',
  ],
};

// Zielfahne (16x32): Stange mit wehendem Blatt-Tuch, 3 Frames
const POLE_TOP = ['.......jj.......', '......jJJj......', '.......jj.......'];
const POLE = '.......wv.......';
const POLE_BASE = ['.....vwwwwv.....', '....vvvvvvvv....', '....vvvvvvvv....'];
function flag(cloth) {
  return [...POLE_TOP, ...cloth, ...Array(32 - 3 - cloth.length - 3).fill(POLE), ...POLE_BASE];
}
const FLAG_FRAMES = {
  flag0: flag([
    '.......wvLLLLLL.',
    '.......wvLlLLLLL',
    '.......wvLLLLLL.',
    '.......wvLlLLLL.',
    '.......wvLLLLL..',
    '.......wvLLLL...',
    '.......wvLL.....',
  ]),
  flag1: flag([
    '.......wvLLLLL..',
    '.......wvLlLLLL.',
    '.......wvLLLLLLL',
    '.......wvLlLLLL.',
    '.......wvLLLLL..',
    '.......wvLLL....',
    '.......wvLL.....',
  ]),
  flag2: flag([
    '.......wvLLLL...',
    '.......wvLlLLL..',
    '.......wvLLLLLL.',
    '.......wvLlLLLLL',
    '.......wvLLLLLL.',
    '.......wvLLLL...',
    '.......wvLL.....',
  ]),
};

// Dornenranke (16x8): verletzt bei Berührung
const THORNS_FRAMES = {
  thorns: [
    '..k.....k....k..',
    '..k..k..k.k..k..',
    '.eke.k.eke.k.ek.',
    '.ekeeke.ekekeek.',
    'eeekekeeekeeekee',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
  ],
};

// Checkpoint-Pfosten (16x32): aus / an
const POST_TOP = ['................', '................', '................', '................', '.......ww.......'];
const POST_ROW = '.......wv.......';
const POST_BASE = ['.....vwwwwv.....', '....vvvvvvvv....', '....vvvvvvvv....'];
const CHECKPOINT_FRAMES = {
  off: [
    ...POST_TOP,
    '......xwwv......',
    ...Array(16).fill(POST_ROW),
    '.......wvtt.....',
    '.......wvttt....',
    '.......wvtttt...',
    '.......wvttt....',
    '.......wvtt.....',
    POST_ROW, POST_ROW,
    ...POST_BASE,
  ],
  on: [
    ...POST_TOP,
    '......xwwvLL....',
    '.......wvLLLL...',
    '.......wvLlLLL..',
    '.......wvLLLLLL.',
    '.......wvLlLLL..',
    '.......wvLLLL...',
    '.......wvLL.....',
    ...Array(17).fill(POST_ROW),
    ...POST_BASE,
  ],
};

// Herzen (8x8)
const HEART_FRAMES = {
  full: [
    '.PP..PP.',
    'PpPPPPPP',
    'PpPPPPPP',
    'PPPPPPPP',
    '.PPPPPP.',
    '..PPPP..',
    '...PP...',
    '........',
  ],
  empty: [
    '.QQ..QQ.',
    'Q..QQ..Q',
    'Q......Q',
    'Q......Q',
    '.Q....Q.',
    '..Q..Q..',
    '...QQ...',
    '........',
  ],
};

// Beere (8x8)
const BERRY_FRAMES = {
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
const FIREBALL_FRAMES = {
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

const PALETTE = {
  '.': null,
  'J': '#f2c230', 'j': '#fff2a8', 'i': '#a8761a', 'G': '#6d8a2b',
  's': '#8c8f99', 't': '#5f626b', 'u': '#b3b6bf', 'w': '#9a6b3a', 'v': '#6e4a25', 'x': '#c9955c',
  'L': '#c7471f', 'l': '#e8862c', 'e': '#6b3f1c', 'k': '#1c1a26',
  'P': '#e8405a', 'p': '#ff9fb0', 'Q': '#4a1a2a',
  'Z': '#b47fe6', 'z': '#d9b8f0', 'F': '#ff8c2a', 'f': '#ffd36a', 'W': '#ffffff', 'K': '#120a06',
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
  { key: 'berry', frameWidth: 8, frameHeight: 8, frames: BERRY_FRAMES, palette: PALETTE, variants: POWER_COLORS },
  { key: 'fireball', frameWidth: 8, frameHeight: 8, frames: FIREBALL_FRAMES, palette: PALETTE },
];
