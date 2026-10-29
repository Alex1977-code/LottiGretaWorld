// S-7 „Riesenpilz-Dschungel am Tintenteich“ (Bauplan S-7: Parcours, 400 s, ca. 400 m – Dschungel, alles übergroß:
// Pilzlingstürme, Rutschhang, zwei Riesen-Pilzlingstürme, Riesentrank-Feld mit Großrollpilzen, Blockwände nur in Riesenform
// zerstörbar, versteckter Gleitblatt-Block, Blockwächter-Wand, Kontrollpunkt, Unterwasser mit Tintlingen und Strömungen,
// zweiter Riesentrank, Pilz-Trampoline durchbrechen zwei Großblock-Lagen, Röhre zum Ziel). Thema grotto, Musik course_grotto.
//
// Ein Dschungel, in dem alles riesig ist: Pilze so groß wie Häuser, Blätter wie Segel, Bäume wie Türme, und Ziegelblöcke von
// 2 m (Großblöcke). Abschnitte (Level nach −Z; Absturz unter y −26):
//   1. Dschungelstart (z 8 … −34, y 0): Pilzlingstürme; links ein Ring aus Großblöcken mit Deckel – Stampfen auf den Deckel
//      öffnet ihn, drinnen liegt der Stempel. Extraleben im unsichtbaren Block.
//   2. Rutschhang (z −34 … −66): eine Schlucht hinab bis y −10.
//   3. Riesen-Pilzlingstürme (z −66 … −100): zwei hohe Türme (7 und 9 Pilzlinge) patrouillieren zwischen Riesenpilzen, von deren
//      Hüten man sie von oben abträgt.
//   4. Riesentrank-Feld (z −100 … −150): Riesentrank-Quelle (füllt sich wieder), Großrollpilze, graue Riesen-Steinblöcke (2 m,
//      nur Riesentrank oder Bombe) als Wände – eine Schatzkammer ganz aus Stein mit Extraleben.
//   5. Gleitblatt und Blockwächter-Wand (z −150 … −190): versteckter Gleitblatt-Block; die Wand hinauf über Lauerblöcke, die im
//      Takt herausfahren; oben der Kontrollpunkt. Links hinter der Wand die Blätterinsel mit Stern 0 – nur im Gleitflug.
//   6. Tintenteich (z −190 … −291): 100 m unter Wasser; Riesenstämme auf der Oberfläche (darunter durchtauchen), Strömungen nach
//      links, rechts und gegen einen, sechs Tintlinge, Wurzelsäulen, Seetang, Münzen.
//   7. Riesentrank 2 und Pilz-Trampoline (z −291 … −332, y −5): als Riese auf das Pilz-Trampolin, durch die erste Großblock-Lage,
//      auf das zweite Trampolin, durch die zweite Lage – oben Stern 1.
//   8. Röhre zum Ziel (z −318 … −358): über der Röhre der Bonusbereich (Pilz-Trampolin hinauf): Riesentrank-Quelle, Druckschalter,
//      blaue Münzen in Steinkäfigen – nur als Riese alle in 12 s (Stern 2). Die Röhre bringt einen zum Zielplatz.

import {
  line, ring, arc, grossbloecke, riesentrankQuelle, riesenpilzPlattform, riesenstaemme, riesenbaeume, wurzelsaeulen, dschungelDeko,
} from './_helpers_c.js';

const PI = Math.PI;
const Y1 = -10, YW = -4, WS = -6, WB = -13, YG = -5, YB = 3;

const isl = (x0, x1, z0, z1, top, h = 4, o = {}) => ({ type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, Math.abs(z1 - z0)], ...o });

// Stempel-Käfig am Start: Ring aus acht Großblöcken, Deckel obendrauf
const KX = -6, KZ = -14;
const KAEFIG = [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]].map(([dx, dz]) => [KX + dx, 0, KZ + dz]);
// Großblock-Lagen über den Pilz-Trampolinen (Stern 1)
const LAGE1 = []; for (const x of [-2, 0, 2, 4]) for (const z of [-304, -306, -308]) LAGE1.push([x, 0, z]);
const LAGE2 = []; for (const x of [2, 4, 6]) for (const z of [-304, -306, -308]) LAGE2.push([x, 8, z]);
// blaue Münzen in Steinkäfigen auf dem Bonusbereich (Stern 2)
const KAEFIGE = [[-3, -324.5], [0.5, -325.5], [4, -323.5], [-0.5, -320.5]];
const BLAU = KAEFIGE.flatMap(([x, z]) => [[x, YB + 0.3, z], [x, YB + 1.3, z]]);
const STEINE = KAEFIGE.flatMap(([x, z]) => {
  const out = [];
  for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) for (const dy of [0, 1]) out.push({ kind: 'steinblock', pos: [x + dx, YB + dy, z + dz] });
  out.push({ kind: 'steinblock', pos: [x, YB + 2, z] });
  return out;
});

// Riesen-Kleinigkeiten am Wegrand (Gras, Klee, Käfer, Schnecken, Beeren, Felsen, Eicheln) – Ränder je Abschnitt
const RAND = [
  // [x0, x1, y, zA, zB, Abstand] – Grasbüschel entlang der Kanten (links und rechts)
  [-9.3, 9.3, 0, 6, -32, 4.6], [-11.3, 11.3, Y1, -68, -98, 4.4], [-9.3, 9.3, Y1, -102, -148, 4.8], [-11.3, 11.3, Y1, -152, -170, 4.4],
  [-9.3, 9.3, YG, -296, -330, 4.4], [-6.3, 6.3, 0, -343, -359, 4],
];
const KLEIN = [
  ...RAND.flatMap(([x0, x1, y, zA, zB, d]) => {
    const out = [];
    for (let z = zA, i = 0; z >= zB; z -= d, i++) { out.push({ kind: 'gras', pos: [x0 + (i % 2) * 0.4, y, z], s: 1 + (i % 3) * 0.15 }); out.push({ kind: 'gras', pos: [x1 - (i % 2) * 0.4, y, z - d / 2], s: 0.95 + (i % 2) * 0.2 }); }
    return out;
  }),
  { kind: 'kaefer', pos: [-3.5, 0, 0.5], s: 1.2, yaw: 0.5, solid: true }, { kind: 'schnecke', pos: [7.5, 0, 3], s: 1.1, yaw: 2.6 },
  { kind: 'klee', pos: [4.5, 0.02, -2], s: 1.2 }, { kind: 'klee', pos: [-1.5, 0.02, -22], s: 1 }, { kind: 'beeren', pos: [-8.2, 0, -31], s: 1.1 },
  { kind: 'eichel', pos: [6.5, 0, -33], s: 1.2, solid: true }, { kind: 'fels', pos: [8.3, 0, -18], s: 1, solid: true },
  { kind: 'eichel', pos: [-5.5, 1.5, -40], s: 1.3 }, { kind: 'eichel', pos: [5.5, 1.5, -48], s: 1.1 }, { kind: 'beeren', pos: [-5.6, 1.5, -58], s: 1, color: 0x5a4ae8 },
  { kind: 'gras', pos: [5.5, 1.5, -54], s: 1.1 }, { kind: 'gras', pos: [-5.5, 1.5, -50], s: 1.2 },
  { kind: 'kaefer', pos: [10, Y1, -76], s: 1.4, yaw: -2.2 }, { kind: 'fels', pos: [-10.5, Y1, -88], s: 1.3, solid: true }, { kind: 'klee', pos: [2.5, Y1 + 0.02, -72], s: 1.4 },
  { kind: 'klee', pos: [-2, Y1 + 0.02, -97], s: 1.1 }, { kind: 'beeren', pos: [10.5, Y1, -97], s: 1.2 }, { kind: 'schnecke', pos: [-10.6, Y1, -68.5], s: 1.2, yaw: 1 },
  { kind: 'fels', pos: [-8.8, Y1, -140], s: 1.1, solid: true }, { kind: 'beeren', pos: [-8.6, Y1, -101.5], s: 1 }, { kind: 'klee', pos: [-5, Y1 + 0.02, -121], s: 1.2 },
  { kind: 'eichel', pos: [8.6, Y1, -104], s: 1.1, solid: true }, { kind: 'kaefer', pos: [-8.3, Y1, -147], s: 1.1, yaw: 0.9 },
  { kind: 'schnecke', pos: [10.5, Y1, -160], s: 1.3, yaw: 3.6 }, { kind: 'klee', pos: [2, Y1 + 0.02, -153], s: 1.3 }, { kind: 'fels', pos: [-10, Y1, -168], s: 1.2 },
  { kind: 'beeren', pos: [10.6, YW, -177], s: 1.1, color: 0xe8284a }, { kind: 'klee', pos: [8, YW + 0.02, -186], s: 1.1 }, { kind: 'eichel', pos: [-23.6, YW, -186], s: 0.9 },
  { kind: 'gras', pos: [-24.4, YW, -190.5], s: 0.8 }, { kind: 'gras', pos: [-20.4, YW, -185.4], s: 0.8 },
  { kind: 'kaefer', pos: [8.5, YG, -328], s: 1.3, yaw: -0.4 }, { kind: 'fels', pos: [-8.8, YG, -306], s: 1.1, solid: true }, { kind: 'beeren', pos: [8.6, YG, -300], s: 1 },
  { kind: 'klee', pos: [4, YG + 0.02, -314], s: 1.3 }, { kind: 'schnecke', pos: [5.5, 0, -357], s: 1, yaw: 2 }, { kind: 'klee', pos: [-3, 0.02, -349], s: 1.1 },
];

function build(level) {
  grossbloecke(level, { id: 'kaefig', blocks: KAEFIG });
  grossbloecke(level, { id: 'deckel', blocks: [[KX, 2, KZ]] });
  grossbloecke(level, { id: 'lage1', blocks: LAGE1 });
  grossbloecke(level, { id: 'lage2', blocks: LAGE2 });
  // Steinwände im Riesentrank-Feld (nur Riesentrank/Bombe): Wand A quer (Ränder frei), Wand B mit Lücke rechts, Schatzkammer
  grossbloecke(level, { id: 'wandA', look: 'stein', blocks: [-6, -4, -2, 0, 2, 4, 6].map((x) => [x, Y1, -114]) });
  grossbloecke(level, { id: 'wandB', look: 'stein', blocks: [-9, -7, -5, -3, -1, 1, 3].map((x) => [x, Y1, -126]) });
  grossbloecke(level, { id: 'kammer', look: 'stein', blocks: [[3, -137.5], [5, -137.5], [7, -137.5], [3, -139.5], [7, -139.5], [3, -141.5], [5, -141.5], [7, -141.5]].flatMap(([x, z]) => [[x, Y1, z], [x, Y1 + 2, z]]) });
  riesentrankQuelle(level, { id: 'quelle1', pos: [0, Y1 + 1.9, -104] });
  riesentrankQuelle(level, { id: 'quelle2', pos: [-4, YG + 1.9, -298] });
  riesentrankQuelle(level, { id: 'quelle3', pos: [-4, YB + 1.9, -319] });
  // Riesenpilze als Plattformen
  riesenpilzPlattform(level, { x: -7.5, y: Y1, z: -80, top: Y1 + 4.6, r: 2.8, color: 0xff5a3a });
  riesenpilzPlattform(level, { x: 7.5, y: Y1, z: -90, top: Y1 + 5.2, r: 3, color: 0xff8a2a });
  riesenpilzPlattform(level, { x: 7.8, y: 0, z: -26, top: 2.8, r: 2.2, color: 0xe84ab8 });
  // Tintenteich: Stämme quer auf dem Wasser, Wurzelsäulen
  riesenstaemme(level, [{ x: 0, y: WS - 0.1, z: -206, length: 20 }, { x: 0, y: WS - 0.1, z: -233, length: 20 }, { x: 0, y: WS - 0.1, z: -259, length: 20 }, { x: 0, y: WS - 0.1, z: -281, length: 20 }]);
  wurzelsaeulen(level, [{ x: -4, z: -222, y0: WB, y1: WS + 1.2 }, { x: 5, z: -245, y0: WB, y1: WS + 1.4 }, { x: -2.5, z: -270, y0: WB, y1: WS + 1.2 }, { x: 6.5, z: -214, y0: WB, y1: WS + 1.0, r: 0.6 }]);
  dschungelDeko(level, KLEIN);
  // Riesenbäume am Rand (Kulisse)
  riesenbaeume(level, [
    { x: -15, z: -6, r: 2.2, h: 20 }, { x: 16, z: -20, r: 2.6, h: 22 }, { x: -17, z: -58, y: Y1, r: 2.4, h: 26 }, { x: 18, z: -84, y: Y1, r: 3, h: 28 },
    { x: -17, z: -118, y: Y1, r: 2.6, h: 26 }, { x: 16, z: -142, y: Y1, r: 2.2, h: 24 }, { x: 17, z: -176, y: YW, r: 2.6, h: 22 },
    { x: -18, z: -214, y: WS, r: 2.4, h: 24 }, { x: 17, z: -246, y: WS, r: 2.8, h: 26 }, { x: -17, z: -276, y: WS, r: 2.2, h: 22 },
    { x: 15, z: -306, y: YG, r: 2.4, h: 26 }, { x: -15, z: -338, y: YG, r: 2.6, h: 24 }, { x: 12, z: -352, y: 0, r: 2.0, h: 20 },
  ]);
}

const DECO = [
  // Dschungelstart
  { kind: 'riesenpflanze', pos: [-9, 0, 4], size: 4 }, { kind: 'riesenpflanze', pos: [9, 0, -4], size: 3.5 },
  { kind: 'riesenblume', pos: [-9.2, 0, -20.5], height: 6, color: 'rosa' }, { kind: 'riesenblume', pos: [5, 0, -32], height: 5, color: 'gold' },
  { kind: 'liane', from: [-9.6, 11, 6], to: [-9.6, 10, -10], sag: 2.5 }, { kind: 'liane', from: [9.6, 10, -12], to: [9.6, 11, -30], sag: 2.5 },
  // Rutschhang
  { kind: 'riesenpflanze', pos: [-6, 1.5, -36], size: 3 }, { kind: 'riesenpflanze', pos: [6, 1.5, -40], size: 3 },
  { kind: 'liane', from: [-5.6, 8, -38], to: [-5.6, 6, -58], sag: 2 }, { kind: 'liane', from: [5.6, 7, -42], to: [5.6, 5, -62], sag: 2 },
  // Riesen-Pilzlingstürme
  { kind: 'riesenblume', pos: [-10, Y1, -70], height: 7, color: 'lila' }, { kind: 'riesenpflanze', pos: [10, Y1, -72], size: 4.5 },
  { kind: 'riesenpflanze', pos: [-10.5, Y1, -96], size: 4 },
  // Riesentrank-Feld
  { kind: 'riesenpflanze', pos: [-9, Y1, -104], size: 3.5 }, { kind: 'riesenblume', pos: [9.5, Y1, -112], height: 6, color: 'rosa' },
  { kind: 'riesenpflanze', pos: [9, Y1, -148], size: 4 }, { kind: 'liane', from: [-9.6, Y1 + 10, -104], to: [-9.6, Y1 + 9, -124], sag: 2.5 }, { kind: 'liane', from: [9.6, Y1 + 9, -128], to: [9.6, Y1 + 10, -148], sag: 2.5 },
  // Blockwächter-Wand, Plateau
  { kind: 'riesenblume', pos: [-10.5, Y1, -158], height: 6.5, color: 'gold' }, { kind: 'riesenpflanze', pos: [10.5, Y1, -166], size: 3.5 },
  { kind: 'riesenpflanze', pos: [10, YW, -188], size: 3 }, { kind: 'riesenblume', pos: [-24, YW, -190], height: 4, color: 'rosa' },
  // Teich-Ufer
  { kind: 'riesenpflanze', pos: [-11.5, -5, -200], size: 3 }, { kind: 'riesenpflanze', pos: [11.5, -5, -228], size: 3.5 },
  { kind: 'riesenblume', pos: [-11.5, -5, -252], height: 5, color: 'lila' }, { kind: 'riesenpflanze', pos: [11.5, -5, -270], size: 3 },
  // Trampoline, Ziel
  { kind: 'riesenpflanze', pos: [-9, YG, -330], size: 3.5 }, { kind: 'riesenblume', pos: [9, YG, -296], height: 6, color: 'gold' },
  { kind: 'riesenblume', pos: [-5, 0, -356], height: 5, color: 'rosa' }, { kind: 'riesenpflanze', pos: [5, 0, -344], size: 3 },
];

export const LEVEL = {
  id: 'S-7',
  world: 9,
  title: 'Riesenpilz-Dschungel am Tintenteich',
  archetype: 'parcours',
  theme: 'grotto',
  music: 'course_grotto',
  timeLimit: 400,
  killY: -26,
  farHide: 45,
  instances: { coin: { farHide: 40, shadow: false } },
  build,
  start: { pos: [0, 0, 4], yaw: PI / 2 },
  camera: [
    { from: 12, to: -34, pitch: 38, dist: 14, fov: 42 },
    { from: -34, to: -66, pitch: 40, dist: 13, fov: 40, height: 1.2 },
    { from: -66, to: -100, pitch: 38, dist: 15.5, fov: 42 },
    { from: -100, to: -150, pitch: 40, dist: 15.5, fov: 42 },
    { from: -150, to: -171, pitch: 28, dist: 15, fov: 42, height: 3.5 },
    { from: -171, to: -191, pitch: 44, dist: 14, fov: 40, area: [-16, 30] },
    { from: -171, to: -195, pitch: 40, dist: 15, fov: 40, area: [-40, -16] },
    { from: -191, to: -292, pitch: 24, dist: 10, fov: 44, height: 0.6 },
    { from: -292, to: -334, pitch: 30, dist: 17, fov: 44, height: 4 },
    { from: -336, to: -362, pitch: 42, dist: 13, fov: 40 },
  ],
  segments: [
    // ================================================================ 1 Dschungelstart
    isl(-10, 10, 8, -34, 0, 5),
    { type: 'island', pos: [-1.5, 0, -10], size: [2, 2, 2] },                          // Erdhügel als Stufe zum Käfig
    // ================================================================ 2 Rutschhang (Schlucht)
    { type: 'rutschhang', pos: [0, Y1, -50], size: [8, 10, 32], dir: 1 },
    isl(-7, -4, -34, -66, 1.5, 12, { top: 'rock' }), isl(4, 7, -34, -66, 1.5, 12, { top: 'rock' }),
    // ================================================================ 3/4 Lichtung und Riesentrank-Feld
    isl(-12, 12, -66, -100, Y1, 5),
    isl(-10, 10, -100, -150, Y1, 5),
    // ================================================================ 5 Gleitblatt und Blockwächter-Wand
    isl(-12, 12, -150, -172, Y1, 5),
    isl(-12, -6, -172, -174, YW, 10, { top: 'rock' }),                                  // Wandstück links (dahinter Schlucht)
    isl(-6, 12, -172, -190, YW, 10, { top: 'rock' }),                                   // Wand + Plateau (Kontrollpunkt)
    isl(-25, -20, -185, -191, YW, 3, { under: 4 }),                                     // Blätterinsel mit Stern 0 (14 m Lücke)
    { type: 'pipe', id: 'inselrohr', pos: [-22.5, YW, -189.6], height: 1.4, target: [-3, YW, -186] },
    // ================================================================ 6 Tintenteich
    { type: 'lagune', id: 'teich', pos: [0, WB, -240.5], size: [20, WS - WB, 101], caustics: 0.45 },
    isl(-13, -10, -190, -292, -5, 9), isl(10, 13, -190, -292, -5, 9),
    { type: 'water', pos: [0, WB, -219], size: [20, WS - WB, 10], current: [2.2, 0, 0], show: false },
    { type: 'water', pos: [0, WB, -245], size: [20, WS - WB, 10], current: [-2.2, 0, 0], show: false },
    { type: 'water', pos: [0, WB, -271], size: [20, WS - WB, 10], current: [0, 0, 1.3], show: false },
    { type: 'seetang', pos: [-7, WB, -210], height: 4, count: 4, current: 0.4 }, { type: 'seetang', pos: [7.5, WB, -226], height: 5, count: 5, current: 0.6 },
    { type: 'seetang', pos: [-7.5, WB, -248], height: 4.5, count: 4, current: -0.5 }, { type: 'seetang', pos: [7, WB, -264], height: 4, count: 4 },
    { type: 'seetang', pos: [-6, WB, -286], height: 5, count: 5, current: 0.3 },
    { type: 'blasen', pos: [3, WB, -230], height: 6.5, count: 10 }, { type: 'blasen', pos: [-5, WB, -262], height: 6.5, count: 10 },
    // ================================================================ 7 Trampoline und Großblock-Lagen
    isl(-10, 10, -291, -332, YG, 6),
    { type: 'pilztrampolin', pos: [0, YG, -306], strength: 22 },
    { type: 'pilztrampolin', pos: [4, 2, -306], strength: 22, scale: 0.9 },
    // ================================================================ 8 Bonusbereich über der Röhre, Röhre zum Ziel
    isl(-6, 6, -316.5, -327.5, YB, 1, { under: 0 }),
    { type: 'pilztrampolin', pos: [-8, YG, -322], strength: 22 },
    { type: 'pipe', id: 'zielrohr', pos: [0, YG, -322], height: 2, target: 'zielausgang' },
    isl(-7, 7, -342, -360, 0, 6),
    { type: 'pipe', id: 'zielausgang', pos: [0, 0, -345.5], height: 1.6 },
    { type: 'deco_star', items: DECO },
  ],
  blocks: [
    { kind: 'question', pos: [2.5, 2.0, -6], content: 'coins:5' },
    { kind: 'question', pos: [-2.5, 2.0, -6], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [-7.5, 2.4, -26], content: 'oneup' },                       // Extraleben (Hinweis: Münzkreis)
    { kind: 'hidden', pos: [-5, Y1 + 1.9, -160], content: 'gleitblatt' },             // versteckter Gleitblatt-Block
    { kind: 'question', pos: [2, YW + 1.9, -184], content: 'wachstumsbeere' },
    ...STEINE,
  ],
  enemies: [
    { kind: 'pilzlingsturm', id: 'turm1', pos: [3, 0, -18], count: 3, sight: 8 },
    { kind: 'pilzlingsturm', id: 'turm2', pos: [-2, 0, -29], count: 4, sight: 8 },
    { kind: 'pilzling', id: 'pz1', pos: [4, 0, -2], path: [[4, 0, -2], [7, 0, -10]] },
    { kind: 'schnappblume', id: 'sb1', pos: [8, 0, -12], base: 'pot', yaw: PI },
    // Riesen-Pilzlingstürme zwischen den Riesenpilzen
    { kind: 'pilzlingsturm', id: 'riese1', pos: [-3, Y1, -78], count: 7, behavior: 'walk', speed: 0.7, path: [[-3, Y1, -78], [4, Y1, -78]] },
    { kind: 'pilzlingsturm', id: 'riese2', pos: [3, Y1, -92], count: 9, behavior: 'walk', speed: 0.6, path: [[3, Y1, -92], [-4, Y1, -92]] },
    // Riesentrank-Feld: Großrollpilze
    { kind: 'grossrollpilz', id: 'gr1', pos: [-5, Y1, -108], behavior: 'chase' },
    { kind: 'grossrollpilz', id: 'gr2', pos: [5, Y1, -120], behavior: 'chase' },
    { kind: 'grossrollpilz', id: 'gr3', pos: [-4, Y1, -132], path: [[-7, Y1, -132], [1, Y1, -132]] },
    { kind: 'grossrollpilz', id: 'gr4', pos: [-2, Y1, -146], behavior: 'chase' },
    { kind: 'pilzling', id: 'pz2', pos: [0, Y1, -156], path: [[-6, Y1, -156], [6, Y1, -156]] },
    // Blockwächter-Wand: Lauerblöcke fahren im Takt aus der Wand (Stufen hinauf)
    { kind: 'lauerblock', id: 'lb1', pos: [-3, Y1 + 0.4, -172], dir: [0, 1], size: 1.6, reach: 2.2, mode: 'timed', period: 3.4, hold: 2.3, phase: 0 },
    { kind: 'lauerblock', id: 'lb2', pos: [3, Y1 + 0.4, -172], dir: [0, 1], size: 1.6, reach: 2.2, mode: 'timed', period: 3.4, hold: 2.3, phase: 0 },
    { kind: 'lauerblock', id: 'lb3', pos: [9, Y1 + 0.4, -172], dir: [0, 1], size: 1.6, reach: 2.2, mode: 'timed', period: 3.4, hold: 2.3, phase: 0 },
    { kind: 'lauerblock', id: 'lb4', pos: [0, Y1 + 2.2, -172], dir: [0, 1], size: 1.6, reach: 2.2, mode: 'timed', period: 3.4, hold: 2.3, phase: 0.16 },
    { kind: 'lauerblock', id: 'lb5', pos: [6, Y1 + 2.2, -172], dir: [0, 1], size: 1.6, reach: 2.2, mode: 'timed', period: 3.4, hold: 2.3, phase: 0.16 },
    // Tintenteich
    { kind: 'tintling', id: 'tl1', pos: [-3, WB + 1.4, -214], range: 5, sight: 8 },
    { kind: 'tintling', id: 'tl2', pos: [3, WB + 2, -223], range: 5, drift: 0.6, sight: 8, phase: 0.4 },
    { kind: 'tintling', id: 'tl3', pos: [-2.5, WB + 2.4, -240], range: 5, drift: 0.6, sight: 8 },
    { kind: 'tintling', id: 'tl4', pos: [2.5, WB + 1.4, -252], range: 5, drift: 0.6, sight: 8, phase: 0.6 },
    { kind: 'tintling', id: 'tl5', pos: [-3, WB + 2, -268], range: 5, drift: 0.6, sight: 8, phase: 0.2 },
    { kind: 'tintling', id: 'tl6', pos: [2.5, WB + 2.4, -285], range: 5, sight: 8, phase: 0.8 },
    { kind: 'grossrollpilz', id: 'gr5', pos: [-5, YG, -314], behavior: 'chase', sight: 7 },
  ],
  items: [
    // Münzen
    ring([0, 0.4, 4], 2, 6), line([0, 0.5, -10], [0, 0.5, -30], 6),
    { kind: 'coins', pos: [-7.5, 0.3, -26], r: 1.1, n: 5 },                            // Hinweis auf das Extraleben
    { kind: 'coins', pos: [7.8, 3.2, -26], r: 1.2, n: 6 },                             // auf dem rosa Pilz
    line([0, 1.0, -36], [0, Y1 + 1.0, -64], 10),
    ring([-7.5, Y1 + 5, -80], 1.6, 6), ring([7.5, Y1 + 5.6, -90], 1.8, 6),
    line([-9, Y1 + 0.5, -110], [-9, Y1 + 0.5, -128], 6), line([7.5, Y1 + 0.5, -118], [7.5, Y1 + 0.5, -130], 4),
    { kind: 'coins', pos: [5, Y1 + 0.4, -139.5], r: 0.6, n: 4 },                       // in der Schatzkammer (innen 2 × 2 m)
    { kind: 'powerup', pos: [5, Y1, -139.5], power: 'oneup' },
    { kind: 'coins', pos: [-5, Y1 + 0.3, -160], r: 1.0, n: 5 },                        // unter dem versteckten Gleitblatt-Block
    ...arc([-7, YW + 0.6, -186.5], [-19.5, YW + 0.6, -187.5], 6, 2.4),                // Gleitflug-Bogen zur Blätterinsel
    line([0, WS - 1.5, -196], [0, WS - 3, -204], 4), line([0, WS - 3, -210], [0, WS - 4, -228], 6),
    ring([0, WS - 4, -238], 2, 8), line([0, WS - 4, -248], [0, WS - 3, -276], 8), line([0, WS - 2, -284], [0, WS - 1, -289], 3),
    line([-6, YG + 0.5, -296], [-6, YG + 0.5, -330], 7),
    { kind: 'pswitch', id: 'blauschalter', pos: [3, YB, -318.5], time: 12, star: 2, coins: BLAU },
    ring([0, 0.4, -352], 2.2, 8),
  ],
  checkpoint: [{ pos: [4, YW, -182], yaw: PI / 2 }, { pos: [0, YG, -294], yaw: PI / 2 }],
  stars: [
    [-22.5, YW + 1.0, -187],                                                           // 0: Blätterinsel hinter der Blockwächter-Wand
    [6, 10.9, -308],                                                                   // 1: auf der zweiten Großblock-Lage
    { pos: [0, YB + 1.2, -322], hidden: true, id: 'blaustern' },                        // 2: alle blauen Münzen (Druckschalter)
  ],
  stamp: [KX, 0.5, KZ],
  goal: [0, 0, -354],
  marks: {
    start: [0, 0, 4], kaefig: [KX, 0, KZ], rutsch: [0, 0, -33], tuerme: [0, Y1, -70], feld: [0, Y1, -102], wand: [0, Y1, -168],
    plateau: [4, YW, -182], insel: [-22.5, YW, -187], teich: [0, WS, -192], trampolin: [0, YG, -300], bonus: [0, YB, -322], ziel: [0, 0, -350],
  },
};
