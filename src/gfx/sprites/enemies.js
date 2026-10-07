// Gegner: Laufkäfer (16x16) und hüpfender Pilz (16x16). Füße auf der untersten Zeile.

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
const WALKER_FRAMES = {
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
const HOPPER_FRAMES = {
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


const PALETTE = {
  '.': null,
  'E': '#6e1b28', 'c': '#c2383f', 'n': '#ec7a72', 'k': '#1c1a26', 'W': '#ffffff', 'K': '#120a06',
  'M': '#4a3580', 'm': '#6f52b8', 'Y': '#f3d35a', 'S': '#e8d9b8', 'T': '#c9b68f',
};

export const SHEETS = [
  { key: 'walker', frameWidth: 16, frameHeight: 16, frames: WALKER_FRAMES, palette: PALETTE },
  { key: 'hopper', frameWidth: 16, frameHeight: 16, frames: HOPPER_FRAMES, palette: PALETTE },
];
