// 4-5 „Säulenstadt der Stachelwalzen“ – Ruinenstadt am goldenen Nachmittag (Bauplan: Detail 4-5). Level verläuft nach −Z;
// Thema ruins, Musik course_ruins, 400 s, ≈ 265 m Weg (davon ≈ 220 m Parcours).
//
// Abschnitte:
//   1  Ruinenstart     z  10 … −61   Startplatz mit Mosaik-Rosette, altem Hasenbrunnen und Torbogen; links die schrägen
//                                    Stufen (Stempel ganz oben). Hang 1 hinauf (Walzenwerfer oben, Walzen rollen
//                                    herab), Säulenplatz mit trockenem Brunnen (Rollpilze, Walzenwerfer), rechts auf dem
//                                    Sims die Röhre in den Schalterraum (Stern 0), Hang 2 mit zwei Walzenwerfern,
//                                    Kante → bewegliche Plattform zum Checkpoint.
//   2  Checkpoint      z −78 … −104  Checkpoint-Insel: ?-Block mit Krallen-Anzug, links der Rundturm (gewölbte Wand –
//                                    mit Krallen hinauf, Stern 1 oben), rechts die Balkenbrücke mit Spiegelfrucht-Strauch
//                                    zur glatten Mauer: Klon im Gänsemarsch vorausschicken, ihm auf den Kopf springen
//                                    (Räuberleiter), mit Krallen die Ranken hinauf → drei Extraleben auf der Mauer.
//   3  Plattformfahrt  z −104 … −166 bewegliche Plattformen (längs, quer, schräg aufwärts) mit Rast-Säulen dazwischen,
//                                    Aufstieg über Hang 3 mit Walzenwerfer, Plateau mit Walzenwerfer.
//   4  Stachelstangen  z −166 … −236 Plattformen mit drehenden Stachelstangen (auch auf der fahrenden Plattform), Insel
//                                    mit großer Stachelstange; links die Schwankplattform mit Stern 2.
//   5  Zielhang        z −236 … −264 Hang zum Zielplateau, Zielmast; versiegelte blaue Röhre („Werfer-Festung“, 4-B ist
//                                    auf der Weltkarte erreichbar).
//   Schalterraum (abseits, x ≈ 80): Farbfeld 4 × 4 – alle Felder färben → Stern 0; Röhre zurück auf den Säulenplatz.
// Sterne (Index): 0 Schalterraum, 1 Rundturm, 2 Schwankplattform. Stempel: schräge Stufen am Start.
// Extraleben: drei auf der hohen Mauer (Räuberleiter + Krallen-Anzug).

import {
  levelSetup, isl, line, ring, arc, cullStatic, farHide, instanceEnemies, noModelShadow, birds, fruitBush, ruinMosaic,
  ruinFountain, vines, mossTufts, stoneBlock, roundTower, jungleTrees, raeuberleiter, sealedPipe, switchHall, RUIN,
} from './_helpers_c.js';

// Höhen
const Y0 = 1;       // Startplatz
const Y1 = 3.5;     // Säulenplatz
const Y2 = 6;       // Kante, Checkpoint-Insel, Plattformfahrt unten
const Y3 = 9;       // Landung nach der Plattformfahrt
const Y4 = 12;      // Plateau, Stachelstangen
const Y5 = 14.5;    // Zielplateau
const XS = 80;      // Schalterraum (abseits)

// 1-Up-Mauer (Räuberleiter): Balken (2 Stücke), Graben, Mauer
const M = {
  beamA: [6, 9.6, -88.4, -89.6],          // x0, x1, z0, z1 (Oberkante Y2)
  beamB: [8.4, 9.6, -89.6, -95.0],
  moat: [8.4, 9.6, -95.0, -95.7], moatY: Y2 - 0.8,
  wall: { x0: 7.0, x1: 11.0, z0: -95.7, z1: -98.8, band: Y2 + 7.0, top: Y2 + 8.0 },
};

const CAM = { pitch: 44, dist: 13, fov: 40, area: [-30, 40] };

function scene(level) {
  // =============================================================== 1 Ruinenstart
  ruinMosaic(level, -4, 4, 6, -2, Y0, { cell: 0.5 });
  ruinMosaic(level, -1.5, 1.5, 9.5, 6, Y0, { rosette: false, border: 1 });
  ruinMosaic(level, -1.5, 1.5, -2, -12, Y0, { rosette: false, border: 1 });
  ruinFountain(level, 6.4, Y0, 4.2, { r: 1.6 });
  vines(level, [
    { x: -7.5, y: Y0 + 3.6, z: -3.9, w: 1.8, len: 2.0, face: '+x' },
    { x: -6.8, y: Y0 + 1.8, z: 0.45, w: 1.4, len: 1.2, face: '+z' },
  ]);
  mossTufts(level, [[-3, Y0, 7.4, 1.2, 5], [4.6, Y0, -8.4, 1.4, 6], [8.2, Y0, 0.4, 1.0, 4], [-6.4, Y0, -9.6, 1.2, 5]]);
  jungleTrees(level, [[-8.6, Y0, 8.0, 6.5], [9.0, Y0, -9.8, 7.2], [8.6, Y0, 8.6, 5.4]]);
  // Säulenplatz
  ruinMosaic(level, -6, 6, -29, -41, Y1, { cell: 0.5 });
  ruinFountain(level, -4.6, Y1, -34.4, { r: 1.5, dry: true });
  vines(level, [{ x: 12.5, y: Y1 + 1.5, z: -29.95, w: 4, len: 1.2, face: '+z', n: 7 }]);
  mossTufts(level, [[7, Y1, -40, 1.4, 6], [-8, Y1, -28.4, 1.2, 5], [3, Y1, -30.6, 0.9, 3]]);
  jungleTrees(level, [[-9.2, Y1, -42.6, 6.8]]);
  // =============================================================== 2 Checkpoint-Insel
  ruinMosaic(level, -6, 2, -84, -92, Y2, { cell: 0.5 });
  ruinFountain(level, -7.2, Y2, -100.2, { r: 1.6 });
  roundTower(level, { x: -10, z: -95, y: Y2, r: 2.4, h: 7 });
  mossTufts(level, [[-12.6, Y2, -86, 1.0, 4], [3.6, Y2, -101.8, 1.2, 5], [-6.6, Y2, -102.4, 1.0, 4]]);
  jungleTrees(level, [[-12.8, Y2, -80.6, 6.4], [4.4, Y2, -102.6, 5.8]]);
  // 1-Up-Mauer: Balkenbrücke über dem Abgrund, Graben, glatter Sockel, Rankenband, Krone
  const [ax0, ax1, az0, az1] = M.beamA, [bx0, bx1, bz0, bz1] = M.beamB, [mx0, mx1, mz0, mz1] = M.moat, W = M.wall;
  stoneBlock(level, ax0, ax1, Y2 - 0.8, Y2, az0, az1, { tag: 'balken', chips: false, top: false });
  stoneBlock(level, bx0, bx1, Y2 - 0.8, Y2, bz0, bz1, { tag: 'balken', chips: false, top: false });
  stoneBlock(level, mx0, mx1, M.moatY - 0.8, M.moatY, mz0, mz1, { tag: 'graben', chips: false, top: false });
  stoneBlock(level, mx0 - 0.35, mx0, M.moatY - 0.8, Y2, mz0, mz1, { tag: 'graben-rand', noWallSlide: true, chips: false });
  stoneBlock(level, mx1, mx1 + 0.35, M.moatY - 0.8, Y2, mz0, mz1, { tag: 'graben-rand', noWallSlide: true, chips: false });
  // Sockel (glatt, kein Wandrutschen) etwas zurückgesetzt, darüber das Rankenband (kletterbar), oben die Krone
  stoneBlock(level, W.x0 + 0.1, W.x1 - 0.1, Y2 - 6, W.band, W.z0 - 0.1, W.z1 + 0.1, { tag: 'mauer-sockel', noWallSlide: true, color: RUIN.ivory, light: 0xffffff, dark: 0xe8d8b8, top: false, chips: false, course: 1.4 });
  stoneBlock(level, W.x0, W.x1, W.band, W.top, W.z0, W.z1, { tag: 'mauer-ranken', climbable: true, chips: true });
  vines(level, [
    { x: (W.x0 + W.x1) / 2, y: W.top - 0.05, z: W.z0, w: 3.8, len: 1.15, face: '+z', n: 9 },
    { x: W.x0, y: W.top - 0.05, z: (W.z0 + W.z1) / 2, w: 2.8, len: 1.1, face: '-x', n: 6 },
    { x: W.x1, y: W.top - 0.05, z: (W.z0 + W.z1) / 2, w: 2.8, len: 1.1, face: '+x', n: 6 },
  ]);
  // Brüstung hinten auf der Krone (der Klon läuft nicht hinten hinunter)
  level.world.add({ type: 'box', min: [W.x0, W.top, W.z1], max: [W.x1, W.top + 0.7, W.z1 + 0.35], tag: 'mauer-bruestung' });
  fruitBush(level, [9, Y2, -91.6], { every: 4, id: 'strauch' });
  raeuberleiter(level, { area: { min: [mx0 - 0.05, M.moatY - 0.1, mz1 - 0.1], max: [mx1 + 0.05, M.moatY + 0.4, mz0 + 0.1] }, speed: 19.5, id: 'leiter' });
  // =============================================================== 3 Plattformfahrt / Aufstieg
  mossTufts(level, [[9.6, Y3, -142.6, 1.0, 4], [4, Y4, -158, 1.2, 5], [11.6, Y4, -163.4, 1.0, 4]]);
  jungleTrees(level, [[12.4, Y4, -158.4, 6.2], [12.8, Y4, -164.6, 5.6]]);
  // =============================================================== 4 Stachelstangen
  ruinMosaic(level, 3, 11, -186, -194, Y4, { cell: 0.5 });
  mossTufts(level, [[1.6, Y4, -185.6, 1.0, 4], [12.4, Y4, -195, 1.0, 4], [4, Y4, -218.6, 0.8, 3]]);
  // =============================================================== 5 Zielhang
  ruinMosaic(level, 3, 11, -254, -263, Y5, { cell: 0.5 });
  ruinFountain(level, 2.6, Y5, -261.2, { r: 1.3 });
  jungleTrees(level, [[13.2, Y5, -262, 6.6], [0.8, Y4, -238.6, 5.8]]);
  sealedPipe(level, { pos: [11.4, Y5, -257.8], id: 'festung_roehre', text: 'Zur Werfer-Festung geht es über die Weltkarte!' });
  mossTufts(level, [[12, Y5, -255, 1.0, 5], [1.8, Y4, -244, 1.0, 4]]);
  // =============================================================== Schalterraum
  switchHall(level, { x0: XS - 9, x1: XS + 9, z0: -43, z1: -25.4, y: Y0, h: 5, open: '+z' });
  mossTufts(level, [[XS - 7.6, Y0, -41.6, 0.8, 4], [XS + 7.4, Y0, -41.4, 0.8, 4]]);
  // Leben
  birds(level, { center: [0, Y1 + 13, -30], r: 11, n: 6, speed: 0.28 });
  birds(level, { center: [8, Y4 + 12, -200], r: 12, n: 6, speed: 0.32 });
  // Rampen verdecken die Kamera nie (der Strahl prüft Hüllquader – auf der Rampe steckt der Kopf darin)
  level.world.forEach?.((s) => { if (s.type === 'ramp') s.camIgnore = true; });
  // Budget
  instanceEnemies(level, ['rollpilz', 'walzenwerfer']);
  noModelShadow(level, ['stachelwalze']);
  farHide(level, ['rollpilz', 'walzenwerfer', 'stachelwalze', 'stachelstange'], 46);
}

/** Walzenwerfer auf einer Ruinensäule. */
const walzer = (id, x, y, z, o = {}) => ({ kind: 'walzenwerfer', id, pos: [x, y, z], pillar: o.pillar ?? 1.6, dir: o.dir ?? [0, 1], aim: o.aim ?? 'dir', sight: o.sight ?? 18, interval: o.interval ?? 3, first: o.first ?? 1, walze: 0.85, speed: o.speed ?? 3.5, max: 2 });
/** Bewegliche Ruinenplattform (Sandstein-Orange). */
const plat = (id, path, o = {}) => ({ type: 'mover', id, path, size: o.size ?? [3.6, 0.5, 3.6], speed: o.speed ?? 2.4, wait: o.wait ?? 0.7, phase: o.phase ?? 0, color: o.color ?? 0xe8b070 });
/** Rast-Säule (Sandsteinblock, Oberkante y). */
const pillar = (x, z, y, s = 2.4) => ({ type: 'platform', pos: [x, y - 6, z], size: [s, 6, s], style: 'stone' });

export const LEVEL = {
  id: '4-5',
  world: 4,
  title: 'Säulenstadt der Stachelwalzen',
  archetype: 'parcours',
  theme: 'ruins',
  music: 'course_ruins',
  timeLimit: 400,
  start: { pos: [0, Y0, 5], yaw: Math.PI / 2 },
  killY: -12,
  setup(level, sc) { levelSetup(scene)(level, sc); cullStatic(level); },
  camera: [
    { ...CAM, from: 14, to: -27 },
    { ...CAM, from: -27, to: -62, pitch: 45 },
    { ...CAM, from: -62, to: -106, pitch: 44, dist: 13.5 },
    { ...CAM, from: -106, to: -168, pitch: 46 },
    { ...CAM, from: -168, to: -236, pitch: 47, dist: 12.5 },
    { ...CAM, from: -236, to: -270, pitch: 42, dist: 13.5 },
    // Schalterraum (abseits)
    { from: -18, to: -50, pitch: 52, dist: 13, fov: 40, area: [60, 100] },
  ],
  segments: [
    // =============================================================== 1 Ruinenstart
    isl(-10, 10, 10, -12, Y0, 4, { under: 2 }),
    { type: 'sign', pos: [3.6, Y0, 8.4], text: 'Säulenstadt', size: [2.6, 0.9] },
    // schräge Stufen (Stempel): diagonal nach hinten links ansteigend
    { type: 'platform', pos: [-5.2, Y0, 1.2], size: [1.7, 0.9, 1.7], style: 'stone' },
    { type: 'platform', pos: [-6.8, Y0, -0.4], size: [1.7, 1.8, 1.7], style: 'stone' },
    { type: 'platform', pos: [-8.4, Y0, -2.0], size: [1.7, 2.7, 1.7], style: 'stone' },
    { type: 'platform', pos: [-8.6, Y0, -3.9], size: [2.2, 3.6, 2.1], style: 'stone' },
    { type: 'deco_w4', items: [
      { kind: 'ruinenbogen', pos: [0, Y0, -10.2], width: 4.2, height: 4.6, yaw: Math.PI / 2 },
      { kind: 'saeulen', from: [9, Y0, 6], to: [9, Y0, -6], every: 4, height: 4.5, broken: 0.5 },
      { kind: 'saeule', pos: [-9, Y0, 4.4], height: 3.2, broken: true },
      { kind: 'statue', pos: [-3.6, Y0, -7.4], size: 2.2, yaw: 0.4 },
      { kind: 'truemmer', pos: [5, Y0, -4], size: [3, 3], n: 5 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'butterflies', pos: [6.4, Y0, 4.2], n: 4, r: 2.4, colors: [0xffd23d, 0xff8cc0, 0x9ad8ff] },
      { kind: 'butterflies', pos: [-2, Y0, -5], n: 3, r: 2.0, colors: [0xffffff, 0xff9a3a] },
    ] },
    // Hang 1 (steigt nach −Z), Seitenmauern halten die Walzen
    isl(-4.5, 4.5, -12, -26, Y0, 4, { under: 2, top: 'stone' }),
    { type: 'ramp', pos: [0, Y0, -19], size: [9, Y1 - Y0, 14], axis: 'z', dir: -1, top: 'stone' },
    { type: 'wall', pos: [-5.1, Y0, -19], size: [1.2, 3.2, 14] },
    { type: 'wall', pos: [5.1, Y0, -19], size: [1.2, 3.2, 14] },
    // Säulenplatz
    isl(-10, 10, -26, -44, Y1, 6, { under: 2 }),
    { type: 'platform', pos: [12.5, Y1 - 6, -34.5], size: [5, 7.5, 9], style: 'stone' },
    { type: 'pipe', id: 'p_schalter', pos: [12.6, Y1 + 1.5, -35], height: 1.1, target: 'p_raum' },
    { type: 'pipe', id: 'p_back', pos: [6.6, Y1, -40.4], height: 0.9 },
    { type: 'sign', pos: [9.4, Y1, -29.2], text: 'Schalterraum', size: [2.2, 0.8] },
    { type: 'deco_w4', items: [
      { kind: 'saeulen', from: [-9.4, Y1, -27.5], to: [-9.4, Y1, -43], every: 3.8, height: 5, broken: 0.5 },
      { kind: 'ruinenmauer', from: [-2, Y1, -43.6], to: [-9.6, Y1, -43.6], height: 1.8 },
      { kind: 'statue', pos: [3.4, Y1, -37.4], size: 2.4, yaw: -0.4 },
      { kind: 'truemmer', pos: [3, Y1, -29.6], size: [3, 2], n: 4 },
    ] },
    { type: 'deco_w1', items: [{ kind: 'butterflies', pos: [-4.6, Y1, -34.4], n: 3, r: 2, colors: [0xffd23d, 0xb894ff] }] },
    // Hang 2
    isl(-4.5, 4.5, -44, -54, Y1, 6, { under: 2, top: 'stone' }),
    { type: 'ramp', pos: [0, Y1, -49], size: [9, Y2 - Y1, 10], axis: 'z', dir: -1, top: 'stone' },
    { type: 'wall', pos: [-5.1, Y1, -49], size: [1.2, 3.2, 10] },
    { type: 'wall', pos: [5.1, Y1, -49], size: [1.2, 3.2, 10] },
    // Kante → bewegliche Plattform zum Checkpoint
    isl(-6, 6, -54, -61, Y2, 6, { under: 3 }),
    plat('mp1', [[0, Y2 - 0.5, -63.6], [0, Y2 - 0.5, -76.2]], { speed: 2.4, wait: 0.9 }),
    { type: 'deco_w4', items: [
      { kind: 'saeule', pos: [-5, Y2, -55.4], height: 4.2 }, { kind: 'saeule', pos: [5, Y2, -55.4], height: 3.0, broken: true },
      { kind: 'saeule', pos: [-14, Y2 - 18, -70], height: 16, shadow: false, solid: false }, { kind: 'saeule', pos: [13, Y2 - 18, -66], height: 13, broken: true, shadow: false, solid: false },
    ] },

    // =============================================================== 2 Checkpoint-Insel
    isl(-14, 6, -78, -104, Y2, 7, { under: 3 }),
    { type: 'sign', pos: [3.2, Y2, -86.4], text: 'Spiegelfrucht nehmen,\nim Gänsemarsch zur Mauer!', size: [3.2, 1.0] },
    { type: 'sign', pos: [-6.6, Y2, -89.8], text: 'Krallen hoch!', size: [2.0, 0.8] },
    { type: 'deco_w4', items: [
      { kind: 'ruinenbogen', pos: [-2, Y2, -103.2], width: 4.2, height: 4.6, yaw: Math.PI / 2 },
      { kind: 'saeulen', from: [-13.4, Y2, -84], to: [-13.4, Y2, -102], every: 4.5, height: 4.6, broken: 0.6 },
      { kind: 'statue', pos: [-12.4, Y2, -100.6], size: 2.2, yaw: 0.8 },
      { kind: 'truemmer', pos: [2.4, Y2, -94], size: [2.6, 3], n: 4 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'butterflies', pos: [-7.2, Y2, -100.2], n: 4, r: 2.2, colors: [0xffd23d, 0xff8cc0, 0xffffff] },
      { kind: 'butterflies', pos: [9, Y2 + 8.6, -97.2], n: 2, r: 1.4, colors: [0xff8cc0, 0x9ad8ff] },
    ] },

    // =============================================================== 3 Plattformfahrt
    plat('mp2a', [[-2, Y2 - 0.5, -107], [-2, Y2 - 0.5, -117.4]], { speed: 2.6, wait: 0.6 }),
    pillar(-2, -120.4, Y2, 2.6),
    plat('mp2b', [[-2, Y2 - 0.5, -124.4], [7.2, Y2 - 0.5, -124.4]], { speed: 2.2, wait: 0.7 }),
    pillar(7.2, -128.6, Y2, 2.4),
    plat('mp2c', [[7.2, Y2 - 0.5, -132.2], [7.2, Y3 - 0.5, -139.6]], { speed: 1.9, wait: 0.8 }),
    isl(2, 12, -141.4, -144, Y3, 6, { under: 3, top: 'stone' }),
    // Aufstieg (Hang 3) mit Walzenwerfer oben
    isl(2.5, 11.5, -144, -155, Y3, 6, { under: 3, top: 'stone' }),
    { type: 'ramp', pos: [7, Y3, -149.5], size: [9, Y4 - Y3, 11], axis: 'z', dir: -1, top: 'stone' },
    { type: 'wall', pos: [1.9, Y3, -149.5], size: [1.2, 3.4, 11] },
    { type: 'wall', pos: [12.1, Y3, -149.5], size: [1.2, 3.4, 11] },
    isl(0, 14, -155, -166, Y4, 6, { under: 3 }),
    { type: 'deco_w4', items: [
      { kind: 'saeule', pos: [-6, Y2 - 16, -120], height: 14, shadow: false, solid: false }, { kind: 'saeule', pos: [16, Y2 - 14, -134], height: 15, broken: true, shadow: false, solid: false },
      { kind: 'ruinenbogen', pos: [7, Y4, -165.2], width: 4.4, height: 4.8, yaw: Math.PI / 2 },
      { kind: 'saeulen', from: [0.6, Y4, -157], to: [0.6, Y4, -164], every: 3.5, height: 4.4, broken: 0.5 },
    ] },

    // =============================================================== 4 Stachelstangen
    plat('ms1', [[7, Y4 - 0.5, -169.4], [7, Y4 - 0.5, -181.2]], { size: [4.2, 0.5, 4.2], speed: 1.8, wait: 1.0 }),
    { type: 'stachelstange', id: 'ss1', pos: [7, Y4, -169.4], attach: 'ms1', length: 1.75, arms: 2, balls: 2, speed: 1.3 },
    isl(0, 14, -183.4, -196, Y4, 6, { under: 3 }),
    { type: 'stachelstange', id: 'ss2', pos: [7, Y4, -190], length: 3.0, arms: 2, balls: 3, speed: 1.0 },
    // Stern 2: Schwankplattform links (kippt, ab 14° rutscht man)
    { type: 'schwankplattform', id: 'schwank', pos: [-4.4, Y4, -190], size: [6, 3], axis: 'x', max: 26, slideFrom: 14 },
    plat('ms2', [[7, Y4 - 0.5, -199.2], [7, Y4 - 0.5, -210.6]], { size: [4.2, 0.5, 4.2], speed: 1.9, wait: 1.0 }),
    { type: 'stachelstange', id: 'ss3', pos: [7, Y4, -199.2], attach: 'ms2', length: 1.75, arms: 1, balls: 2, speed: -1.6 },
    isl(3, 11, -212.8, -221, Y4, 6, { under: 3 }),
    { type: 'stachelstange', id: 'ss4', pos: [3.4, Y4, -217], length: 2.75, arms: 1, balls: 3, speed: 1.4 },
    { type: 'stachelstange', id: 'ss5', pos: [10.6, Y4, -217], length: 2.75, arms: 1, balls: 3, speed: -1.4, angle: Math.PI },
    plat('ms3', [[7, Y4 - 0.5, -224.4], [7, Y4 - 0.5, -233.2]], { size: [4.2, 0.5, 4.2], speed: 1.8, wait: 1.0 }),
    { type: 'stachelstange', id: 'ss6', pos: [7, Y4, -224.4], attach: 'ms3', length: 1.75, arms: 2, balls: 2, speed: -1.2 },
    { type: 'deco_w4', items: [
      { kind: 'saeule', pos: [-2, Y4 - 16, -205], height: 14, shadow: false, solid: false }, { kind: 'saeule', pos: [17, Y4 - 18, -190], height: 16, broken: true, shadow: false, solid: false },
      { kind: 'saeule', pos: [13.4, Y4, -186], height: 4.4, broken: true }, { kind: 'saeule', pos: [0.6, Y4, -195.4], height: 3.4 },
      { kind: 'truemmer', pos: [11.4, Y4, -214.6], size: [2, 2], n: 3 },
    ] },
    { type: 'deco_w1', items: [{ kind: 'butterflies', pos: [7, Y4, -186], n: 3, r: 2.2, colors: [0xffd23d, 0x9ad8ff] }] },

    // =============================================================== 5 Zielhang
    isl(0, 14, -235.4, -241, Y4, 6, { under: 3 }),
    isl(2.5, 11.5, -241, -252, Y4, 6, { under: 3, top: 'stone' }),
    { type: 'ramp', pos: [7, Y4, -246.5], size: [9, Y5 - Y4, 11], axis: 'z', dir: -1, top: 'stone' },
    { type: 'wall', pos: [1.9, Y4, -246.5], size: [1.2, 3.0, 11] },
    { type: 'wall', pos: [12.1, Y4, -246.5], size: [1.2, 3.0, 11] },
    isl(0, 14, -252, -266, Y5, 6, { under: 3 }),
    { type: 'sign', pos: [13, Y5, -253.6], text: 'Werfer-Festung\n(über die Weltkarte)', size: [2.6, 0.9] },
    { type: 'deco_w4', items: [
      { kind: 'ruinenbogen', pos: [7, Y5, -252.8], width: 4.4, height: 4.8, yaw: Math.PI / 2 },
      { kind: 'saeulen', from: [0.6, Y5, -255], to: [0.6, Y5, -265], every: 3.4, height: 4.8, broken: 0.4 },
      { kind: 'statue', pos: [12.4, Y5, -264], size: 2.4, yaw: -0.6 },
    ] },
    { type: 'deco_w1', items: [{ kind: 'butterflies', pos: [2.6, Y5, -261.2], n: 4, r: 2, colors: [0xffd23d, 0xff8cc0, 0xffffff] }] },

    // =============================================================== Schalterraum (abseits)
    isl(XS - 10, XS + 10, -24, -44, Y0, 4, { top: 'stone', under: 2 }),
    { type: 'pipe', id: 'p_raum', pos: [XS - 6.5, Y0, -27.6], height: 1.1 },
    { type: 'farbfeld', id: 'farbe', pos: [XS, Y0, -35], grid: [4, 4], cell: 2, onAll: { reveal: 'stern_farbe' }, indicator: [XS, Y0 + 3.4, -42] },
    { type: 'pipe', id: 'p_raus', pos: [XS + 6.5, Y0, -27.6], height: 1.1, target: 'p_back' },
    { type: 'sign', pos: [XS - 6.6, Y0, -31.2], text: 'Alle Felder\nfärben!', size: [2, 0.8] },
    { type: 'killplane', y: -14 },
  ],
  blocks: [
    { kind: 'question', pos: [0, Y0 + 2.4, -4.6], content: 'coins:5' },
    { kind: 'brick', pos: [-1, Y0 + 2.4, -4.6], content: 'coin' },
    { kind: 'brick', pos: [1, Y0 + 2.4, -4.6] },
    { kind: 'question', pos: [-1.5, Y1 + 2.4, -31], content: 'wachstumsbeere' },
    // Krallen-Anzug neben dem Rundturm (höchstens 2 m hoch: das Power-up bleibt oben liegen)
    { kind: 'question', pos: [-5.4, Y2 + 2.1, -88.6], content: 'krallen' },
    { kind: 'question', pos: [5, Y4 + 2.4, -159], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [7, Y5 + 2.4, -256.6], count: 6 },
  ],
  enemies: [
    // Walzenwerfer (10)
    walzer('ww1', 1.6, Y1, -27.6, { pillar: 1.4, interval: 3.4, first: 1.2 }),
    walzer('ww2', -6.6, Y1, -41.4, { pillar: 2.0, aim: 'player', sight: 13, interval: 2.8 }),
    walzer('ww3', -2.6, Y2, -55.6, { pillar: 1.2, interval: 3.4, first: 0.6 }),
    walzer('ww4', 2.6, Y2, -55.6, { pillar: 1.2, interval: 3.4, first: 2.3 }),
    walzer('ww5', 9.0, Y1, -43.0, { pillar: 1.2, aim: 'player', sight: 11, interval: 3.2, first: 2 }),
    walzer('ww6', 11.2, Y3, -142.6, { pillar: 0.8, aim: 'player', sight: 10, interval: 3.2 }),
    walzer('ww7', 9.6, Y4, -156.4, { pillar: 1.2, interval: 3.0, first: 1.4 }),
    walzer('ww8', 2.2, Y4, -163.2, { pillar: 1.6, aim: 'player', sight: 12, interval: 3.0 }),
    walzer('ww9', 12.8, Y4, -194.4, { pillar: 1.8, aim: 'player', sight: 12, interval: 3.4 }),
    walzer('ww10', 10.4, Y5, -254.4, { pillar: 0.6, interval: 3.2, first: 1.6 }),
    // Rollpilze (8)
    { kind: 'rollpilz', id: 'rp1', pos: [3, Y0, -6.4], path: [[1.4, Y0, -6.4], [6.4, Y0, -6.4]] },
    { kind: 'rollpilz', id: 'rp2', pos: [-2, Y0 + 1.2, -17], path: [[-2.6, Y0 + 0.7, -14], [-2.6, Y0 + 1.9, -22]] },
    { kind: 'rollpilz', id: 'rp3', pos: [3, Y1, -33], path: [[0.5, Y1, -33], [7.5, Y1, -33]] },
    { kind: 'rollpilz', id: 'rp4', pos: [-1, Y1, -38.6], behavior: 'chase', sight: 6 },
    { kind: 'rollpilz', id: 'rp5', pos: [10, Y4, -160], path: [[8.6, Y4, -160], [12.6, Y4, -160]] },
    { kind: 'rollpilz', id: 'rp6', pos: [2.4, Y4, -186.4], path: [[1.4, Y4, -186.4], [12.6, Y4, -186.4]] },
    { kind: 'rollpilz', id: 'rp7', pos: [11, Y4, -238.4], path: [[1.4, Y4, -238.4], [12.6, Y4, -238.4]] },
    { kind: 'rollpilz', id: 'rp8', pos: [5, Y5, -258.6], behavior: 'chase', sight: 6 },
  ],
  items: [
    // Startplatz
    line([0, Y0 + 0.3, 2.4], [0, Y0 + 0.3, -1.6], 3),
    ring([6.4, Y0 + 2.6, 4.2], 1.3, 6),
    ...arc([-5.2, Y0 + 1.2, 1.2], [-8.4, Y0 + 3.0, -2.0], 4, 1.2),
    // Hang 1 + Säulenplatz
    line([-2.6, Y0 + 0.9, -13.4], [-2.6, Y0 + 2.4, -24.6], 5),
    line([1.2, Y1 + 0.4, -36.6], [1.2, Y1 + 0.4, -40.6], 3),
    ring([12.6, Y1 + 3.6, -35], 1.2, 5),
    line([2.6, Y1 + 0.9, -45.6], [2.6, Y1 + 2.4, -52.6], 4),
    // Plattform zum Checkpoint
    line([0, Y2 + 1.1, -65], [0, Y2 + 1.1, -75], 5),
    // Checkpoint-Insel, Turm (zeigt den Aufstieg)
    ring([-7.2, Y2 + 3.4, -100.2], 1.4, 6),
    line([-10, Y2 + 1.4, -92.4], [-10, Y2 + 5.8, -92.4], 4),
    line([7.0, Y2 + 0.5, -89], [9, Y2 + 0.5, -89], 2),
    // Plattformfahrt
    line([-2, Y2 + 1.1, -108.6], [-2, Y2 + 1.1, -116], 4),
    line([0.5, Y2 + 1.1, -124.4], [5.5, Y2 + 1.1, -124.4], 3),
    ...arc([7.2, Y2 + 0.9, -133.6], [7.2, Y3 + 0.9, -139.4], 4, 0.6),
    line([4.4, Y3 + 0.9, -145.4], [4.4, Y4 + 0.4, -153.6], 4),
    // Stachelstangen
    line([7, Y4 + 1.6, -171], [7, Y4 + 1.6, -179], 4),
    ring([7, Y4 + 2.8, -190], 1.4, 6),
    ...arc([-1.0, Y4 + 0.5, -190], [-6.2, Y4 + 0.6, -190], 3, 1.2),
    line([7, Y4 + 1.6, -201], [7, Y4 + 1.6, -209], 4),
    line([5.6, Y4 + 0.4, -214.4], [8.4, Y4 + 0.4, -214.4], 3),
    line([7, Y4 + 1.6, -226], [7, Y4 + 1.6, -232], 3),
    // Zielhang
    line([4.4, Y4 + 0.9, -242.6], [4.4, Y5 + 0.4, -250.6], 4),
    // Schalterraum
    line([XS - 3, Y0 + 0.4, -28.6], [XS + 3, Y0 + 0.4, -28.6], 4),
    // 1-Ups auf der Mauer (stehen still)
    { kind: 'powerup', pos: [8.0, M.wall.top, -97.2], power: 'oneup', speed: 0 },
    { kind: 'powerup', pos: [9.0, M.wall.top, -97.2], power: 'oneup', speed: 0 },
    { kind: 'powerup', pos: [10.0, M.wall.top, -97.2], power: 'oneup', speed: 0 },
  ],
  checkpoint: { pos: [0, Y2, -81.6], yaw: Math.PI / 2 },
  stars: [
    { pos: [XS, Y0 + 1.2, -35], hidden: true, id: 'stern_farbe' },   // 0: Schalterraum
    [-10, Y2 + 7 + 0.9, -95],                                        // 1: Rundturm (gewölbte Wand, Krallen)
    [-6.6, Y4 + 1.0, -190],                                          // 2: Schwankplattform
  ],
  stamp: [-8.6, Y0 + 3.6 + 0.9, -3.9],
  goal: { pos: [7, Y5, -259.6], height: 8 },
  marks: {
    start: [0, Y0, 5], stufen: [-5.2, Y0, 3], hang1: [0, Y0, -12], platz: [0, Y1, -30], roehre: [12.6, Y1 + 1.5, -35],
    hang2: [0, Y1, -44], kante: [0, Y2, -58], checkpoint: [0, Y2, -81.6], turm: [-10, Y2, -91.6], balken: [9, Y2, -89],
    graben: [9, M.moatY, -95.35], mauer: [9, M.wall.top, -97.2], fahrt: [-2, Y2, -104], landung: [7, Y3, -142.6],
    plateau: [7, Y4, -160], insel3: [7, Y4, -186], schwank: [-4.4, Y4, -190], insel4: [7, Y4, -214], ziel: [7, Y5, -256],
    raum: [XS, Y0, -30],
  },
};
