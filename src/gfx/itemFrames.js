// Pixel-Art für Sammelobjekte und Level-Elemente: Münze, Schlüssel, Tor, Fahne, Dornen.

// Große Sammelmünze (12x12), 4 Frames Drehung
export const COIN_FRAMES = {
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
export const COIN_HUD_FRAMES = {
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
export const KEY_FRAMES = {
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
export const GATE_FRAMES = {
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
export const FLAG_FRAMES = {
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
export const THORNS_FRAMES = {
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
