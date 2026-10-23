// 3-1 „Flockenwiese“ – verschneite Wiese mit rollbaren Schneebällen, Eisläufer-Teich, Eisbahn mit schmalen Eisstegen
// und einem Baumhain hinter der Zielröhre (Bauplan: Detail 3-1). Level verläuft nach −Z; Thema snow, Musik course_snow.
//
// Abschnitte:
//   1  Schneefeld-Start  z  11 … −46  Iglu mit Rauch (Extraleben im unsichtbaren Block über der Kuppel), Schneemann-
//                                     Familie, Schlitten mit Fußspuren, Lichterkette am Start, ?-Block mit Gleitblatt,
//                                     zwei Schneebälle (einer zerschellt am Felsriegel → Münzen, einer kegelt die
//                                     Krabbelkäfer um), zwei Schneesäulen, Frosttor mit fallenden Eiszapfen.
//   2  Flatterfeld       z −46 … −112 kleiner Abgrund, Felswand rechts mit dem Wandloch (Stern 0), das neun
//                                     Flatterkäfer umkreisen; Eisläufer-Teich: auf dem Eisläufer mitfahren, stampfen →
//                                     Schlittschuh; Schneesäulen, Mini-Pilzlinge, Checkpoint mit Gleitblatt-Block.
//   3  Eisbahn           z −112 … −200 links die Hasenwiese (Stern 1: Hasen fangen), von dort der schmale Eissteg
//                                     zum Stempel; Eisbahn mit zwei Eisläufern und Stachelstreifen (Münzen nur mit
//                                     Schlittschuh), drei schmale Eisstege über dem Abgrund, zweite Eisbahn mit einem
//                                     Verfolger; Zielplateau: Felswand mit Nische (Stern 2: vom Schneebaum aus gleiten,
//                                     Propeller-Helm oder Krallen-Anzug), Zielröhre.
//   4  Baumhain          z −226 … −262 (hinter der hohen Felswand, nur durch die Röhre) Tannenlichtung mit
//                                     zugefrorenem Teich, Robben- und Pinguinkindern, Krabbelkäfer-Reihe, Zielmast.
// Sterne (Index): 0 Wandloch hinter den Flatterkäfern, 1 Hase nach dem Checkpoint, 2 Wandnische vor der Zielröhre.
// Stempel: Insel am Ende des schmalen Eisstegs hinter der Hasenwiese.
// Kulisse (LEVEL.setup, nur Optik bis auf Schneebaum, Bank, Brunnen): siehe _helpers_a.js.

import {
  isl, snow, rink, steg, line, ring, arc, column, starHere, levelSetup, farHide, sled, footprints, sledTrack,
  icicleFringe, bench, birdhouse, snowAngel, snowTree, crystals, penguins, seals, smoke, farFirs, instanceEnemies,
} from './_helpers_a.js';

const Y = 1;
const CAM = { pitch: 44, dist: 13, fov: 40 };

// Schneebaum am Zielplateau (Krone begehbar, Ast-Stufen) und Felsnische
const TREE = { x: 7, z: -186, top: 8.9, r: 2.2 };
const NICHE = { x0: -12, x1: -9, z0: -183, z1: -186.6, y: 8 };
const HOLE = { x0: 12, x1: 15.4, z0: -75.6, z1: -79.4, y: 4 };

function scene(level) {
  // ---------------- Start: Iglu mit Rauch, Schlitten, Spuren, Schneeengel
  smoke(level, [-8.5, Y + 1.72, 3.5], { drift: [0.5, -0.25] });
  smoke(level, [9.3, Y + 1.72, -250.5], { drift: [-0.4, -0.2], n: 6 });
  sled(level, 4.8, Y, 7.6, 0.45);
  footprints(level, [[4.0, 7.2], [2.6, 6.6], [1.2, 5.8], [0.3, 5.1]], Y);
  sledTrack(level, [[5.9, 8.2], [8.2, 9.4], [10.8, 10.6]], Y);
  footprints(level, [[-6.4, 3.4], [-4.6, 2.6], [-2.8, 2.6], [-1.6, 3.6]], Y, { size: 0.8 });
  footprints(level, [[10.4, -3], [11.2, -6.2], [10.6, -9]], Y, { kind: 'pfote', size: 0.9, step: 0.45 });
  snowAngel(level, -3.2, Y, 9.2, 0.3);
  bench(level, -9.2, Y, -6.6, Math.PI / 2 - 0.2);
  birdhouse(level, 10.8, Y, 0.8, -0.6);
  penguins(level, [
    { pos: [8.8, Y, 5.4], yaw: -2.2, color: 0x3a8aff, mode: 'winken', phase: 0.4 },
    { pos: [9.7, Y, 4.6], yaw: -2.6, color: 0xff5a8a, scale: 0.85, phase: 1.7 },
  ]);
  icicleFringe(level, -7.5, -41.5, 7.5, -41.5, Y + 5.3, { len: 0.6 });
  // ---------------- Flatterfeld: Wandloch, Teich
  icicleFringe(level, HOLE.x0 - 0.02, HOLE.z0, HOLE.x0 - 0.02, HOLE.z1, Y + 5.6, { len: 0.5, density: 3 });
  crystals(level, [[15, 4, -76.2, 1.2, 0x9ff0ff], [15, 4, -78.8, 0.9, 0xc8a8ff]]);
  seals(level, [{ pos: [-11.3, Y, -84], yaw: 0.4, floe: false, phase: 1 }]);
  bench(level, 9.6, Y, -96, -Math.PI / 2 + 0.15);
  penguins(level, [
    { pos: [9.1, Y + 0.46, -96.4], yaw: Math.PI, color: 0x4ad06a, scale: 0.8, phase: 2.2 },
    { pos: [9.2, Y + 0.46, -95.4], yaw: Math.PI, color: 0xff8a2a, scale: 0.8, phase: 0.6 },
  ]);
  footprints(level, [[-14.5, -101], [-17, -104], [-18.6, -108], [-17.4, -113]], Y, { kind: 'pfote', size: 0.7, step: 0.4 });
  // ---------------- Eisbahn: Robbenkinder am Rand
  seals(level, [{ pos: [11.4, Y, -120], yaw: Math.PI + 0.3, phase: 0.2 }, { pos: [-11.6, Y, -137], yaw: -0.5, phase: 2.1 }]);
  // ---------------- Zielplateau: Schneebaum, Nische
  snowTree(level, TREE.x, Y, TREE.z, { top: TREE.top, r: TREE.r, lights: true, steps: [[3.5, 0.9, Y + 1.9], [1.6, -3.3, Y + 3.7], [-2.9, -2.1, Y + 5.6]] });
  icicleFringe(level, NICHE.x1 + 0.02, NICHE.z0, NICHE.x1 + 0.02, NICHE.z1, NICHE.y + 2.6, { len: 0.5, density: 3 });
  crystals(level, [[-11.5, NICHE.y, -183.6, 1, 0x9ff0ff]]);
  icicleFringe(level, -16, -199.9, 16, -199.9, Y + 9, { len: 0.9, density: 1.2 });
  // ---------------- Baumhain
  seals(level, [{ pos: [6.2, Y + 0.02, -246.8], yaw: 2.6, phase: 0.8 }, { pos: [8.6, Y + 0.02, -244.6], yaw: -2.4, phase: 2.6 }]);
  penguins(level, [
    { pos: [3.6, Y + 0.02, -243], color: 0xff4a3a, mode: 'rutschen', path: [[3.4, -243.2], [9.6, -248.8]], phase: 0.5 },
    { pos: [10.6, Y, -242.2], yaw: Math.PI, color: 0x3a8aff, mode: 'winken', phase: 1.2 },
    { pos: [11.3, Y, -243.2], yaw: Math.PI + 0.4, color: 0xffd23a, scale: 0.8, phase: 2.6 },
  ]);
  bench(level, -9.6, Y, -249.6, Math.PI / 2);
  birdhouse(level, -11, Y, -239, 0.5);
  sled(level, -6.2, Y, -229.4, -0.3, { color: 0x3a6ad8 });
  footprints(level, [[0.6, -232], [1.4, -238], [0.6, -244], [0.2, -250]], Y, { size: 0.9 });
  snowTree(level, -8.6, Y, -256.4, { top: Y + 6.4, r: 2, lights: true });
  // ---------------- ferne Tannenhänge (sparsame Tannen ohne Schatten)
  farFirs(level, FIRS);
  // ---------------- Gegner gleicher Art als Instanzen (Budget)
  instanceEnemies(level, ['flatterkaefer', 'krabbelkaefer', 'pilzling', 'schneesaeule', 'pilzling_eis']);
}

// ferne Tannen auf den Hängen links und rechts (in LEVEL.setup über farFirs)
const FIRS = [];
for (const [z, d, seed] of [[-20, 64, 3], [-84, 64, 13], [-148, 64, 23], [-212, 64, 33], [-260, 40, 43]]) {
  FIRS.push({ pos: [-23, -3.5, z], size: [16, d - 4], n: Math.round(d / 5), scale: [3.5, 6.5], gap: 2.8, seed });
  FIRS.push({ pos: [23, -3.5, z], size: [16, d - 4], n: Math.round(d / 5), scale: [3.5, 6.5], gap: 2.8, seed: seed + 1 });
}

// ferne Kulisse (Tannenhänge tief unter dem Pfad, ohne Sonnenschatten)
const slopes = (z, d, seed) => ({ type: 'deco_w3', shadow: false, items: [
  { kind: 'schneeflaeche', pos: [-30, -3.5, z], size: [30, d], cell: 6, solid: false },
  { kind: 'schneeflaeche', pos: [30, -3.5, z], size: [30, d], cell: 6, solid: false },
  { kind: 'schneehuegel', pos: [-36, -3.5, z], size: [14, d], n: 3, height: [1, 3], seed: seed + 2 },
  { kind: 'schneehuegel', pos: [36, -3.5, z], size: [14, d], n: 3, height: [1, 3], seed: seed + 3 },
] });

export const LEVEL = {
  id: '3-1',
  world: 3,
  title: 'Flockenwiese',
  archetype: 'parcours',
  theme: 'snow',
  music: 'course_snow',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -9,
  setup: levelSetup(scene),
  camera: [
    { ...CAM, from: 14, to: -44 },
    { ...CAM, from: -44, to: -66, pitch: 45 },
    { ...CAM, from: -68, to: -88, pitch: 43, dist: 13.5, yaw: -12 },
    { ...CAM, from: -90, to: -114, pitch: 45 },
    { ...CAM, from: -114, to: -140, pitch: 46, dist: 13.5 },
    { ...CAM, from: -140, to: -158, pitch: 50, dist: 12.5 },
    { ...CAM, from: -158, to: -174, pitch: 46 },
    { ...CAM, from: -176, to: -200, pitch: 42, dist: 14, yaw: 10 },
    { ...CAM, from: -224, to: -264, pitch: 42, dist: 13 },
  ],
  segments: [
    // =============================================================== Kulisse
    slopes(-20, 64, 3), slopes(-84, 64, 13), slopes(-148, 64, 23), slopes(-212, 64, 33), slopes(-260, 40, 43),

    // =============================================================== 1  Schneefeld-Start
    snow(-12, 12, 11, -62, Y, 4),
    { type: 'sign', pos: [-4.6, Y, 7.4], text: 'Flockenwiese' },
    { type: 'iglu', pos: [-8.5, Y, 3.5], yaw: 0 },
    { type: 'deco_w3', items: [
      { kind: 'schneemann', pos: [7.8, Y, 3], yaw: -2 },
      { kind: 'schneemann', pos: [9.4, Y, 2.0], yaw: -2.3, scale: 0.55 },
      { kind: 'laterne', pos: [-3.7, Y, 0.6] }, { kind: 'laterne', pos: [3.7, Y, 0.6] },
      { kind: 'tanne', pos: [-11, Y, 8.6], size: 4.6 }, { kind: 'tanne', pos: [11.2, Y, 8.4], size: 3.8 },
      { kind: 'tanne', pos: [11.2, Y, -11], size: 4.2 }, { kind: 'tanne', pos: [-11.2, Y, -26], size: 4.4 },
      { kind: 'tanne', pos: [11.3, Y, -40], size: 3.6 }, { kind: 'tanne', pos: [-11, Y, -46], size: 4 },
      { kind: 'felsen', pos: [-10.6, Y, -1], size: [2, 3], n: 2, height: [0.6, 1.2] },
    ] },
    { type: 'deco_w1b', items: [{ kind: 'bulbs', from: [-3.7, Y + 2.75, 0.6], to: [3.7, Y + 2.75, 0.6], sag: 0.6, n: 12 }] },
    { type: 'sign', pos: [-2.6, Y, -6.6], text: 'Schneebälle\nrollen!', size: [2.2, 0.8] },
    // Felsriegel links (der Schneeball zerschellt daran), Hügel für die Abwechslung
    isl(-11.5, -3.6, -21, -22.6, Y + 1.6, 1.6, { top: 'grass' }),
    { type: 'mound', pos: [-7.2, Y, -32], radius: 3.2, height: 0.8 },
    // Frosttor: zwei Felspfeiler mit verschneitem Sturz, Eiszapfen fallen auf Vorbeilaufende
    isl(-7.6, -5, -41.4, -43.6, Y + 5.3, 5.3, { top: 'grass' }),
    isl(5, 7.6, -41.4, -43.6, Y + 5.3, 5.3, { top: 'grass' }),
    { type: 'wall', pos: [0, Y + 5.3, -42.5], size: [15.2, 0.95, 2.2], style: 'grass', camIgnore: true },
    { type: 'eiszapfen', id: 'ez1', pos: [-2.6, Y + 5.3, -42.5], length: 1.1 },
    { type: 'eiszapfen', id: 'ez2', pos: [0, Y + 5.3, -42.5], length: 1.3 },
    { type: 'eiszapfen', id: 'ez3', pos: [2.6, Y + 5.3, -42.5], length: 1.1 },
    { type: 'tanne', id: 'tanne_muenzen', pos: [-10.4, Y, -14], content: 'coins:3' },
    { type: 'schneehaufen', id: 'haufen1', pos: [10.2, Y, -4.2], coins: 5 },

    // =============================================================== 2  Flatterfeld
    snow(-12, 12, -65.5, -114, Y, 4),
    // Felswand rechts mit dem Wandloch (Höhle x 12 … 15,4, Boden y 4)
    isl(12, 17.5, -64, -94, HOLE.y, 8, { top: 'grass' }),
    isl(12, 17.5, -64, HOLE.z0, Y + 6.6, 3.6, { top: 'grass' }),
    isl(12, 17.5, HOLE.z1, -94, Y + 6.6, 3.6, { top: 'grass' }),
    isl(12, 17.5, HOLE.z0, HOLE.z1, Y + 6.6, 1.0, { top: 'grass' }),
    isl(HOLE.x1, 17.5, HOLE.z0, HOLE.z1, Y + 5.6, 2.6, { top: 'none' }),
    isl(9.4, 11, -76.5, -78.5, Y + 1.3, 1.3, { top: 'grass' }),
    // Eisläufer-Teich (erhöht 0,3 m, Schneewulst)
    { type: 'eisflaeche', pos: [-6, Y, -86], size: [9, 0.3, 12], edge: true },
    { type: 'sign', pos: [-9.6, Y, -78.6], text: 'Eisläufer-\nTeich', size: [2, 0.8] },
    { type: 'deco_w3', items: [
      { kind: 'tanne', pos: [-11.2, Y, -68], size: 4.2 }, { kind: 'tanne', pos: [-11.3, Y, -95], size: 3.8 },
      { kind: 'tanne', pos: [11, Y, -100], size: 4.4 }, { kind: 'tanne', pos: [11.2, Y, -111], size: 3.6 },
      { kind: 'schneemann', pos: [-9.5, Y, -104], yaw: -1.2 },
      { kind: 'laternen', pos: [-3.4, Y, -96], from: [-3.4, Y, -96], to: [-3.4, Y, -110], every: 7 },
      { kind: 'felsen', pos: [11.2, Y, -66.5], size: [1.6, 2], n: 2, height: [0.6, 1.4] },
    ] },
    { type: 'deco_w1b', items: [{ kind: 'bulbs', from: [-3.4, Y + 2.7, -96], to: [-3.4, Y + 2.7, -103], sag: 0.5, n: 9 }, { kind: 'bulbs', from: [-3.4, Y + 2.7, -103], to: [-3.4, Y + 2.7, -110], sag: 0.5, n: 9 }] },

    // =============================================================== 3  Hasenwiese, Stempel-Steg, Eisbahn
    snow(-25, -12, -98, -118, Y, 4),
    { type: 'deco', items: [
      { kind: 'fence', from: [-24.6, Y, -98.6], to: [-24.6, Y, -117.4] },
      { kind: 'fence', from: [-24.6, Y, -98.6], to: [-12.6, Y, -98.6] },
    ] },
    { type: 'deco_w3', items: [
      { kind: 'tanne', pos: [-23.4, Y, -100.4], size: 3.4 }, { kind: 'tanne', pos: [-13.4, Y, -117], size: 3 },
      { kind: 'felsen', pos: [-23.5, Y, -114], size: [1.6, 2], n: 2, height: [0.5, 1] },
    ] },
    // schmaler Eissteg (1 m) zum Stempel, zweiter Steg zur Eisbahn
    steg(-20, -19, -118, -130, Y),
    snow(-23, -16.5, -130, -135, Y, 3),
    steg(-16.5, -10, -132, -133, Y),
    { type: 'sign', pos: [-22, Y, -116.6], text: 'Schmaler\nEissteg', size: [2, 0.8] },
    // Eisbahn 1 mit Stachelstreifen (nur mit Schlittschuh)
    rink(-10, 10, -114, -140, Y, 4),
    { type: 'stachelboden', pos: [8.2, Y, -127], size: [2.6, 0.25, 20] },
    { type: 'sign', pos: [6.6, Y, -114.6], text: 'Nur mit\nSchlittschuh!', size: [2.2, 0.8] },
    // drei schmale Eisstege über dem Abgrund, dazwischen Schneeinseln
    steg(-0.8, 0.8, -140, -146.5, Y),
    snow(-1.8, 1.8, -146.5, -150.5, Y, 3),
    steg(1.8, 7.2, -147.7, -149.3, Y),
    snow(7.2, 10.8, -146.5, -150.5, Y, 3),
    steg(8.2, 9.8, -150.5, -158, Y),
    // Eisbahn 2
    rink(-2, 14, -158, -174, Y, 4),
    // Zielplateau
    snow(-9, 14, -174, -200, Y, 4),
    // Felswand links mit Nische (x −12 … −9, Boden y 8), Kletterwand darunter
    isl(-16, -9, -168, -204, NICHE.y, 11, { top: 'grass' }),
    isl(-16, -9, -168, NICHE.z0, Y + 11, 4, { top: 'grass' }),
    isl(-16, -9, NICHE.z1, -204, Y + 11, 4, { top: 'grass' }),
    isl(-16, -9, NICHE.z0, NICHE.z1, Y + 11, 1.4, { top: 'grass' }),
    isl(-16, NICHE.x0, NICHE.z0, NICHE.z1, NICHE.y + 2.6, 2.6, { top: 'none' }),
    { type: 'wall', pos: [-8.8, Y, -184.8], size: [0.4, NICHE.y - Y, 3.6], climbable: true },
    // hohe Felswand hinter dem Plateau (verdeckt den Baumhain)
    isl(-16, 16, -200, -206, Y + 9, 13, { top: 'grass' }),
    { type: 'pipe', id: 'p_ziel', pos: [3, Y, -196], height: 1.4, target: 'p_hain' },
    { type: 'sign', pos: [0.2, Y, -194.2], text: 'Zum Baumhain', size: [2, 0.7] },
    { type: 'deco_w3', items: [
      { kind: 'schneemann', pos: [12.4, Y, -177], yaw: -2.4 },
      { kind: 'tanne', pos: [12.6, Y, -197], size: 4 }, { kind: 'tanne', pos: [-7.6, Y, -198], size: 3.4 },
      { kind: 'laterne', pos: [5.6, Y, -197.2] },
    ] },

    // =============================================================== 4  Baumhain (nur durch die Röhre)
    snow(-14, 14, -226, -262, Y, 4),
    { type: 'pipe', id: 'p_hain', pos: [0, Y, -229.6], height: 1.2 },
    { type: 'iglu', pos: [9.3, Y, -250.5], yaw: Math.PI },
    { type: 'deco_w3', items: [
      { kind: 'tannen', pos: [-10.5, Y, -244], size: [6, 34], n: 7, scale: [0.9, 1.3], gap: 3, avoid: [[-5.5, -240, 4], [-9.6, -249.6, 1.6], [-8.6, -256.4, 3], [-11, -239, 1], [-6.2, -229.4, 1.5]] },
      { kind: 'tannen', pos: [11.2, Y, -236], size: [5, 18], n: 4, scale: [0.9, 1.3], gap: 3, avoid: [[10.8, -242.6, 1.6]] },
      { kind: 'schneemann', pos: [-3.6, Y, -258], yaw: -1.4 },
      { kind: 'schneemann', pos: [-2.4, Y, -258.8], yaw: -1.7, scale: 0.5 },
      { kind: 'laternen', pos: [-2.6, Y, -232], from: [-2.6, Y, -232], to: [-2.6, Y, -252], every: 6.5 },
      { kind: 'laternen', pos: [2.6, Y, -232], from: [2.6, Y, -232], to: [2.6, Y, -252], every: 6.5 },
    ] },
    { type: 'deco_w1b', items: [
      { kind: 'bulbs', from: [-2.6, Y + 2.7, -238.5], to: [2.6, Y + 2.7, -238.5], sag: 0.5, n: 8 },
      { kind: 'bulbs', from: [-2.6, Y + 2.7, -251.5], to: [2.6, Y + 2.7, -251.5], sag: 0.5, n: 8 },
    ] },
    // zugefrorener Teich (nur Optik und rutschig)
    { type: 'eisbahn', pos: [6.6, Y, -246], size: [7, 0.06, 6.4] },
  ],
  blocks: [
    // 1: Gleitblatt in Sichtweite des Starts
    { kind: 'brick', pos: [1.4, Y + 2.4, -3.4] },
    { kind: 'question', pos: [2.4, Y + 2.4, -3.4], content: 'gleitblatt' },
    { kind: 'brick', pos: [3.4, Y + 2.4, -3.4], content: 'coins:3' },
    // Extraleben: unsichtbarer Block über der Iglu-Kuppel
    { kind: 'hidden', pos: [-8.5, Y + 4.0, 3.5], content: 'oneup' },
    // 2: Gleitblatt-Nachschub am Checkpoint
    { kind: 'question', pos: [-3.4, Y + 2.4, -99], content: 'gleitblatt' },
    // 3: Krallen-Anzug am Zielplateau
    { kind: 'question', pos: [-5, Y + 2.4, -178.6], content: 'krallenAnzug' },
    { kind: 'brick', pos: [-6, Y + 2.4, -178.6], content: 'coins:2' },
  ],
  enemies: [
    // Schneesäulen (6)
    { kind: 'schneesaeule', id: 'ss1', pos: [-2, Y, -15], path: [[-5, Y, -15], [2, Y, -15]], segments: 3 },
    { kind: 'schneesaeule', id: 'ss2', pos: [-4, Y, -34], behavior: 'chase', sight: 6, segments: 4 },
    { kind: 'schneesaeule', id: 'ss3', pos: [3, Y, -71], path: [[0, Y, -71], [6, Y, -71]], segments: 4 },
    { kind: 'schneesaeule', id: 'ss4', pos: [4, Y, -92], behavior: 'chase', sight: 6, segments: 5 },
    { kind: 'schneesaeule', id: 'ss5', pos: [7.6, Y, -106], path: [[6, Y, -106], [10, Y, -106]], segments: 3 },
    { kind: 'schneesaeule', id: 'ss6', pos: [-1, Y, -183], path: [[-4, Y, -183], [1.5, Y, -183]], segments: 4 },
    // Flatterkäfer (9) kreisen vor dem Wandloch
    { kind: 'flatterkaefer', id: 'fk', path: [[11.3, HOLE.y + 0.7, -73.4], [11.3, HOLE.y + 0.7, -81.6], [8.2, HOLE.y + 0.4, -81.6], [8.2, HOLE.y + 0.4, -73.4]], count: 9, spacing: 1.75, speed: 1.6, color: 'blue' },
    // Eisläufer-Pilzlinge (4): Reit-Eisläufer im Teich, zwei auf Eisbahn 1, ein Verfolger auf Eisbahn 2
    { kind: 'pilzling_eis', id: 'eis_reit', pos: [-3, Y + 0.3, -86], center: [-6, Y + 0.3, -86], radius: 2.6, rz: 3.8, ride: true, speed: 2.2 },
    { kind: 'pilzling_eis', id: 'eis1', pos: [1.5, Y, -126], center: [-3, Y, -126], radius: 4.5, cw: true },
    { kind: 'pilzling_eis', id: 'eis2', pos: [3, Y, -117], dir: [0, -1], slalom: 0.9, speed: 3.6 },
    { kind: 'pilzling_eis', id: 'eis3', pos: [9, Y, -170], behavior: 'chase', sight: 8, speed: 3.6 },
    // Mini-Pilzlinge (4)
    { kind: 'pilzling', mini: true, pos: [0, Y, -81], behavior: 'chase', sight: 5 },
    { kind: 'pilzling', mini: true, pos: [-8, Y, -70], path: [[-10.5, Y, -70], [-6, Y, -70]] },
    { kind: 'pilzling', mini: true, pos: [10, Y, -192], path: [[8, Y, -192], [12, Y, -192]] },
    { kind: 'pilzling', mini: true, pos: [6, Y, -238], behavior: 'chase', sight: 5 },
    // Krabbelkäfer (7): Kegelbahn am Start (3), Reihe im Baumhain (4)
    { kind: 'krabbelkaefer', id: 'kk_start', path: [[3.5, Y, -26], [10, Y, -26], [10, Y, -34], [3.5, Y, -34]], count: 3, spacing: 3, color: 'red' },
    { kind: 'krabbelkaefer', id: 'kk_hain', path: [[-8, Y, -235], [-3.6, Y, -235], [-3.6, Y, -244], [-8, Y, -244]], count: 4, spacing: 2.2, color: 'yellow' },
  ],
  items: [
    // ---------------- 1
    line([0, Y + 0.6, 2.4], [0, Y + 0.6, -1], 3),
    ...arc([-6.2, Y + 0.6, 3.5], [-8.5, Y + 2.4, 3.5], 3, 0.8),
    line([-0.4, Y + 0.6, -24], [-0.4, Y + 0.6, -30], 3),
    line([0, Y + 0.6, -37], [0, Y + 0.6, -47], 5),
    { kind: 'schneeball', id: 'ball_riegel', pos: [-7.4, Y, -9.4], size: 1, content: 'coins:5' },
    { kind: 'schneeball', id: 'ball_kegel', pos: [6.8, Y, -18.4], size: 1.1, content: 'coins:3' },
    // ---------------- 2
    ...arc([0, Y + 0.6, -59.6], [0, Y + 0.6, -68], 5, 1.8),
    line([12.6, HOLE.y + 0.6, -76.6], [12.6, HOLE.y + 0.6, -78.4], 2),
    ...column(10.2, -77.5, Y + 2, Y + 3.4, 2),
    ring([-6, Y + 1.0, -86], 2.6, 4),
    line([2, Y + 0.6, -94], [2, Y + 0.6, -100], 3),
    // ---------------- 3
    line([-19.5, Y + 0.7, -120], [-19.5, Y + 0.7, -128], 4),
    line([8.2, Y + 1.0, -119], [8.2, Y + 1.0, -135], 5),
    line([0, Y + 0.6, -141], [0, Y + 0.6, -145.5], 3),
    line([2.6, Y + 0.6, -148.5], [6.4, Y + 0.6, -148.5], 3),
    line([9, Y + 0.6, -151.5], [9, Y + 0.6, -157], 3),
    line([6, Y + 0.6, -160], [4, Y + 0.6, -172], 4),
    // Krone des Schneebaums und Ast-Stufen (zeigt den Weg nach oben)
    ring([TREE.x, TREE.top + 0.7, TREE.z], 1.3, 4),
    ...arc([TREE.x + 3.5, Y + 2.4, TREE.z + 0.9], [TREE.x + 1.6, Y + 4.2, TREE.z - 3.3], 2, 0.5),
    // Propeller-Helm und Hinweis-Münzen vor der Nische
    { kind: 'helm_propeller', pos: [1.2, Y, -177.6], respawn: 6 },
    line([-7.6, NICHE.y + 0.8, -184.8], [-3.6, NICHE.y + 0.8, -184.8], 3),
    { kind: 'schneeball', id: 'ball_plateau', pos: [-3, Y, -190.6], size: 1.2, content: 'coins:3' },
    // ---------------- 4
    line([0, Y + 0.6, -233], [0, Y + 0.6, -248], 5),
  ],
  checkpoint: { pos: [0, Y, -102], yaw: Math.PI / 2 },
  stars: [
    [13.9, HOLE.y + 0.5, -77.5],                                            // 0: Wandloch hinter den Flatterkäfern
    { pos: [-18.5, Y + 1, -108], hidden: true, id: 'stern_hase' },          // 1: Hase (erscheint über ihm)
    [-10.6, NICHE.y + 0.5, -184.8],                                          // 2: Wandnische vor der Zielröhre
  ],
  stamp: [-19.6, Y + 0.9, -132.6],
  goal: { pos: [0, Y, -254], height: 9 },
  marks: {
    start: [0, Y, 5],
    qblock: [2.4, Y, -1.6],
    iglu: [-8.5, Y + 1.78, 3.5],
    ball_riegel: [-7.4, Y, -9.4],
    ball_kegel: [6.8, Y, -18.4],
    tor: [0, Y, -40],
    gap: [0, Y, -60],
    hole: [10.2, Y + 1.3, -77.5],
    pond: [-6, Y + 0.3, -80.6],
    checkpoint: [0, Y, -102],
    meadow: [-15, Y, -108],
    steg: [-19.5, Y, -118.6],
    stampIsland: [-19.6, Y, -132.6],
    rink1: [0, Y, -116],
    stegs: [0, Y, -139],
    rink2: [9, Y, -159],
    plateau: [3, Y, -176],
    tree: [TREE.x, TREE.top, TREE.z],
    niche: [-10.6, NICHE.y, -184.8],
    pipe: [3, Y + 1.4, -196],
    grove: [0, Y, -232],
    goal: [0, Y, -249],
  },
};
