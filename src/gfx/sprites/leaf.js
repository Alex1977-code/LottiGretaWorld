// Blätterschirm (22x12), wird über der Heldin gezeichnet.

const FRAMES = {
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

const PALETTE = { '.': null, 'L': '#c7471f', 'l': '#e8862c', 'G': '#6d8a2b', 'D': '#7a2a12' };

export const SHEETS = [
  { key: 'leaf', frameWidth: 22, frameHeight: 12, frames: FRAMES, palette: PALETTE },
];
