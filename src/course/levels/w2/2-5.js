// 2-5 „Doppelgängersteig“ – rosa Grasland (Welt 2), Parcours nach −Z, ca. 235 m. Kernidee: die Spiegelfrucht –
// jede Frucht stellt der Heldin einen Klon an die Seite, der jede Eingabe mitmacht. Druckfelder brauchen zwei Figuren,
// der Viererlift neben dem Ziel vier. Thema `pinkgrass`, Musik `course_cherry`, 400 s.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1  Blütenweg          (z 10 … −28,  y 1)    Spiegelfrucht mit Schild, zwei Rollpilze, Fang-Hase (1-Up) im Blumen-
//                                              garten, Picknick mit Kaninchen; Glasrohr links hinauf zum Kistenhof.
//   2  Kistenhof          (z −28 … −52, y 2,2)  Kistenfeld (Stern 1 in der hinteren rechten Kiste, eine Spiegelfrucht),
//                                              ganz rechts ?-Block mit Funkenblüte; Spiegelfrucht-Strauch (wächst nach).
//   3  Marschblock-Gang   (z −52 … −80, y 2,2)  Rosenhecken-Gang (statt Erdtunnel: Figuren bleiben sichtbar), zwei
//                                              Marschblock-Kolonnen; Nische links: Druckfeld für 2 → 1-Up und Münzen;
//                                              am Ende Druckfeld für 2 → das Tor versinkt (wer es überspringt, dem
//                                              öffnet es sich von hinten). Dahinter: unsichtbarer Block mit
//                                              Spiegelfrucht (Platz).
//   3b Glasrohr-Platz     (z −80 … −88)        zwei verbundene Glasrohre mit Münzen hinauf zum Blockgarten.
//   4  Bunter Blockgarten (z −88 … −114, y 6,2) Checkpoint, bunte Riesenblöcke (versteckter 1-Up-Block über dem gelben),
//                                              ?-Block mit Krallen-Anzug; linke hintere Ecke: Stempel-Turm – mit dem
//                                              wachsenden ?-Block hinauf (oder Krallen an der Kletterwand).
//   –  Brücke über die Schlucht (z −114 … −118)
//   5  Marschblock-Hügel  (z −118 … −150)      Spiegelfrucht auf dem Hügel, von einer Kolonne umrundet; roter Ring auf
//                                              dem Terrassenhügel; oben links ?-Block mit Spiegelfrucht;
//                                              ganz rechts unsichtbarer Block (Spiegelfrucht); Zwillingsfelder unter
//                                              dem Rosenbogen → Stern 2 (zwei Felder gleichzeitig, mit Klon).
//   6  Feuer-Werfer-Gasse (z −150 … −184)      Kolonne quer, Feuer-Werfer mit Einweg-Bühne; besiegt → bunte Treppe
//                                              zum Felsturm mit der Röhre (→ Zielhügel jenseits der Schlucht).
//   7  Zielhügel          (z −202 … −234, y 3) zwei Spiegelfrüchte, Strauch, unsichtbarer Block, Schild „nur zu
//                                              viert“; Viererlift auf den Turm → Stern 3 (oder Krallen); Zielmast
//                                              auf dem Hügel.
// Gegner: Marschblock 14 (3 + 3 Gang, 5 Hügel, 3 Gasse), Rollpilz 2, Feuer-Werfer 1.
// Level-Haken (Laterne am Start, _helpers_c.js): Inseln, Hecken, Teiche, Bäume, Beete, Gartenleuchten, fallende
// Blütenblätter, Spiegelfrucht-Sträucher, sitzende Kaninchen, Tor-Rückseite.

import { isl, line, ring, arc, hook, fruitBush, petals, blossomTrees, flowerBeds, hedges, ponds, flatIslands, gardenLamps, roseVines } from './_helpers_c.js';
import { bakeModel } from '../../blocks/w2kit.js';

const Y1 = 1, Y2 = 2.2, Y4 = 6.2, Y7 = 3;

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 1.0], yaw: o.yaw ?? 0 });
const trees = (x, y, z, w, d, n, avoid) => ({ at: [x, y, z], size: [w, d], n, gap: 3.2, avoid });
const tree = (x, y, z, size = 4) => [x, y, z, size];

// Blütenbäume (eigene sparsame Geometrie, im Level-Haken gebaut)
const TREES = [
  trees(-11.5, Y1, -2, 6, 22, 4, [[-9, -16, 3.6], [-9, -9.5, 2]]), trees(11.8, Y1, -12, 5, 20, 3, [[10.4, -16.4, 3.4], [9, 2, 2.4]]),
  tree(-13, Y1, -24, 5), tree(12.5, Y1, 6, 4.5),
  trees(-12, Y2, -42, 5, 14, 3), trees(12.2, Y2, -32, 4, 8, 2), tree(11.5, Y2, -46.5, 3.6),
  trees(12.4, Y4, -95, 4, 10, 2), tree(-12.6, Y4, -95, 4.2), tree(12.6, Y4, -111, 3.4),
  trees(-12.5, Y4, -134, 5, 14, 3, [[-11, -141, 3.6], [-11.6, -151, 3]]), trees(13, Y4, -122, 4, 10, 2), tree(-3.5, Y4, -146.5, 3.6), tree(13.4, Y4, -147.8, 3.4),
  trees(-12.5, Y4, -170, 4, 20, 3), trees(12.5, Y4, -162, 4, 16, 2),
  trees(-12.6, Y7, -214, 4, 16, 3, [[-10.4, -207.6, 3.2], [-6, -211, 1.6]]), tree(13.2, Y7, -206, 4.2), tree(4, Y7, -232.5, 3.8), tree(-12, Y7, -231, 4.4),
  // Seitenterrassen (tiefer gelegen, rahmen den Weg)
  trees(-18.5, Y1 - 1.4, -9, 5, 24), trees(18, Y1 - 0.8, -15, 4, 18), trees(17.5, Y2 - 1.2, -40, 3.5, 16),
  trees(-17.5, Y4 - 1.5, -101, 3.5, 14), trees(19, Y4 - 1.2, -136, 4, 22), trees(-19, Y4 - 1.6, -169, 4, 14),
  trees(18.5, Y7 - 1.1, -215, 3.5, 18),
];

// Zierteiche [x, y, z, rx, rz]
const PONDS = [[10.4, Y1, -16.4, 2.3, 1.7], [-11.6, Y4, -151, 2.4, 1.4], [-10.4, Y7, -207.6, 2.3, 1.6]];

// Blumenbeete [x, y, z, w, d, n] (eigene sparsame Blumen ohne Schattenwurf, im Level-Haken gebaut)
const FLOWERS = [
  [-1.8, Y1, -6, 1.4, 1.4, 6],
  [1.8, Y1, -6, 1.4, 1.4, 6],
  [-9, Y1, -16, 5, 6, 16],
  [9.5, Y1, -22, 4, 3, 10],
  [-6, Y1, 7, 4, 2, 8],
  [4, Y2, -32, 3, 2, 8],
  [-6.4, Y2, -46, 3, 2, 8],
  [9, Y2, -44, 2, 2, 6],
  [-3.4, Y2 + 0.8, -78, 3, 3.2, 10],
  [3.4, Y2 + 0.8, -78, 3, 3.2, 10],
  [-6, Y4, -93, 3, 3, 9],
  [4, Y4, -112, 4, 2, 8],
  [-7, Y4 + 1.2, -126, 2, 2, 6],
  [1, Y4, -122, 3, 3, 8],
  [-12, Y4, -147, 3, 3, 8],
  [-4, Y7 + 2, -226, 2.4, 2.4, 6],
  [3, Y7, -206, 4, 3, 10],
  [-13.2, Y7, -204.6, 2.4, 1.8, 8],
  // mehr Blumen an Weg und Schildern
  [-3.4, Y1, 0.2, 1.6, 4, 8], [3.4, Y1, 0.2, 1.6, 4, 8], [-6.4, Y1, -3.6, 2, 1.2, 6], [6, Y1, -8, 2.4, 2.4, 8], [-3, Y1, -26.6, 2.2, 1.4, 6], [3, Y1, -26.6, 2.2, 1.4, 6],
  [-9.6, Y2, -33, 2.4, 1.6, 7], [10, Y2, -36, 2.4, 2.4, 8], [-12, Y2, -48, 3, 2, 8], [3.4, Y2, -50.6, 2.4, 1, 6],
  [12, Y4, -92, 3, 2.4, 9], [-9, Y4, -100, 2.4, 2.4, 8], [6, Y4, -108.6, 2, 1.4, 6],
  [-13, Y4, -121, 2.4, 2, 7], [13, Y4, -128, 2.4, 3, 8], [-3.6, Y4, -139, 2, 2, 7], [3.4, Y4, -152, 2.6, 1.4, 7],
  [-8.6, Y4, -153, 2.4, 1.6, 7], [8.6, Y4, -180, 3, 2, 8], [-8.6, Y4, -181, 3, 2, 8],
  [6, Y7, -226, 3, 2.6, 9], [-12.6, Y7, -224, 2.4, 3, 8], [2, Y7, -232.6, 4, 1.6, 9],
  [6, Y2, -84, 4, 4, 10],
];

// Inseln (ohne Sonnenschatten-Wurf, im Level-Haken gebaut): Wege, Seitenterrassen
const ISLANDS = [
  isl(-15, 15, 10, -28, Y1, 4, { under: 3 }),
  isl(-22, -15, 4, -22, Y1 - 1.4, 2.6, { under: 2 }), isl(15, 21, -4, -26, Y1 - 0.8, 3.2, { under: 2 }),
  isl(-15, 15, -28, -52, Y2, 5.2, { under: 3 }),
  isl(15, 20, -30, -50, Y2 - 1.2, 4, { under: 2 }),
  isl(-6.2, 6.2, -52, -84, Y2, 5.2, { under: 3 }),
  isl(-9.6, -6.2, -63.2, -68.8, Y2, 5.2, { under: 3 }),
  isl(-9, 9, -84, -88, Y2, 5.2, { under: 3 }),
  isl(-15, 15, -88, -114, Y4, 9.2, { under: 3 }),
  isl(-20, -15, -92, -110, Y4 - 1.5, 4, { under: 2 }),
  isl(-16, 16, -118, -184, Y4, 9.2, { under: 3 }),
  isl(16, 22, -122, -150, Y4 - 1.2, 4, { under: 2 }), isl(-22, -16, -160, -178, Y4 - 1.6, 4, { under: 2 }),
  isl(-16, 16, -202, -236, Y7, 6, { under: 3 }),
  isl(16, 21, -204, -226, Y7 - 1.1, 4, { under: 2 }),
];

// Rosenhecken [x0, x1, zA, zB, Fuß, Höhe]: Gang mit Nische (4,2 m, nur mit Rückwärtssalto zu erklimmen), Gasse, Pferch
const HEDGES = [
  [-6.2, -5.2, -52.5, -64.6, Y2, 4.2], [-6.2, -5.2, -67.4, -84, Y2, 4.2], [5.2, 6.2, -52.5, -84, Y2, 4.2],
  [-9.6, -8.6, -63.2, -68.8, Y2, 4.2], [-8.6, -6.2, -63.2, -64.6, Y2, 4.2], [-8.6, -6.2, -67.4, -68.8, Y2, 4.2],
  [-6, -5, -154, -176, Y4, 1.6], [5, 6, -154, -176, Y4, 1.6],
  [0, 7.6, -220, -220.5, Y7, 1.6], [12, 12.5, -213.6, -220, Y7, 1.6],
];

/** Level-Haken: Bäume, Blumen, Hecken, Blütenblätter, Spiegelfrucht-Sträucher (wachsen nach), sitzende Kaninchen. */
function setup(level) {
  flatIslands(level, ISLANDS);
  hedges(level, HEDGES);
  ponds(level, PONDS);
  blossomTrees(level, TREES);
  flowerBeds(level, FLOWERS);
  petals(level, { n: 80 });
  fruitBush(level, [6.2, Y2, -48.6], { id: 'strauch_tunnel' });
  fruitBush(level, [-6, Y7, -211], { id: 'strauch_lift' });
  for (const [x, y, z, yaw] of [[8.4, Y1, 1.2, 2.4], [12.4, Y7, -208, 3.8]]) {
    bakeModel(level, 'bunny_small', {}, x, y, z, yaw, 1, { anim: 'idle' });
  }
  gardenLamps(level, [[3.4, Y1, 6.6], [-3.4, Y4, -96.8], [1.6, Y7, -222]]);
  // Kletterrosen am Felsturm (Vorderseite und linke Flanke)
  roseVines(level, [[4.7, Y4, -178, 6.6, 0, 1], [6.3, Y4, -178, 5.2, 0, 1], [7.5, Y4, -178, 6.2, 0, 1], [4, Y4, -178.8, 4.6, -1, 0], [4, Y4, -181.4, 6.4, -1, 0]]);
  // Tor-Rückseite: wer das Tor überspringt (Rückwärtssalto vom Pflanzkasten), dem öffnet es sich – sonst stünde die
  // Kamera hinter dem Tor
  const tor = level.named.get('tor');
  if (tor) {
    level.onStep(() => {
      if (tor.running || tor.pm.s > 0.01) return;
      if ((level.players ?? [level.player]).some((p) => p && p.pos.z < -81 && p.pos.z > -84 && Math.abs(p.pos.x) < 5.2)) tor.start();
    });
  }
}

export const LEVEL = {
  id: '2-5',
  world: 2,
  title: 'Doppelgängersteig',
  archetype: 'parcours',
  theme: 'pinkgrass',
  music: 'course_cherry',
  timeLimit: 400,
  start: { pos: [0, Y1, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -26, pitch: 44, dist: 13 },
    { from: -26, to: -50, pitch: 45, dist: 13 },
    { from: -50, to: -80, pitch: 48, dist: 12.5 },
    { from: -80, to: -90, pitch: 46, dist: 13.5 },
    { from: -90, to: -116, pitch: 45, dist: 14 },
    { from: -116, to: -152, pitch: 44, dist: 13.5 },
    { from: -152, to: -188, pitch: 46, dist: 14 },
    { from: -188, to: -238, pitch: 44, dist: 13.5 },
  ],
  segments: [
    // ======================================================== 1  Blütenweg
    { type: 'deco_w1', items: [{ kind: 'arch', pos: [0, Y1, 1.5], width: 5, height: 3.6 }] },
    sign(-4.2, Y1, 6.4, 'Doppelgängersteig'),
    sign(-4.6, Y1, -3.2, 'Spiegelfrucht:\nein Klon macht alles mit!', { size: [3.2, 1.1] }),
    { type: 'deco', items: [
      { kind: 'bush', pos: [-8.8, Y1, 6.5], size: 0.8 }, { kind: 'bush', pos: [7.4, Y1, -25.4], size: 0.7 },
      { kind: 'fence', from: [-12.6, Y1, -12.6], to: [-5.8, Y1, -12.6] }, { kind: 'fence', from: [-12.6, Y1, -20.6], to: [-5.8, Y1, -20.6] },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'picnic', pos: [9, Y1, 2], yaw: 0.3, size: [2, 1.5] },
      { kind: 'daisies', pos: [0, Y1, -14], size: [22, 22], n: 26 },
      { kind: 'tufts', pos: [0, Y1, -6], size: [26, 26], n: 14 },
      { kind: 'butterflies', pos: [-8, Y1, -16], n: 3, r: 2.2, h: 1.3 },
      { kind: 'mushrooms', pos: [-12.6, Y1, 4], size: 1, color: 'red' },
    ] },
    { type: 'stairs', pos: [0, Y1, -24.4], dir: '-z', steps: 4, rise: 0.3, run: 0.9, width: 8, style: 'white' },
    // Glasrohr links hinauf zum Kistenhof (Münzen)
    { type: 'glasspipe', id: 'g_kisten', radius: 1, oneWay: true, coins: 3,
      path: [[-9, 2.05, -9.5], [-9, 2.05, -15], [-9, 5.8, -21], [-9, 6.4, -28], [-8.4, 3.4, -33.6]] },

    // ======================================================== 2  Kistenhof + 3 Tunnel (eine Insel)
    { type: 'kistenfeld', id: 'kisten', pos: [-3, Y2, -38], grid: [3, 2],
      contents: { '2,0': 'star:0', '0,1': 'spiegel', '0,0': 'coins:3', '1,1': 'coins:2' } },
    sign(-9.4, Y2, -31.4, 'Kisten knackt man\nmit der Stampfattacke!', { size: [3.2, 1.1] }),
    { type: 'deco', items: [
      { kind: 'rock', pos: [12.6, Y2, -40], size: 0.7 }, { kind: 'bush', pos: [-12.5, Y2, -31], size: 0.8 },
    ] },
    { type: 'deco_w1', items: [{ kind: 'tufts', pos: [0, Y2, -40], size: [26, 22], n: 10 }, { kind: 'daisies', pos: [4, Y2, -42], size: [12, 14], n: 12 }] },
    sign(-6.6, Y2, -49.2, 'Druckfelder:\nzu zweit draufstellen!', { size: [3.2, 1.1] }),

    // Rosenhecken-Gang (Hecken 4,2 m, im Level-Haken gebaut) mit Nische links; Pflanzkästen lenken die beiden Figuren
    // aufs Druckfeld vor dem Tor
    { type: 'platform', pos: [-3.4, Y2, -78], size: [3.6, 0.8, 4], style: 'block', color: 0xc8805a },
    { type: 'platform', pos: [3.4, Y2, -78], size: [3.6, 0.8, 4], style: 'block', color: 0xc8805a },
    // Tor: versinkt, sobald zwei Figuren auf dem Druckfeld stehen
    { type: 'mover', id: 'tor', size: [10.4, 4.4, 0.6], path: [[0, Y2, -80.3], [0, Y2 - 4.8, -80.3]], speed: 2.4, idle: true, once: true, wait: 0, color: 0xd8607a },

    // ======================================================== 3b Glasrohr-Platz → zwei verbundene Glasrohre
    { type: 'glasspipe', id: 'g_platz', radius: 1, oneWay: true, coins: 4,
      path: [[0, 3.25, -82.6], [0, 3.25, -84.6], [0, 6.6, -86.6], [0, 8.8, -88.8], [0, 8.4, -91.8], [0, 7.25, -94.6]],
      branches: [{ at: 3, path: [[0, 8.8, -88.8], [-4, 9.6, -90], [-8, 8.4, -91.2], [-9.5, 7.25, -92.6]] }] },
    { type: 'deco', items: [{ kind: 'bush', pos: [-7.6, Y2, -86.6], size: 0.8 }] },

    // ======================================================== 4  Bunter Blockgarten
    { type: 'platform', pos: [5, Y4, -101], size: [2, 2, 2], style: 'block', color: 'red' },
    { type: 'platform', pos: [7.2, Y4, -103.4], size: [2, 1, 2], style: 'block', color: 'blue' },
    { type: 'platform', pos: [9.6, Y4, -101.4], size: [2, 3, 2], style: 'block', color: 'yellow' },
    { type: 'platform', pos: [-2.6, Y4, -105], size: [2.4, 1.2, 2.4], style: 'block', color: 'green' },
    { type: 'platform', pos: [1.2, Y4, -108.4], size: [2, 0.8, 2], style: 'block', color: 'orange' },
    // Stempel-Turm (linke hintere Ecke) mit Kletterwand zum wachsenden Block
    { type: 'platform', pos: [-11.6, Y4, -110], size: [3.2, 6, 4], style: 'block', color: 'purple' },
    { type: 'wall', pos: [-9.8, Y4, -110], size: [0.4, 6, 4], climbable: true },
    { type: 'platform', pos: [-6.4, Y4, -110], size: [1.6, 1.6, 1.6], style: 'block', color: 'orange' },
    sign(-5.4, Y4, -103.6, 'Wachsender Block:\nstampfen – er wächst!', { size: [3.2, 1.1] }),
    { type: 'deco_w1', items: [{ kind: 'tufts', pos: [0, Y4, -101], size: [26, 22], n: 10 }, { kind: 'butterflies', pos: [4, Y4, -96], n: 3, r: 2, h: 1.4 }] },
    // Brücke über die Schlucht
    { type: 'bridge', from: [0, Y4, -113.6], to: [0, Y4, -118.4], width: 4 },

    // ======================================================== 5  Marschblock-Hügel + 6 Feuer-Werfer-Gasse (eine Insel)
    { type: 'mound', pos: [-7, Y4, -126], radius: 4, height: 1.2 },
    { type: 'hill', pos: [7, Y4, -130], radius: 4.5, height: 2.4, steps: 2 },
    { type: 'platform', pos: [-11, Y4, -141], size: [5, 2, 3], style: 'stone' },
    // Zwillingsfelder: Holzbühne mit Rosenbogen
    { type: 'platform', pos: [8, Y4, -146], size: [8, 1.2, 8], style: 'wood' },
    { type: 'deco_w1', items: [{ kind: 'arch', pos: [8, Y4 + 1.2, -143.2], width: 2.4, height: 3.2 }] },
    sign(2.6, Y4, -141.4, 'Zwillingsfelder:\nbeide zugleich!', { size: [3, 1.1] }),
    { type: 'deco', items: [
      { kind: 'bush', pos: [2.6, Y4, -136], size: 0.7 }, { kind: 'rock', pos: [-1.6, Y4, -148], size: 0.6 },
    ] },
    { type: 'deco_w1', items: [{ kind: 'daisies', pos: [0, Y4, -134], size: [28, 28], n: 22 }, { kind: 'tufts', pos: [0, Y4, -134], size: [28, 28], n: 12 }] },

    // 6  Gasse: niedrige Hecken, Einweg-Bühne des Werfers, Felsturm mit Röhre, erscheinende Treppe
    { type: 'platform', pos: [0, 8.6, -169], size: [6, 0.4, 2.6], style: 'wood', oneWay: true },
    { type: 'platform', pos: [6, Y4, -180], size: [4, 7, 4], style: 'block', color: 'pink' },
    { type: 'pipe', id: 'rohr_gasse', pos: [6, 13.2, -180], height: 1.2, radius: 0.9, target: 'rohr_ziel' },
    { type: 'appear', id: 'treppe', style: 'block', parts: [
      { pos: [-3, 6.6, -179.4], size: [2, 0.8, 2], color: 'yellow' },
      { pos: [-1, 7.8, -180.4], size: [2, 0.8, 2], color: 'red' },
      { pos: [1, 9.0, -179.4], size: [2, 0.8, 2], color: 'blue' },
      { pos: [3, 10.4, -180.4], size: [2, 0.8, 2], color: 'green' },
    ] },
    sign(-8.6, Y4, -152, 'Besiege den Feuer-Werfer –\ndann kommt die Treppe!', { size: [3.6, 1.1] }),

    // ======================================================== 7  Zielhügel (jenseits der Schlucht)
    { type: 'deco_w1b', items: [{ kind: 'flag', pos: [7.2, 13.2, -178.6], size: 2.2, color: 'pink' }, { kind: 'flag', pos: [11.4, 10, -223.6], size: 2.2, color: 'yellow' }] },
    { type: 'pipe', id: 'rohr_ziel', pos: [-2, Y7, -206], height: 1.2, radius: 0.9 },
    sign(-2.6, Y7, -213.2, 'Viererlift: nur zu viert!\nAn die Hecke, dann nach rechts!', { size: [3.6, 1.1] }),
    // Viererlift in der rechten Ecke eines Pferchs vor dem Turm (Stern 3 oben): an die Turmwand und dann nach rechts
    // drücken sammelt die Figuren auf dem Lift. Kletterwand links am Turm (Krallen-Anzug als Alternative).
    { type: 'platform', pos: [10, Y7, -222], size: [4, 7, 4], style: 'block', color: 'purple' },
    { type: 'wall', pos: [7.8, Y7, -222], size: [0.4, 7, 4], climbable: true },
    { type: 'multilift', id: 'vierer', pos: [10, Y7, -218], size: [4, 0.5, 4], rise: 7, need: 4 },
    { type: 'platform', pos: [6, Y7, -214.8], size: [12, 0.2, 2.4], style: 'wood' },
    { type: 'platform', pos: [4, Y7, -218], size: [8, 0.4, 4], style: 'wood' },
    // Zielhügel
    { type: 'hill', pos: [-4, Y7, -226], radius: 5.5, height: 2, steps: 2 },
    { type: 'deco', items: [
      { kind: 'fence', from: [-13, Y7, -219], to: [-9, Y7, -219] },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'daisies', pos: [0, Y7, -218], size: [28, 28], n: 22 }, { kind: 'tufts', pos: [0, Y7, -218], size: [28, 28], n: 10 },
      { kind: 'butterflies', pos: [-4, Y7 + 2, -226], n: 4, r: 2.6, h: 1.6 },
      { kind: 'picnic', pos: [11.4, Y7, -207.4], yaw: -0.4, size: [1.8, 1.4] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [3.6, Y1 + 2.3, -9.5], content: 'wachstumsbeere' },
    { kind: 'question', pos: [9, Y2 + 2.3, -42], content: 'funken' },
    { kind: 'hidden', pos: [-3.6, Y2 + 2.3, -84.2], content: 'spiegel' },
    { kind: 'question', pos: [2.4, Y4 + 2.3, -94.6], content: 'krallen' },
    { kind: 'hidden', pos: [9.6, Y4 + 3 + 2.3, -101.4], content: 'oneup' },
    { kind: 'wachs_block', id: 'wachs', pos: [-9, Y4 + 2, -110], height: 5, last: 'coins:5' },
    // ?-Block mit Spiegelfrucht, links und rechts je eine Münze (?-Blöcke sind teure Instanzen: Dreiecksbudget mit fünf Figuren)
    { kind: 'coin', pos: [-12.6, Y4 + 2 + 2.4, -141] },
    { kind: 'question', pos: [-11, Y4 + 2 + 2.3, -141], content: 'spiegel' },
    { kind: 'coin', pos: [-9.4, Y4 + 2 + 2.4, -141] },
    { kind: 'hidden', pos: [13.2, Y4 + 2.3, -139.6], content: 'spiegel' },
    { kind: 'hidden', pos: [0, Y7 + 2.3, -214.6], content: 'spiegel' },
  ],
  enemies: [
    { kind: 'rollpilz', id: 'rp1', pos: [-4, Y1, -13], path: [[-7, Y1, -13], [7, Y1, -13]] },
    { kind: 'rollpilz', id: 'rp2', pos: [4, Y1, -19], path: [[7, Y1, -19], [-7, Y1, -19]] },
    { kind: 'marschblock', id: 'mb_t1', path: [[-1.8, Y2, -55], [-1.8, Y2, -74]], count: 3, colors: ['red', 'yellow', 'blue', 'green'] },
    { kind: 'marschblock', id: 'mb_t2', path: [[1.8, Y2, -74], [1.8, Y2, -55]], count: 3, phase: 0.35, colors: ['purple', 'orange', 'red', 'blue'] },
    { kind: 'marschblock', id: 'mb_huegel', path: [[-12.5, Y4, -120.5], [-1.5, Y4, -120.5], [-1.5, Y4, -131.5], [-12.5, Y4, -131.5]], count: 5, spacing: 1.4 },
    { kind: 'marschblock', id: 'mb_gasse', path: [[-4.4, Y4, -158], [4.4, Y4, -158]], count: 3, colors: ['yellow', 'green', 'orange', 'purple'] },
    { kind: 'feuer_werfer', id: 'werfer', weapon: 'feuer', pos: [0, Y4, -167.6], heights: [Y4, 9.0], sight: 14 },
  ],
  items: [
    // 1
    { kind: 'powerup', pos: [0, Y1, -6], power: 'spiegel' },
    line([0, Y1 + 0.4, 2.5], [0, Y1 + 0.4, -1.5], 3),
    ring([0, Y1 + 0.4, -16], 2.2, 4),
    { kind: 'bunny', id: 'hase', pos: [-9, Y1, -16.6], area: { min: [-12.4, -20.2], max: [-6.2, -13] }, speed: 4.6 },
    line([0, Y1 + 0.4, -23], [0, Y2 + 0.4, -29], 3),
    // 2
    line([6, Y2 + 0.4, -32], [6, Y2 + 0.4, -37], 2),
    arc([9, Y2 + 0.4, -45], [9, Y2 + 3.8, -42], 3, 1),
    line([0, Y2 + 0.4, -45], [0, Y2 + 0.4, -49], 2),
    // 3 Tunnel
    line([0, Y2 + 0.4, -57], [0, Y2 + 0.4, -71], 4),
    { kind: 'pfeld', id: 'pf_nische', pos: [-6.9, Y2, -66], size: [2.6, 2.6], need: 2,
      on: [{ coins: 10 }, { power: 'oneup', pos: [-6.9, Y2 + 0.6, -66.4] }] },
    { kind: 'pfeld', id: 'pf_tor', pos: [0, Y2, -78.6], size: [2.6, 2.6], need: 2, on: { start: 'tor' } },
    // Glasrohr-Abzweig: versteckte Münzen
    { kind: 'coin', pos: [-4, 9.6, -90] }, { kind: 'coin', pos: [-8, 8.4, -91.2] },
    // 4
    ring([5, Y4 + 2.4, -101], 0.5, 2), { kind: 'coin', pos: [9.6, Y4 + 3.5, -101.4] }, { kind: 'coin', pos: [7.2, Y4 + 1.5, -103.4] },
    line([0, Y4 + 0.4, -101], [0, Y4 + 0.4, -110], 3),
    line([0, Y4 + 0.6, -116], [0, Y4 + 0.6, -116], 1),
    // 5
    { kind: 'powerup', pos: [-7, Y4 + 1.2, -126], power: 'spiegel' },
    { kind: 'roter_ring', id: 'ring', pos: [7, Y4 + 2.4, -130], yaw: Math.PI / 2,
      coins: { pos: [7, Y4 + 0.45, -130], r: 6, n: 8 }, time: 12, reward: [{ coins: 10 }, { power: 'spiegel' }] },
    line([-11, Y4 + 2.4, -139.6], [-11, Y4 + 2.4, -142.4], 2),
    { kind: 'pfeld', id: 'zw_a', pos: [6.9, Y4 + 1.2, -145.6], size: [1.8, 1.8], group: 'zwilling', need: 1, on: { star: 1 } },
    { kind: 'pfeld', id: 'zw_b', pos: [9.1, Y4 + 1.2, -145.6], size: [1.8, 1.8], group: 'zwilling', need: 1 },
    line([0, Y4 + 0.4, -138], [0, Y4 + 0.4, -148], 3),
    // 6
    { kind: 'task', id: 'werfer_task', area: { min: [-6, Y4 - 1, -184], max: [6, 14, -150] }, ids: ['werfer'], reward: { reveal: 'treppe' } },
    line([0, Y4 + 0.4, -154], [0, Y4 + 0.4, -161], 3),
    arc([-3, 7.8, -179.4], [-1, 9, -180.4], 2, 0.8), arc([1, 10.2, -179.4], [3, 11.6, -180.4], 2, 0.8),
    { kind: 'coins', pos: [6, 14.6, -180], r: 1.4, n: 4 },
    // 7
    { kind: 'powerup', pos: [2.4, Y7, -209.6], power: 'spiegel' },
    { kind: 'powerup', pos: [4.6, Y7, -211.6], power: 'spiegel' },
    line([-2, Y7 + 0.4, -211], [-2, Y7 + 0.4, -216], 2),
    { kind: 'coins', pos: [10, 11, -222], r: 1.3, n: 4 },
    line([-4, Y7 + 1.4, -221], [-4, Y7 + 2.4, -223], 2),
    // Level-Haken (brennende Laterne am Start)
    hook([-3.4, Y1, 7.2], setup),
  ],
  checkpoint: { pos: [0, Y4, -98.6], yaw: Math.PI / 2 },
  stars: [
    { pos: [-1.95, Y2 + 0.4, -38.525], hidden: true, id: 'stern_kiste' },    // 1: hintere rechte Kiste im Kistenfeld
    { pos: [8, Y4 + 3.4, -148.2], hidden: true, id: 'stern_zwilling' },   // 2: Zwillingsfelder (zwei Figuren)
    [10, 10.4, -222.6],                                                     // 3: Turm am Viererlift
  ],
  stamp: [-11.6, Y4 + 6, -110.6],
  goal: { pos: [-4, Y7 + 2, -226.6], height: 9 },
  marks: {
    start: [0, Y1, 5], frucht1: [0, Y1, -6], kisten: [-3, Y2, -38], funken: [9, Y2, -42], tunnel: [0, Y2, -52],
    nische: [-6.9, Y2, -66], pf_tor: [0, Y2, -78.6], platz: [0, Y2, -82], checkpoint: [0, Y4, -98.6], wachs: [-9, Y4, -110],
    stempel: [-11.6, Y4 + 6, -110.6], bruecke: [0, Y4, -116], huegel: [-7, Y4, -126], ring: [7, Y4, -130],
    zwilling: [8, Y4 + 1.2, -145.6], gasse: [0, Y4, -156], werfer: [0, Y4, -167.6], turm: [6, 13.2, -180],
    ziel_rohr: [-2, Y7, -206], lift: [10, Y7, -218], stern3: [10, 10.4, -222.6], goal: [-4, Y7 + 2, -226.6],
  },
};
