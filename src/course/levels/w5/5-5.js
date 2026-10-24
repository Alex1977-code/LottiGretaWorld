// 5-5 „Kawumm im Kristallstollen“ – Bergwerk unter der Lila Strand-Insel (Bauplan: Detail 5-5, Archetyp Parcours/Höhle).
// Thema mine, Musik course_mine, 400 s, ≈ 230 m Weg nach −Z; der Stollen führt in drei Stufen hinab (y 1 → −4 → −8) und
// über eine Röhre hinauf zum Ausgang (y 3).
//
// Abschnitte:
//   1  Start            z  10 … −29  Stolleneingang mit Grubenbalken, abgestellter Kristall-Lore, Grubenlampen und
//                                    Wimpeln; ?-Block mit Krallen-Anzug; zwei Schnappblumen, zwei Zündköpfe.
//                                    Das Tor aus lila Ziegeln öffnet der POW-Block davor (Einführung: harmlos).
//   2  Erster Abschnitt z −29 … −97  Felssims mit POW und Pilzlingsturm, Schlucht mit zwei fahrenden Loren auf
//                                    Gleisgerüsten (Lücken 2–3,2 m), Mittelinsel (Schnappblume, versteckter 1-Up-
//                                    Block), Feuer-Schnappblume auf dem Felsvorsprung. Sims B: links die erste Glasröhre
//                                    hinter einer lila Ziegelwand (Zündkopf aus der Nachschub-Röhre werfen, Tatzenhieb
//                                    oder POW-Block) → Kristallbalkon mit Stern 0; rechts die Glasröhre über die
//                                    Felswand hinab in die Halle.
//   3  Checkpoint       z −97 … −141 Kristallhalle: Checkpoint, Wolkenkanone → Kristall-Empore mit Farbfeld 3 × 3
//                                    (alle färben → Stern 2), Glühpilz-Wiese mit zwei Hasen (einer trägt Stern 1, einer
//                                    ein Extraleben), POW, Pilzlingsturm, Schnappblume. Links die rissige Felswand: einen
//                                    Zündkopf aus der Nachschub-Röhre dagegen werfen → Geheimgang zum Stempel.
//   4  Zweiter Abschnitt z −141 … −196  Boost-Feld: Rampe hinab mit Boost-Pfeilen, 14-m-Sprung über die Grube (wer zu
//                                    kurz springt, landet weich in der Grube und steigt die Treppe wieder hinauf),
//                                    Landesims mit Funkelstern-Block, POW, zwei Pilzlingstürmen, Zündkopf, Schnappblume
//                                    und Feuer-Schnappblume; grüne Röhre zum Ausgang.
//   5  Ziel             z −206 … −226  Stollenausgang im Lichtschacht: Gold-Lore, Schild „Glück auf!“, Zielmast.
// Sterne (Index): 0 Kristallbalkon hinter der lila Wand, 1 Hase nach dem Checkpoint, 2 Farbfeld auf der Empore.
// Stempel: Geheimkammer hinter der rissigen Wand. Extraleben: Hase auf der Wiese, versteckter Block über der Mittelinsel.
// Gegner: Zündkopf 3 + 2 Nachschub-Röhren, Pilzlingsturm 4, Schnappblume 5, Feuer-Schnappblume 2.

import {
  isl, rock, line, ring, arc, sign, rails, lore, parkedLore, risswand, crystals, dripstones, glowShrooms, boulders, oreVeins,
  pennantLines, lightShaft, sparkleField, planks,
} from './_helpers_c.js';
import { giveStar } from '../../entities/gimmick.js';

// Höhen
const Y1 = 1;     // Start, Schlucht, Sims B
const Y2 = -4;    // Kristallhalle
const Y3 = -7;    // Boost-Lauf
const Y4 = -8;    // Landesims
const YG = 3;     // Ausgang
const RAIL = 1.76; // Lore (scale 1,6): Oberseite 1,76 m über der Schiene

function build(level) {
  // ---------------------------------------------------------------- Gleise und Loren
  rails(level, [
    { from: [5, Y1, 5], to: [5, Y1, -3], gauge: 1.17, buffers: ['to'] },                         // abgestellte Lore am Start
    { from: [0, Y1 - RAIL, -44.2], to: [0, Y1 - RAIL, -59.8], trestle: true, down: 16 },           // Lore 1 (längs)
    { from: [-9, Y1 - RAIL, -70], to: [9, Y1 - RAIL, -70], trestle: true, down: 16 },              // Lore 2 (quer)
    { from: [-7.5, Y1, -89.5], to: [-1.5, Y1, -89.5], gauge: 1.17, buffers: ['from', 'to'] },      // Sims B, Erzlore
    { from: [-6, YG, -224], to: [6, YG, -224], gauge: 1.17, buffers: ['from'] },                   // Ausgang
  ]);
  lore(level, { id: 'lore1', path: [[0, Y1 - RAIL, -47.2], [0, Y1 - RAIL, -56.6]], speed: 2.4, wait: 1.0, load: 'erz' });
  lore(level, { id: 'lore2', path: [[-5.2, Y1 - RAIL, -70], [5.2, Y1 - RAIL, -70]], speed: 2.2, wait: 0.8, phase: 0.25, load: 'kristall' });
  parkedLore(level, [[5, Y1, 1.5, Math.PI / 2, 'kristall', 1.3], [-4.5, Y1, -89.5, 0, 'erz', 1.3], [2.5, YG, -224, 0, 'gold', 1.3]]);
  // ---------------------------------------------------------------- rissige Wand (Stempel-Geheimgang)
  risswand(level, { id: 'risswand', pos: [-10.5, Y2, -131.5], size: [1, 3.6, 4] });
  // ---------------------------------------------------------------- Kristalle, Tropfsteine, Pilze, Felsen, Erz
  crystals(level, [
    [-6.2, Y1, 8.4, 1.1, 0x7ae8ff], [6.4, Y1, -6.5, 0.9, 0xff7ad8], [-6.3, Y1, -16, 1.2, 0xb07aff], [6.2, Y1, -25, 1.0, 0x7ae8ff],
    [-6, Y1, -40, 1.1, 0xffd04a], [6.2, Y1, -43, 0.9, 0xff7ad8],
    [-3, Y1, -65.4, 0.8, 0x7ae8ff], [3.1, Y1, -60.6, 0.7, 0xb07aff],
    [-8.2, Y1, -75.5, 1.2, 0xff7ad8], [8.3, Y1, -78, 1.1, 0x7ae8ff], [8.2, Y1, -90.5, 1.3, 0xb07aff],
    [-12.2, Y1 + 9, -82.2, 1.2, 0x7ae8ff], [-9.2, Y1 + 9, -87.6, 1.0, 0xff7ad8], [-12.4, Y1 + 9, -87.4, 1.4, 0xffd04a],
    [-9.2, Y2, -99, 1.4, 0x7ae8ff], [9.2, Y2, -100, 1.2, 0xff7ad8], [9.3, Y2, -138, 1.3, 0xb07aff], [-9.2, Y2, -139, 1.0, 0x7ae8ff],
    [4.4, Y2 + 13, -126.2, 1.0, 0xff7ad8], [9.2, Y2 + 13, -116.8, 1.1, 0x7ae8ff],
    [-27, Y2, -127, 1.4, 0xffd04a], [-27.2, Y2, -136, 1.2, 0xff7ad8], [-21, Y2, -136.4, 0.9, 0x7ae8ff],
    [-4.4, Y3, -155.8, 0.8, 0x7ae8ff], [4.3, Y3, -153, 0.9, 0xff7ad8], [-4, Y3 - 4, -166, 1.2, 0xb07aff], [4.2, Y3 - 4, -170.6, 1.0, 0x7ae8ff],
    [-7.2, Y4, -194.5, 1.3, 0x7ae8ff], [7.3, Y4, -174, 1.1, 0xb07aff],
    [-7.2, YG, -207, 1.4, 0xffd04a], [7.3, YG, -212, 1.2, 0x7ae8ff], [-7.4, YG, -225, 1.1, 0xff7ad8], [7.2, YG, -225.4, 1.3, 0xb07aff],
  ]);
  dripstones(level, [
    [-5.6, Y1, 6.2, 1.6, 0.45], [5.8, Y1, -10.5, 1.2, 0.35], [-6.1, Y1, -30.8, 1.8, 0.5],
    [-6, Y1 - 14, -50, 9, 1.4], [5.6, Y1 - 14, -54, 7, 1.1], [-4, Y1 - 14, -68, 10, 1.6], [6, Y1 - 14, -64, 8, 1.2], [0, Y1 - 15, -61, 6, 1],
    [-12, Y1 + 7, -60, -3, 0.9], [12, Y1 + 7, -66, -2.4, 0.7],
    [-7.8, Y2 + 13, -118, -2.2, 0.6], [6, Y2 + 13, -126.4, -1.8, 0.5], [8.4, Y2 + 13, -116.4, -2.6, 0.6],
    [9, Y2, -104, 1.4, 0.4], [-9, Y2, -108, 1.8, 0.5], [8.8, Y2, -130, 2.0, 0.55],
    [-4, Y3 - 4, -160.5, 1.6, 0.5], [0, Y3 - 4, -170, 1.2, 0.4],
    [7, Y4, -180, 1.4, 0.45], [-7.2, Y4, -184, 1.9, 0.5],
  ]);
  glowShrooms(level, [
    [-9, Y2, -112, 0.8, 0x6ae0ff], [-3, Y2, -112.5, 0.6, 0xff8ad8], [-9.2, Y2, -124.5, 0.9, 0xb07aff], [-2.6, Y2, -125, 0.7, 0x6ae0ff],
    [-5.8, Y2, -111.6, 0.5, 0xffd04a], [-9.4, Y2, -118, 0.6, 0xff8ad8],
    [-22, Y2, -128.6, 0.6, 0x6ae0ff], [-26.5, Y2, -131.5, 0.7, 0xff8ad8],
    [-1, Y3 - 4, -167, 0.7, 0x6ae0ff], [2, Y3 - 4, -161, 0.5, 0xff8ad8],
    [-6.6, YG, -214, 0.7, 0x6ae0ff], [6.6, YG, -217, 0.6, 0xff8ad8],
  ]);
  boulders(level, [
    [-6.4, Y1, 10.8, 1.1, 4], [6.4, Y1, 10.6, 1.0, 3], [-5.6, Y1, -27, 0.8, 3], [5.6, Y1, -26.8, 0.8, 3],
    [-6.2, Y1, -45, 0.7, 2], [8.3, Y1, -86, 0.9, 3], [-9.3, Y2, -102, 1.0, 3], [9.2, Y2, -122, 0.8, 3],
    [-4.4, Y3, -142.4, 0.6, 2], [4.4, Y3, -146, 0.6, 2], [-7.2, Y4, -173.4, 0.9, 3], [-6.8, YG, -219, 1.0, 3],
  ]);
  oreVeins(level, [
    [-7.02, Y1 + 3, -4, '+x', 7, 2.5], [7.02, Y1 + 4, -18, '-x', 7, 2.5], [-9.02, Y1 + 4, -80, '+x', 6, 2], [9.02, Y1 + 3.5, -84, '-x', 6, 2],
    [-10.02, Y2 + 5, -112, '+x', 8, 3, 0x7ae8ff], [10.02, Y2 + 6, -106, '-x', 8, 3], [10.02, Y2 + 4, -134, '-x', 6, 2, 0xff7ad8],
    [-5.02, Y3 + 4, -150, '+x', 5, 2], [8.02, Y4 + 3, -186, '-x', 6, 2.5, 0x7ae8ff], [-8.02, YG + 4, -214, '+x', 7, 3],
  ]);
  planks(level, [[-4, 4, -91.5, -97, Y2 - 0.02 + 0, 'x'], [-3, 3, 9.6, 3, Y1, 'x']]);
  pennantLines(level, [
    [[-6.8, Y1 + 5.4, 2], [6.8, Y1 + 5.4, 2], 10, 0.9], [[-6.8, Y1 + 5.4, -20], [6.8, Y1 + 5.4, -20], 10, 0.9],
    [[-9.8, Y2 + 6.5, -104], [9.8, Y2 + 6.5, -104], 13, 1.1], [[-7.8, YG + 5.5, -210], [7.8, YG + 5.5, -210], 10, 0.9],
  ]);
  // Glühpilz-Wiese: weiches Moos (dunkelgrün-türkis) als flache Scheiben
  if (level.view) {
    lightShaft(level, { pos: [0, YG, -219], r: 3.8, h: 22 });
  }
}

function setup(level) {
  // Kristallstaub in Schlucht und Halle, Funkeln am Ausgang
  sparkleField(level, { min: [-8, Y1 - 6, -74], max: [8, Y1 + 5, -44], n: 36, size: 0.32, color: 0xa8e8ff });
  sparkleField(level, { min: [-9, Y2 + 1, -140], max: [9, Y2 + 9, -100], n: 40, size: 0.3, color: 0xffc8ff });
  sparkleField(level, { min: [-4, YG + 1, -223], max: [4, YG + 14, -215], n: 30, size: 0.28, color: 0xfff2c0, rise: 0.6 });
}

/** Belohnung des Stern-Hasen: Stern 1 erscheint dort, wo er gefangen wurde. */
const starAtBunny = { fn: (level, ctx) => { const p = ctx.pos; giveStar(level, { index: 1, pos: [p[0], p[1] + 0.9, p[2]] }, { x: p[0], y: p[1], z: p[2] }); } };

export const LEVEL = {
  id: '5-5',
  world: 5,
  title: 'Kawumm im Kristallstollen',
  archetype: 'parcours',
  theme: 'mine',
  music: 'course_mine',
  timeLimit: 400,
  killY: -26,
  build,
  setup,
  start: { pos: [0, Y1, 6], yaw: Math.PI / 2 },
  camera: [
    { from: 14, to: -30, pitch: 44, dist: 13 },
    { from: -30, to: -94, pitch: 46, dist: 14 },
    { from: -94, to: -141, pitch: 47, dist: 14.5 },
    { from: -141, to: -200, pitch: 44, dist: 14 },
    { from: -200, to: -232, pitch: 40, dist: 13 },
    // Geheimgang zum Stempel (links hinter der rissigen Wand)
    { from: -122, to: -142, pitch: 52, dist: 12, area: [-34, -10.6] },
  ],
  segments: [
    // ============================================================ 1 Start
    isl(-7, 7, 10, -44, Y1, 5),
    rock(-9, 9, 13, 10, Y1 + 2.4, 7.4),                     // niedrige Rückwand (Kamera bleibt frei)
    rock(-11, -7, 13, -44, Y1 + 7, 12), rock(7, 11, 13, -44, Y1 + 7, 12),
    // Tor aus lila Ziegeln zwischen zwei Felspfeilern (Wand: items)
    rock(-7, -2, -27.6, -29.4, Y1 + 7, 7), rock(2, 7, -27.6, -29.4, Y1 + 7, 7),
    sign(-4.2, Y1, 5.2, 'Kristallstollen\nVorsicht: Zündköpfe!', { size: [3.0, 1.0] }),
    sign(2.6, Y1, -21.6, 'Auf den POW springen!', { size: [2.6, 0.8] }),
    { type: 'deco_w5', items: [
      { kind: 'grubenbalken', pos: [0, Y1, 3.5], width: 13.6, height: 5.8, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenbalken', pos: [0, Y1, -9.5], width: 13.6, height: 5.8, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenbalken', pos: [0, Y1, -36], width: 13.6, height: 5.8, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenlampe', pos: [-6.4, Y1 + 4.6, -16] }, { kind: 'grubenlampe', pos: [6.4, Y1 + 4.6, -24] },
      { kind: 'kristalle', pos: [6, Y1, 7.5], n: 5, size: 1.1 }, { kind: 'kristalle', pos: [-6, Y1, -22], n: 4, size: 0.9 },
    ] },
    // ============================================================ 2 Erster Abschnitt
    rock(-13, -9, -44, -74, Y1 + 7, 13), rock(9, 13, -44, -74, Y1 + 7, 13),
    isl(-3.5, 3.5, -60, -66, Y1, 4, { under: 6 }),                       // Mittelinsel
    rock(-8.6, -5.4, -61, -65, Y1 + 1.2, 6, { under: 4 }),                 // Felsvorsprung (Feuer-Schnappblume)
    isl(-9, 9, -73.2, -92, Y1, 5),                                        // Sims B
    rock(-13, -9, -74, -98, Y1 + 7, 12), rock(9, 13, -74, -98, Y1 + 7, 12),
    rock(-13.4, -8.4, -81, -88.6, Y1 + 9, 10),                            // Kristallbalkon (Stern 0)
    rock(-7.5, -6.5, -79.9, -81.6, Y1 + 5, 5), rock(-3.5, -2.5, -79.9, -81.6, Y1 + 5, 5),   // Felspfosten um die lila Wand
    rock(-9, 9, -92, -97, Y1 + 6, 11, { xray: true }),                    // Felswand zwischen Sims B und Halle
    { type: 'pipe', id: 'zk_roehre1', pos: [1.4, Y1, -86.2], height: 1.2, radius: 0.7, color: 'red' },
    { type: 'glasspipe', id: 'roehre_stern', path: [[-5, Y1 + 1, -80.4], [-5, Y1 + 1, -83.2], [-6.4, Y1 + 3.2, -85.8], [-8.1, Y1 + 6.8, -86.2], [-8.8, Y1 + 8.6, -85.6], [-9.2, Y1 + 10, -85.3]], coins: 3, oneWay: true },
    { type: 'glasspipe', id: 'roehre_halle', path: [[5, Y1 + 1, -82.6], [5, Y1 + 1, -86.2], [5, Y1 + 3.6, -89.4], [4, Y1 + 8.3, -93.6], [2.5, Y2 + 5.6, -98.6], [1, Y2 + 1.5, -101.6], [0.5, Y2 + 1, -103.4]], coins: 6, oneWay: true },
    sign(7.4, Y1, -78.6, 'Zur Halle ↓', { size: [2.0, 0.8] }),
    { type: 'deco_w5', items: [
      { kind: 'grubenlampe', pos: [-8.6, Y1 + 5.2, -50] }, { kind: 'grubenlampe', pos: [8.6, Y1 + 5.2, -62] },
      { kind: 'grubenlampe', pos: [-8.6, Y1 + 5, -78] }, { kind: 'grubenlampe', pos: [8.6, Y1 + 5, -88] },
      { kind: 'grubenbalken', pos: [0, Y1, -76.5], width: 17.6, height: 6.2, yaw: Math.PI / 2, lamp: true },
      { kind: 'kristalle', pos: [-11, Y1 + 9, -85], n: 5, size: 1.2 },
    ] },
    // ============================================================ 3 Kristallhalle (Checkpoint)
    isl(-10, 10, -97, -141, Y2, 5),
    rock(-14, -10, -97, -129.5, Y2 + 11, 13), rock(-14, -10, -133.5, -141, Y2 + 11, 13),
    rock(-14, -10, -129.5, -133.5, Y2 + 11, 7.4),                         // Sturz über dem Geheimgang
    rock(10, 14, -97, -141, Y2 + 11, 13),
    rock(3.4, 10, -116, -127, Y2 + 13, 2.6, { under: 2 }),                // Kristall-Empore (Wolkenkanone)
    { type: 'cloudcannon', id: 'kanone', pos: [7, Y2, -110], target: [6.8, Y2 + 13, -119.2], arc: 4 },
    { type: 'switchtiles', id: 'farbfeld', pos: [6.8, Y2 + 13, -121.8], grid: [3, 3], spacing: 1.6, onAll: { star: 2 }, at: [6.8, Y2 + 14.2, -121.8] },
    // Geheimgang (hinter der rissigen Wand) und Stempelkammer
    isl(-21, -10, -129.5, -133.5, Y2, 5),
    rock(-21, -14, -128.6, -129.5, Y2 + 1.2, 6), rock(-21, -14, -133.5, -134.6, Y2 + 6, 10),
    isl(-29, -21, -125.5, -137.5, Y2, 5),
    rock(-29, -21, -137.5, -138.6, Y2 + 6, 10), rock(-30, -29, -125.5, -138.6, Y2 + 6, 10),
    rock(-29, -21, -124.6, -125.5, Y2 + 1.2, 6),
    { type: 'pipe', id: 'zk_roehre2', pos: [-7.6, Y2, -125.6], height: 1.2, radius: 0.7, color: 'red' },
    sign(-6.2, Y2, -136.8, 'Risse? Kawumm!', { size: [2.2, 0.8] }),
    { type: 'deco', items: [
      { kind: 'fence', from: [-9.6, Y2, -110.6], to: [-2.2, Y2, -110.6] }, { kind: 'fence', from: [-2.2, Y2, -110.6], to: [-2.2, Y2, -115.5] },
      { kind: 'fence', from: [-2.2, Y2, -120.5], to: [-2.2, Y2, -126] }, { kind: 'fence', from: [-9.6, Y2, -126], to: [-2.2, Y2, -126] },
    ] },
    { type: 'deco_w5', items: [
      { kind: 'grubenbalken', pos: [0, Y2, -100], width: 19.6, height: 7.5, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenbalken', pos: [0, Y2, -138.5], width: 19.6, height: 7.5, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenlampe', pos: [-9.6, Y2 + 6, -116] }, { kind: 'grubenlampe', pos: [9.6, Y2 + 6, -112] },
      { kind: 'grubenlampe', pos: [-9.6, Y2 + 5, -128] }, { kind: 'grubenlampe', pos: [-25, Y2 + 5.4, -137] },
      { kind: 'grubenlampe', pos: [6.8, Y2 + 17, -121.5] },
      { kind: 'kristalle', pos: [-25.5, Y2, -128], n: 5, size: 1.2 },
    ] },
    // ============================================================ 4 Boost-Feld
    isl(-5, 5, -141, -158, Y3, 7),
    { type: 'ramp', pos: [0, Y3, -146.6], size: [10, Y2 - Y3, 11.2], axis: 'z', dir: 1 },
    rock(-9, -5, -141, -158, Y2 + 7, 14), rock(5, 9, -141, -158, Y2 + 7, 14),
    { type: 'boost', pos: [0, Y2, -142.6], dir: [0, -1], size: [2.4, 2.4] },
    { type: 'boost', pos: [0, Y3, -153.8], dir: [0, -1], size: [2.4, 2.4] },
    { type: 'boost', pos: [0, Y3, -156.8], dir: [0, -1], size: [2.4, 2.4] },
    sign(-3.6, Y2, -141.6, 'Boost – und springen!', { size: [2.4, 0.8] }),
    isl(-5, 5, -158, -172, Y3 - 4, 4, { under: 2 }),                       // Grube (weich)
    { type: 'stairs', pos: [3.4, Y3 - 4, -162], dir: '+z', steps: 4, rise: 1, run: 1, width: 3, style: 'stone' },
    rock(-9, -5, -158, -172, Y3 + 3, 10), rock(5, 9, -158, -172, Y3 + 3, 10),
    isl(-8, 8, -172, -196, Y4, 6),                                         // Landesims
    rock(-12, -8, -172, -197, Y4 + 8, 12), rock(8, 12, -172, -197, Y4 + 8, 12),
    rock(4.6, 7.6, -190.4, -193.6, Y4 + 1.2, 3),                           // Sockel der Feuer-Schnappblume
    { type: 'pipe', id: 'roehre_ausgang', pos: [0, Y4, -193.4], height: 2, target: 'roehre_ziel' },
    sign(-3.2, Y4, -190.4, 'Ausgang ↑', { size: [2.0, 0.8] }),
    { type: 'deco_w5', items: [
      { kind: 'grubenlampe', pos: [-4.6, Y2 + 4.4, -148] }, { kind: 'grubenlampe', pos: [4.6, Y2 + 4.4, -154] },
      { kind: 'grubenbalken', pos: [0, Y4, -176], width: 15.6, height: 6.5, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenlampe', pos: [-7.6, Y4 + 5, -186] }, { kind: 'grubenlampe', pos: [7.6, Y4 + 5, -182] },
      { kind: 'grubenlampe', pos: [0, Y3 - 0.6, -165] },
    ] },
    // ============================================================ 5 Ausgang
    isl(-8, 8, -205, -227, YG, 6),
    rock(-12, -8, -203, -228, YG + 8, 12), rock(8, 12, -203, -228, YG + 8, 12), rock(-12, 12, -227, -230, YG + 9, 12),
    { type: 'pipe', id: 'roehre_ziel', pos: [-3, YG, -208.6], height: 1.4 },
    sign(4.2, YG, -208.6, 'Glück auf!', { size: [2.2, 0.9] }),
    { type: 'deco_w5', items: [
      { kind: 'grubenbalken', pos: [0, YG, -213], width: 15.6, height: 6.5, yaw: Math.PI / 2, lamp: true },
      { kind: 'grubenlampe', pos: [-7.6, YG + 5, -222] }, { kind: 'grubenlampe', pos: [7.6, YG + 5, -218] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.2, Y1 + 2.4, -3], content: 'krallen' },
    { kind: 'coinblock', pos: [0, Y1 + 2.4, -3], count: 6 },
    { kind: 'brick', pos: [2.2, Y1 + 2.4, -3], content: 'coin' },
    { kind: 'hidden', pos: [-1.4, Y1 + 3.2, -62.6], content: 'oneup' },
    { kind: 'question', pos: [2.4, Y1 + 2.4, -88.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-3, Y2 + 2.4, -104.4], content: 'funken' },
    { kind: 'coinblock', pos: [-1.6, Y2 + 2.4, -104.4], count: 6 },
    { kind: 'question', pos: [0, Y4 + 2.4, -175.6], content: 'stern' },
  ],
  enemies: [
    // Schnappblumen (5)
    { kind: 'schnappblume', id: 'sb1', pos: [-4.6, Y1, -10.6], yaw: 0 },
    { kind: 'schnappblume', id: 'sb2', pos: [4.6, Y1, -15.4], yaw: Math.PI },
    { kind: 'schnappblume', id: 'sb3', pos: [2.4, Y1, -64.6], yaw: Math.PI / 2 },
    { kind: 'schnappblume', id: 'sb4', pos: [6.6, Y2, -133.4], yaw: Math.PI },
    { kind: 'schnappblume', id: 'sb5', pos: [-6, Y4, -177], yaw: 0 },
    // Feuer-Schnappblumen (2)
    { kind: 'feuer_schnappblume', id: 'fs1', pos: [-7, Y1 + 1.2, -63], range: 9, pause: 1.8 },
    { kind: 'feuer_schnappblume', id: 'fs2', pos: [6.1, Y4 + 1.2, -192], range: 9, pause: 1.8 },
    // Zündköpfe (3) und Nachschub (2 Röhren)
    { kind: 'zuendkopf', id: 'zk1', pos: [2.6, Y1, -18.6], sight: 7 },
    { kind: 'zuendkopf', id: 'zk2', pos: [-3.2, Y1, -22.4], sight: 7 },
    { kind: 'zuendkopf', id: 'zk3', pos: [-5, Y4, -187], sight: 7 },
    { kind: 'zuendkopf', id: 'zk_quelle1', pos: [1.4, Y1 + 1.3, -86.2], vel: [0, 5.5, 1.6], behavior: 'walk', trigger: 0, path: [[-2.4, Y1, -83.2], [2.4, Y1, -83.2]], spawner: { every: 5, max: 1, first: 1, range: 16 } },
    { kind: 'zuendkopf', id: 'zk_quelle2', pos: [-7.6, Y2 + 1.3, -125.6], vel: [0, 5.5, -1.6], behavior: 'walk', trigger: 0, path: [[-7.8, Y2, -127.6], [-7.8, Y2, -135.4]], spawner: { every: 5, max: 1, first: 1, range: 16 } },
    // Pilzlingstürme (4)
    { kind: 'pilzlingsturm', id: 't1', pos: [3, Y1, -38], count: 3 },
    { kind: 'pilzlingsturm', id: 't2', pos: [3, Y2, -125], count: 4 },
    { kind: 'pilzlingsturm', id: 't3', pos: [-3, Y4, -183], count: 4 },
    { kind: 'pilzlingsturm', id: 't4', pos: [3.6, Y4, -188], count: 5 },
  ],
  items: [
    // POW-Blöcke (5) und lila Ziegelwände
    { kind: 'pow', id: 'pow_tor', pos: [0, Y1, -24], radius: 6, height: 5 },
    { kind: 'lila_ziegelwand', id: 'tor', pos: [0, Y1, -28.5], size: [4, 4, 1], content: 'coin' },
    { kind: 'pow', id: 'pow_sims', pos: [-4, Y1, -35], radius: 5.5 },
    { kind: 'pow', id: 'pow_stern', pos: [0, Y1, -77], radius: 7, height: 3.5 },
    { kind: 'lila_ziegelwand', id: 'wand_stern', pos: [-5, Y1, -79.4], size: [3, 4, 1] },
    { kind: 'pow', id: 'pow_halle', pos: [1, Y2, -120], radius: 6 },
    { kind: 'pow', id: 'pow_lande', pos: [0, Y4, -179.6], radius: 7 },
    // Hasen auf der Glühpilz-Wiese
    { kind: 'bunny', id: 'hase_stern', pos: [-6.2, Y2, -116], reward: starAtBunny, area: { pos: [-5.8, Y2, -118.2], r: 3.6 }, alert: 5 },
    { kind: 'bunny', id: 'hase_leben', pos: [-5, Y2, -121.6], area: { pos: [-5.8, Y2, -118.2], r: 3.6 }, alert: 5 },
    // Münzen
    line([0, Y1 + 0.6, 1], [0, Y1 + 0.6, -6], 5),
    ring([0, Y1 + 0.7, -24], 2.2, 8),
    line([0, Y1 + 0.6, -31], [0, Y1 + 0.6, -42], 6),
    ...arc([0, Y1 + 0.6, -44.6], [0, Y1 + 0.6, -46.8], 3, 1.2),
    ring([0, Y1 + 0.7, -63], 2.2, 8),
    ...arc([0, Y1 + 0.8, -66.6], [0, Y1 + 0.8, -73.6], 6, 2),
    ring([-11, Y1 + 9.6, -84.6], 1.4, 6),
    line([-3, Y2 + 0.6, -108], [3, Y2 + 0.6, -108], 4),
    ring([6.8, Y2 + 13.6, -121.8], 3.4, 10),
    line([0, Y3 + 0.8, -152], [0, Y3 + 0.8, -157.5], 4),
    ...arc([0, Y3 + 1.2, -159], [0, Y4 + 1, -172.5], 9, 3.4),
    line([-3, Y3 - 3.4, -164], [-3, Y3 - 3.4, -170], 4),
    ring([0, Y4 + 0.7, -186], 2.4, 8),
    ring([-24.8, Y2 + 0.6, -131.5], 2.2, 8),
    line([-19, Y2 + 0.6, -131.5], [-12, Y2 + 0.6, -131.5], 5),
    line([-4, YG + 0.6, -212], [4, YG + 0.6, -212], 5),
  ],
  checkpoint: [0, Y2, -107],
  stars: [
    [-11, Y1 + 9.4, -86.2],
    { pos: [-5.8, Y2 + 0.9, -118.2], hidden: true, id: 'stern1' },
    { pos: [6.8, Y2 + 14.2, -121.8], hidden: true, id: 'stern2' },
  ],
  stamp: [-25.4, Y2 + 0.5, -131.5],
  goal: [0, YG, -220.5],
  marks: {
    pow: [0, Y1, -24], tor: [0, Y1, -28.5], lore1: [0, Y1, -47.2], insel: [0, Y1, -63], lore2: [0, Y1, -70], simsB: [0, Y1, -76],
    wandStern: [-5, Y1, -79.4], roehreHalle: [5, Y1, -82.6], halle: [0, Y2, -104], kanone: [7, Y2, -110], wiese: [-5.8, Y2, -118.2],
    risswand: [-10.5, Y2, -131.5], boost: [0, Y2, -142.6], grube: [0, Y3 - 4, -165], lande: [0, Y4, -176], ausgang: [0, Y4, -193.4],
    ziel: [0, YG, -220.5],
  },
};
