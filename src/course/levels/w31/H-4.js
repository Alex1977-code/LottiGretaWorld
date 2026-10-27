// H-4 „Hokuspokus-Hochhaus“ – Halloween-Welt „Kürbisinsel“, vertikaler Parcours im Hexenturm (Archetyp parcours, Thema
// witchtower, Musik course_witchtower, 400 s). Nachts zwischen lila Wolken klettern Lotti und Greta von Turm zu Turm
// hinauf bis auf die Krempe des riesigen Hexenhuts, der das Dach des Hauptturms bildet: fliegende Hexenbesen tragen über
// die Schluchten, grün blubbernde Hexenkessel schleudern hoch hinauf, Zaubertrank-Blasen heben sanft nach oben, und ein
// Spinnennetz federt (die kleine Spinne winkt). Kindgerecht: Brüstungen an den Turmkanten, Besen warten, bis man
// draufsteht, viele Süßigkeiten. Level verläuft nach −Z und steigt von y 0 auf y 30,6.
//
// Abschnitte (Lernen → Steigern → Kombinieren):
//   1  Kräutergarten     z  11 …  −10   y 0     Start, winkender Kürbis, erster Hexenkessel (Lernen) → Turm 1 (y 4,6);
//                                               Spinnennetz rechts (unsichtbarer Block mit Extraleben darüber)
//   2  Besenflug          z −10 …  −66   y 4,6 → 9,4   Besen 1 (waagerecht) → Türmchen 2 (Flatterfledi kreist) → Besen 2
//                                               (steigt) → Bücherturm 3; links parkt ein grüner Besen: Geheimflug zur
//                                               Wolkeninsel (Stern 0, Kiste mit Extraleben)
//   3  Kesselküche        z −66 … −101  y 9,4 → 16,8  Hexenküche (Tische, Regale, Kräuterbalken mit hängender
//                                               Flatterfledi, Spuk mit Hexenhut), Kessel-Hopser auf den Balkon
//                                               (Checkpoint); Zaubertrank-Blasen des lila Kessels → Mondturm (Stern 1)
//   4  Besenwirbel        z −101 … −141 y 16,8 → 23,5 Besen 3 fliegt selbständig einen Bogen (Steigern: Timing) →
//                                               Spinnenturm 4, Spinnennetz → Glockenterrasse 5 (zwei Hexenhut-Hüpfer,
//                                               Spuk); hinter dem Türmchen ein zweites Netz → hoch über dem Dach Stern 2
//   5  Hutkrempe          z −141 … −197 y 23,5 → 30,6 orange Kessel → Turm 6, Besen 4 → Turm 7, Brücke auf die Krempe
//                                               des Riesen-Hexenhuts: Zielmast. Rechts ein Besen-Aufzug zum
//                                               Schornstein (Stempel)
// Gegner: Hexenhut-Hüpfer 6, Flatterfledi 4 (drei kreisen um Türme, eine hängt am Kräuterbalken), Spuk mit Hexenhut 2.

import { turm, terrasse, hexenHut, hexenKueche, winkeKuerbis, funkelSpur, kraeuterGarten, isl, line, ring, arc, naschen, naschKreis, sign } from './_helpers_c.js';

const PI = Math.PI;
const Y1 = 4.6, Y2 = 9.4, Y3 = 16.8, Y4 = 23.5, Y5 = 30.6;
const K = 0.35;   // Dicke der Besen-Lauffläche (Bahnpunkte = Unterseite)

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MH4 = {
  Y1, Y2, Y3, Y4, Y5,
  T1: { x: 1, z: -16, r: 5 }, T2: { x: 1, z: -38.3, r: 3.2 }, T3: { x: 0, z: -59.7, r: 5.5 }, T4: { x: 0, z: -121.4, r: 4 },
  T6: { x: 4, z: -145.8, r: 4 }, T7: { x: 4, z: -168.1, r: 3 },
  WOLKE: { x: -23.5, z: -59.7, top: 12.4 },              // Wolkeninsel (Stern 0)
  MOND: { x: 11.4, z: -82.5, r: 1.8, top: 24.6 },         // Mondturm (Stern 1)
  TUERMCHEN: { x: -8.6, z: -130 },                        // Türmchen auf der Glockenterrasse
  NETZ2: { x: -8.6, z: -136.4 },                           // Netz hinter dem Türmchen (Stern 2)
  HUT: { x: 2, z: -186.5, y: Y5, brim: 9.5 },
  SCHORNSTEIN: { x: 13, z: -185.2, r: 1.5, top: 37.6 },   // Stempel
};
const { T1, T2, T3, T4, T6, T7, WOLKE, MOND, TUERMCHEN, NETZ2, HUT, SCHORNSTEIN } = MH4;

const besen = (id, path, o = {}) => ({ type: 'besen_plattform', id, path, start: 'stand', speed: 2.6, wait: 1.6, size: [3, 1.4], ...o });
const hut = (id, pos, o = {}) => ({ kind: 'hexenhut_huepfer', id, pos, sight: 6, ...o });

/** Aufbau-Haken: Türme, Hexenhut, Küche, winkender Kürbis (vor dem Verschmelzen; Kollision zählt zum Umriss). */
function build(level) {
  // ---------------------------------------------------------------- Türme
  turm(level, { ...T1, top: Y1, floor: 'holz', gaps: [[0.0, 0.62], [PI, 0.36]], windows: [[0.3, -2.6], [-0.7, -4.4], [1.2, -3.2]], id: 't1' });
  turm(level, { ...T2, top: Y1, floor: 'stein', gaps: [[0, 0.62], [PI, 0.62]], windows: [[0.5, -2.2], [-0.9, -3.8]], color: 'gruen', id: 't2' });
  turm(level, { ...T3, top: Y2, floor: 'holz', gaps: [[0.18, 0.42], [PI, 0.3], [-PI / 2, 0.36]], windows: [[0.4, -2.5], [-0.4, -5], [1.4, -3.4], [-1.5, -2.2]], id: 't3' });
  turm(level, { ...T4, top: Y3, floor: 'stein', gaps: [[0, 0.55], [PI, 0.7]], windows: [[0.6, -2.4], [-0.8, -3.6]], color: 'rosa', id: 't4' });
  turm(level, { ...T6, top: Y5, floor: 'holz', gaps: [[0.05, 0.6], [PI, 0.5]], windows: [[0.5, -2.4], [-0.6, -4.2]], id: 't6' });
  turm(level, { ...T7, top: Y5, floor: 'stein', gaps: [[0, 0.65], [PI, 0.6]], windows: [[0.6, -2.0]], color: 'gruen', id: 't7' });
  // Mondturm (Stern 1) und Schornstein (Stempel): schlank, ohne Brüstung
  turm(level, { x: MOND.x, z: MOND.z, r: MOND.r, top: MOND.top, rim: 0, depth: 16, under: 8, floor: 'stein', windows: [[-0.4, -2.2], [0.3, -6.5], [-0.2, -10.5]], color: 'rosa', circle: false, id: 'mondturm' });
  turm(level, { x: SCHORNSTEIN.x, z: SCHORNSTEIN.z, r: SCHORNSTEIN.r, top: SCHORNSTEIN.top, rim: 0, depth: 8, under: 6, floor: 'stein', windows: [[-0.3, -2.4]], color: 'grau', circle: false, id: 'schornstein' });
  // Riesen-Hexenhut auf dem Hauptturm (Krempe = Zielterrasse)
  hexenHut(level, { x: HUT.x, z: HUT.z, y: HUT.y, r: 5, brim: HUT.brim, height: 13, bend: 2.8 });
  // ---------------------------------------------------------------- Terrassen (Küche, Balkon, Glockenterrasse) und Kesselküche
  terrasse(level, { x0: -9, x1: 9, z0: -68, z1: -88, top: Y2, depth: 8, under: 10, floor: 'stein', windows: [[0.18, -2.8], [0.5, -4.6], [0.82, -2.8]] });
  terrasse(level, { x0: -9, x1: 7, z0: -88, z1: -101, top: Y3, depth: 10, under: 10, floor: 'holz', windows: [[0.12, -2.4], [0.62, -2.4], [0.88, -4.8]] });
  terrasse(level, { x0: -11, x1: 6, z0: -125.2, z1: -141, top: Y4, depth: 8, under: 10, floor: 'stein', color: 'rosa', windows: [[0.3, -2.6], [0.72, -2.6], [0.5, -5.2]] });
  hexenKueche(level, [
    { kind: 'regal', pos: [-8.45, Y2, -73.5], yaw: PI / 2, len: 4, h: 2.6 },
    { kind: 'regal', pos: [-8.45, Y2, -80], yaw: PI / 2, len: 3.4, h: 2.6 },
    { kind: 'tisch', pos: [-1.6, Y2, -75.5], len: 3.6 },
    { kind: 'tisch', pos: [3.2, Y2, -71], len: 2.6, yaw: 0.25 },
    { kind: 'fass', pos: [7.6, Y2, -69.6] }, { kind: 'fass', pos: [7.4, Y2, -71.2] },
    { kind: 'balken', pos: [-4.4, Y2, -79.2], len: 8.4, h: 3.2 },
    { kind: 'besen', pos: [-8.2, Y2, -77], yaw: PI / 2 },
    { kind: 'besen', pos: [-8.2, Y2, -84], yaw: PI / 2 + 0.3 },
  ]);
  // ---------------------------------------------------------------- winkender Kürbis am Start
  winkeKuerbis(level, { id: 'winkekuerbis', pos: [4.6, 0, 4.4], size: 1.35, near: 5.5 });
  kraeuterGarten(level, {
    y: 0,
    beds: [{ x0: -7, x1: -3.6, z0: 6.4, z1: 2.6 }, { x0: 3.6, x1: 7, z0: -0.4, z1: -3.6 }],
    path: [[0, 9.6], [0.3, 8.1], [0.1, 6.6], [0.4, 5.1], [0.2, 3.6], [0.5, 2.1], [0.4, 0.6], [0.8, -0.9], [0.6, -2.4], [1, -3.9], [0.9, -5.4]],
  });
  // Glitzer-Hinweise: Geheimbesen, Süßigkeiten-Leiter über dem zweiten Netz, Besen-Aufzug
  funkelSpur(level, [[-7, Y2 + 1.2, -59.7], [-11, Y2 + 2.2, -59.7], [-15, Y2 + 3.2, -59.7]], 0xb8ff9a, 0.8, { name: 'hinweis-besen' });
  funkelSpur(level, [[SCHORNSTEIN.x, SCHORNSTEIN.top + 2.2, SCHORNSTEIN.z], [MOND.x, MOND.top + 2.4, MOND.z]], 0xfff0a0, 1.4, { name: 'hinweis-spitzen' });
}

export const LEVEL = {
  id: 'H-4',
  world: 31,
  title: 'Hokuspokus-Hochhaus',
  archetype: 'parcours',
  theme: 'witchtower',
  music: 'course_witchtower',
  timeLimit: 400,
  candyHud: true,
  killY: -12,
  start: { pos: [0, 0, 7], yaw: PI / 2 },
  build,
  instances: { coin: { farHide: 44, shadow: false } },
  farHide: 46,
  camera: [
    { from: 14, to: -10, pitch: 40, dist: 14, height: 1.6, ahead: 2.2 },
    { from: -10, to: -56, pitch: 37, dist: 15, height: 2.2, ahead: 2.2 },
    { from: -56, to: -68, pitch: 40, dist: 15, height: 2, ahead: 2 },
    { from: -68, to: -88, pitch: 38, dist: 15, height: 2.6, ahead: 2 },
    { from: -88, to: -101, pitch: 40, dist: 14.5, height: 2, ahead: 2 },
    { from: -101, to: -125, pitch: 37, dist: 15, height: 2.4, ahead: 2.2 },
    { from: -125, to: -141, pitch: 39, dist: 15, height: 2.4, ahead: 2 },
    { from: -141, to: -172, pitch: 37, dist: 15, height: 2.2, ahead: 2.2 },
    { from: -172, to: -200, pitch: 34, dist: 16, height: 2.6, ahead: 1.6 },
  ],
  segments: [
    // ================================================================ 1 Kräutergarten
    isl(-7.5, 7.5, 11, -10, 0, 6, { top: 'grass' }),
    sign(-2.6, 0, 9.4, 'Hokuspokus-Hochhaus\nBitte nach oben fliegen!', { size: [3, 1.0] }),
    sign(4.8, 0, -4.6, 'Kessel-Hopser:\nrein und hui!', { size: [2.4, 0.9] }),
    { type: 'hexenkessel', id: 'kessel0', pos: [T1.x, 0, -8.2], size: 2, jump: 6 },
    { type: 'spinnennetz_trampolin', id: 'netz0', pos: [-4.4, 0, -0.4], size: [2.4, 2.4], height: 1, jump: 5.6 },
    { type: 'deco_hw', items: [
      { kind: 'kuerbisse', pos: [-5.4, 0, -6.4], size: [3, 3.6], n: 5, faces: 0.6 },
      { kind: 'kuerbislaterne', pos: [-6.3, 0, 9.2], size: 0.7 },
      { kind: 'kuerbislaterne', pos: [6.3, 0, 9.2], size: 0.7 },
      { kind: 'kerzen', pos: [6.2, 0, -8.6], n: 5, size: 1.1 },
      { kind: 'kerzen', pos: [-6.6, 0, 8.4], n: 3 },
      { kind: 'strohballen', pos: [6.4, 0, 0.6], form: 'rund', yaw: 0.6 },
      { kind: 'krummer_baum', pos: [-6.4, 0, -8.6], height: 4.6 },
      { kind: 'suessigkeiten', pos: [3.6, 0, 8.6], size: 0.9 },
    ] },

    // ================================================================ 2 Besenflug
    besen('besen1', [[T1.x, Y1 - K, -22.5], [T1.x, Y1 - K, -34.4]], { color: 'lila' }),
    besen('besen2', [[T2.x, Y1 - K, -43], [T2.x, Y2 - K, -54.2]], { color: 'rot' }),
    // geheimer Besen links am Bücherturm → Wolkeninsel (Stern 0)
    besen('besen_stern', [[-7, Y2 - K, T3.z], [-20.6, WOLKE.top - K, T3.z]], { color: 'gruen', axis: 'x', speed: 2.8, wait: 1.6 }),
    { type: 'platform', pos: [WOLKE.x, WOLKE.top - 0.8, WOLKE.z], size: [4.6, 0.8, 4.6], style: 'cloud' },
    { type: 'deco_hw', items: [
      { kind: 'kerzen', pos: [T1.x - 3.4, Y1, T1.z - 2.4], n: 3 },
      { kind: 'kerzen', pos: [T3.x + 3.6, Y2, T3.z - 2.6], n: 4 },
      { kind: 'spinnweben', pos: [T3.x - 4.4, Y2 + 0.3, T3.z - 3.2], size: 1.3, yaw: 0.8 },
      { kind: 'fledermaus_girlande', from: [T1.x - 4.2, Y1 + 1.2, -19], to: [T2.x - 2.8, Y1 + 1.2, -36.6], n: 9, sag: 1.2 },
      { kind: 'hexenturm', pos: [T3.x + 3.9, Y2, T3.z - 1.6], height: 3, radius: 0.9, lean: 0.2, windows: 2 },
    ] },

    // ================================================================ 3 Kesselküche
    { type: 'bridge', from: [0, Y2, -65], to: [0, Y2, -68.3], width: 2.6 },
    { type: 'wall', pos: [-9.3, Y2, -77.5], size: [0.6, 3.4, 19], style: 'stone' },
    sign(5.2, Y2, -86.8, 'Hui! Kessel-Hopser\nauf den Balkon', { size: [2.5, 0.9] }),
    { type: 'hexenkessel', id: 'kessel1', pos: [-4, Y2, -85.6], size: 2.2, jump: 8.2 },
    { type: 'hexenkessel', id: 'kessel2', pos: [6.2, Y2, -82.5], size: 2, color: 'lila', potions: { every: 2.4, rise: 1.7, height: 13, size: 1.9, max: 3, first: 0.4 } },
    { type: 'deco_hw', items: [
      { kind: 'kerzen', pos: [-6.8, Y2, -69.2], n: 4 },
      { kind: 'kerzen', pos: [-6.2, Y3, -99.6], n: 4 },
      { kind: 'spinnweben', pos: [-8.9, Y2 + 2.6, -86.6], size: 1.4, yaw: 0.6 },
      { kind: 'kuerbisse', pos: [6.8, Y2, -75.5], size: [2.6, 3], n: 4, faces: 0.7 },
      { kind: 'kuerbislaterne', pos: [5.6, Y3, -89.2], size: 0.7 },
      { kind: 'kuerbislaterne', pos: [-8.2, Y3, -89.2], size: 0.7 },
      { kind: 'suessigkeiten', pos: [-7, Y3, -92], size: 1 },
    ] },

    // ================================================================ 4 Besenwirbel
    besen('besen3', [[0, Y3 - K, -102.6], [0, Y3 + 2.9 - K, -110], [0, Y3 - K, -117.4]], { color: 'gruen', start: 'auto', wait: 1.6, speed: 2.4 }),
    { type: 'spinnennetz_trampolin', id: 'netz1', pos: [T4.x, Y3, -122.4], size: [2.6, 2.6], height: 1, jump: 7.4 },
    { type: 'deco_hw', items: [
      { kind: 'hexenturm', pos: [TUERMCHEN.x, Y4, TUERMCHEN.z], height: 3, radius: 1.1, lean: 0.3, windows: 2 },
      { kind: 'kerzen', pos: [4.6, Y4, -126.4], n: 4 },
      { kind: 'kerzen', pos: [-10, Y4, -139.6], n: 3 },
      { kind: 'spinnweben', pos: [5.4, Y4 + 0.2, -140.4], size: 1.6, yaw: -0.7 },
      { kind: 'fledermaus_girlande', from: [-10.6, Y4 + 2.6, -126], to: [5.6, Y4 + 2.6, -126], n: 9, sag: 0.8 },
    ] },
    { type: 'spinnennetz_trampolin', id: 'netz2', pos: [NETZ2.x, Y4, NETZ2.z], size: [2.4, 2.4], height: 1, jump: 11 },

    // ================================================================ 5 Hutkrempe
    { type: 'hexenkessel', id: 'kessel3', pos: [T6.x, Y4, -138.4], size: 2.2, color: 'orange', jump: 8 },
    besen('besen4', [[T6.x, Y5 - K, -151.3], [T6.x, Y5 - K, -164.6]], { color: 'lila' }),
    { type: 'bridge', from: [T7.x, Y5, -170.6], to: [T7.x, Y5, -178.2], width: 2.2 },
    // Besen-Aufzug zum Schornstein (Stempel): steigt senkrecht, wartet oben
    besen('besen_aufzug', [[SCHORNSTEIN.x - 0.4, Y5 - K, -181.2], [SCHORNSTEIN.x - 0.4, 35.2 - K, -181.2]], { color: 'rot', axis: 'x', speed: 1.8, wait: 2.2 }),
    { type: 'deco_hw', items: [
      { kind: 'kuerbislaterne', pos: [HUT.x - 6.6, Y5, HUT.z + 5.6], size: 0.8 },
      { kind: 'kuerbislaterne', pos: [HUT.x + 6.4, Y5, HUT.z + 5.8], size: 0.8 },
      { kind: 'kerzen', pos: [HUT.x - 7.6, Y5, HUT.z + 2], n: 4 },
      { kind: 'suessigkeiten', pos: [HUT.x - 4.2, Y5, HUT.z + 7.4], size: 1.1 },
      { kind: 'kerzen', pos: [T6.x + 2.4, Y5, T6.z - 1.6], n: 3 },
    ] },
    { type: 'killplane', y: -14 },
  ],
  blocks: [
    { kind: 'hidden', id: 'geheim_netz', pos: [-4.4, 5.4, -0.4], content: 'oneup' },
    { kind: 'coinblock', pos: [T3.x + 2.6, Y2 + 2.3, T3.z + 0.6], count: 6 },
    { kind: 'question', pos: [-1.6, Y2 + 2.3, -71.6], content: 'wachstumsbeere' },
    { kind: 'question', pos: [0, Y4 + 2.3, -131.5], content: 'coins:5' },
  ],
  enemies: [
    hut('hh1', [3.5, 0, -5.4], { behavior: 'patrol', path: [[2.2, 0, -5.4], [6.2, 0, -5.4]], sight: 0 }),
    hut('hh2', [-2, Y2, T3.z - 1.5], { sight: 5 }),
    hut('hh3', [0, Y2, -81], { behavior: 'patrol', path: [[-1.8, Y2, -81], [3.4, Y2, -81]], sight: 0 }),
    hut('hh6', [2, Y3, -98.4], { behavior: 'patrol', path: [[-0.5, Y3, -98.4], [5, Y3, -98.4]], sight: 0 }),
    hut('hh4', [-2, Y4, -129], { behavior: 'patrol', path: [[-4, Y4, -128.6], [3.4, Y4, -128.6]], sight: 0 }),
    hut('hh5', [1.5, Y4, -135.5], { sight: 6 }),
    { kind: 'flatterfledi', id: 'f1', center: [T2.x, Y1 + 0.8, T2.z], radius: 4.5, flySpeed: 1.6 },
    { kind: 'flatterfledi', id: 'f2', center: [T4.x, Y3 + 0.9, T4.z], radius: 5.4, flySpeed: 1.7, cw: true },
    { kind: 'flatterfledi', id: 'f3', center: [T7.x, Y5 + 0.9, T7.z], radius: 4.3, flySpeed: 1.6 },
    { kind: 'flatterfledi', id: 'f4', pos: [-3.4, Y2 + 3.2, -79.2], sight: 4 },
    { kind: 'spuk', id: 'spuk1', pos: [6, Y2 + 0.6, -74], hat: 'hexe', sight: 10 },
    { kind: 'spuk', id: 'spuk2', pos: [-4, Y4 + 0.6, -139], hat: 'hexe', sight: 9 },
  ],
  items: [
    // ---- 1
    naschen([0, 0.6, 4.5], [0, 0.6, -1.5], 4),
    naschKreis([T1.x, Y1 + 0.6, T1.z], 2.4, 6, 'lolli'),
    // ---- 2
    line([T1.x, Y1 + 1.2, -24], [T1.x, Y1 + 1.2, -33], 5),
    naschKreis([T2.x, Y1 + 0.6, T2.z], 1.6, 5, 'bonbon'),
    line([T2.x, Y1 + 1.6, -44.5], [T2.x, Y2 + 1.2, -53], 5),
    naschen([-9, Y2 + 1.4, T3.z], [-18, Y2 + 3.3, T3.z], 4, 'zuckermais'),
    { kind: 'crate', id: 'kiste_wolke', pos: [WOLKE.x - 1.2, WOLKE.top, WOLKE.z + 1.4], content: 'oneup' },
    naschKreis([WOLKE.x + 0.6, WOLKE.top + 0.6, WOLKE.z - 0.6], 1.2, 4, 'schoko'),
    // ---- 3
    naschen([0, Y2 + 0.6, -69.5], [0, Y2 + 0.6, -72.5], 3),
    naschen([3, Y2 + 0.6, -78.5], [-1.5, Y2 + 0.6, -78.5], 4, 'lolli'),
    line([-4, Y2 + 3.4, -85.6], [-4, Y2 + 6.4, -85.6], 3),
    ring([-3, Y3 + 0.6, -93.5], 1.4, 6),
    // ---- 4
    arc([0, Y3 + 1.2, -103], [0, Y3 + 1.2, -117], 7, 2.9),
    naschKreis([T4.x, Y3 + 0.6, T4.z], 2.6, 6, 'bonbon'),
    naschen([-8.6, Y4 + 3.4, NETZ2.z + 0.4], [-8.6, Y4 + 9.4, NETZ2.z + 1.2], 5, 'zuckermais'),
    naschen([-3, Y4 + 0.6, -133.5], [3, Y4 + 0.6, -133.5], 4, 'schoko'),
    // ---- 5
    line([T6.x, Y4 + 3.4, -138.4], [T6.x, Y4 + 6.4, -138.4], 3),
    line([T6.x, Y5 + 1.2, -153.5], [T6.x, Y5 + 1.2, -163], 5),
    naschKreis([T7.x, Y5 + 0.6, T7.z], 1.6, 5, 'lolli'),
    naschen([HUT.x - 3, Y5 + 0.6, -179.6], [HUT.x + 3, Y5 + 0.6, -179.6], 4),
  ],
  checkpoint: [{ pos: [-3, Y3, -95], yaw: PI / 2 }],
  stars: [
    { pos: [WOLKE.x, WOLKE.top + 1.2, WOLKE.z - 0.4] },                 // 0: Wolkeninsel (Geheimbesen)
    { pos: [MOND.x, MOND.top + 1.2, MOND.z] },                          // 1: Mondturm (Zaubertrank-Blase)
    { pos: [NETZ2.x, Y4 + 11.3, NETZ2.z + 1.8] },                       // 2: hoch über dem Türmchen (zweites Netz)
  ],
  stamp: [SCHORNSTEIN.x, SCHORNSTEIN.top + 1.1, SCHORNSTEIN.z],
  goal: { pos: [HUT.x, Y5, -179.8], height: 9 },
  marks: {
    start: [0, 0, 7], kessel0: [T1.x, 0, -5], t1: [T1.x, Y1, T1.z], besen1: [T1.x, Y1, -20.4], t2: [T2.x, Y1, T2.z], t3: [T3.x, Y2, T3.z],
    wolke: [WOLKE.x, WOLKE.top, WOLKE.z], kueche: [0, Y2, -72], kessel2: [6.2, Y2, -79.5], balkon: [-3, Y3, -95], t4: [T4.x, Y3, T4.z],
    terrasse: [0, Y4, -131], netz2: [NETZ2.x, Y4, NETZ2.z], t6: [T6.x, Y5, T6.z], t7: [T7.x, Y5, T7.z], krempe: [HUT.x, Y5, -178.6],
    schornstein: [SCHORNSTEIN.x, SCHORNSTEIN.top, SCHORNSTEIN.z],
  },
};
