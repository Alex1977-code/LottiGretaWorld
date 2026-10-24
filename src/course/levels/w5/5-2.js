// 5-2 „Zirkus Schwingeschwung“ – Trapez-Zirkus unter der großen Kuppel (Welt 5, Bauplan: Detail 5-2). Parcours nach −Z,
// ≈ 250 m, Thema circus, Musik course_trapeze, 400 s. Bühnen schweben hoch über den Manegen; wer fällt, fällt in die Tiefe.
//
// Abschnitte (+X = rechts im Bild; Bühnenhöhen 1 → 9 → 5 → 10 → 14):
//   1  Start und Seilbahn   z  12 …  −61   Startbühne, Seilbahn 1 schwebt hinauf; unterwegs der hohe Sims links (aus der
//                                         Gondel hinüberspringen → Stern 0, Stufen weiter hinauf); Trapezbühne, drei
//                                         Trapeze (Schwungabstand 4,5 m) zur Seilbahnbühne.
//   2  Seilbahn 2, Checkpoint z −61 … −131  Seilbahn 2 hinab zur Checkpoint-Bühne (Schnappblumen), Pilz-Trampolin hinauf
//                                         zur Requisiten-Gasse: ?-Block mit Riesentrank – als Riese durch drei graue
//                                         Steinwände, Pilzlinge und Riesenschnappblumen (Münzen, Extraleben hinter der
//                                         letzten Wand); ohne Trank über den Seitensteg.
//   3  Schwingplattformen   z −131 … −220  Glasröhre hinauf zur Bühne F (Checkpoint 2), Pendelplattform, Bühne G
//                                         (Funkenlinge), drei Drehscheiben mit Stachelstangen; östlich davon die Bühne mit der
//                                         Röhre in den Blaumünzen-Raum (Stern 1), nördlich Bühne H mit Pilz-Trampolin zum
//                                         Stempel-Sims; drei Trapeze zur Bühne I.
//   4  Finale               z −220 … −250  letztes Trapez über die große Lücke, Zielbühne mit Sternring (Stern 2) und Zielmast.
// Gegner: Schnappblume 16, Riesenschnappblume 4, Funkenling 4, Pilzling 6 (Riesentrank-Gasse).

import {
  line, arc, ring, column, areaMoods, schattenDiaet,
} from './_helpers_a.js';

const Y0 = 1, Y1 = 9, YC = 5, YD = 10, YF = 14;
const STAGE_H = 1.2;

/** Zirkusbühne (deco_w1b stage): Mitte x/z, Oberseite top, Größe w × d. */
const stage = (x, top, z, w, d, o = {}) => ({ kind: 'stage', pos: [x, top - (o.h ?? STAGE_H), z], size: [w, o.h ?? STAGE_H, d], ...o });
/** Bühne über ihre Grundfläche (z0 vorn, z1 hinten). */
const stageZ = (x0, x1, z0, z1, top, o = {}) => stage((x0 + x1) / 2, top, (z0 + z1) / 2, x1 - x0, Math.abs(z0 - z1), o);
const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.6, 0.9], yaw: o.yaw ?? 0 });
const flower = (x, y, z, yaw = Math.PI / 2, o = {}) => ({ kind: 'schnappblume', pos: [x, y, z], base: 'pot', yaw, ...o });

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M52 = {
  S0: { x0: -5, x1: 5, z0: 12, z1: -4, top: Y0 },
  LEDGE: { x0: -6, x1: -3.2, z0: -13.5, z1: -20.5, top: 6.6 },      // hoher Sims (Stern 0)
  STEP: { x0: -6, x1: -3.2, z0: -21.6, z1: -24.4, top: 7.8 },
  P1: { x0: -4.5, x1: 4.5, z0: -27, z1: -37, top: Y1 },
  P2: { x0: -4, x1: 4, z0: -52, z1: -60, top: Y1 },
  C: { x0: -7, x1: 7, z0: -81, z1: -95, top: YC },
  GASSE: { x0: -5.5, x1: 5.5, z0: -94.5, z1: -131, top: YD },
  F: { x0: -5, x1: 5, z0: -139.5, z1: -147, top: YF },
  G: { x0: -5, x1: 5, z0: -158, z1: -164, top: YF },
  EAST: { x0: 6.2, x1: 10.2, z0: -175, z1: -179.5, top: YF },
  H: { x0: -5, x1: 5, z0: -190.5, z1: -196.5, top: YF },
  PERCH: { x0: -11, x1: -7, z0: -191.5, z1: -195.5, top: 19.4 }, // Stempel-Sims
  I: { x0: -5, x1: 5, z0: -211.5, z1: -217.5, top: YF },
  J: { x0: -6, x1: 6, z0: -223.5, z1: -250, top: YF },
  ROOM: { x0: 80, x1: 96, z0: -168, z1: -186 },                     // Blaumünzen-Raum
  WALLS: [-112, -119, -126],
};
const { S0, LEDGE, STEP, P1, P2, C, GASSE, F, G, EAST, H, PERCH, I, J, ROOM, WALLS } = M52;
export const DISCS = [-169.3, -177.3, -185.3];
export const TRAPEZE = {
  a: [P1.z1 - 1.5, P1.z1 - 6, P1.z1 - 10.5],                // vor P2 (z −38,5 / −43 / −47,5), Aufhängung Y1 + 6,2
  b: [H.z1 - 1.5, H.z1 - 6, H.z1 - 10.5],                   // vor I
  c: [I.z1 - 1.5],                                         // letztes Trapez
};
export const GONDOLA = {
  g1: { from: [0, Y0 + 2.2, S0.z1 - 1.5], to: [0, Y1 + 2.2, P1.z0 + 1.15] },
  g2: { from: [0, Y1 + 2.2, P2.z1 - 1.4], to: [0, YC + 2.2, C.z0 + 1.4] },
};

/** Level-Haken: Stimmung im Blaumünzen-Raum, Budget. */
function setup(level) {
  areaMoods(level, {
    raum: { fog: { color: 0x1a1030, near: 12, far: 60 }, background: 0x140c24, hemi: { sky: 0xd8c8ff, ground: 0x3a1a5a, intensity: 1.1 }, sun: { color: 0xe0d0ff, intensity: 1.6 }, dome: 0x2a1a4a },
  }, [{ min: [ROOM.x0 - 2, ROOM.z1 - 2], max: [ROOM.x1 + 2, ROOM.z0 + 2], mood: 'raum' }]);
  schattenDiaet(level, ['schnappblume', 'riesenschnappblume', 'pilzling', 'funkenling'], 1);
}

export const LEVEL = {
  id: '5-2',
  world: 5,
  title: 'Zirkus Schwingeschwung',
  archetype: 'parcours',
  theme: 'circus',
  music: 'course_trapeze',
  timeLimit: 400,
  killY: -8,
  start: { pos: [0, Y0, 8], yaw: Math.PI / 2 },
  build: setup,
  instances: { coin: { farHide: 40, shadow: false } },
  farHide: 38,
  camera: [
    { from: 16, to: -8, pitch: 42, dist: 13.5, fov: 40 },
    { from: -8, to: -26, pitch: 36, dist: 14, fov: 42, height: 1.6 },                  // Seilbahn 1, hoher Sims
    { from: -26, to: -62, pitch: 36, dist: 15, fov: 42, height: 2.2 },                 // Trapeze
    { from: -62, to: -80, pitch: 40, dist: 14, fov: 42, height: 1.4 },                 // Seilbahn 2
    { from: -80, to: -96, pitch: 44, dist: 13.5, fov: 40 },                             // Checkpoint, Trampolin
    { from: -96, to: -132, pitch: 46, dist: 13.5, fov: 40 },                            // Requisiten-Gasse
    { from: -132, to: -150, pitch: 44, dist: 13.5, fov: 40 },
    { from: -150, to: -192, pitch: 46, dist: 14.5, fov: 42, area: [-30, 30] },          // Pendel, Drehscheiben
    { from: -192, to: -226, pitch: 38, dist: 15, fov: 42, height: 2.2, area: [-30, 30] }, // Trapeze
    { from: -226, to: -256, pitch: 42, dist: 13.5, fov: 40 },                           // Ziel
    { from: -160, to: -195, pitch: 50, dist: 12.5, fov: 40, area: [70, 110] },          // Blaumünzen-Raum
  ],
  segments: [
    // =============================================================== Zelt (Kulisse), Scheinwerfer, Ketten
    { type: 'deco_w1b', items: [
      { kind: 'tent', from: [-30, 22], to: [30, -262], y0: -16, y1: 32, peak: 54,
        rings: [[0, -10, 12], [0, -90, 14], [0, -175, 13], [0, -240, 11]], poles: [[-17, -50], [17, -50], [-17, -132], [17, -132], [-17, -205], [17, -205]] },
      { kind: 'curtain', pos: [0, -16, -258], size: [30, 40], color: 0xc81e2a },
    ] },
    { type: 'deco_w1b', items: [
      { kind: 'spotlight', pos: [-26, 30, 4], target: [0, Y0, 4], r: 3.4, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [26, 30, -22], target: [LEDGE.x0 + 1.4, LEDGE.top, -17], r: 1.8, color: 0xffd0f0 },
      { kind: 'spotlight', pos: [-26, 30, -40], target: [0, Y1 + 3, -44], r: 3.6, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [26, 30, -84], target: [0, YC, -88], r: 3.4, color: 0xc8e4ff },
      { kind: 'spotlight', pos: [-26, 30, -110], target: [0, YD, -116], r: 4, color: 0xffe0b0 },
      { kind: 'spotlight', pos: [26, 30, -150], target: [0, YF, -152], r: 3.4, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [-26, 30, -176], target: [0, YF, -178], r: 4.2, color: 0xffd0f0 },
      { kind: 'spotlight', pos: [26, 32, -200], target: [PERCH.x0 + 2, PERCH.top, -193.5], r: 1.8, color: 0xfff2a0 },
      { kind: 'spotlight', pos: [-26, 30, -212], target: [0, YF + 3, -205], r: 3.6, color: 0xc8e4ff },
      { kind: 'spotlight', pos: [26, 30, -236], target: [0, YF, -240], r: 4, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [-17, 34, -90], target: [-6, -16, -90], r: 5, color: 0xffc8e8, strength: 0.1 },
      { kind: 'spotlight', pos: [17, 34, -175], target: [5, -16, -175], r: 5, color: 0xc8e4ff, strength: 0.1 },
    ] },
    { type: 'deco_w1b', items: [
      { kind: 'bunting', from: [-17, 22, -50], to: [-17, 22, -132], sag: 2.5, n: 54 },
      { kind: 'bunting', from: [17, 22, -50], to: [17, 22, -132], sag: 2.5, n: 54 },
      { kind: 'bunting', from: [-17, 22, -132], to: [-17, 22, -205], sag: 2.5, n: 50 },
      { kind: 'bunting', from: [17, 22, -132], to: [17, 22, -205], sag: 2.5, n: 50 },
      { kind: 'bulbs', from: [-17, 19, 14], to: [-17, 19, -50], sag: 1.5, n: 40 },
      { kind: 'bulbs', from: [17, 19, 14], to: [17, 19, -50], sag: 1.5, n: 40 },
      { kind: 'bulbs', from: [-17, 19, -205], to: [-17, 19, -255], sag: 1.5, n: 34 },
      { kind: 'bulbs', from: [17, 19, -205], to: [17, 19, -255], sag: 1.5, n: 34 },
      { kind: 'balloons', pos: [-21, 8, -70], n: 6, size: 3 },
      { kind: 'balloons', pos: [21, 12, -150], n: 6, size: 3 },
      { kind: 'balloons', pos: [-21, 14, -232], n: 5, size: 3 },
      // Requisiten unten in den Manegen (Blick in die Tiefe)
      { kind: 'drum', pos: [-5, -16, -6], size: [2.4, 1.4], color: 'blue' }, { kind: 'drum', pos: [5, -16, -13], size: [2.2, 1.2], color: 'yellow' },
      { kind: 'ball', pos: [2, -16, -4], size: 1.1 }, { kind: 'cannon', pos: [-7, -16, -88], yaw: 0.6 },
      { kind: 'drum', pos: [6, -16, -95], size: [2.6, 1.6], color: 'red' }, { kind: 'ball', pos: [4, -16, -86], size: 1.2 },
      { kind: 'drum', pos: [-4, -16, -172], size: [2.4, 1.4], color: 'green' }, { kind: 'ball', pos: [5, -16, -178], size: 1 },
      { kind: 'confetti', pos: [0, -16, -10], size: [18, 18], n: 70 }, { kind: 'confetti', pos: [0, -16, -90], size: [20, 20], n: 80 },
      { kind: 'confetti', pos: [0, -16, -175], size: [18, 18], n: 70 }, { kind: 'confetti', pos: [0, -16, -240], size: [16, 16], n: 60 },
    ] },

    // =============================================================== 1  Start und Seilbahn 1
    { type: 'deco_w1b', items: [
      stageZ(S0.x0, S0.x1, S0.z0, S0.z1, S0.top, { color: 0x2a4fd0, star: true }),
      stageZ(LEDGE.x0, LEDGE.x1, LEDGE.z0, LEDGE.z1, LEDGE.top, { color: 0xffc21a, h: 0.8, inlay: false, skirt: ['red', 0xfff4e0] }),
      stageZ(STEP.x0, STEP.x1, STEP.z0, STEP.z1, STEP.top, { color: 0xd0302a, h: 0.8, inlay: false }),
      stageZ(P1.x0, P1.x1, P1.z0, P1.z1, P1.top, { color: 0x8a2ad0 }),
      { kind: 'drum', pos: [-3.6, Y0, 9.6], size: [1.6, 0.9], color: 'red' }, { kind: 'ball', pos: [3.6, Y0, 9], size: 0.7, solid: true },
      { kind: 'pennant', pos: [4.3, Y0, -3.3], size: 2.4, color: 'yellow' },
      { kind: 'confetti', pos: [0, Y0, 4], size: [9, 14], n: 50 },
      { kind: 'pennant', pos: [-4, P1.top, P1.z1 + 0.6], size: 2.2 },
      { kind: 'pennant', pos: [4, P1.top, P1.z1 + 0.6], size: 2.2, color: 'blue' },
    ] },
    sign(-3.4, Y0, 10.6, 'Zirkus\nSchwingeschwung', { size: [3, 1.1] }),
    sign(2.6, Y0, -1.6, 'Seilbahn', { size: [1.8, 0.7] }),
    { type: 'seilbahn', id: 'gondel1', ...GONDOLA.g1, speed: 3, wait: 3, trigger: 'auto', mode: 'pingpong' },
    // Trapeze vor der Seilbahnbühne
    ...TRAPEZE.a.map((z, i) => ({ type: 'trapez', id: `ta${i + 1}`, pos: [0, Y1 + 6.2, z], length: 3, swing: 30, color: ['rot', 'blau', 'gold'][i] })),
    sign(2.6, P1.top, P1.z0 - 1.2, 'Spring ans\nTrapez!', { size: [2.2, 0.8] }),

    // =============================================================== 2  Seilbahn 2, Checkpoint, Requisiten-Gasse
    { type: 'deco_w1b', items: [
      stageZ(P2.x0, P2.x1, P2.z0, P2.z1, P2.top, { color: 0x2a9a5a }),
      stageZ(C.x0, C.x1, C.z0, C.z1, C.top, { color: 0xd0302a, star: true }),
      stageZ(GASSE.x0, GASSE.x1, GASSE.z0, GASSE.z1, GASSE.top, { color: 0x2a4fd0 }),
      { kind: 'drum', pos: [-5.4, YC, -84], size: [1.6, 0.9], color: 'yellow' },
      { kind: 'balloons', pos: [5.6, YC, -83], n: 5, size: 1.8 },
    ] },
    { type: 'seilbahn', id: 'gondel2', ...GONDOLA.g2, speed: 3, wait: 3, trigger: 'auto', mode: 'pingpong' },
    { type: 'pilztrampolin', id: 'trampolin_c', pos: [0, YC, -92], strength: 19 },
    sign(-3.2, YC, -89.6, 'Hüpf hoch!', { size: [1.8, 0.7] }),
    // Requisiten-Gasse: graue Steinwände (nur Riesentrank), Seitensteg links
    ...WALLS.map((z, i) => ({ type: 'megawall', id: `wand${i + 1}`, pos: [1, YD, z], size: [9, 3, 1], onBreak: i === 2 ? { spawn: { kind: 'powerup', power: 'oneup', dir: [0, 0], pos: [1, YD + 0.2, z - 2.4] } } : { coins: 5 } })),
    sign(-4.6, YD, -97, 'Riesen-\nGasse', { size: [2, 0.8] }),
    { type: 'deco_w1b', items: [
      { kind: 'bulbs', from: [-5.4, YD + 1.6, -100], to: [-5.4, YD + 1.6, -130], sag: 0.5, n: 30 },
      { kind: 'pole', pos: [-5.4, YD, -100], size: 1.8, r: 0.08 }, { kind: 'pole', pos: [-5.4, YD, -130], size: 1.8, r: 0.08 },
    ] },
    // Glasröhre hinauf zur Bühne F
    { type: 'glasspipe', id: 'roehre_f', path: [[0, YD + 1, GASSE.z1 + 0.2], [0, YD + 1, GASSE.z1 - 3], [0, YF - 0.5, GASSE.z1 - 6], [0, YF + 1, F.z0 + 0.2]], radius: 1, oneWay: true, coins: 6 },

    // =============================================================== 3  Schwingplattformen
    { type: 'deco_w1b', items: [
      stageZ(F.x0, F.x1, F.z0, F.z1, F.top, { color: 0xffc21a, star: true }),
      stageZ(G.x0, G.x1, G.z0, G.z1, G.top, { color: 0x8a2ad0 }),
      stageZ(EAST.x0, EAST.x1, EAST.z0, EAST.z1, EAST.top, { color: 0x2a9a5a, inlay: false }),
      stageZ(H.x0, H.x1, H.z0, H.z1, H.top, { color: 0xd0302a }),
      stageZ(PERCH.x0, PERCH.x1, PERCH.z0, PERCH.z1, PERCH.top, { color: 0xffc21a, h: 0.8, inlay: false, skirt: [0x2a4fd0, 0xfff4e0] }),
      stageZ(I.x0, I.x1, I.z0, I.z1, I.top, { color: 0x2a4fd0 }),
      { kind: 'drum', pos: [-3, YF, -161], size: [2, 1], color: 'yellow' },
      { kind: 'drum', pos: [3, YF, -161], size: [2, 1], color: 'blue' },
    ] },
    { type: 'pendelplattform', id: 'pendel1', pos: [0, YF + 6, -152.5], length: 6, size: [3, 2.2], dir: [0, -1], amp: 35, style: 'zirkus' },
    ...DISCS.map((z, i) => ({ type: 'drehplattform', id: `scheibe${i + 1}`, axis: 'y', pos: [0, YF - 0.5, z], arms: 0, length: 3.2, thick: 0.5, speed: i % 2 ? -0.5 : 0.5, hub: true, style: 'holz' })),
    { type: 'pipe', id: 'p_blau', pos: [(EAST.x0 + EAST.x1) / 2, EAST.top, (EAST.z0 + EAST.z1) / 2], height: 1.2, color: 'blue', target: 'p_blau_raum' },
    sign(EAST.x0 + 0.6, EAST.top, EAST.z0 - 0.4, 'Geheim!', { size: [1.4, 0.6] }),
    { type: 'pilztrampolin', id: 'trampolin_h', pos: [-3.4, YF, -193.5], strength: 19 },
    ...TRAPEZE.b.map((z, i) => ({ type: 'trapez', id: `tb${i + 1}`, pos: [0, YF + 6.2, z], length: 3, swing: 30, color: ['gold', 'rot', 'blau'][i] })),

    // =============================================================== Blaumünzen-Raum (abseits)
    { type: 'room', pos: [(ROOM.x0 + ROOM.x1) / 2, YF, (ROOM.z0 + ROOM.z1) / 2], size: [ROOM.x1 - ROOM.x0, 5, ROOM.z0 - ROOM.z1], style: 0x6a2ad0, top: 'stone' },
    { type: 'pipe', id: 'p_blau_raum', pos: [ROOM.x0 + 2.4, YF, ROOM.z0 - 2.4], height: 1.2, color: 'blue' },
    { type: 'pipe', id: 'p_blau_zurueck', pos: [ROOM.x1 - 2.4, YF, ROOM.z0 - 2.4], height: 1.2, color: 'blue', target: 'p_blau' },

    // =============================================================== 4  Finale
    { type: 'deco_w1b', items: [
      stageZ(J.x0, J.x1, J.z0, J.z1, J.top, { color: 0xffc21a, star: true }),
      { kind: 'balloons', pos: [-5, YF, -246], n: 6, size: 2 },
      { kind: 'confetti', pos: [0, YF, -240], size: [10, 16], n: 60 },
      { kind: 'cannon', pos: [4.4, YF, -247], yaw: -0.5 },
    ] },
    ...TRAPEZE.c.map((z) => ({ type: 'trapez', id: 'tc1', pos: [0, YF + 6.2, z], length: 3, swing: 30, color: 'gold' })),
  ],
  blocks: [
    { kind: 'question', pos: [-1, Y0 + 2.4, 2.5], content: 'coins:3' },
    { kind: 'question', pos: [1, Y0 + 2.4, 2.5], content: 'wachstumsbeere' },
    { kind: 'question', pos: [0, YC + 2.4, -86], content: 'coins:5' },
    // Riesentrank am Eingang der Gasse
    { kind: 'question', pos: [1, YD + 2.2, -104.5], content: 'riese' },
    // Extraleben: unsichtbarer Block über dem hohen Sims
    { kind: 'hidden', pos: [LEDGE.x0 + 1.4, LEDGE.top + 3.1, -19.2], content: 'oneup' },
    { kind: 'question', pos: [0, YF + 2.4, -143.5], content: 'wachstumsbeere' },
  ],
  enemies: [
    // Schnappblumen 16 (Töpfe auf den Bühnen)
    flower(-3.8, Y1, -30, Math.PI / 2), flower(3.6, Y1, -57, Math.PI / 2),
    flower(-5.6, YC, -90, 0), flower(5.6, YC, -90, Math.PI),
    flower(-4.6, YD, -108, Math.PI / 2, { id: 'blume_steg' }), flower(4.6, YD, -97, Math.PI),
    flower(-4, YF, -145, 0), flower(4, YF, -145, Math.PI),
    flower(-4.2, YF, -163.2, 0), flower(4.2, YF, -163.2, Math.PI),
    flower(-4.2, YF, -195.8, 0), flower(4.2, YF, -195.8, Math.PI),
    flower(-4.2, YF, -217, 0), flower(4.2, YF, -217, Math.PI),
    flower(-5, YF, -236, 0), flower(5, YF, -236, Math.PI),
    // Riesenschnappblumen 4: zwei in der Gasse (nur der Riese räumt sie ab), eine an der Bühne G, eine vor dem Ziel
    { kind: 'riesenschnappblume', id: 'riese_g1', pos: [3.5, YD, -115.5], yaw: Math.PI, range: 4 },
    { kind: 'riesenschnappblume', id: 'riese_g2', pos: [3.5, YD, -122.5], yaw: Math.PI, range: 4 },
    { kind: 'riesenschnappblume', id: 'riese_east', pos: [EAST.x1 - 0.6, EAST.top, EAST.z1 + 0.6], yaw: Math.PI * 0.75, range: 3.2 },
    { kind: 'riesenschnappblume', id: 'riese_ziel', pos: [-4.2, YF, -248], yaw: 0, range: 4 },
    // Pilzlinge 6 (Riesentrank-Gasse, zwischen den Wänden)
    { kind: 'pilzling', id: 'pz1', pos: [1, YD, -108], path: [[-2, YD, -108], [4.5, YD, -108]] },
    { kind: 'pilzling', id: 'pz2', pos: [3, YD, -109.5], path: [[4.5, YD, -109.5], [-2, YD, -109.5]] },
    { kind: 'pilzling', id: 'pz3', pos: [0, YD, -115.5], path: [[-2.5, YD, -115.5], [1.5, YD, -115.5]] },
    { kind: 'pilzling', id: 'pz4', pos: [0, YD, -117], path: [[1.5, YD, -117], [-2.5, YD, -117]] },
    { kind: 'pilzling', id: 'pz5', pos: [0, YD, -122.5], path: [[-2.5, YD, -122.5], [1.5, YD, -122.5]] },
    { kind: 'pilzling', id: 'pz6', pos: [0, YD, -124], path: [[1.5, YD, -124], [-2.5, YD, -124]] },
    // Funkenlinge 4 (laufen um Trommeln und Bühnenränder)
    { kind: 'funkenling', id: 'fl1', block: { pos: [-3, YF, -161], size: [2, 1, 2] }, speed: 1.6 },
    { kind: 'funkenling', id: 'fl2', block: { pos: [3, YF, -161], size: [2, 1, 2] }, speed: 1.6, color: 'blau' },
    { kind: 'funkenling', id: 'fl3', path: [[-4.6, YF, -212.2], [4.6, YF, -212.2]], speed: 1.8, color: 'pink' },
    { kind: 'funkenling', id: 'fl4', path: [[J.x0 + 0.6, YF, -246.5], [J.x1 - 0.6, YF, -246.5]], speed: 1.6 },
  ],
  items: [
    // ---------------- 1
    line([0, Y0 + 0.6, 6], [0, Y0 + 0.6, 0], 4),
    ...arc([0, Y1 + 0.6, P1.z0 - 1.5], [0, Y1 + 0.6, P1.z1 + 1], 5, 0.4),
    ...arc([0, Y1 + 3.6, TRAPEZE.a[0] - 1.5], [0, Y1 + 3.6, TRAPEZE.a[2] + 1.5], 6, 1.4),
    // ---------------- 2
    line([0, Y1 + 0.6, P2.z0 - 1.5], [0, Y1 + 0.6, P2.z1 + 1.5], 4),
    ...column(0, -93.2, YC + 2.5, YD + 2.5, 4),
    ...[-112.5, -119.5, -126.5].map((z) => line([-4.5, YD + 0.6, z + 2], [-4.5, YD + 0.6, z - 2], 3)),
    ...[-108.8, -116.2, -123.2].map((z) => ring([1, YD + 1, z], 1.4, 6)),
    // ---------------- 3
    line([0, YF + 0.6, F.z0 - 2], [0, YF + 0.6, F.z1 + 1], 4),
    ...DISCS.map((z) => ring([0, YF + 0.6, z], 2.2, 6)),
    ...arc([2, YF + 0.6, DISCS[1]], [EAST.x0 + 0.6, YF + 0.6, (EAST.z0 + EAST.z1) / 2], 4, 1.2),
    ...column(-3.4, -193.5, YF + 2.6, YF + 6.6, 4),
    ...arc([0, YF + 3.6, TRAPEZE.b[0] - 1.5], [0, YF + 3.6, TRAPEZE.b[2] + 1.5], 6, 1.4),
    // Blaumünzen-Raum: Druckschalter → blaue Münzen (10 s) → Stern 1
    { kind: 'pswitch', id: 'schalter_blau', pos: [(ROOM.x0 + ROOM.x1) / 2, YF, (ROOM.z0 + ROOM.z1) / 2], star: 1, time: 10,
      coins: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [(ROOM.x0 + ROOM.x1) / 2 + Math.cos(a) * 4, YF + 0.6 + (i % 2) * 1.2, (ROOM.z0 + ROOM.z1) / 2 + Math.sin(a) * 4]; }) },
    // Stachelstangen auf den Naben der Drehscheiben (drehen gegen die Scheibe)
    ...DISCS.map((z, i) => ({ kind: 'stachelstange', id: `stange${i + 1}`, pos: [0, YF, z], height: 1.0, length: 2.7, arms: i === 1 ? 2 : 1, balls: 2, radius: 0.38, speed: i % 2 ? 1.1 : -1.1, angle: i * 1.3 })),
    // ---------------- 4 Finale: Sternring vor dem Ziel → Stern 2
    { kind: 'starring', id: 'sternring', pos: [0, YF, -228], star: 2, time: 10, coins: [[-1.8, -230.8], [1.8, -232.2], [-1.8, -233.6], [1.8, -235], [-1.8, -236.4], [1.8, -237.8], [-1.8, -239.2], [0, -240.6]].map(([x, z]) => [x, YF + 0.6, z]) },
    line([0, YF + 0.6, I.z0 - 1], [0, YF + 0.6, I.z1 + 1], 3),
  ],
  checkpoint: [{ pos: [0, YC, -84.5], yaw: Math.PI / 2 }, { pos: [0, YF, -144], yaw: Math.PI / 2 }],
  stars: [
    [(LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top + 1.1, -17],                        // 0: hoher Sims (aus der Seilbahn)
    { pos: [(ROOM.x0 + ROOM.x1) / 2, YF + 2.2, (ROOM.z0 + ROOM.z1) / 2], hidden: true, id: 'stern_blau' }, // 1: Blaumünzen-Raum
    { pos: [0, YF + 1.4, -236], hidden: true, id: 'stern_ring' },              // 2: Sternring
  ],
  stamp: [(PERCH.x0 + PERCH.x1) / 2, PERCH.top + 1.2, (PERCH.z0 + PERCH.z1) / 2],
  goal: { pos: [0, YF, -244], height: 9 },
  marks: {
    start: [0, Y0, 8], ledge: [(LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top, -17], p1: [0, Y1, -30], p2: [0, Y1, -56],
    c: [0, YC, -84.5], gasse: [0, YD, -100], f: [0, YF, -144], g: [0, YF, -161], east: [8.2, YF, -177.25], h: [0, YF, -194],
    perch: [-9, PERCH.top, -193.5], i: [0, YF, -214.5], j: [0, YF, -227], room: [84, YF, -172], goal: [0, YF, -242],
  },
};
