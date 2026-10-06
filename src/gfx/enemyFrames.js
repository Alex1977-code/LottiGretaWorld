// Pixel-Art für Gegner, Checkpoint und HUD (siehe palette.js).

// Laufkäfer (16x16, blickt nach rechts)
const WALKER_BODY = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '............k.k.',
  '...........k.k..',
  '....EEEEEEEkkk..',
  '...EccnnccccEkkk',
  '..EccnccccccEkWk',
  '..EcccccccccEkkk',
  '..EcccccccccEkk.',
  '..EEccccccccEEk.',
  '...EEEEEEEEEE...',
];
export const WALKER_FRAMES = {
  walk0: [...WALKER_BODY, '...k..k...k.....', '..k..k.....k....'],
  walk1: [...WALKER_BODY, '....k..k..k.....', '.....k..k...k...'],
  squashed: [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '................', '................',
    '....EEEEEEEEEE..',
    '..EEccnnccccccEk',
    '.kEEEEEEEEEEEEkk',
    'k..k..k..k..k...',
    '................',
  ],
};

// Hüpfender Pilz (16x16)
export const HOPPER_FRAMES = {
  idle: [
    '................',
    '................',
    '.....MMMMMM.....',
    '...MMmmYmmmMM...',
    '..MmmmmmmmYmmM..',
    '.MmYmmmmmmmmmmM.',
    '.MmmmmmmmYmmmmM.',
    '.MMmmmmmmmmmmMM.',
    '..MMMMMMMMMMMM..',
    '....STTTTTTS....',
    '....SKSSSSKS....',
    '....SSSSSSSS....',
    '....SSTSSTSS....',
    '.....SSSSSS.....',
    '....kk....kk....',
    '...kkk....kkk...',
  ],
  squat: [
    '................',
    '................',
    '................',
    '................',
    '....MMMMMMMM....',
    '..MMmmYmmmmmMM..',
    '.MmmmmmmmmYmmmM.',
    '.MmYmmmmmmmmmmM.',
    'MMmmmmmmmYmmmmMM',
    '.MMMMMMMMMMMMMM.',
    '...STTTTTTTTS...',
    '...SKSSSSSSKS...',
    '...SSSSSSSSSS...',
    '....SSSSSSSS....',
    '..kkk......kkk..',
    '.kkk........kkk.',
  ],
  jump: [
    '.....MMMMMM.....',
    '...MMmmYmmmMM...',
    '..MmmmmmmmYmmM..',
    '.MmYmmmmmmmmmmM.',
    '.MmmmmmmmYmmmmM.',
    '.MMmmmmmmmmmmMM.',
    '..MMMMMMMMMMMM..',
    '....STTTTTTS....',
    '....SKSSSSKS....',
    '....SSSSSSSS....',
    '....SSSSSSSS....',
    '.....SSSSSS.....',
    '.....SSSSSS.....',
    '......kkkk......',
    '.....kk..kk.....',
    '................',
  ],
  squashed: [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '................',
    '...MMMMMMMMMM...',
    '.MMmmYmmmmYmmMM.',
    'MmmmmmmmmmmmmmmM',
    '.MMMMMMMMMMMMMM.',
    '..SKSSSSSSSSKS..',
    '.kkk........kkk.',
  ],
};

// Checkpoint-Pfosten (16x32): aus / an
const POST_TOP = ['................', '................', '................', '................', '.......ww.......'];
const POST_ROW = '.......wv.......';
const POST_BASE = ['.....vwwwwv.....', '....vvvvvvvv....', '....vvvvvvvv....'];
export const CHECKPOINT_FRAMES = {
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
export const HEART_FRAMES = {
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
