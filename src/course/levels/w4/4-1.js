// 4-1 „Kribbelkrabbel-Schlucht“ – Abendrot-Canyon voller Ameisensoldaten (Welt 4, Bauplan: Detail 4-1). Kernidee:
// Ameisen marschieren über Böden und **Wände** und tragen die Figur mit (Ameisenpfade, Präzisierung Gegner Welt 4);
// riesige Ameisen kommen endlos aus einer Höhle und dienen als Laufuntergrund über dem Stachelfeld. Parcours nach −Z,
// ≈ 250 m, Thema canyon, Musik course_canyon, 400 s.
//
// Abschnitte (Y = 1 Bodenhöhe, +X = rechts im Bild):
//   1  Wüstenstart     z  12 … −30   Sandplateau mit Ameisenhügeln (Kolonne marschiert um den großen Hügel), Lagerfeuer
//                                    der Ameisen (drei tanzen ums Feuer, Zelte, Kochtopf), Kakteen mit Blüten, Geier auf
//                                    Felsnadeln, Kuhschädel, Steppenläufer, Gecko; ?-Block mit Funkenblüte; niedriger
//                                    Felsblock, über den zwei Ameisen laufen (harmlose Einführung); Kolonne quer zum Weg.
//   2  Ameisenhöhle    z −30 … −98   Spalte mit Felsbögen (dunkle Höhlen-Stimmung, Leuchtkristalle, Tropfsteine, Fackeln):
//                                    Einführungsblock → **Ameisenwand** (6,4 m, nur auf dem Rücken einer Ameise zu
//                                    überwinden) → **Stempelturm** (10,5 m, Ameisen tragen hinauf, Stempel darüber) →
//                                    **Schlucht** (14 m): Ameisen laufen waagerecht an den Seitenwänden und tragen über
//                                    den Abgrund → Kolonne → Ausgang.
//   3  Hörnerreihen    z −98 … −158  gleich nach der Höhle links die Kletterwand (Krallen-Anzug aus dem ?-Block) zum Sims
//                                    mit **Stern 0**; Checkpoint; Reihen von Hörner-Ameisen (nicht von oben!), dazwischen
//                                    ein Wall mit gewöhnlichen Ameisen, **Funkelstern** auf einer Plattform, zuletzt zwei
//                                    niedrige Mauern mit Hörner-Ameisen.
//   4  Stachelfeld     z −158 … −214 Stachelboden; aus der Höhle rechts kommen endlos Riesenameisen und tragen auf ihrem
//                                    Lastdeck über die Stacheln zur Höhle links. Mitten im Feld eine Felsinsel mit
//                                    **Röhre in den Ameisenraum** (Stern 1 auf dem Vorratsturm, Ameisen tragen hinauf);
//                                    am Ende des Felds die Felssäule mit **Stern 2** (vom Deck aus springen).
//   5  Zielbereich     z −214 … −256 Endsims mit Zielröhre → Zieltafel (Tafelberg-Kuppe, Ameisen-Wimpel, Zielmast).
// Geheimnisse: Extraleben im unsichtbaren Block über dem großen Ameisenhügel am Start. Ameisenraum (x ≈ 70) nur durch
// die Röhre auf der Felsinsel; Rückweg über eine Röhre aufs Endsims.
// Gegner: Ameisensoldat 41, Hörner-Ameisensoldat 23, Riesenameise (endlos, Strom).

import { islandParts, merge, addStatic } from '../../blocks/kit.js';
import {
  isl, rock, wallBox, line, ring, arc, column, levelSetupLate, cullStatic, antOver, antWallLane, antLoop, areaMoods, campfire,
  vultures, cacti, skulls, antFlags, stalactites, glowCrystals, antPantry, tumbleweed, lizard, beetle, fernAus, cullInstances,
  spikeField, chunkBackdrop, xrayWalls, pebbles, tufts, cracks, wallHoles, roots, bunting, heroShadowDiet, rockLids,
} from './_helpers_a.js';

const Y = 1;
const CAM = { pitch: 44, dist: 13, fov: 40 };

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M41 = {
  B0: { pos: [4, Y, -15], size: [3, 1.6, 2] },             // Einführungs-Felsblock (Start)
  B1: { pos: [0, Y, -41.5], size: [4, 1.8, 2] },           // Einführungsblock in der Höhle
  W1: { pos: [0, Y, -50], size: [14, 6.4, 2] },            // Ameisenwand (Vorderseite z −49, Rückseite −51)
  TOWER: { pos: [4.5, Y, -58.5], size: [3, 10.5, 2] },     // Stempelturm (Vorderseite −57,5)
  CHASM: { z0: -62, z1: -76 },                             // Schlucht in der Höhle
  LEDGE: { x0: -12, x1: -6.5, z0: -103, z1: -110, top: Y + 7.2 },   // Sims mit Stern 0
  PIT: { z0: -158, z1: -214, floor: Y - 1 },                // Stachelfeld
  ISLE: { x0: -7.6, x1: -4.6, z0: -180, z1: -184, top: Y + 0.4 },   // Felsinsel mit Röhre
  PILLAR: { x0: 2.6, x1: 4.2, z0: -200.7, z1: -202.3, top: Y + 2.6 },   // Säule mit Stern 2
  ROOM: { x0: 60, x1: 80, z0: -176, z1: -196 },             // Ameisenraum
  STORE: { pos: [70, Y, -188.5], size: [4, 6.2, 3] },      // Vorratsturm im Ameisenraum
  MESA: { top: Y + 5 },                                     // Zieltafel
};
const { B0, B1, W1, TOWER, CHASM, LEDGE, PIT, ISLE, PILLAR, ROOM, STORE, MESA } = M41;

// Riesenameisen-Strom (Höhle rechts → Höhle links)
const GY = PIT.floor;
export const GIANT_PATH = [
  [9.6, GY, -160.6], [4.6, GY, -160.6], [1.6, GY, -163.6], [0.4, GY, -170], [-2.6, GY, -177.6], [-2.6, GY, -185.2], [0.2, GY, -193],
  [1.2, GY, -200.6], [-0.6, GY, -207.6], [-3.6, GY, -211.4], [-9.8, GY, -211.4],
];

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 0.95], yaw: o.yaw ?? 0 });
/** Ameisenstraße am Boden (Baustein ameisenweg mit Spur): data = Liste oder { loop, path }. */
const trail = (id, data, color = 0x6a3a22) => ({ type: 'ameisenweg', id, path: data.path ?? data, loop: !!data.loop, color, every: 0.36 });
const LOOPS = {
  huegel: { loop: true, path: [[-10.2, Y, 3.2], [-3.8, Y, 3.2], [-3.8, Y, -3.2], [-10.2, Y, -3.2]] },
  feuer: { loop: true, path: [[8.2, Y, 4.2], [7.7, Y, 2.9], [6.4, Y, 2.4], [5.1, Y, 2.9], [4.6, Y, 4.2], [5.1, Y, 5.5], [6.4, Y, 6], [7.7, Y, 5.5]] },
  quer1: antLoop(-9, 9, -22.4, Y, 1.2),
  kolonne: antLoop(-6, 6, -84.4, Y, 1.2),
  h1: antLoop(-8, 8, -117.4, Y, 1.2),
  wall: antLoop(-8, 8, -124.4, Y + 0.6, 1.2),
  h3: antLoop(-8, 8, -136.4, Y, 1.2),
  h_platz: { loop: true, path: [[3.4, Y, -128.4], [9.6, Y, -128.4], [9.6, Y, -134.4], [3.4, Y, -134.4]] },
  jubel: { loop: true, path: [[10.8, MESA.top, -236], [10.8, MESA.top, -240], [6, MESA.top, -240], [6, MESA.top, -236]] },
};
const wayOver = (box, at, phase = 0, o = {}) => ({ kind: 'ameisensoldat', antpath: antOver(box.pos, box.size, at, o.from ?? 2.5, o.to ?? 2.5), speed: o.speed ?? 1.5, phase, ...o.extra });

/**
 * Grund der Höhlenschlucht (nur Kulisse, ohne Kollision – wer hineinfällt, stürzt unter killY): dunkler Fels mit
 * Tropfsteinen und ein paar Leuchtpilzen tief unten, damit die Schlucht tief und gefährlich wirkt.
 */
function bakeChasm(level) {
  const v = level.view;
  if (!v) return;
  const y = Y - 10.5;
  const parts = islandParts(-7, y - 1, CHASM.z0, 7, y, CHASM.z1, { ...v.theme, dirt: 0x3a1e18, dirtDeep: 0x1e0e0c }, { top: 'none', under: 0 });
  addStatic(level, merge(parts), { castShadow: false });
  stalactites(level, [[-4, y, -64, 2.6, 0.6], [2.6, y, -67, 3.4, 0.7], [-1, y, -71, 2, 0.5], [4.4, y, -73.4, 2.8, 0.6], [-5, y, -74.6, 3.2, 0.7]]);
  glowCrystals(level, [[0.6, y, -65.4, 1.4, 0x7ae8ff], [-3, y, -69.6, 1.1, 0xd88aff], [3.6, y, -71.6, 1.2, 0x9aff6a]]);
}

const LID = { top: 0xd89a68, side: 0xb4643e };   // Sandstein-Oberseite der Felsen

/** Level-Haken: Kulisse, Stimmungen, sparsame Darstellung. */
function setup(level) {
  // ---------------- Höhlen-Stimmung (dunkel, warmes Fackellicht) – Höhle und Ameisenraum
  areaMoods(level, {
    hoehle: { fog: { color: 0x3c2430, near: 16, far: 92 }, background: 0x2a1822, hemi: { sky: 0xd09a84, ground: 0x4a2418, intensity: 0.82 }, sun: { color: 0xffb47a, intensity: 1.5 }, dome: 0x6a4a5a },
    raum: { fog: { color: 0x3a2228, near: 14, far: 70 }, background: 0x2a1820, hemi: { sky: 0xe0aa8a, ground: 0x5a2a1a, intensity: 0.9 }, sun: { color: 0xffc08a, intensity: 1.4 }, dome: 0x6a4a50 },
  }, [
    { min: [-14, -97], max: [14, -35], mood: 'hoehle' },
    { min: [50, -205], max: [92, -168], mood: 'raum' },
  ]);

  // ---------------- 1 Wüstenstart
  campfire(level, 6.4, Y, 4.2, { tents: [[2.6, -1.4, 0.7], [-2.4, -1.8, -0.4]] });
  cacti(level, [
    { pos: [-9.4, Y, 8.6], variant: 'saeule', size: 1.15, yaw: 0.4 }, { pos: [9.8, Y, -3.8], variant: 'kugel', size: 1.1 },
    { pos: [10.2, Y, -2.6], variant: 'kugel', size: 0.8 }, { pos: [-9.6, Y, -12.4], variant: 'feige', size: 1 },
    { pos: [9.6, Y, -19.6], variant: 'gruppe', size: 1.1 }, { pos: [-9.8, Y, -25.6], variant: 'saeule', size: 0.95, yaw: 2 },
    { pos: [3.2, Y, 10.4], variant: 'kugel', size: 0.9 }, { pos: [-2.6, Y, -27.6], variant: 'kugel', size: 0.75 },
    // Zielbereich
    { pos: [-9.6, MESA.top, -236], variant: 'saeule', size: 1.1 }, { pos: [9.8, MESA.top, -244], variant: 'feige', size: 1 },
    { pos: [8.8, MESA.top, -252.6], variant: 'kugel', size: 0.9 }, { pos: [-8.6, MESA.top, -250], variant: 'gruppe', size: 1 },
    // Hörnerreihen-Rand
    { pos: [-10.6, Y, -114.6], variant: 'kugel', size: 0.85 }, { pos: [10, Y, -128.4], variant: 'saeule', size: 1 }, { pos: [-10.4, Y, -146], variant: 'feige', size: 0.9 },
    // Endsims
    { pos: [-8.6, Y, -215.2], variant: 'saeule', size: 0.9, yaw: 1 }, { pos: [8.4, Y, -215.6], variant: 'kugel', size: 0.8 },
    { pos: [8.9, Y, -216.4], variant: 'kugel', size: 0.6 }, { pos: [-2.8, Y, -223.2], variant: 'feige', size: 0.7 },
    // Zieltafel: zweite Reihe
    { pos: [-6.2, MESA.top, -256.4], variant: 'kugel', size: 0.8 }, { pos: [6.4, MESA.top, -233.4], variant: 'saeule', size: 0.85, yaw: 2.4 },
  ]);
  skulls(level, [[-3.8, Y, 7.2, 0.7], [9.2, Y, -150.4, 2.2]]);
  vultures(level, [[-13.3, Y + 6.2, -7.4, 0.4, 1.1], [13.4, Y + 7.4, -21.4, Math.PI - 0.4, 1], [12.6, Y + 9.2, -151, Math.PI - 0.3, 1.2], [-13, MESA.top + 6.2, -241, 0.3, 1]]);
  antFlags(level, [[-7, Y + 1.8, 0.2, 0.4, 1.6], [7.6, Y + 1.3, -11.6, 2.2, 1.4], [-4.6, MESA.top, -247.6, 0.3, 2.4], [4.6, MESA.top, -247.6, 2.8, 2.4],
    [-1.6, Y, -217.4, 0.6, 1.4], [8.4, MESA.top + 1.6, -238, 1.2, 1.5]]);
  skulls(level, [[-8.8, MESA.top, -246.4, 1.4], [5.6, Y, -223, 2.6]]);
  tumbleweed(level, [-11, Y, -5], [11, Y, -9], { speed: 3, pause: 5 });
  tumbleweed(level, [11, Y, -125], [-11, Y, -121], { speed: 3.4, pause: 7, phase: 3 });
  lizard(level, [11.02, Y + 2.6, -27], { normal: [-1, 0, 0], dir: [0, 1, 0.3], near: 34 });
  lizard(level, [-6.48, Y + 3.2, -104.8], { normal: [1, 0, 0], dir: [0, 1, -0.2], near: 30, color: 0xe86a3a });
  beetle(level, [-6.6, Y, -18], [-3.6, Y, -21.4]);

  // ---------------- 2 Höhle: Tropfsteine, Kristalle
  stalactites(level, [
    [-6.4, Y + 10, -38, -2.2, 0.5], [6.2, Y + 10, -44, -3, 0.6], [-6.6, Y + 10, -54, -2.6, 0.5], [6.5, Y + 10, -66, -3.4, 0.7],
    [-6.5, Y + 10, -72, -2.4, 0.5], [6.4, Y + 10, -82, -2.8, 0.6], [-6.4, Y + 10, -90, -2, 0.45],
    [-6.2, Y, -44.6, 1.2, 0.4], [6.2, Y, -39, 0.9, 0.35], [-6.1, Y, -80, 1.4, 0.45], [6.2, Y, -92.6, 1, 0.35], [-5.8, Y, -94.4, 0.7, 0.3],
  ]);
  glowCrystals(level, [
    [-6.3, Y, -46.6, 1.1, 0x7ae8ff], [6.2, Y, -53, 1.3, 0xd88aff], [-6.4, Y + 3.8, -60.6, 0.9, 0xffa86a, 0.6], [6.3, Y, -88, 1.2, 0x7ae8ff],
    [-6.3, Y, -86, 0.9, 0xd88aff], [1.6, TOWER.pos[1] + TOWER.size[1], -59.4, 0.7, 0xffe07a],
    // Ameisenraum
    [61, Y, -194.6, 1.3, 0x7ae8ff], [79, Y, -194.4, 1.1, 0xd88aff], [60.8, Y, -178, 0.9, 0xffe07a],
  ]);

  // ---------------- 4 Ameisenraum: Vorratskammer
  antPantry(level, {
    sugar: [[63, Y, -192.6, 0.7, 0.3], [63.8, Y, -193.4, 0.6, 0.9], [63.4, Y + 0.7, -192.9, 0.55, 0.5], [77, Y, -191.4, 0.65, 0.2], [76.4, Y, -192.6, 0.5, 1.1]],
    crumbs: [[66, Y, -193.4, 0.5], [74.4, Y, -194, 0.45], [73.4, Y, -193.2, 0.3], [62.6, Y, -186, 0.35], [78, Y, -186.4, 0.4]],
    leaves: [[66.6, Y, -184, 0.9, 0.6], [74.6, Y, -184.4, 0.8, 2.2], [69.4, Y, -194.2, 0.7, 1.3]],
    eggs: [[62.8, Y, -189, 7], [77.6, Y, -188.4, 6], [70, Y, -180.6, 4]],
  });

  // ---------------- Felsdeckel: Höhlenboden, Felsblöcke und -wände bekommen eine Oberseite aus Sandstein
  rockLids(level, LID);
  // ---------------- hohe Felsblöcke im Weg: Kamera bleibt auf Abstand, Block wird durchscheinend, wenn er die Figur verdeckt
  xrayWalls(level, [
    { id: 'wand_w1', pos: W1.pos, size: W1.size },
    { id: 'wand_turm', pos: TOWER.pos, size: TOWER.size },
    { id: 'wand_vorrat', pos: STORE.pos, size: STORE.size },
  ], { lid: LID });
  // ---------------- Boden-Details: Kiesel, trockenes Gras, Risse
  pebbles(level, [
    { pos: [0, Y, -9], size: [20, 38], n: 70, seed: 3, avoid: [[-7, 0, 2.2], [6.4, 4.2, 2.2], [0, -3, 1.4]] },
    { pos: [0, Y, -128], size: [20, 56], n: 60, seed: 7 },
    { pos: [0, MESA.top, -245], size: [22, 24], n: 40, seed: 11, avoid: [[0, -251, 1.6], [0, -236, 1.6]] },
    { pos: [0, Y, -217], size: [18, 7], n: 16, seed: 13 },
    { pos: [70, Y, -186], size: [18, 18], n: 26, seed: 17, colors: [0x6a3a28, 0x8a5a3a, 0x4a2a1a] },
    // Höhlenboden
    { pos: [0, Y, -42.5], size: [13, 12], n: 18, seed: 21, colors: [0x6a3a28, 0x8a5a3a, 0x4a2a1a], avoid: [[0, -41.5, 2.6], [-4.8, -44.2, 1.4]] },
    { pos: [0, Y, -56], size: [13, 9], n: 14, seed: 23, colors: [0x6a3a28, 0x8a5a3a, 0x4a2a1a], avoid: [[4.5, -58.5, 2.4], [-3.6, -60.6, 1.2]] },
    { pos: [0, Y, -87], size: [13, 20], n: 26, seed: 25, colors: [0x6a3a28, 0x8a5a3a, 0x4a2a1a] },
  ]);
  tufts(level, [
    { pos: [0, Y, -10], size: [21, 38], n: 26, seed: 5, avoid: [[-7, 0, 2.4], [6.4, 4.2, 2.6], [0, 8, 2]] },
    { pos: [0, Y, -128], size: [21, 56], n: 30, seed: 9, color: 0x8aaa3a, tip: 0xd8e88a },
    { pos: [0, Y, -219], size: [19, 9], n: 14, seed: 19, color: 0x8aaa3a, tip: 0xd8e88a, avoid: [[3.2, -219.6, 1.4], [-6.6, -219.4, 1.4], [0.6, -217.2, 1.2]] },
    { pos: [0, MESA.top, -245], size: [22, 24], n: 16, seed: 15, avoid: [[0, -251, 1.6], [0, -236, 1.6]] },
  ]);
  cracks(level, [[-4, Y, 6, 2.4, 0.4], [3.6, Y, -6.6, 2, 2.1], [-6, Y, -24, 2.8, -0.3], [5.2, Y, -29, 1.8, 1.2], [-2.6, MESA.top, -244, 2.6, 0.8], [5, MESA.top, -254, 2, 2.6], [2, Y, -219, 2.2, 0.2],
    [-3.6, Y, -38.6, 2.2, 0.6], [2.8, Y, -55.4, 1.8, 2.2], [-2.2, Y, -86, 2.6, 1.1], [3.4, Y, -93, 2, 0.3]]);
  // ---------------- Höhle: Gänge in den Wänden, Wurzeln, Grund der Schlucht (nur Kulisse – wer fällt, stürzt ab)
  wallHoles(level, [
    [-6.98, Y + 1.2, -41, 1, 0, 1.1, 0.8], [6.98, Y + 0.9, -53, -1, 0, 1, 0.7], [-6.98, Y + 4.6, -66, 1, 0, 0.9, 0.7], [6.98, Y + 5.2, -71, -1, 0, 1.2, 0.9],
    [-6.98, Y + 1, -88, 1, 0, 1.2, 0.8], [6.98, Y + 1.4, -92, -1, 0, 0.9, 0.7],
    [-4, Y + 2.6, ROOM.z1 + 0.02, 0, 1, 1.4, 1], [66, Y + 1, ROOM.z1 + 0.02, 0, 1, 1.2, 0.9], [74.6, Y + 3.6, ROOM.z1 + 0.02, 0, 1, 1, 0.8],
    [ROOM.x0 + 0.02, Y + 1.6, -183, 1, 0, 1, 0.8], [ROOM.x1 - 0.02, Y + 1.2, -191, -1, 0, 1.2, 0.9], [ROOM.x1 - 0.02, Y + 4.2, -181, -1, 0, 0.9, 0.7],
    [10.02, Y - 0.2, -186, -1, 0, 1.2, 0.8], [-9.98, Y - 0.2, -172, 1, 0, 1, 0.7], [-9.98, Y + 2.2, -198, 1, 0, 1.1, 0.8],
  ]);
  roots(level, [[-6.8, Y + 10, -48, 2.4, 3], [6.8, Y + 10, -60, 3, 4], [-6.8, Y + 10, -76, 2.6, 3], [6.8, Y + 10, -87, 2.2, 3],
    [64, Y + 7, ROOM.z1 + 0.2, 2.2, 3], [76, Y + 7, ROOM.z1 + 0.2, 2.8, 4]]);
  bakeChasm(level);
  // ---------------- Zielbereich: Wimpelketten
  bunting(level, [-4.6, MESA.top + 2.35, -247.6], [4.6, MESA.top + 2.35, -247.6], 12, 0.5);
  bunting(level, [-7, Y + 1.7, 0.2], [-3.2, Y + 2.6, 7.8], 7, 0.3);

  // ---------------- 4 Stachelfeld (Kollision wie stachelboden, sparsame Spitzen)
  spikeField(level, [0, PIT.floor, (PIT.z0 + PIT.z1) / 2], [20, 0.25, PIT.z0 - PIT.z1]);

  // ---------------- Budget: Instanz-Gruppen nur nahe und im Bild; ferne Abschnitte aus
  cullInstances(level, {
    'instanzen:ameisensoldat': { far: 34, radius: 1.2, shadowNear: 14 },
    'instanzen:ameisensoldat_horn': { far: 34, radius: 1.2, shadowNear: 14 },
    'instanzen:riesenameise': { far: 44, radius: 3, shadowNear: 18 },
    coin: { far: 40, radius: 0.8, shadow: false },
  });
  chunkBackdrop(level, { far: 260, chunk: 64 });
  heroShadowDiet(level, 0.16);
}

export const LEVEL = {
  id: '4-1',
  world: 4,
  title: 'Kribbelkrabbel-Schlucht',
  archetype: 'parcours',
  theme: 'canyon',
  music: 'course_canyon',
  timeLimit: 400,
  start: { pos: [0, Y, 8], yaw: Math.PI / 2 },
  killY: -8,
  setup: levelSetupLate(setup, (level) => {
    cullStatic(level);
    fernAus(level, 140);
  }),
  camera: [
    { ...CAM, from: 14, to: -30 },
    { ...CAM, from: -30, to: -46, pitch: 46 },
    { ...CAM, from: -46, to: -60, pitch: 45, dist: 13.5 },
    { ...CAM, from: -60, to: -78, pitch: 46, dist: 12.5 },
    { ...CAM, from: -78, to: -98, pitch: 45 },
    { ...CAM, from: -98, to: -112, pitch: 42, dist: 13.5, yaw: -6 },
    { ...CAM, from: -112, to: -158, pitch: 45 },
    { ...CAM, from: -158, to: -214, pitch: 48, dist: 13 },
    { ...CAM, from: -214, to: -226, pitch: 46 },
    { ...CAM, from: -228, to: -262, pitch: 42, dist: 13 },
    { ...CAM, from: -170, to: -200, pitch: 50, dist: 13, area: [55, 85] },
  ],
  segments: [
    // =============================================================== Kulisse (ferne Canyonwände, ohne Schatten)
    { type: 'deco_w4', shadow: false, items: [
      { kind: 'felsnadeln', pos: [-30, -6, -60], size: [12, 100], n: 6, height: [8, 16] },
      { kind: 'felsnadeln', pos: [30, -6, -150], size: [12, 120], n: 7, height: [8, 18] },
      { kind: 'tafelberg', pos: [-34, -10, -190], radius: 8, height: 14 },
      { kind: 'tafelberg', pos: [36, -10, -40], radius: 7, height: 12 },
      { kind: 'tafelberg', pos: [0, -12, -300], radius: 12, height: 16 },
    ] },

    // =============================================================== Ameisenstraßen (Spuren der Kolonnen)
    ...Object.entries(LOOPS).map(([k, d]) => trail(`weg_${k}`, d)),
    // Spuren an den Wänden: zeigen, wo Ameisen die Figur hinauf- oder hinübertragen
    ...[-4.5, 0, 4.5].map((x, i) => trail(`spur_w1_${i}`, antOver(W1.pos, W1.size, x, 2.5, 2.5), 0x4a2012)),
    ...[3.9, 5.1].map((x, i) => trail(`spur_turm_${i}`, antOver(TOWER.pos, TOWER.size, x, 2, 1.3), 0x4a2012)),
    trail('spur_faehre_l', antWallLane(-7, 1, Y + 0.45, -59.6, -78.4), 0x4a2012),
    trail('spur_faehre_r', antWallLane(7, -1, Y + 0.45, -59.6, -78.4), 0x4a2012),
    trail('spur_faehre_l2', antWallLane(-7, 1, Y + 2.8, -60, -78), 0x4a2012),
    trail('spur_faehre_r2', antWallLane(7, -1, Y + 2.8, -60, -78), 0x4a2012),
    ...[69.4, 70.6].map((x, i) => trail(`spur_vorrat_${i}`, antOver(STORE.pos, STORE.size, x, 2.4, 2), 0x4a2012)),

    // =============================================================== 1  Wüstenstart
    isl(-11, 11, 12, -30, Y, 5, { top: 'sand' }),
    sign(-4.4, Y, 9.2, 'Kribbelkrabbel-\nSchlucht', { size: [3, 1.1] }),
    { type: 'deco_w4', items: [
      { kind: 'canyonwand', from: [-14, Y, 12], to: [-14, Y, -30], height: 9, depth: 4, solid: true },
      { kind: 'canyonwand', from: [14, Y, 12], to: [14, Y, -30], height: 11, depth: 4, solid: true },
      { kind: 'ameisenhuegel', pos: [-7, Y, 0], size: 3.2 },
      { kind: 'ameisenhuegel', pos: [7.6, Y, -11.6], size: 2.2 },
      { kind: 'geroell', pos: [-8, Y, -18], size: [4, 6], n: 7 },
      { kind: 'geroell', pos: [8.6, Y, 9], size: [3, 3], n: 4 },
      { kind: 'trockenbuesche', pos: [8.6, Y, -26], size: [4, 4], n: 3 },
      { kind: 'trockenbuesche', pos: [-9, Y, 3.6], size: [3, 5], n: 3 },
    ] },
    // Felsnadeln mit Geiern (fest)
    rock(-14, -12.6, -6.7, -8.1, Y + 6.2, 6.2),
    rock(12.7, 14.1, -20.7, -22.1, Y + 7.4, 7.4),
    // Einführung: niedriger Felsblock, über den Ameisen laufen
    rock(B0.pos[0] - B0.size[0] / 2, B0.pos[0] + B0.size[0] / 2, B0.pos[2] + B0.size[2] / 2, B0.pos[2] - B0.size[2] / 2, Y + B0.size[1], B0.size[1]),
    sign(-1.6, Y, -9.6, 'Ameisen laufen\nauch an Wänden!', { size: [2.6, 0.9] }),
    // kleine Spalte (Blick hinab ins trockene Flussbett), dann Vorplatz der Höhle
    isl(-8, 8, -32.6, -36, Y, 5),

    // =============================================================== 2  Ameisenhöhle
    // Seitenwände der Spalte (Ameisen laufen an ihnen), Felsbögen am Eingang/Ausgang
    rock(-13, -7, -34, -98, Y + 10, 15),
    rock(7, 13, -34, -98, Y + 10, 15),
    { type: 'deco_w4', items: [
      { kind: 'canyonwand', from: [-13.5, Y + 10, -34], to: [-13.5, Y + 10, -98], height: 3, depth: 3 },
      { kind: 'canyonwand', from: [13.5, Y + 10, -34], to: [13.5, Y + 10, -98], height: 4, depth: 3 },
      { kind: 'fackel', pos: [-6.98, Y + 2.2, -40], yaw: 0 }, { kind: 'fackel', pos: [6.98, Y + 2.2, -46], yaw: Math.PI },
      { kind: 'fackel', pos: [-6.98, Y + 2.4, -58], yaw: 0 }, { kind: 'fackel', pos: [6.98, Y + 2.4, -80], yaw: Math.PI },
      { kind: 'fackel', pos: [-6.98, Y + 2.4, -90], yaw: 0 },
    ] },
    isl(-7, 7, -36, CHASM.z0, Y, 5, { top: 'none' }),
    isl(-7, 7, CHASM.z1, -98, Y, 5, { top: 'none' }),
    rock(B1.pos[0] - B1.size[0] / 2, B1.pos[0] + B1.size[0] / 2, B1.pos[2] + B1.size[2] / 2, B1.pos[2] - B1.size[2] / 2, Y + B1.size[1], B1.size[1]),
    sign(-4.8, Y, -44.2, 'Spring auf eine\nAmeise an der Wand!', { size: [2.8, 0.9] }),
    sign(-3.6, Y, -60.6, 'Ameisen-Fähre', { size: [2.2, 0.75] }),

    // =============================================================== 3  Hörnerreihen (mit Stern-Sims)
    isl(-12, 11, -98, -158, Y, 5),
    rock(LEDGE.x0, LEDGE.x1, LEDGE.z0, LEDGE.z1, LEDGE.top, LEDGE.top - Y),
    wallBox(LEDGE.x0 + 0.5, LEDGE.x1, LEDGE.z0 + 0.4, LEDGE.z0, Y, LEDGE.top - Y, { climbable: true }),
    sign(-4.4, Y, -103.8, 'Krallen\nkratzen!', { size: [1.8, 0.8] }),
    sign(4.8, Y, -113.4, 'Achtung,\nHörner!', { size: [2, 0.8] }),
    rock(-9, 9, -123.4, -126.6, Y + 0.6, 0.6),
    rock(4.5, 8.5, -129.4, -133.4, Y + 2.4, 2.4),
    rock(2.6, 4.5, -130.4, -132.4, Y + 1.2, 1.2),
    rock(-9, 9, -143, -144, Y + 1.5, 1.5),
    rock(-9, 9, -150, -151, Y + 1.5, 1.5),
    { type: 'deco_w4', items: [
      { kind: 'canyonwand', from: [-15, Y, -112], to: [-15, Y, -158], height: 10, depth: 4, solid: true },
      { kind: 'canyonwand', from: [14, Y, -100], to: [14, Y, -158], height: 12, depth: 4, solid: true },
      { kind: 'ameisenhuegel', pos: [-9.6, Y, -132], size: 2.4 },
      { kind: 'ameisenhuegel', pos: [9.6, Y, -138.6], size: 2.8 },
      { kind: 'trockenbuesche', pos: [-9.6, Y, -120], size: [3, 4], n: 3 },
      { kind: 'geroell', pos: [9, Y, -118], size: [3, 5], n: 5 },
      { kind: 'geroell', pos: [-9.4, Y, -154], size: [3, 5], n: 5 },
    ] },
    rock(11.6, 13.4, -150.1, -151.9, Y + 9.2, 9.2),

    // =============================================================== 4  Stachelfeld
    rock(-10, 10, PIT.z0, PIT.z1, PIT.floor, 4),
    rock(-14, -10, -156, -216, Y + 8, 12),
    rock(10, 14, -156, -216, Y + 8, 12),
    { type: 'deco_w4', items: [
      { kind: 'ameisenhoehle', pos: [10, GY, -160.6], width: 3.8, height: 3.2, yaw: Math.PI },
      { kind: 'ameisenhoehle', pos: [-10, GY, -211.4], width: 3.8, height: 3.2, yaw: 0 },
      { kind: 'fackel', pos: [9.98, Y + 2.6, -163.4], yaw: Math.PI }, { kind: 'fackel', pos: [-9.98, Y + 2.6, -208.6], yaw: 0 },
    ] },
    sign(-3.6, Y, -153.6, 'Reite die\nRiesenameisen!', { size: [2.4, 0.9] }),
    rock(ISLE.x0, ISLE.x1, ISLE.z0, ISLE.z1, ISLE.top, 2.4),
    { type: 'pipe', id: 'p_raum_ein', pos: [(ISLE.x0 + ISLE.x1) / 2, ISLE.top, (ISLE.z0 + ISLE.z1) / 2], height: 1.2, target: 'p_raum' },
    rock(PILLAR.x0, PILLAR.x1, PILLAR.z0, PILLAR.z1, PILLAR.top, PILLAR.top - PIT.floor),

    // =============================================================== 5  Zielbereich
    isl(-10, 10, -214, -224, Y, 5),
    { type: 'pipe', id: 'p_ziel', pos: [3.2, Y, -219.6], height: 1.4, target: 'p_ziel_aus' },
    { type: 'pipe', id: 'p_raum_aus', pos: [-6.6, Y, -219.4], height: 1.2 },
    sign(0.6, Y, -217.2, 'Zum Ziel', { size: [1.8, 0.7] }),
    { type: 'deco_w4', items: [
      { kind: 'trockenbuesche', pos: [-6.4, Y, -222.4], size: [5, 2], n: 3 },
      { kind: 'geroell', pos: [7.6, Y, -222.6], size: [4, 2], n: 5 },
    ] },
    isl(-12, 12, -232, -258, MESA.top, 9, { top: 'sand' }),
    { type: 'pipe', id: 'p_ziel_aus', pos: [0, MESA.top, -236], height: 1.2 },
    { type: 'deco_w4', items: [
      { kind: 'ameisenhuegel', pos: [8.4, MESA.top, -238], size: 3 },
      { kind: 'canyonwand', from: [-15, MESA.top, -232], to: [-15, MESA.top, -258], height: 8, depth: 4, solid: true },
      { kind: 'canyonwand', from: [15, MESA.top, -232], to: [15, MESA.top, -258], height: 9, depth: 4, solid: true },
      { kind: 'trockenbuesche', pos: [-8, MESA.top, -254], size: [4, 4], n: 3 },
      { kind: 'geroell', pos: [7, MESA.top, -255], size: [5, 3], n: 6 },
      { kind: 'felsnadel', pos: [-10.6, MESA.top, -256.4], height: 6.5, size: 1.4 },
      { kind: 'felsnadel', pos: [10.8, MESA.top, -233.6], height: 5, size: 1.2 },
      { kind: 'felsnadel', pos: [11, MESA.top, -256.6], height: 4, size: 1 },
      { kind: 'trockenbuesche', pos: [-9, MESA.top, -242], size: [3, 6], n: 3 },
    ] },
    rock(-13.6, -12.2, -240.3, -241.7, MESA.top + 6.2, 6.2),

    // =============================================================== Ameisenraum (nur durch die Röhre)
    isl(ROOM.x0, ROOM.x1, ROOM.z0, ROOM.z1, Y, 4, { top: 'none' }),
    rock(ROOM.x0 - 3, ROOM.x1 + 3, ROOM.z1, ROOM.z1 - 3, Y + 7, 11),
    rock(ROOM.x0 - 3, ROOM.x0, ROOM.z0, ROOM.z1, Y + 7, 11),
    rock(ROOM.x1, ROOM.x1 + 3, ROOM.z0, ROOM.z1, Y + 7, 11),
    { type: 'pipe', id: 'p_raum', pos: [63.4, Y, -179.6], height: 1.2 },
    { type: 'pipe', id: 'p_raum_zurueck', pos: [76.6, Y, -179.8], height: 1.2, target: 'p_raum_aus' },
    sign(70, Y, -177.4, 'Vorratskammer', { size: [2.6, 0.8] }),
    { type: 'deco_w4', items: [
      { kind: 'fackel', pos: [ROOM.x0 + 0.02, Y + 2.6, -186], yaw: 0 }, { kind: 'fackel', pos: [ROOM.x1 - 0.02, Y + 2.6, -186], yaw: Math.PI },
    ] },
  ],
  blocks: [
    // Start: Funkenblüte in Sichtweite (Feuer besiegt auch Hörner-Ameisen)
    { kind: 'brick', pos: [-1, Y + 2.4, -3.2], content: 'coins:2' },
    { kind: 'question', pos: [0, Y + 2.4, -3.2], content: 'funken' },
    { kind: 'brick', pos: [1, Y + 2.4, -3.2] },
    // Extraleben: unsichtbarer Block über dem großen Ameisenhügel
    { kind: 'hidden', pos: [-7, Y + 4.4, 0], content: 'oneup' },
    // gleich nach der Höhle: Krallen-Anzug für die Kletterwand
    { kind: 'question', pos: [-4.6, Y + 2, -100.6], content: 'krallenAnzug' },
    { kind: 'brick', pos: [-3.6, Y + 2, -100.6], content: 'coins:3' },
    // Checkpoint: Wachstumsbeere
    { kind: 'question', pos: [2.4, Y + 2.4, -109], content: 'wachstumsbeere' },
    // Stachelfeld-Vorplatz
    { kind: 'question', pos: [-2, Y + 2.4, -155.4], content: 'coins:5' },
  ],
  enemies: [
    // ---------------- 1 Wüstenstart (Ameisensoldat 15)
    { kind: 'ameisensoldat', id: 'huegel', count: 4, spacing: 6, speed: 1.3, antpath: 'weg_huegel', mode: 'loop' },
    { kind: 'ameisensoldat', id: 'feuer', count: 3, spacing: 3.1, speed: 0.9, antpath: 'weg_feuer', mode: 'loop' },
    wayOver(B0, 3.3, 0.1), wayOver(B0, 4.7, 0.6),
    { kind: 'ameisensoldat', id: 'quer1', count: 4, spacing: 9.4, speed: 1.6, antpath: 'weg_quer1', mode: 'loop' },
    { kind: 'ameisensoldat', pos: [-3, Y, -8.6], dir: [1, 0], speed: 1.4 },
    { kind: 'ameisensoldat', pos: [5, Y, -27.6], dir: [-1, 0], speed: 1.4 },
    // ---------------- 2 Höhle (Ameisensoldat 14)
    wayOver(B1, 0, 0.2),
    { ...wayOver(W1, -4.5, 0.05, { speed: 1.6 }), id: 'w1a' },
    { ...wayOver(W1, 0, 0.38, { speed: 1.6 }), id: 'w1b' },
    { ...wayOver(W1, 4.5, 0.71, { speed: 1.6 }), id: 'w1c' },
    { ...wayOver(TOWER, 3.9, 0.05, { speed: 1.7, from: 2, to: 1.3 }), id: 'turm1' },
    { ...wayOver(TOWER, 5.1, 0.55, { speed: 1.7, from: 2, to: 1.3 }), id: 'turm2' },
    { kind: 'ameisensoldat', id: 'faehre_l', antpath: antWallLane(-7, 1, Y + 0.45, -59.6, -78.4), speed: 2, phase: 0 },
    { kind: 'ameisensoldat', id: 'faehre_r', antpath: antWallLane(7, -1, Y + 0.45, -59.6, -78.4), speed: 2, phase: 0.5 },
    { kind: 'ameisensoldat', id: 'faehre_l2', antpath: antWallLane(-7, 1, Y + 2.8, -60, -78), speed: 1.6, phase: 0.45 },
    { kind: 'ameisensoldat', id: 'faehre_r2', antpath: antWallLane(7, -1, Y + 2.8, -60, -78), speed: 1.6, phase: 0.95 },
    { kind: 'ameisensoldat', id: 'kolonne', count: 4, spacing: 6.6, speed: 1.6, antpath: 'weg_kolonne', mode: 'loop' },
    // ---------------- 3 Hörnerreihen (Hörner 23, Ameisensoldat 6)
    { kind: 'ameisensoldat_horn', id: 'h1', count: 5, spacing: 6.9, speed: 1.6, antpath: 'weg_h1', mode: 'loop' },
    { kind: 'ameisensoldat', id: 'wall', count: 6, spacing: 5.7, speed: 1.5, antpath: 'weg_wall', mode: 'loop' },
    { kind: 'ameisensoldat_horn', id: 'h3', count: 6, spacing: 5.7, speed: 2, antpath: 'weg_h3', mode: 'loop', phase: 0.3 },
    { kind: 'ameisensoldat_horn', id: 'h_platz', count: 4, spacing: 4.8, speed: 1.2, antpath: 'weg_h_platz', mode: 'loop' },
    { kind: 'ameisensoldat_horn', pos: [-5, Y, -154.6], dir: [1, 0], speed: 1.3 },
    { kind: 'ameisensoldat_horn', pos: [6, Y, -147], dir: [-1, 0], speed: 1.3 },
    ...[-5, 0, 5].map((x, i) => ({ kind: 'ameisensoldat_horn', antpath: antOver([0, Y, -143.5], [18, 1.5, 1], x, 2.2, 2.2), speed: 1.4, phase: 0.2 + i * 0.3 })),
    ...[-5, 0, 5].map((x, i) => ({ kind: 'ameisensoldat_horn', antpath: antOver([0, Y, -150.5], [18, 1.5, 1], x, 2.2, 2.2), speed: 1.4, phase: 0.7 + i * 0.27 })),
    // ---------------- 4 Stachelfeld: Riesenameisen endlos aus der Höhle
    { kind: 'riesenameise', id: 'strom', spawner: { every: 3, max: 12 }, path: GIANT_PATH, speed: 2 },
    // ---------------- Ameisenraum (Ameisensoldat 3)
    { kind: 'ameisensoldat', id: 'vorrat1', antpath: antOver(STORE.pos, STORE.size, 69.4, 2.4, 2), speed: 1.6, phase: 0.05 },
    { kind: 'ameisensoldat', id: 'vorrat2', antpath: antOver(STORE.pos, STORE.size, 70.6, 2.4, 2), speed: 1.6, phase: 0.55 },
    { kind: 'ameisensoldat', id: 'rueckwand', antpath: [[61.5, Y + 2.2, ROOM.z1, 0, 0, 1], [78.5, Y + 2.2, ROOM.z1, 0, 0, 1]], speed: 1.4 },
    // ---------------- Zielbereich (Ameisensoldat 3: Ehrenrunde um den Hügel)
    { kind: 'ameisensoldat', id: 'jubel', count: 3, spacing: 4.4, speed: 1.1, antpath: 'weg_jubel', mode: 'loop' },
  ],
  items: [
    // ---------------- 1
    line([0, Y + 0.6, 4.6], [0, Y + 0.6, 0], 3),
    line([4, Y + B0.size[1] + 0.6, -14.4], [4, Y + B0.size[1] + 0.6, -15.6], 2),
    line([0, Y + 0.6, -10], [0, Y + 0.6, -18], 4),
    ...arc([0, Y + 0.6, -28.6], [0, Y + 0.6, -34], 4, 1.6),
    // ---------------- 2
    line([0, Y + B1.size[1] + 0.6, -41], [0, Y + B1.size[1] + 0.6, -42], 2),
    ...column(0, -47.6, Y + 1.4, Y + 5.4, 4),
    line([-4.5, Y + W1.size[1] + 0.6, -49.6], [4.5, Y + W1.size[1] + 0.6, -49.6], 5),
    ...column(TOWER.pos[0], -57, Y + 2, Y + 9, 5),
    line([-6.2, Y + 1.4, -64], [-6.2, Y + 1.4, -74], 5),
    line([0, Y + 0.6, -80], [0, Y + 0.6, -92], 5),
    // ---------------- 3
    ring([(LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top + 1.0, -107], 1.2, 5),
    ...column(-8.6, -102.4, Y + 1.6, Y + 6, 4),
    line([0, Y + 0.6, -112], [0, Y + 0.6, -116], 3),
    ...arc([0, Y + 0.6, -120], [0, Y + 1.2, -124], 3, 1.6),
    { kind: 'powerup', pos: [6.5, Y + 2.4, -131.4], power: 'stern', dir: [0, 0] },
    ...arc([0, Y + 0.6, -139.4], [0, Y + 2.1, -143.5], 3, 1.2),
    ...arc([0, Y + 2.1, -143.5], [0, Y + 2.1, -150.5], 4, 1.4),
    // ---------------- 4
    ...arc([4, Y + 0.6, -157.4], [3.6, Y + 0.9, -161], 3, 1),
    line([0.4, Y + 1, -166], [0.2, Y + 1, -172], 3),
    line([-2.6, Y + 1, -179], [-2.6, Y + 1, -184], 3),
    ...arc([-3.2, Y + 1, -182], [-6.1, ISLE.top + 2.2, -182], 3, 1),
    line([0.6, Y + 1, -191], [1, Y + 1, -197], 3),
    line([-1.8, Y + 1, -209.4], [-6, Y + 1, -211.4], 3),
    // ---------------- 5
    line([0, MESA.top + 0.6, -239], [0, MESA.top + 0.6, -245], 4),
    ring([0, MESA.top + 1, -236], 1.4, 6),
    // ---------------- Ameisenraum
    line([66, Y + 0.6, -181], [74, Y + 0.6, -181], 5),
    ...column(STORE.pos[0], -186.4, Y + 1.6, Y + 5.6, 4),
  ],
  checkpoint: { pos: [0, Y, -111], yaw: Math.PI / 2 },
  stars: [
    [(LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top + 0.9, -107.4],                              // 0: Sims über der Kletterwand
    [STORE.pos[0], Y + STORE.size[1] + 0.9, STORE.pos[2]],                             // 1: Ameisenraum (Vorratsturm)
    [(PILLAR.x0 + PILLAR.x1) / 2, PILLAR.top + 0.9, (PILLAR.z0 + PILLAR.z1) / 2],       // 2: Säule am Ende des Stachelfelds
  ],
  stamp: [TOWER.pos[0], Y + TOWER.size[1] + 1.5, TOWER.pos[2]],
  goal: { pos: [0, MESA.top, -251], height: 9 },
  marks: {
    start: [0, Y, 8],
    w1: [0, Y, -47.6],
    tower: [TOWER.pos[0], Y, -55.6],
    chasm: [-6.6, Y, -60],
    ledge: [-8, Y, -101.6],
    checkpoint: [0, Y, -111],
    star: [6.5, Y + 2.4, -131.4],
    pit: [4, Y, -157],
    isle: [-6.1, ISLE.top, -182],
    pillar: [3.4, PILLAR.top, -201.5],
    end: [0, Y, -216],
    room: [70, Y, -182],
    goal: [0, MESA.top, -246],
  },
};
