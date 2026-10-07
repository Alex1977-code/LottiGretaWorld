// Gegner: Laufkäfer (16x16) und hüpfender Pilz (16x16). Füße auf der untersten Zeile, Licht von oben links.

// Laufkäfer (16x16, blickt nach rechts). Hitbox 12x9 unten (Spalten 2–13, Zeilen 7–15).
// Glänzender roter Panzer mit Naht (S), Punkten (o) und Glanzpunkt (h); schwarzer Kopf mit Auge und Fühlern.
const WALKER_BODY = [
  '................',
  '................',
  '................',
  '...........k...k',
  '....EEEEEE..k..k',
  '...EnhhnSccE.kk.',
  '..EnhnnnSccDEkk.',
  '.EnnnnccSccDkgWW',
  '.EnnooccSooDkkWK',
  'EnccooccSooDkkkk',
  'EcccccccSccDkkkk',
  'EDcccoocSDDDEkkk',
  'EEEEEEEEEEEEEkkk',
];
// Fühler wippen im zweiten Schritt
const WALKER_BODY_B = WALKER_BODY.map((r, i) => (i === 3 ? '............k..k' : i === 4 ? '....EEEEEE..k.k.' : r));
// Sechs Beine (Basen 0/3/6/9/12/15): drei vordere (k) und drei hintere (g) schwingen gegenläufig (Schere)
const WALKER_LEGS_A = ['g..k..g..k..g..k', '.gk....gk....gk.', '.kg....kg....kg.'];
const WALKER_LEGS_B = ['g..k..g..k..g..k', 'g...kg....kg...k', 'g...gk....gk...k'];

const WALKER_FRAMES = {
  walk0: [...WALKER_BODY, ...WALKER_LEGS_A],
  walk1: [...WALKER_BODY_B, ...WALKER_LEGS_B],
  squashed: [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '................', '................',
    '..EEEEEEEEEEE..k',
    '.EnhccoScocDEkWk',
    '.EDDDDDDDDDDEkkk',
    'EEEEEEEEEEEEEkk.',
    'kk.k..k..k..k.kk',
  ],
};

const WALKER_PALETTE = {
  '.': null,
  'E': '#4a1018', // Panzer Umriss
  'D': '#8c2030', // Panzer Schatten
  'c': '#c2383f', // Panzer Grund
  'n': '#e85a5a', // Panzer Licht
  'h': '#ffb4a4', // Glanzpunkt
  'S': '#5a1420', // Flügelnaht
  'o': '#2e1220', // Punkte
  'k': '#1c1a26', // Kopf, Beine
  'g': '#3e3a56', // Kopf Licht, hintere Beine
  'W': '#ffffff', 'K': '#120a06',
};

// Hüpfender Pilz (16x16). Hitbox 12x14 (Spalten 2–13, Zeilen 2–15).
// Violetter Hut mit gelben Flecken und hellem Rand, grimmiges Gesicht auf dem hellen Stiel, kleine Füße.
const HOPPER_FRAMES = {
  idle: [
    '.....MMMMMM.....',
    '...MMvAAvmmMM...',
    '..MvAAvmmmYYmM..',
    '.MvAvmmmmmYymmM.',
    '.MvYYmmmmmmmmVM.',
    '.MmYymmmYYmmVVM.',
    '.MvvvvvvYyvvvVM.',
    '.MMMMMMMMMMMMMM.',
    '...TkkttttkkT...',
    '...TsWkSSkWtT...',
    '...TsWKSSKWtT...',
    '...TsSkkkkStT...',
    '...TskSSSSktT...',
    '...TTTTTTTTTT...',
    '...kk......kk...',
    '..kkk.....kkk...',
  ],
  // Geduckt: Hut breiter und flacher, Füße gespreizt
  squat: [
    '................',
    '................',
    '................',
    '....MMMMMMMM....',
    '..MMvAAvmmmYYMM.',
    '.MvAAvmmmmmYymmM',
    'MvAvmmmmmmmmmmVM',
    'MvYYmmmmYYmmmVVM',
    'MvvYyvvvYyvvvvVM',
    'MMMMMMMMMMMMMMMM',
    '...TkkttttkkT...',
    '...TsWKSSKWtT...',
    '...TsSkkkkStT...',
    '...TTTTTTTTTT...',
    '..kk........kk..',
    '.kkk.......kkk..',
  ],
  // Sprung: gestreckt, Hut schmaler, Füße angezogen
  jump: [
    '......MMMM......',
    '....MMvAAmMM....',
    '...MvAAvmmYYM...',
    '..MvAvmmmmYymM..',
    '..MvYYmmmmmmVM..',
    '..MvvYyvYYvvVM..',
    '..MMMMMMMMMMMM..',
    '....TkkttkkT....',
    '....TWkSSkWT....',
    '....TWKSSKWT....',
    '....TSkkkkST....',
    '....TkSSSSkT....',
    '....TsSSSStT....',
    '....TTTTTTTT....',
    '....kkk..kkk....',
    '................',
  ],
  squashed: [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '................', '................',
    '..MMMMMMMMMMMM..',
    '.MvAvYYmmmYYmmVM',
    'MvvvYyvvvvYyvvVM',
    'MMMMMMMMMMMMMMMM',
    'kk.TWKttttKWT.kk',
  ],
};

const HOPPER_PALETTE = {
  '.': null,
  'M': '#2a1a48', // Hut Umriss
  'V': '#4a3580', // Hut Schatten
  'm': '#6f52b8', // Hut Grund
  'v': '#9b7ae0', // Hut Licht / Rand
  'A': '#d9b8f0', // Hut Glanz
  'Y': '#f3d35a', // Flecken
  'y': '#c9a030', // Flecken Schatten
  'T': '#5a4630', // Stiel Umriss
  't': '#c9b68f', // Stiel Schatten
  'S': '#e8d9b8', // Stiel Grund
  's': '#fff6e0', // Stiel Licht
  'k': '#1c1a26', // Brauen, Mund, Füße
  'W': '#ffffff', 'K': '#120a06',
};

export const SHEETS = [
  { key: 'walker', frameWidth: 16, frameHeight: 16, frames: WALKER_FRAMES, palette: WALKER_PALETTE },
  { key: 'hopper', frameWidth: 16, frameHeight: 16, frames: HOPPER_FRAMES, palette: HOPPER_PALETTE },
];
