// Schneegarten (0-9): Testlevel der Motor-Erweiterungen für Welt 3 (tests/course_w3engine.mjs). Ein Mittelweg führt
// nach −Z, jede Station hat ein Schild und benannte Punkte (marks):
//   Gleitblatt (z 8 … −28)        Gleitblatt am Weg + ?-Block, Pilzling im Gehege (Schwanzhieb), Ziegel, Statue-Gehege
//   Gleitlücke (−28 … −36)        8 m breite Lücke: im Gehtempo nur gleitend zu schaffen
//   Eis (−36 … −60)               links Gras, rechts Eisbahn (Bremsweg), Pilzling auf dem Eis
//   Schlittschuh (−62 … −110)     Schlittschuh, Graspiste links mit Stachelboden und Pilzling, Eispiste rechts
//   Schneeball (−112 … −150)      Schneefeld, Schneeball mit Münzen, Pilzling im Weg, Mauer; großer Ball zum Draufstehen
//   Kettenzaun (−152 … −190)      fester Zaun mit Pilzling dahinter (Faustschlag), fahrender Zaun, Kettenplattform
//   Unterwasser (−192 … −230)     tiefes Becken (7,6 m, id 'see' – Wasserspiegel), Strömungsfeld nach +X
//   Ziel (−232 … −246)

const Y = 1;

/** Gehege: vier niedrige Mauern um x0..x1 × z0..z1 (z0 > z1). */
function pen(x0, x1, z0, z1, h = 1.2) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  return [
    { type: 'wall', pos: [cx, Y, z0], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [cx, Y, z1], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, d], camIgnore: true },
    { type: 'wall', pos: [x1, Y, cz], size: [0.5, h, d], camIgnore: true },
  ];
}

export const LEVEL = {
  id: '0-9',
  world: 0,
  title: 'Schneegarten',
  archetype: 'parcours',
  theme: 'snow',
  music: 'course_snow',
  timeLimit: 999,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -190, pitch: 45, dist: 13, yaw: 0 },
    { from: -198, to: -230, pitch: 20, dist: 8.5, yaw: 0 },
    { from: -236, to: -252, pitch: 45, dist: 13, yaw: 0 },
  ],
  underwater: { near: 2, far: 26 },
  segments: [
    // Gleitblatt + Lücke
    { type: 'schneefeld', pos: [0, 0, -10], size: [26, 1, 36] },
    // Eis: links Gras, rechts Eisbahn (bündig)
    { type: 'schneefeld', pos: [-6.5, 0, -48], size: [13, 1, 24] },
    { type: 'island', pos: [6.5, 0, -48], size: [13, 0.7, 24], top: 'stone' },
    { type: 'eisbahn', pos: [6.5, 0.7, -48], size: [13, 0.3, 24] },
    // Schlittschuh: Graspiste links, Eispiste rechts
    { type: 'schneefeld', pos: [-5.5, 0, -85], size: [15, 1, 50] },
    { type: 'island', pos: [7.5, 0, -85], size: [11, 0.7, 50], top: 'stone' },
    { type: 'eisbahn', pos: [7.5, 0.7, -85], size: [11, 0.3, 50] },
    { type: 'stachelboden', pos: [-6, Y, -80], size: [6, 0.25, 4] },
    // Schneeball
    { type: 'schneefeld', pos: [0, 0, -130], size: [26, 1, 40] },
    { type: 'wall', pos: [0, Y, -147], size: [12, 3, 1] },
    // Kettenzaun
    { type: 'schneefeld', pos: [0, 0, -170], size: [26, 1, 40] },
    { type: 'kettenzaun', id: 'zaun_fest', pos: [-6, Y, -158], size: [5, 4] },
    { type: 'kettenzaun', id: 'zaun_fahrt', pos: [6, Y, -166], size: [4, 3.5], path: [[3.5, Y, -166], [8.5, Y, -166]], speed: 1.5, wait: 0.3 },
    { type: 'kettenplattform', id: 'plattform', pos: [0, 4, -182], size: [5, 3], path: [[-6, 4, -182], [6, 4, -182]], speed: 2 },
    // Unterwasser: Becken (Boden y −8 … −7, Wände bis 4,5), Wasser bis 0,6
    { type: 'island', pos: [0, -9, -211], size: [24, 2, 34], top: 'stone', under: 0 },
    { type: 'island', pos: [-11, -7, -211], size: [2, 11.5, 30], top: 'stone', under: 0 },
    { type: 'island', pos: [11, -7, -211], size: [2, 11.5, 30], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -7, -227], size: [24, 11.5, 2], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -7, -193], size: [24, 8, 6], top: 'stone', under: 0 },
    { type: 'water', id: 'see', pos: [0, -7, -211], size: [20, 7.6, 30], rise: { to: 3.6, speed: 2 } },
    { type: 'water', id: 'stroemung', pos: [5, -7, -205], size: [8, 7.6, 6], current: [3, 0, 0], show: false },
    // Ziel (hinter der Beckenwand; erreichbar, wenn das Wasser gestiegen ist – Druckfeld am Beckenrand)
    { type: 'schneefeld', pos: [0, 0, -237], size: [26, 1, 18] },
    { type: 'killplane', y: -16 },
    // Schilder
    { type: 'sign', pos: [-5, Y, 4], text: 'Gleitblatt' },
    { type: 'sign', pos: [-9, Y, -25], text: 'Gleitlücke 8 m' },
    { type: 'sign', pos: [-9, Y, -38], text: 'Eis' },
    { type: 'sign', pos: [-10, Y, -64], text: 'Schlittschuh' },
    { type: 'sign', pos: [-10, Y, -113], text: 'Schneeball' },
    { type: 'sign', pos: [-10, Y, -153], text: 'Kettenzaun' },
    { type: 'sign', pos: [-9, Y, -191], text: 'Unterwasser' },
    ...pen(-11, -5, -4, -11),
    ...pen(5, 11, -14, -22),
  ],
  blocks: [
    { kind: 'question', pos: [3, 3.4, -2], content: 'gleitblatt' },
    { kind: 'brick', pos: [-2.5, Y, -16] },
    { kind: 'brick', pos: [-3.5, Y, -16] },
    { kind: 'question', pos: [-4, 3.4, -66], content: 'schlittschuh' },
  ],
  enemies: [
    { kind: 'pilzling', id: 'pz_tail', pos: [-8, Y, -7.5], path: [[-10, Y, -7.5], [-6, Y, -7.5]] },
    { kind: 'pilzling', id: 'pz_statue', pos: [8, Y, -18], path: [[6, Y, -18], [10, Y, -18]] },
    { kind: 'pilzling', id: 'pz_ice', pos: [6, Y, -55], path: [[3, Y, -55], [11, Y, -55]] },
    { kind: 'pilzling', id: 'pz_skate', pos: [-6, Y, -98], path: [[-9, Y, -98], [-3, Y, -98]] },
    { kind: 'pilzling', id: 'pz_ball', pos: [0, Y, -130], dir: [1, 0], path: [[-1, Y, -130], [1, Y, -130]] },
    { kind: 'pilzling', id: 'pz_zaun', pos: [-6, Y, -158.8], path: [[-7.5, Y, -158.8], [-4.5, Y, -158.8]] },
  ],
  items: [
    { kind: 'powerup', pos: [0, Y, 0], power: 'gleitblatt' },
    { kind: 'schlittschuh', id: 'skate1', pos: [-6, Y, -66] },
    { kind: 'schneeball', id: 'ball1', pos: [0, Y, -117], size: 1, content: 'coins:5' },
    { kind: 'schneeball', id: 'ball_gross', pos: [-8, Y, -121], size: 1.8, grow: false },
    { kind: 'coins', from: [-2, 3, -32], to: [2, 3, -32], n: 3 },
    { kind: 'pfeld', id: 'pf_see', pos: [7, Y, -192], need: 1, on: { start: 'see' } },
  ],
  checkpoint: [0, Y, -152],
  goal: [0, Y, -241],
  marks: {
    start: [0, Y, 5], leaf: [0, Y, 0], qblock: [3, Y, -2], pen_tail: [-8, Y, -7.5], bricks: [-3, Y, -16], pen_statue: [8, Y, -18],
    gap_edge: [-6, Y, -28], gap_far: [-6, Y, -36],
    grass: [-6, Y, -40], ice: [6, Y, -40], pz_ice: [6, Y, -55],
    skate: [-6, Y, -66], skate_grass: [-6, Y, -70], skate_ice: [7.5, Y, -66], spikes: [-6, Y, -80], pz_skate: [-6, Y, -98],
    ball: [0, Y, -117], pz_ball: [0, Y, -130], ball_wall: [0, Y, -147], ball_gross: [-8, Y, -121],
    zaun: [-6, Y, -158], pz_zaun: [-6, Y, -158.8], zaun_fahrt: [6, Y, -166], plattform: [0, 4, -182],
    pool: [0, Y, -198], pool_mid: [0, -2, -211], current: [5, -3, -205], pf_see: [7, Y, -192], goal: [0, Y, -241],
  },
};
