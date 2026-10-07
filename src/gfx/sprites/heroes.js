// Heldinnen-Spritesheets: 'lotti' (dunkelblond, Zöpfe, blaues Kleid) und 'greta' (hellblond, offenes Haar, grünes Kleid mit Schürze).
// Frames 24x24, blicken nach rechts, Füße auf der untersten Zeile, Hitbox 10x14 mittig unten (Spalten 7-16, Zeilen 10-23).
// Aufbau pro Frame aus Ebenen: Rumpf (gemeinsam) → Arme (gemeinsam) → Kopf (je Heldin) → ggf. Arme vor dem Kopf.
// Gemeinsame Zeichen, Farben je Heldin über die Palette (A/a = Schürze: bei Lotti Kleidfarbe, bei Greta weiß).

const W = 24, H = 24;
const E = '.'.repeat(W);
const BLANK = Array(H).fill(E);

/** Malt `rows` (Strings, '.' = durchsichtig) ab Zeile dy / Spalte dx auf `base`. */
function paint(base, rows, dx = 0, dy = 0) {
  const out = base.map((r) => r.split(''));
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const c = r[x];
      const yy = y + dy, xx = x + dx;
      if (c === '.' || yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
      out[yy][xx] = c;
    }
  });
  return out.map((r) => r.join(''));
}
const compose = (...layers) => layers.reduce((acc, [rows, dx = 0, dy = 0]) => paint(acc, rows, dx, dy), BLANK);

// ---------------------------------------------------------------- Rumpf (Zeilen 12-19: Hals, Kragen, Mieder, Rock, Saum)
//        012345678901234567890123
const TORSO = [
  '........ooosssooo.......', // 12 Hals
  '........oDCCsCCDo.......', // 13 Kragen
  '........oeDCACDdo.......', // 14
  '........oeDAAAddo.......', // 15
  '........oeAAAAado.......', // 16 Rock beginnt
  '.......oeeAAAAaddo......', // 17
  '.......oeDAAAAaddo......', // 18
  '.......ooooooooooo......', // 19 Saum
];
// Rock weht beim Laufen nach hinten (links)
const TORSO_RUN = [
  ...TORSO.slice(0, 4),
  '........oeAAAAado.......', // 16
  '......oeeDAAAAaddo......', // 17
  '.....oeeeDAAAAaddo......', // 18
  '.....ooooooooooooo......', // 19
];
// Sitzend: Rock liegt breit auf dem Panzer
const TORSO_RIDE = [
  ...TORSO.slice(0, 4),
  '........oeAAAAado.......', // 16
  '......ooeeAAAAaddoo.....', // 17
  '.....oeeeDAAAAadddo.....', // 18
  '.....oooooooooooooo.....', // 19
];
// Hängend am Schirm: Rock schwingt leicht
const TORSO_GLIDE = [
  ...TORSO.slice(0, 4),
  '........oeAAAAado.......', // 16
  '.......oeeAAAAaddo......', // 17
  '......oeeDAAAAadddo.....', // 18
  '......oooooooooooo......', // 19
];

// ---------------------------------------------------------------- Beine (Zeilen 19-23, Sohle auf Zeile 23)
const LEGS_STAND = [
  '........oSSooSSo........', // 20
  '........ocBBocBBo.......', // 21
  '........oBbboBbbo.......', // 22
  '........ooooooooo.......', // 23
];
// Kontakt-Pose: Beine weit gespreizt
const LEGS_RUN_A = [
  '........oSSooSSo........', // 20
  '......ocBBo...ocBBo.....', // 21
  '......oBbbo...oBbbo.....', // 22
  '......ooooo...ooooo.....', // 23
];
// Durchgangs-Pose (Körper 1 px höher): Standbein gestreckt, hinteres Bein angehoben
const LEGS_RUN_B = [
  '.........oSSoSSo........', // 19
  '.......ocBBooSSo........', // 20
  '.......oBbboocBBo.......', // 21
  '.......ooooooBbbo.......', // 22
  '............ooooo.......', // 23
];
// Zweite Kontakt-Pose: hinteres Bein angewinkelt hoch
const LEGS_RUN_C = [
  '........oSSooSSo........', // 20
  '......ocBBo..ocBBo......', // 21
  '......oBbbo..oBbbo......', // 22
  '......ooooo..ooooo......', // 23
];
// Sprung: Beine angezogen (Fersen nach hinten), 1 px über dem Boden
const LEGS_JUMP = [
  '.........oSSoSSo........', // 19
  '.......ocBBocBBo........', // 20
  '.......oBbboBbbo........', // 21
  '.......ooooooooo........', // 22
  E,                          // 23
];
// Fall: Beine gespreizt, baumeln
const LEGS_FALL = [
  '.......oSSo..oSSo.......', // 20
  '......ocBBo..ocBBo......', // 21
  '......oBbbo..oBbbo......', // 22
  '......ooooo..ooooo......', // 23
];
// Gleiten: Beine hängen, ein Bein leicht angewinkelt
const LEGS_GLIDE = [
  '........oSSo.oSSo.......', // 20
  '........ocBBocBBo.......', // 21
  '........oBbboBbbo.......', // 22
  '........oooo.oooo.......', // 23
];
// Reiten: Beine nach vorn-unten, Füße auf Zeile 23 (= Zeile 7 des Käfers)
const LEGS_RIDE = [
  '.............oSSSSo.....', // 20 Oberschenkel nach vorn
  '..............ooSSSo....', // 21
  '...............ocBBBo...', // 22 Stiefel
  '...............ooooooo..', // 23 Sohle
];

// ---------------------------------------------------------------- Arme (Zeilen 12-17)
const ARMS_IDLE = [
  '.......o.........o......', // 12 Ärmelansatz
  '......oDo.......oDo.....', // 13
  '.....oeDo.......oDdo....', // 14 Puffärmel
  '......oSo.......oSo.....', // 15
  '.....oSSo.......oSso....', // 16 Hand
  '.....ooo.........ooo....', // 17
];
// Lauf A: hinterer Arm nach hinten-unten, vorderer Arm angewinkelt mit Faust oben
const ARMS_RUN_A = [
  '.......o...........ooo..', // 12
  '......oDo.......oDoSSo..', // 13
  '.....oeDo.......oDosso..', // 14
  '.....oSSo.......oSSooo..', // 15
  '....oSso.........ooo....', // 16
  '....ooo.................', // 17
];
// Lauf B (Durchgang): Arme nah am Körper, leicht versetzt
const ARMS_RUN_B = [
  '.......o.........o......', // 12
  '......oDo.......oDo.....', // 13
  '.....oeDo.......oDdo....', // 14
  '.....oSo.........oSo....', // 15
  '....oSso.........oSSo...', // 16
  '....ooo...........ooo...', // 17
];
// Lauf C: hinterer Arm angewinkelt mit Faust hoch, vorderer Arm nach vorn-unten
const ARMS_RUN_C = [
  '....ooo.................', // 11
  '...oSSoo.........o......', // 12
  '...ossooDo......oDo.....', // 13
  '....oSSoDo......oDdo....', // 14
  '.....ooSo........oSoo...', // 15
  '......oo..........oSSo..', // 16
  '...................ooo..', // 17
];
// Sprung: vorderer Arm hoch gestreckt (Faust oben), hinterer Arm nach hinten-unten
const ARMS_JUMP = [
  '..................ooo...', // 3
  '.................oSSo...', // 4
  '.................ossso..', // 5  Faust
  '.................oSoo...', // 6
  '.................oSo....', // 7
  '.................oSo....', // 8
  '.................oSo....', // 9
  '.................oDo....', // 10 Ärmel
  '................oDDo....', // 11
  '.......o........oDdo....', // 12
  '......oDo.......oDoo....', // 13
  '.....oeDo.......oooo....', // 14
  '.....oSSo...............', // 15
  '....oSso................', // 16
  '....ooo.................', // 17
];
// Fall: Arme waagerecht ausgebreitet
const ARMS_FALL = [
  '..ooo..o.........o..ooo.', // 12
  '.oSSooDo........oDooSSo.', // 13
  'oSsSSDDo........oDDSSsSo', // 14
  'oooooooo........oooooooo', // 15
];
// Gleiten: beide Arme nach oben zum Schirmstiel (werden VOR dem Kopf gemalt)
const ARMS_GLIDE = [
  '........oSSoSSo.........', // 0  Hände greifen den Stiel
  '.......oSsooosSo........', // 1
  '......oSSo.....oSSo.....', // 2
  '.....oSSo.......oSSo....', // 3
  '....oSSo.........oSSo...', // 4
  '...oSSo...........oSSo..', // 5
  '...oSo.............oSo..', // 6
  '...oSo.............oSo..', // 7
  '...oSo.............oSo..', // 8
  '...oSo.............oSo..', // 9
  '...oSo.............oSo..', // 10
  '...oDo.............oDo..', // 11 Ärmel
  '...oDDo...........oDDo..', // 12
  '.....oDDo.......oDDo....', // 13
  '......oDo.......oDo.....', // 14
  '......oo.........oo.....', // 15
];
// Reiten: vordere Hand hält sich am Panzer fest, hinterer Arm jubelnd hoch
const ARMS_RIDE = [
  '.ooo....................', // 9
  'oSSo....................', // 10 Faust
  'ossoo...................', // 11
  '.oSSo..o.........o......', // 12
  '..oSSoDo........oDo.....', // 13
  '...oSoDo........oDdo....', // 14
  '....oSSo.........oSo....', // 15
  '.....oo...........oSo...', // 16
  '...................oSSo.', // 17
  '...................osso.', // 18
  '....................ooo.', // 19
];

// ---------------------------------------------------------------- Lotti: Köpfe (Zeilen 0-12), Zöpfe stehen seitlich ab
// Rote Haarschleife oben rechts (7x4), sitzt auf dem Haar
const BOW = [
  '.............oo.oo......', // 0
  '............oRprRRo.....', // 1
  '............oRRrRro.....', // 2
  '.............oo.oo......', // 3
];
const BOW_FLIPPED = [...BOW].reverse(); // kopfüber (Sturzflug)
//        012345678901234567890123
const LOTTI_HEAD = [
  E,                          // 0
  '........ooooooo.........', // 1
  '......ooHiiHHHHoo.......', // 2
  '.....oHHiIiHHHHHHo......', // 3
  '.....oHHHiHHHHHHHo......', // 4
  '.oooooHhHhHsSSSSHoooooo.', // 5  Zöpfe oben
  'oHRiHhHHhsssSSSSShHhiRHo', // 6  Zopf: Quaste, Band, Flechtung
  'ohrHhHHhhSWWSSWWShhHhrho', // 7  Augen oben
  '.oooooHhhSWKSSWKShooooo.', // 8
  '.....oHhhSWKSSWKSo......', // 9
  '.....ohhSSxSSOOxso......', // 10 Mund, Wangen
  '......oosSSSSSsso.......', // 11 Kinn
  '........ooo...ooo.......', // 12
];
// Blinzeln (idle1): Augen zu, Zöpfe hängen 1 px tiefer
const LOTTI_HEAD_BLINK = [
  E,
  '........ooooooo.........',
  '......ooHiiHHHHoo.......',
  '.....oHHiIiHHHHHHo......',
  '.....oHHHiHHHHHHHo......',
  '.....oHhHhHsSSSSHo......',
  '.oooooHHhsssSSSSShooooo.',
  'oHRiHhHhhSSSSSSSShHhiRHo',
  'ohrHhHHhhSooSSooShhHhrho', // Lider
  '.oooooHhhSSSSSSSSooooo..',
  '.....ohhSSxSSOOxso......',
  '......oosSSSSSsso.......',
  '........ooo...ooo.......',
];
// Laufen: beide Zöpfe wehen nach hinten
const LOTTI_HEAD_RUN = [
  E,
  '........ooooooo.........', // 1
  '......ooHiiHHHHoo.......', // 2
  '..ooooHHiIiHHHHHHo......', // 3
  '.oHRiHhHHiHHHHHHHo......', // 4  oberer Zopf
  '.ohrHhHHhHHsSSSSHo......', // 5
  '..ooooHHhsssSSSSSo......', // 6
  '.....oHhhSWWSSWWSo......', // 7
  '.oooooHhhSWKSSWKSo......', // 8
  'oHRiHhhhhSWKSSWKSo......', // 9  unterer Zopf
  'ohrHhHhhSSxSSOOxso......', // 10
  '.ooooooosSSSSSsso.......', // 11
  '........ooo...ooo.......', // 12
];
// Fallen: Zöpfe peitschen nach oben, Mund offen
const LOTTI_HEAD_UP = [
  E,
  '........ooooooo.........', // 1
  '.ooo..ooHiiHHHHoo..ooo..', // 2
  'oHio.oHHiIiHHHHHHo.oiHo.', // 3
  '.oRrooHHHiHHHHHHHoorRo..', // 4
  '..oHhoHhHhHsSSSSHohHo...', // 5
  '...ohHHHhsssSSSSSHho....', // 6
  '....ohHhhSWWSSWWSho.....', // 7
  '.....oHhhSWKSSWKSo......', // 8
  '.....oHhhSWKSSWKSo......', // 9
  '.....ohhSSxSSmmxso......', // 10
  '......oosSSSSmmso.......', // 11
  '........ooo...ooo.......', // 12
];

// ---------------------------------------------------------------- Greta: Köpfe – langes offenes Haar, Haarreif, Haar fällt hinten über die Schulter
const GRETA_HEAD = [
  E,                          // 0
  '........ooooooo.........', // 1
  '......ooRppRRRRoo.......', // 2  Haarreif
  '.....oRrHiIiHHHHro......', // 3
  '....oHHHHiHHHHHHHo......', // 4
  '...oHHHHhhsSSSSSHo......', // 5  Pony mit Mittelscheitel
  '..oHHHHhhsssSSSSSho.....', // 6
  '..oHHHhhhSWWSSWWSho.....', // 7
  '..oHHHhhhSWKSSWKSho.....', // 8
  '..ohHHhhhSWKSSWKSho.....', // 9
  '..ohHHhhSSxSSOOxsho.....', // 10
  '..ohHHhosSSSSSsso.......', // 11
  '..ohHhhoooo...ooo.......', // 12
  '...ohho.................', // 13 Haarspitzen über der Schulter
  '....oo..................', // 14
];
const GRETA_HEAD_BLINK = [
  E,
  '........ooooooo.........',
  '......ooRppRRRRoo.......',
  '.....oRrHiIiHHHHro......',
  '....oHHHHiHHHHHHHo......',
  '...oHHHHhhsSSSSSHo......',
  '..oHHHHhhsssSSSSSho.....',
  '..oHHHhhhSSSSSSSSho.....',
  '..oHHHhhhSooSSooSho.....', // Lider
  '..ohHHhhhSSSSSSSSho.....',
  '..ohHHhhSSxSSOOxsho.....',
  '..ohHHhosSSSSSsso.......',
  '..ohHhhoooo...ooo.......',
  '...ohho.................',
  '....oo..................',
];
// Laufen: Haar weht in zwei Wellen nach hinten
const GRETA_HEAD_RUN = [
  E,
  '........ooooooo.........', // 1
  '......ooRppRRRRoo.......', // 2
  '...oooRrHiIiHHHHro......', // 3
  '.oooHHHHHiHHHHHHHo......', // 4
  'oHHiHHHHhhsSSSSSHo......', // 5
  'oHhHHHHhhsssSSSSSho.....', // 6
  '.ooHHhhhhSWWSSWWSho.....', // 7
  'oHHhHhhhhSWKSSWKSho.....', // 8
  'ohHHhhhhhSWKSSWKSho.....', // 9
  '.oohhHhhSSxSSOOxsho.....', // 10
  '...oohhosSSSSSsso.......', // 11
  '.....oooooo...ooo.......', // 12
];
// Fallen: Haar fliegt nach oben, Mund offen
const GRETA_HEAD_UP = [
  '..oooo..........ooo.....', // 0
  '.oHHiio.ooooooo.oiHo....', // 1
  '.oHHHHooRppRRRRooHHo....', // 2
  '..oHHoRrHiIiHHHHrHo.....', // 3
  '...oHHHHHiHHHHHHHHo.....', // 4
  '...oHHHHhhsSSSSSHHo.....', // 5
  '....oHHhhsssSSSSSho.....', // 6
  '.....oHhhSWWSSWWSho.....', // 7
  '.....oHhhSWKSSWKSho.....', // 8
  '.....ohhhSWKSSWKSho.....', // 9
  '.....ohhSSxSSmmxsho.....', // 10
  '......oosSSSSmmsoo......', // 11
  '........ooo...ooo.......', // 12
];

// ---------------------------------------------------------------- Sturzflug: kopfüber, Körper gestreckt, Arme am Körper
//        012345678901234567890123
const DIVE_BODY = [
  '........ooooooooo.......', // 0  Sohlen
  '........oBbboBbbo.......', // 1
  '........ocBBocBBo.......', // 2
  '........oSSooSSo........', // 3  Beine
  '.......ooooooooooo......', // 4  Saum
  '.......oeDAAAAaddo......', // 5
  '.......oeeAAAAaddo......', // 6
  '........oeAAAAado.......', // 7
  '........oeDAAAddo.......', // 8
  '........oeDCACDdo.......', // 9
  '........oDCCsCCDo.......', // 10 Kragen
  '........ooosssooo.......', // 11 Hals
];
const ARMS_DIVE = [
  '....ooo..........ooo....', // 3  Hände oben an der Hüfte
  '....oSso.........oSSo...', // 4
  '.....oSo.........oSo....', // 5
  '.....oSo.........oSo....', // 6
  '......oSo.......oSo.....', // 7
  '......oSo.......oSo.....', // 8
  '.....oeDo.......oDdo....', // 9  Puffärmel
  '......oDo.......oDo.....', // 10
  '.......o.........o......', // 11
];
// Lotti kopfüber (Zeilen 11-23): Zöpfe zeigen schräg nach oben
const LOTTI_HEAD_DIVE = [
  '.ooo...............ooo..', // 11
  'oHio...............oiHo.', // 12
  '.oRro.............orRo..', // 13
  '..oHhoooo...oooo.ohHo...', // 14
  '...ohHosSSSSSsso.Hho....', // 15
  '....ohhSSxSSOOxsoho.....', // 16 Mund
  '.....oHhhSWKSSWKSo......', // 17 Augen (kopfüber: Pupille oben)
  '.....oHhhSWKSSWKSo......', // 18
  '.....oHhhSWWSSWWSo......', // 19
  '.....oHHhsssSSSSSo......', // 20 Pony
  '.....oHHHiHHHHHHHo......', // 21
  '......ooHiiHHHHoo.......', // 22
  '........ooooooo.........', // 23
];
// Greta kopfüber: Haar strömt nach oben
const GRETA_HEAD_DIVE = [
  '..ooo...........ooo.....', // 9
  '.oHHio..........oiHo....', // 10
  '.oHHHo..........oHHo....', // 11
  '..oHHHo........oHHo.....', // 12
  '..oHHHHoooo...oooHo.....', // 13
  '...oHHHosSSSSSssoHo.....', // 14
  '...oHHhoSSxSSOOxsho.....', // 15
  '....ohhhSWKSSWKSho......', // 16
  '....oHhhSWKSSWKSho......', // 17
  '....oHhhSWWSSWWSho......', // 18
  '....oHHhhsssSSSSho......', // 19
  '....oHHHHHiHHHHHHo......', // 20
  '.....oRrHiIiHHHHro......', // 21
  '......ooRppRRRRoo.......', // 22
  '........ooooooo.........', // 23
];

/** Baut alle Frames einer Heldin aus den Ebenen. */
function buildFrames(h) {
  return {
    idle0: compose([TORSO, 0, 12], [LEGS_STAND, 0, 20], [ARMS_IDLE, 0, 12], [h.head]),
    idle1: compose([TORSO, 0, 12], [LEGS_STAND, 0, 20], [ARMS_IDLE, 0, 12], [h.blink]),
    run0: compose([TORSO_RUN, 0, 12], [LEGS_RUN_A, 0, 20], [ARMS_RUN_A, 0, 12], [h.run]),
    run1: compose([TORSO_RUN, 0, 11], [LEGS_RUN_B, 0, 19], [ARMS_RUN_B, 0, 11], [h.run, 0, -1]),
    run2: compose([TORSO_RUN, 0, 12], [LEGS_RUN_C, 0, 20], [ARMS_RUN_C, 0, 11], [h.run]),
    run3: compose([TORSO_RUN, 0, 11], [LEGS_RUN_B, 0, 19], [ARMS_RUN_B, 0, 11], [h.run, 0, -1]),
    jump: compose([TORSO_RUN, 0, 11], [LEGS_JUMP, 0, 19], [ARMS_JUMP, 0, 3], [h.run, 0, -1]),
    fall: compose([TORSO, 0, 12], [LEGS_FALL, 0, 20], [ARMS_FALL, 0, 12], [h.up]),
    glide: compose([TORSO_GLIDE, 0, 12], [LEGS_GLIDE, 0, 20], [h.head], [ARMS_GLIDE, 0, 0]),
    ride: compose([TORSO_RIDE, 0, 12], [LEGS_RIDE, 0, 20], [ARMS_RIDE, 0, 9], [h.head]),
    dive: compose([DIVE_BODY, 0, 0], [h.dive, 0, h.diveTop], [ARMS_DIVE, 0, 3]),
  };
}
const withBow = (head) => paint(head, BOW, 0, 0);
const LOTTI = {
  head: withBow(LOTTI_HEAD), blink: withBow(LOTTI_HEAD_BLINK), run: withBow(LOTTI_HEAD_RUN), up: withBow(LOTTI_HEAD_UP),
  dive: paint(LOTTI_HEAD_DIVE, BOW_FLIPPED, 0, 9), diveTop: 11,
};
const GRETA = { head: GRETA_HEAD, blink: GRETA_HEAD_BLINK, run: GRETA_HEAD_RUN, up: GRETA_HEAD_UP, dive: GRETA_HEAD_DIVE, diveTop: 9 };

export const HERO_FRAME = { width: W, height: H };

// Gemeinsame Zeichen: o Umriss · O Innenlinie/Mund · h/H/i/I Haar (Schatten/Grund/Licht/Glanz) · s/S Haut (Schatten/Grund)
// x Wange · W/K Auge · m Mund offen · d/D/e Kleid (Schatten/Grund/Licht) · A/a Schürze · C Kragen
// b/B/c Stiefel (Schatten/Grund/Licht) · r/R/p Schleife bzw. Haarreif (Schatten/Grund/Licht)
const PALETTE_LOTTI = {
  '.': null,
  'o': '#2a1a12', 'O': '#5a2d0c',
  'h': '#8a6327', 'H': '#b5893a', 'i': '#dcb45e', 'I': '#f1d78a',
  's': '#e8b48c', 'S': '#f8d9b4', 'x': '#f2a898',
  'W': '#ffffff', 'K': '#1a0e0a', 'm': '#8a3a2a',
  'd': '#1f3d7a', 'D': '#3f7fc4', 'e': '#6fb0ff',
  'A': '#3f7fc4', 'a': '#1f3d7a', 'C': '#fff6e8',
  'b': '#4a2a1a', 'B': '#6b3f1c', 'c': '#8d5a2b',
  'r': '#7a1f2b', 'R': '#c2383f', 'p': '#e85a5a',
};
const PALETTE_GRETA = {
  ...PALETTE_LOTTI,
  'h': '#c9a84f', 'H': '#efd98e', 'i': '#fff0b8', 'I': '#fffbe6',   // hellblond
  'd': '#2f5230', 'D': '#4f7d24', 'e': '#74a832',                   // grünes Kleid
  'A': '#fff6e8', 'a': '#cfc4b0',                                   // weiße Schürze
  'r': '#8a2a55', 'R': '#d94f8a', 'p': '#f58fbb',                   // rosa Haarreif
};

export const SHEETS = [
  { key: 'lotti', frameWidth: W, frameHeight: H, frames: buildFrames(LOTTI), palette: PALETTE_LOTTI },
  { key: 'greta', frameWidth: W, frameHeight: H, frames: buildFrames(GRETA), palette: PALETTE_GRETA },
];
