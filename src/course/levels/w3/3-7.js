// 3-7 „Ahornklamm“ – Herbstwald über einer tiefen Klamm (Welt 3), Parcours nach −Z, ≈ 235 m. Kernidee: Schalttafeln
// auf Schienen – sie fahren nur, solange jemand draufsteht; an Weichen entscheidet die Neigung (Stick seitlich bzw.
// Stellung auf der Tafel), ein Schaltblock kehrt die Fahrtrichtung des ganzen Netzes um. Thema `autumn`, Musik
// `course_autumn`, 500 s.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild; Inseln y 1, Schienen-Oberkante y 0,25 → Tafel 1,0):
//   1  Schienenstart (z 12 … −47)    Herbstwiese mit Laubhaufen, Kürbissen, Fliegenpilzen, Eichhörnchen; Holzbrücke
//                                    zum Bahnsteig. Tafel 1 fährt über die Klamm zu Tafel 2 – deren Schiene zeigt
//                                    zurück: Schaltblock darüber stoßen, dann geht es weiter (Brummer).
//   2  Funkenzone    (z −47 … −112)  Tafel 3 fährt bis zum Prellbock; Schaltblock stoßen → zurück, an der Weiche nach
//                                    links (Bildschirm) in die Kehrschleife → Checkpoint-Insel. Funkenläufer an der Blockkante
//                                    und auf Seitenspuren der Tafel (ausweichen = auf die andere Tafelseite); Funkenkäfer. Während dieser dritten
//                                    Fahrt: Sprung auf die Plattform mit drei Zeit-Uhren und Röhre → Fallraum (Stern 1).
//   3  Wasserfall    (z −112 … −187) Tafel 4 fährt hinter dem Wasserfall entlang und durch die Felsgasse zum
//                                    Umstieg; Tafel 5: an der Weiche nach links kippen → Seitenast unter der Felsnase
//                                    (ducken!) mit Stern 2, dann zurück aufs Hauptgleis (Funkenläufer auf der rechten Spur).
//   4  Ziel          (z −187 … −237) Tafel 6: geradeaus zur Zielinsel (Laubhügel, Zielmast); ganz rechts die
//                                    Diagonalschiene zu Stern 3, von dort links hinab auf die tiefere Plattform mit dem
//                                    Stempel und über die Holzbrücke hinauf zur Zielinsel.
// Geheimnis 1-Up: Laubhaufen unter der großen Eiche am Start. Gegner: Brummer 10, Funkenkäfer 7, Funkenläufer 5,
// Münzmarder 1. Level-Haken (LEVEL.setup, _helpers_d.js): Wasserfall, Teich tief unten, Laubhaufen, Kürbisse,
// Fliegenpilze, Eichhörnchen, Zeit-Uhren.

import { isl, line, ring, arc, levelSetup, felsen, laubhaufen, kuerbisse, fliegenpilze, eichhoernchen, wasserfall, teich, zeitUhren, instanceEnemies, hohlerBaum, laubTeppich, vogelscheuche } from './_helpers_d.js';

const Y = 1;        // Inseln
const R = 0.25;     // Schienen-Oberkante (Tafel-Oberkante 1,0)
const T = R + 0.75; // Tafel-Oberkante

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 0.95], yaw: o.yaw ?? 0 });
const land = (x0, x1, zA, zB, top = Y, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { under: 3, ...o });
const rail = (net, path, o = {}) => ({ type: 'schiene', net, path: path.map(([x, z]) => [x, R, z]), radius: o.radius ?? 3, ...o });
const board = (id, net, x, z) => ({ type: 'schalttafel', id, net, at: [x, R, z] });

/** Level-Haken: Wasserfall, Felsen, Laubhaufen, Kürbisse, Pilze, Eichhörnchen, Zeit-Uhren. */
function setup(level) {
  // Klammwand mit Wasserfall (Schiene läuft dahinter), Felsgasse rechts, Felsnase über dem Seitenast
  felsen(level, [
    [-18, 11.4, -126.6, -134, -14, 13], [-9, 11.4, -122.2, -126.6, 11.2, 13], [14.6, 22, -126.6, -134, -14, 9],
    [11.4, 14.6, -126.6, -134, 7.2, 13, null, { camIgnore: true }],
    [4.6, 10.4, -159.4, -162.6, 1.85, 4.6], [3, 4.6, -159.4, -162.6, -14, 4.6],
  ], { color: 0xa8866a, dark: 0x5e4a3a, top: 0xc4b44a });
  wasserfall(level, { x0: -8.4, x1: 10.8, z: -122.4, top: 11.4, bottom: -13, bulge: 1.1, speed: 0.6 });
  teich(level, [-22, -100, 26, -146], -13.2);
  laubhaufen(level, [
    { pos: [-6.5, Y, 4], coins: 3 }, { pos: [6.4, Y, 6.5], coins: 3 }, { pos: [-6.6, Y, 2.8], content: { power: 'oneup' }, size: 1.2 },
    { pos: [5.6, Y, -50.6], coins: 3 }, { pos: [-6.4, Y, -54], coins: 2 },
    { pos: [-13, Y, -110], coins: 3 }, { pos: [-5.4, Y, -103.6], coins: 2 },
    { pos: [16.4, Y, -140.6], coins: 3 },
    { pos: [8.6, Y, -193.4], coins: 3 }, { pos: [17.6, Y, -189.4], coins: 2 },
    { pos: [-7.4, Y, -205], coins: 3 }, { pos: [5.6, Y, -232], coins: 3 }, { pos: [-8, Y, -230], coins: 2 },
    { pos: [21.6, -1.6, -219], coins: 3 },
  ]);
  laubTeppich(level, [
    [-10.6, 0.4, 10.6, 11.6, Y, 90], [-4.6, -6, 4.6, -3.6, Y, 14], [-8.6, -55.6, 8.6, -48, Y, 50], [-14.6, -111.6, -4.4, -102, Y, 45],
    [9, -141.6, 17.6, -135, Y, 30], [7.4, -194.6, 18.6, -188, Y, 35], [-9.6, -236.6, 10, -200.4, Y, 130], [18.8, -220.6, 23, -212, -1.6, 14],
    [-33, -58, -20, 14, 2.6, 60], [31, -88, 43, 14, 2.6, 60], [-33, -238, -20, -136, 2.6, 60], [31, -238, 43, -136, 2.6, 60], [3.8, -81.4, 8.2, -76.6, 2.2, 10],
  ]);
  kuerbisse(level, [
    [-3.4, Y, 8.6, 0.55], [-2.6, Y, 9.4, 0.38], [7.8, Y, 1.2, 0.75], [8.6, Y, 2.4, 0.42], [-8.6, Y, -50, 0.6],
    [-13.4, Y, -104, 0.5], [9.4, Y, -141, 0.45], [17.4, Y, -193.6, 0.6],
    [-6, Y, -218, 0.85], [-4.8, Y, -219.4, 0.5], [-7.4, Y, -220, 0.42], [4.4, Y, -226, 0.65], [5.6, Y, -225, 0.38], [-8.6, Y, -226, 0.7, 0xffb030],
  ]);
  fliegenpilze(level, [[-9, Y, 7.4, 0.7], [-8.4, Y, 8.2, 0.45], [8.6, Y, -55, 0.55], [-14, Y, -108.4, 0.6], [17.4, Y, -137.6, 0.5], [-9, Y, -233.4, 0.75], [-8.2, Y, -234.2, 0.45], [8.4, Y, -203.6, 0.5]]);
  eichhoernchen(level, [
    { pos: [4.6, Y, 8.4], spots: [[4.6, Y, 8.4], [6.4, Y, 6.8], [3.2, 2.0, 7.2]] },
    { pos: [-12.2, Y, -106], spots: [[-12.2, Y, -106], [-13.4, Y, -109], [-11.6, Y, -111]], yaw: 0.6 },
    { pos: [3, Y, -231], spots: [[3, Y, -231], [6.4, Y, -228.6], [1.4, Y, -233.6]], yaw: 2 },
  ]);
  vogelscheuche(level, -7.2, Y, -224, 0.4);
  vogelscheuche(level, 8.4, Y, 5.6, -0.3);
  zeitUhren(level, [[4.6, 3, -79.4], [5.8, 3, -79.4], [7, 3, -79.4]], { id: 'uhren' });
  // Fallraum: hohler Baum mit Baumpilz-Simsen
  hohlerBaum(level, { x: 80, z: -80, r: 5.4, y0: 1, y1: 44, shelves: [[-0.9, 30, 2.4], [1.0, 22, 2.2], [-1.1, 12, 2.4], [0.9, 6, 2]] });
  // Wolken der Kulisse unter den Inseln würden in der Klamm wie Schneeflecken wirken: tiefer legen (unter den Boden)
  for (const c of level.view?.sky?.cloudData ?? []) if (c.y < 0) c.y = -60;
  // gleiche Gegner-Modelle als Instanzen (Brummer, Funkenkäfer, Funkenläufer)
  instanceEnemies(level, ['brummer', 'funkenkaefer', 'funkenlaeufer'], { far: 46 });
}

export const LEVEL = {
  id: '3-7',
  world: 3,
  title: 'Ahornklamm',
  archetype: 'parcours',
  theme: 'autumn',
  music: 'course_autumn',
  timeLimit: 500,
  killY: -14,
  setup: levelSetup(setup),
  start: { pos: [0, Y, 8], yaw: Math.PI / 2 },
  camera: [
    { from: 16, to: -46, pitch: 44, dist: 13 },
    { from: -46, to: -100, pitch: 45, dist: 13.5 },
    { from: -100, to: -116, pitch: 44, dist: 13 },
    { from: -116, to: -136, pitch: 41, dist: 12 },
    { from: -136, to: -188, pitch: 45, dist: 13 },
    { from: -188, to: -240, pitch: 43, dist: 13.5 },
    // Fallraum (abseits): flacher, damit der Schacht von vorn zu sehen ist
    { from: -70, to: -92, pitch: 26, dist: 15, x: 80, xLock: 0.85, area: [68, 92] },
  ],
  segments: [
    // ======================================================== Kulisse: bewaldete Ränder der Klamm
    land(-34, -19, 16, -60, 2.6, 5), land(-34, -20, -60, -126.6, 3.4, 6), land(-34, -19, -134, -240, 2.6, 5),
    land(30, 44, 16, -90, 2.6, 5), land(24, 40, -90, -126.6, 3.4, 6), land(30, 44, -134, -240, 2.6, 5),
    { type: 'deco_w3', shadow: false, items: [
      { kind: 'herbstbaeume', pos: [-26, 2.6, -22], size: [12, 70], n: 9, gap: 5, scale: [1.2, 1.9] },
      { kind: 'herbstbaeume', pos: [-27, 3.4, -93], size: [12, 60], n: 8, gap: 5, scale: [1.2, 1.9] },
      { kind: 'herbstbaeume', pos: [-26, 2.6, -186], size: [12, 100], n: 11, gap: 5, scale: [1.2, 1.9] },
      { kind: 'herbstbaeume', pos: [37, 2.6, -36], size: [12, 100], n: 11, gap: 5, scale: [1.2, 1.9] },
      { kind: 'herbstbaeume', pos: [32, 3.4, -108], size: [12, 34], n: 5, gap: 5, scale: [1.2, 1.9] },
      { kind: 'herbstbaeume', pos: [37, 2.6, -186], size: [12, 100], n: 11, gap: 5, scale: [1.2, 1.9] },
    ] },

    // ======================================================== 1  Schienenstart
    land(-11, 11, 12, 0),
    { type: 'bridge', from: [0, Y, 0], to: [0, Y, -3.4], width: 2.6, color: 0xb07a48 },
    land(-5, 5, -3.4, -6),
    sign(-4.6, Y, 9.4, 'Ahornklamm'),
    sign(3.4, Y, -4.8, 'Schalttafel: fährt nur,\nwenn du draufstehst!', { size: [3.2, 1.1] }),
    { type: 'deco_w3', items: [
      { kind: 'herbstbaum', pos: [-8.6, Y, 1.4], size: 5.4 }, { kind: 'herbstbaum', pos: [8.6, Y, 9.6], size: 4.4 },
      { kind: 'herbstbaum', pos: [9.4, Y, -2.6], size: 3.8 }, { kind: 'herbstbaum', pos: [-9.6, Y, 9.6], size: 4 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'mushrooms', pos: [-5, Y, 9.6], size: 0.9, color: 'orange' }, { kind: 'stump', pos: [3.2, Y, 7.2], size: 0.55 },
      { kind: 'tufts', pos: [0, Y, 6], size: [20, 10], n: 10 }, { kind: 'haybale', pos: [9, Y, 4.6], yaw: 0.5 },
    ] },
    { type: 'deco', items: [{ kind: 'fence', from: [-11, Y, 11.6], to: [-5, Y, 11.6] }, { kind: 'fence', from: [5, Y, 11.6], to: [11, Y, 11.6] }] },
    rail('n1', [[0, -6.2], [0, -15], [2.5, -20], [2.5, -26.4]]),
    board('t1', 'n1', 0, -7.8),
    // Tafel 2 – ihre Schiene führt zurück (zur Kamera): Schaltblock darüber kehrt sie um
    rail('n2', [[-2, -46], [-2, -40.5], [0.5, -36.5], [0.5, -30.6]]),
    board('t2', 'n2', 0.5, -30.6),
    { type: 'schaltblock', id: 'sb2', pos: [0.5, T + 2.75, -31], net: 'n2' },

    // ======================================================== 2  Funkenzone
    land(-9, 9, -47.6, -56),
    { type: 'platform', pos: [-4.5, Y, -51], size: [2.2, 1.2, 2.2], style: 'block', color: 'blue' },
    sign(5, Y, -48.6, 'Prellbock? Schaltblock stoßen!\nAn der Weiche nach links', { size: [3.6, 1.1] }),
    rail('n3', [[0, -56.4], [0, -90]]),
    rail('n3', [[-9.5, -100], [-9.5, -72], [-9, -66], [-6.5, -62.5], [-3, -62], [-0.7, -65], [0, -70]], { radius: 2 }),
    board('t3', 'n3', 0, -58),
    { type: 'schaltblock', id: 'sb3a', pos: [2.6, Y + 2.4, -53.4], net: 'n3' },
    { type: 'schaltblock', id: 'sb3b', pos: [0, T + 2.75, -89.6], net: 'n3' },
    // Plattform mit Zeit-Uhren und Röhre zum Fallraum
    land(3.6, 8.4, -76.4, -81.6, 2.2, 3),
    { type: 'pipe', id: 'p_fall', pos: [7.3, 2.2, -77.4], height: 1.2, radius: 0.85, target: [76.6, 40.4, -80.6] },
    // Checkpoint-Insel
    land(-15, -4, -101.6, -112),
    { type: 'deco_w3', items: [{ kind: 'herbstbaum', pos: [-14, Y, -111], size: 4.2 }, { kind: 'herbstbaum', pos: [-5, Y, -111.2], size: 3.4 }] },

    // ======================================================== Fallraum (abseits, x 80): hohler Baum (Stamm im Level-Haken)
    land(73, 87, -73, -87, 1, 3),
    { type: 'platform', pos: [76.6, 39.6, -80.6], size: [2.6, 0.4, 3], style: 'wood' },
    { type: 'pipe', id: 'p_fall_aus', pos: [83, 1, -83], height: 1.2, radius: 0.85, target: [-7, Y + 0.4, -108] },

    // ======================================================== 3  Wasserfall
    rail('n4', [[-9.5, -112.4], [-9.5, -119], [-6, -124.6], [10, -124.6], [13, -128], [13, -133]]),
    board('t4', 'n4', -9.5, -114),
    land(8.5, 18, -134.6, -142),
    sign(16.6, Y, -136, 'Weiche: links kippen?\nDann ducken!', { size: [3, 1.1] }),
    rail('n5', [[13, -142.4], [13, -186]]),
    rail('n5', [[13, -148], [10, -152], [7.5, -156], [7.5, -166], [10, -170], [13, -174]]),
    board('t5', 'n5', 13, -144),

    // ======================================================== 4  Ziel
    land(7, 19, -187.6, -195),
    { type: 'platform', pos: [16.4, Y, -191], size: [2, 1, 2], style: 'block', color: 'orange' },
    rail('n6', [[12, -195.4], [12, -214]]),
    rail('n6', [[12, -199], [16, -203], [22, -209], [26, -213]], { radius: 2 }),
    board('t6', 'n6', 12, -197),
    land(-10, 10.4, -200, -237),
    { type: 'mound', pos: [-2.6, Y, -227], radius: 5, height: 1.4 },
    land(18.5, 23.4, -211.6, -221, -1.6, 2.4),
    { type: 'bridge', from: [18.5, -1.6, -219], to: [10.4, Y, -219], width: 2.2, color: 0xb07a48 },
    sign(-6.4, Y, -202, 'Fast geschafft!'),
    { type: 'deco_w3', items: [
      { kind: 'herbstbaum', pos: [-8.6, Y, -212], size: 5 }, { kind: 'herbstbaum', pos: [8, Y, -236], size: 4.4 },
      { kind: 'herbstbaum', pos: [-8.8, Y, -236], size: 4.2 }, { kind: 'herbstbaum', pos: [8.4, Y, -208], size: 3.6 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'mushrooms', pos: [3.4, Y, -205], size: 1, color: 'red' }, { kind: 'stump', pos: [-3.6, Y, -213], size: 0.6 },
      { kind: 'tufts', pos: [0, Y, -218], size: [18, 30], n: 14 }, { kind: 'haybale', pos: [7, Y, -222], yaw: -0.4 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [3, Y + 2.4, 3], content: 'funken' },
    { kind: 'question', pos: [-13, Y + 2.6, -106.6], content: 'coins:5' },
  ],
  enemies: [
    // Brummer (10)
    { kind: 'brummer', id: 'b1', center: [-5, 3.4, 6], radius: 2 },
    { kind: 'brummer', id: 'b2', center: [-5.6, 3.4, -50.6], radius: 2 },
    { kind: 'brummer', id: 'b3', path: [[5.6, 4, -49.6], [5.6, 4, -54.6]] },
    { kind: 'brummer', id: 'b4', center: [-12.6, 3.6, -108.4], radius: 1.8 },
    { kind: 'brummer', id: 'b5', pos: [6.2, 4.6, -80.4] },
    { kind: 'brummer', id: 'b6', center: [15.4, 3.6, -139.6], radius: 1.8 },
    { kind: 'brummer', id: 'b7', center: [20, 3.6, -162], radius: 1.8 },
    { kind: 'brummer', id: 'b8', center: [10, 3.6, -191], radius: 2 },
    { kind: 'brummer', id: 'b9', center: [-5, 3.4, -208], radius: 2.4 },
    { kind: 'brummer', id: 'b10', center: [0, 3.2, -222], radius: 2.8 },
    // Funkenkäfer (7)
    { kind: 'funkenkaefer', id: 'k1', pos: [3, 4, -51.6] },
    { kind: 'funkenkaefer', id: 'k2', pos: [4.6, 4.6, -87.6] },
    { kind: 'funkenkaefer', id: 'k3', center: [-5.6, 4.6, -70], radius: 2 },
    { kind: 'funkenkaefer', id: 'k4', pos: [14, 4.2, -138.4] },
    { kind: 'funkenkaefer', id: 'k5', path: [[10, 4.4, -164], [10, 4.4, -172]] },
    { kind: 'funkenkaefer', id: 'k6', pos: [19.6, 4.2, -205.4] },
    { kind: 'funkenkaefer', id: 'k7', center: [-4, 4, -210], radius: 2.2 },
    // Funkenläufer (5)
    { kind: 'funkenlaeufer', id: 'f1', block: { pos: [-4.5, Y, -51], size: [2.2, 1.2, 2.2] }, speed: 2.4 },
    // Funkenläufer auf einer Seitenspur der Tafel: auf die andere Tafelseite ausweichen (Springen hielte die Tafel an)
    { kind: 'funkenlaeufer', id: 'f2', path: [[0.95, T + 0.02, -72], [0.95, T + 0.02, -88]], speed: 2.6, wait: 0.4 },
    { kind: 'funkenlaeufer', id: 'f3', path: [[-8.55, T + 0.02, -78], [-8.55, T + 0.02, -95]], speed: 2.2, wait: 0.6 },
    { kind: 'funkenlaeufer', id: 'f4', path: [[13.95, T + 0.02, -150], [13.95, T + 0.02, -184]], speed: 2.6, wait: 0.5 },
    { kind: 'funkenlaeufer', id: 'f5', block: { pos: [16.4, Y, -191], size: [2, 1, 2] }, speed: 2.2 },
    // Münzmarder (1)
    { kind: 'muenzmarder', id: 'm1', path: [[3, Y, -204], [-6, Y, -206.4], [-8, Y, -214], [-4, Y, -222.6], [5, Y, -224], [7.4, Y, -232]], speed: 6, sight: 5.5, lead: 9 },
  ],
  items: [
    // 1
    line([0, Y + 0.5, 6], [0, Y + 0.5, 1], 3),
    line([0, T + 0.6, -10], [0, T + 0.6, -14.6], 3),
    arc([2.5, T + 0.6, -22], [2.5, T + 0.6, -25.6], 2, 0.4),
    line([-1.6, T + 0.6, -40], [-2, T + 0.6, -44], 3),
    // 2
    ring([0, Y + 0.6, -52], 1, 4),
    line([0, T + 0.6, -60], [0, T + 0.6, -68], 4),
    line([-9.5, T + 0.6, -76], [-9.5, T + 0.6, -96], 5),
    arc([-6.5, T + 0.8, -62.6], [-3, T + 0.8, -62], 2, 0.3),
    // Fallraum: Münzspur im Fall, Stern in der Mitte
    line([78.6, 36, -80], [80, 22, -80], 6),
    line([80, 13, -80], [80, 4, -80], 4),
    // 3
    line([-2, T + 0.6, -124.6], [8, T + 0.6, -124.6], 5),
    line([13, T + 0.6, -176], [13, T + 0.6, -184], 3),
    line([7.5, T + 0.5, -157], [7.5, T + 0.5, -159], 2),
    // 4
    line([12, T + 0.6, -204], [12, T + 0.6, -210], 3),
    line([18, T + 0.6, -205], [22, T + 0.6, -209], 3),
    line([12.2, -0.6, -219], [16.6, -1, -219], 3),
    arc([-2.6, Y + 0.6, -220], [-2.6, Y + 1.9, -223.4], 3, 0.6),
  ],
  checkpoint: { pos: [-9.5, Y, -106], yaw: Math.PI / 2 },
  stars: [
    [80, 17, -80],          // 1: Fallraum (Röhre auf der Uhren-Plattform während der dritten Schienenfahrt)
    [7.5, 1.55, -165],      // 2: Seitenast hinter der Felsnase (Weiche links kippen, darunter durchducken)
    [26, 2.4, -213],        // 3: Ende der Diagonalschiene ganz rechts
  ],
  stamp: [20.6, -1.0, -214.4],
  goal: { pos: [-2.6, Y + 1.4, -227], height: 9 },
  marks: {
    start: [0, Y, 8], steig: [0, Y, -4.6], t1: [0, T, -7.8], t2: [0.5, T, -30.6], f1: [0, Y, -50], t3: [0, T, -58],
    uhren: [5.8, 2.2, -79], fall: [76.4, 40, -80], checkpoint: [-9.5, Y, -106], t4: [-9.5, T, -114], umstieg: [13, Y, -138],
    t5: [13, T, -144], z1: [12, Y, -191], t6: [12, T, -197], ziel: [0, Y, -214], stempel: [20.6, -1.6, -214.4], goal: [-2.6, Y + 1.4, -227],
  },
};
