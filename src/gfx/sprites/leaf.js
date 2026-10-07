// Blätterschirm (22x12): großes Herbstblatt mit Blattadern, Stiel unten mittig (Spalten 10-11).
// Wird über der Heldin gezeichnet; die Hände des glide-Frames greifen den Stiel.

//        0123456789012345678901
const LEAF0 = [
  '.........DDDD.........', // 0  Blattspitze
  '......DDDNNvMDDD......', // 1
  '....DDMNNvMvMvLlDD....', // 2
  '..DDMMMvMMMvMMvLLlDD..', // 3
  '.DMMMvMMMMLvLLLvLLllD.', // 4
  'DMMvMMMLLLLvLLLLvLLllD', // 5  gezackter Rand
  '.DvLLLLLLLLvLLLLLvLlD.', // 6
  'DLLLLLvLLLLvLLLvLLlllD', // 7
  '..DDLLLvLLLvLLvLLlDD..', // 8
  '...DDDLLvLLvLvLLDDD...', // 9
  '......DDDLvvLDDD......', // 10
  '.........DGgD.........', // 11 Stiel
];
// Leichtes Wippen: Blattkrone kippt 1 px nach rechts, Stiel bleibt
const LEAF1 = LEAF0.map((r, i) => (i <= 9 ? '.' + r.slice(0, -1) : r));

const FRAMES = { leaf0: LEAF0, leaf1: LEAF1 };

// D Umriss · l/L/M/N Blatt (Schatten/Grund/Licht/Glanz) · v Blattader · G/g Stiel (dunkel/hell)
const PALETTE = {
  '.': null,
  'D': '#6a1c10', 'l': '#b8321f', 'L': '#d9742a', 'M': '#f3a35a', 'N': '#ffd39a',
  'v': '#8f3b1f', 'G': '#5a3a14', 'g': '#8d5a2b',
};

export const SHEETS = [
  { key: 'leaf', frameWidth: 22, frameHeight: 12, frames: FRAMES, palette: PALETTE },
];
