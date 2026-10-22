// 2-1 „Rieselschlucht“ – Wüstenschlucht mit Treibsand, Hackvögeln und Fliesenbrücken (Bauplan: Detail 2-1).
// Level verläuft nach −Z; die Route führt über Tafelberg-Plateaus (Oberseite y = 1) quer durch eine tiefe Schlucht,
// tief unten liegt der Wüstenboden mit Dünen und Felstürmen.
//
// Abschnitte (Länge entlang z):
//   1  Wüstenstart       z   9 … −21  (30 m) Sandstein-Terrasse mit Ortsschild, Rastplatz mit Palme und Picknick, ?-Block
//                                     mit Krallen-Anzug, links der Wachturm mit 5-m-Kletterwand (Stern 0 oben), Dünen-
//                                     kamel auf dem Felsrand. Hackvogel am Plateau-Ende, Treibsandbecken zwischen
//                                     roten Felswänden: Trittsteine (links) oder bröselnde Sandblöcke (rechts, Brummer).
//   2  Goldröhren-Wand   z −21 … −44  (23 m) zwei Hackvögel, links ein Ruinen-Podest, rechts eine 5,4 m hohe Wand:
//                                     hinter dem dritten Hackvogel ein Sprungfeld hinauf zur Goldröhre (Bonusraum mit
//                                     goldenem Schalter abseits bei x ≈ 90, z ≈ 60). Brummer, Felssäule über der Schlucht.
//   3  Oase              z −50 … −70  (20 × 20 m) Teich mit Unterwasser-Münzen, Palmen, Schilf, Checkpoint, Hackvogel,
//                                     Ruinen, Kamelmutter mit Jungtier; unsichtbarer Block mit Extraleben über dem
//                                     Säulenstumpf (Münzspur).
//   4  Fliesenbrücke     z −70 … −100 (30 m) erst ausweichende Fliesen (shift), Rast-Säule, dann kippende Fliesen (drop).
//   5  Schmale Brücke    z −100 … −146 (46 m) 1 m schmale Stege; Hackvögel auf Säulen hacken im Takt auf den Steg,
//                                     einer steht auf der Mittelinsel. Danach Plateau mit dem eingeschlossenen
//                                     Hackvogel im Ring aus acht grauen Steinblöcken (Stern 1 im Block nordöstlich).
//   6  Schlussstück      z −146 … −220 (74 m) Brummer, fließender Treibsand stürzt rechts in die Schlucht, Krümels
//                                     Picknick (ein Hackvogel bedrängt ihn → besiegen → Stern 2), bröselnde Sandblock-
//                                     Treppe zum Stempel-Sims, lange verschiebende Fliesenbrücke (slide), Zielmast.
// Sterne (Index): 0 Wachturm (Krallen-Anzug), 1 Steinblock im Hackvogel-Ring (nicht besiegen – hacken lassen),
//                 2 Krümels Hackvogel besiegen. Stempel: Sims über der Sandblock-Treppe vor der verschiebenden Brücke.
// Kulisse sparsam (Budget): Kakteen sparsam (≈ 0,4–0,8 k Dreiecke je Stück über `cacti`), Felstürme/Dünen billig.
// Wüstenzier (LEVEL.setup, nur Optik, keine neue Kollision): Sanddecken mit weichen Flecken, Windstreifen und Rippeln,
// Sandstein-Schichten an allen sichtbaren Wänden, Geröll und Grasbüschel am Wandfuß, Tierspuren, Tonkrüge, Knochen,
// Muscheln, Stoffbahn, Wegweiser, Marktstand-Rest, Sonnenschirm, Wimpelmast, Vogelnest, Trittplatten, nasses Oasenufer
// ohne Nahtlinien (Fugen-Abdeckungen), Echsen an den Wänden; statische Meshes je Bild per Quader ausgeblendet.

import {
  isl, line, ring, arc, column, blockRing, figure, bubble, farHide, shadowless, camel, tumbleweed,
  islandBoxes, desertTops, strataParts, rubbleParts, stoneParts, tuftParts, tuftSpots, rippleParts, rippleFields, trackParts,
  seamParts, bankParts, jarParts, boneParts, shellParts, clothParts, signpostParts, stallParts, parasolParts, pennantParts,
  flagstoneParts, reedParts, nestParts, featherParts, cacti, lizard, beetle, sandfall, bakeDeco, cullStatic,
} from './_helpers_a.js';

const Y = 1;           // Oberseite der Plateaus
const CAM = { pitch: 43, dist: 13.5, fov: 40, area: [-40, 40] };

/** Plateau (Tafelberg) mit Sanddecke, Unterkante −12. */
const plat = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, top + 12, { under: 3, ...o });
/** Felssäule aus der Schlucht (oben begehbar). */
const pillar = (x0, x1, zA, zB, top = Y) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });
/** Rote Schluchtwand (Kulisse). */
const cliff = (x0, x1, zA, zB, top) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });
/**
 * Wüstenboden tief unten mit Dünen und Felstürmen (Kulisse ohne Sonnenschatten, in LEVEL.setup über shadowless gebaut –
 * drei lange Stücke = drei Zeichenaufrufe, nicht im Schattenpass).
 */
const floor = (z, seed) => ({ type: 'deco_w2', items: [
  { kind: 'sandflaeche', pos: [0, -28, z], size: [160, 88], cell: 8, solid: false },
  { kind: 'duenen', pos: [-46, -28, z], size: [40, 80], n: 3, height: [4, 9], seed },
  { kind: 'duenen', pos: [46, -28, z], size: [40, 80], n: 3, height: [4, 9], seed: seed + 1 },
  { kind: 'felsen', pos: [-30, -28, z], size: [14, 80], n: 3, height: [22, 34], seed: seed + 2 },
  { kind: 'felsen', pos: [30, -28, z], size: [14, 80], n: 3, height: [20, 32], seed: seed + 3 },
  { kind: 'felsen', pos: [0, -28, z], size: [10, 70], n: 2, height: [5, 12], seed: seed + 4 },
] });
const FAR = [
  floor(-24, 11), floor(-111, 31), floor(-198, 51),
  { type: 'deco_w2', items: [{ kind: 'pyramide', pos: [-52, -28, -250], size: 40, steps: 8 }] },
];

// ------------------------------------------------------------------ Krümels Picknick (level-lokale Szene)
// Krümel kauert vor einer Säulenruine, ein Hackvogel (id 'hv_kruemel') hackt vor ihm in den Sand. Ist der Vogel besiegt,
// jubelt Krümel und bedankt sich (die Aufgabe 'task' lässt Stern 2 über ihm erscheinen). Aufgerufen aus LEVEL.setup.
const KRUEMEL = [-7.4, Y, -171.2];
function kruemelSzene(level) {
  let anim = 'scared', t = 0, said = false;
  const m = figure(level, 'kruemel', KRUEMEL, 0.15, () => ({ anim }));
  m?.root.scale.setScalar(1.3);
  if (level.view) level.view.shadows.add({ pos: { x: KRUEMEL[0], y: KRUEMEL[1], z: KRUEMEL[2] }, radius: 0.36, alive: () => true, visible: () => true });
  level.onStep((dt) => {
    t += dt;
    const bird = level.named.get('hv_kruemel');
    const free = !bird || bird.defeated || !bird.alive || bird.removed;
    if (free && anim === 'scared') { anim = 'cheer'; t = 0; }
    if (anim === 'cheer' && !said && t > 0.4) {
      said = true;
      const hero = level.player?.hero === 'greta' ? 'Greta' : 'Lotti';
      bubble(level, [KRUEMEL[0] + 0.4, KRUEMEL[1] + 2.6, KRUEMEL[2]], `Danke, ${hero}!`, '– Krümel', 4.5);
    }
  });
}

// ------------------------------------------------------------------ Wüstenleben (level-lokale Kulisse)
// Dünenkamele auf den Felsrändern (kauen, heben ab und zu den Kopf) und Steppenläufer, die über die Plateaus rollen.
function wuestenLeben(level) {
  camel(level, [12.8, 3.5, -3.2], { yaw: 2.3, phase: 0 });
  camel(level, [14.6, 4.5, -57.4], { yaw: Math.PI - 0.4, phase: 1.7 });
  camel(level, [15.2, 4.5, -60.4], { yaw: Math.PI + 0.3, scale: 0.6, phase: 3.1, blanket: [0xffc21a, 0x7a46d0] });
  tumbleweed(level, [-9.6, Y, -31], [9.6, Y, -26], { speed: 3, pause: 5 });
  tumbleweed(level, [-8.6, Y, -147.6], [8.6, Y, -153.6], { speed: 3.4, pause: 6, phase: 2 });
}

// ------------------------------------------------------------------ Wüstenzier (level-lokale Kulisse, nur Optik)
// Zusatzquader für Schichten/Sandfarben: Treibsandbecken und Sandstrom (Oberfläche y = 1), die Oase (Sandrand, wird
// mit eingefärbt) und die Kletterwand vor dem Wachturm (verdeckt dessen Vorderseite).
const POOL = { x0: 0, x1: 6, z0: -62.5, z1: -57.5, y: Y };
const MOUNDS = [{ x: -6.2, z: -208.6, r: 3, h: 0.8, y: Y }, { x: 6.8, z: -205.4, r: 2.4, h: 0.6, y: Y }];
const EXTRA_BOXES = [
  { x0: -7, x1: 7, z0: -21, z1: -9, y0: -0.2, y1: Y },
  { x0: -9, x1: 11, z0: -162, z1: -156, y0: -0.2, y1: Y },
  { x0: -2, x1: 8, z0: -64.5, z1: -55.5, y0: Y - 2.6, y1: Y, tops: true, noRipples: true },
  { x0: -10, x1: -4.4, z0: -1.6, z1: -1.0, y0: Y, y1: 7 },
];
// Kakteen (Formen und Kollision wie deco_w2 kaktus, Darstellung sparsam)
const KAKTEEN = [
  { pos: [-8.8, 1.8, 3.4], variant: 'saeule', size: 1.1, yaw: 0.6 },
  { pos: [8.4, Y, -6.8], variant: 'feige', yaw: 2.1 },
  { pos: [9.4, 6.4, -28.6], variant: 'gruppe', yaw: 4.0 },
  { pos: [9.6, 1.6, -52.2], variant: 'gruppe', yaw: 1.2 },
  { pos: [-1.8, Y, -85.8], variant: 'gruppe', size: 0.8, yaw: 5.1 },
  { pos: [13.4, 10, -122], variant: 'feige', yaw: 0.9 },
  { pos: [7.8, Y, -131.6], variant: 'saeule', yaw: 2.6 },
  { pos: [7.6, Y, -148.6], variant: 'gruppe', yaw: 3.3 },
  { pos: [3.6, Y, -164.6], variant: 'kugel', size: 0.8, yaw: 0.2 },
  { pos: [12, 5.8, -173.4], variant: 'saeule', size: 0.8, yaw: 4.4 },
  { pos: [-8, Y, -205.2], variant: 'saeule', size: 1.2, yaw: 1.7 },
  { pos: [88, Y, 54.8], variant: 'gruppe', size: 0.8, yaw: 2.9 },
];
// Stellen, an denen keine Streu-Zier liegen soll (Spielobjekte, Figuren, vorhandene Kulisse): [x, z, r]
const AVOID = [
  [0, 5, 1.6], [-7, 6.6, 1.2], [-3.6, 0.4, 0.8], [-2.6, -7.2, 1.4], [8.2, 2.8, 1.4], [8.4, 5.6, 0.9], [12.8, -3.2, 1.6],
  [3.4, -36.6, 1.6], [8.2, -33.2, 1.6], [1.6, -38.8, 0.8], [-8.6, -27.4, 1.1], [-8.8, -32.4, 1.1], [8.6, -23.2, 0.9],
  [-6, -57.2, 1.6], [-7, -66.4, 1.2], [-8.2, -52, 1.2], [-13, -57, 1], [14.6, -57.4, 1.8], [15.2, -60.4, 1.2],
  [1.9, -83.4, 1], [-6.6, -140.6, 1.1], [-5, -132.4, 1.2], [-7.4, -171.2, 1.6], [-5.4, -171.2, 1.2], [-6.6, -173.6, 1.5],
  [-7.8, -164.2, 1.1], [-8.3, -170.2, 1.1], [-8.2, -168, 0.9], [3.4, -180.8, 0.8], [12, -176, 1.6], [6.7, -178.4, 2.2],
  [-11.6, -176.4, 1.1], [0, -212, 2.2], [0, -217.4, 1.2], [-7.4, -212, 1], [-6.2, -208.6, 3.2], [6.8, -205.4, 2.6],
  ...KAKTEEN.map((k) => [k.pos[0], k.pos[2], 0.9 * (k.size ?? 1)]),
];
const TUFTS = [
  [-0.9, Y, -56.6, 1.1], [7.2, Y, -56.3], [-1.1, Y, -61.2, 0.9], [7.3, Y, -63.4, 1.2], [2.4, Y, -64.0], [5.2, Y, -56.1],
  [-9.2, 1.8, 7.8], [6.9, 1.8, 8.3], [-8.4, 2, -35.2], [-6.1, 2, -26.6], [10.4, 6.4, -30.2], [-7.6, 7, -3.0],
  [-2.2, Y, -86.2, 0.8], [8.3, Y, -145.2], [-8.4, Y, -136.4], [-8.6, Y, -158.0], [9.2, Y, -218.4], [-9.1, Y, -202.6],
];
const TRACKS = [
  { kind: 'vogel', y: Y, path: [[7.8, -1.6], [7.1, -3.2], [6.3, -4.3], [5.9, -5.3]] },
  { kind: 'vogel', y: Y, path: [[5.7, -63.2], [5.3, -64.6], [4.8, -66.4]] },
  { kind: 'vogel', y: Y, path: [[-2.8, -133.4], [-1.9, -134.6], [-0.6, -135.6], [0.2, -136.4]] },
  { kind: 'vogel', y: Y, path: [[6.8, -168.4], [5.9, -170.4], [4.9, -172.4]] },
  { kind: 'huf', y: 3.5, path: [[15.6, 7.4], [14.6, 3.4], [13.7, 0.3], [13.1, -2.2]] },
  { kind: 'huf', y: 4.5, path: [[16.2, -50.6], [15.7, -53.6], [14.9, -56.3]] },
  { kind: 'huf', y: 4.5, path: [[16.4, -67.4], [15.9, -64.2], [15.4, -61.4]], scale: 0.6 },
  { kind: 'echse', y: Y, path: [[-4.6, -203.2], [-3.2, -204.2], [-1.8, -203.4], [-0.6, -204.6], [0.8, -204.0]] },
  { kind: 'echse', y: Y, path: [[5.6, -25.0], [6.4, -26.4], [7.6, -26.8], [8.6, -28.4]] },
];
// Fugen-Abdeckungen: wo gleich hohe Teilstücke aneinanderstoßen (Oase, Ring-Plateau/Schlussstück)
const SEAMS = [
  { x0: -2.32, x1: -1.68, z0: -69.8, z1: -50.2, y: Y },
  { x0: -1.68, x1: 7.95, z0: -55.82, z1: -55.18, y: Y },
  { x0: -1.68, x1: 7.95, z0: -64.82, z1: -64.18, y: Y },
  { x0: -1.68, x1: -0.45, z0: -57.82, z1: -57.18, y: Y },
  { x0: -1.68, x1: -0.45, z0: -62.82, z1: -62.18, y: Y },
  { x0: 6.45, x1: 7.95, z0: -57.82, z1: -57.18, y: Y },
  { x0: 6.45, x1: 7.95, z0: -62.82, z1: -62.18, y: Y },
  { x0: -8.8, x1: 8.8, z0: -146.32, z1: -145.68, y: Y },
];
const JARS = [
  { pos: [9.3, 1.8, 4.4], kind: 'amphore', yaw: 0.4 }, { pos: [9.55, 1.8, 3.55], kind: 'topf', yaw: 1.2, band: 0xe0443a },
  { pos: [-5.2, 7, -8.2], kind: 'krug', lie: true, yaw: 2.2 },
  { pos: [-6.0, 2, -34.8], kind: 'amphore', yaw: -0.6 }, { pos: [-5.75, 2, -33.9], kind: 'krug', size: 0.8, band: 0xffc21a },
  { pos: [-9.3, 2, -35.4], kind: 'topf', broken: true, yaw: 0.8 },
  { pos: [10.1, 6.4, -37.6], kind: 'krug', yaw: 0.3 },
  { pos: [-9.3, Y, -53.4], kind: 'amphore', yaw: 1 }, { pos: [-8.75, Y, -54.3], kind: 'topf', lie: true, yaw: -0.4, band: 0xe0443a },
  { pos: [1.9, Y, -85.9], kind: 'krug', size: 0.85, yaw: 2 },
  { pos: [-7.7, Y, -142.3], kind: 'amphore', lie: true, yaw: 0.8, broken: true },
  { pos: [-8.6, Y, -172.7], kind: 'krug', band: 0xffc21a, yaw: 0.5 },
  { pos: [-8.5, Y, -215.6], kind: 'amphore', yaw: 2.4 }, { pos: [-7.8, Y, -216.5], kind: 'topf', yaw: 0.2 },
  { pos: [8.4, Y, -215.6], kind: 'krug', lie: true, yaw: 1.1 },
];
const BONES = [[-5.8, Y, -8.3, 0.6], [-12.6, 3, -66.2, 1.9], [7.4, Y, -143.6, 2.5], [6.2, Y, -211.2, -0.4, 0.9]];
const SHELLS = [
  { pos: [-3.9, Y, -3.4], kind: 'kamm', yaw: 0.3 }, { pos: [8.2, Y, -41.8], kind: 'schnecke', yaw: 1 },
  { pos: [-1.0, Y, -63.8], kind: 'kamm', color: 0xffd6a0, yaw: 2 }, { pos: [3.6, Y, -216.6], kind: 'schnecke', yaw: 2.2 },
  { pos: [-4.4, Y, -147.4], kind: 'kamm', yaw: 4 }, { pos: [6.6, Y, -153.6], kind: 'kamm', color: 0xffb0c8, yaw: 1.4 },
];
const CLOTHS = [{ from: [-8.6, 4.55, -27.4], to: [-8.8, 5.15, -32.4], sag: 0.55, w: 0.42 }];
const SIGNPOSTS = [{ pos: [2.1, Y, -52.1], arms: [{ yaw: 2.52, color: 0x2fb8b0, y: 1.5 }, { yaw: 1.68, color: 0xe0443a, y: 1.28 }, { yaw: -1.57, color: 0xffc21a, y: 1.06 }] }];
const STALL = { pos: [-11.9, 3, -60.8], yaw: Math.PI / 2 };
const PARASOL = { pos: [-8.3, Y, -174.4], r: 1.0, h: 2.0, tilt: 0.12 };
const PENNANT = { pos: [-9.5, 7, -2.2], h: 1.8, yaw: 0.4 };
const NEST = { pos: [-11.6, 7, -108.6], eggs: 3 };
// verlorene Hackvogel-Federn [x, y, z, Gier, Größe?, Farbe?]
const FEATHERS = [
  [6.9, Y, -4.4, 0.3], [3.3, Y, -68.9, 2.0, 0.9], [4.1, Y, -134.5, 0.6], [-0.5, Y, -140.3, 2.2, 0.9],
  [3.7, Y, -142.5, 4.1, 1.1, 0x2f58c0], [-4.1, Y, -169.5, 1.2], [-5.9, Y, -173.1, 3.5, 0.8, 0x2f58c0],
];
const FLAGSTONES = [
  { from: [-1.2, Y, 3], to: [1.4, Y, -7.6], n: 7 }, { from: [-2, Y, -22.4], to: [-1.2, Y, -34], n: 6 },
  { from: [-0.6, Y, -131], to: [-1, Y, -145], n: 7 }, { from: [0, Y, -163], to: [0, Y, -170], n: 5 },
];
const REEDS = [[0.35, 0.8, -62.15, 1.2], [5.7, 0.8, -57.85, 1.1], [5.65, 0.8, -62.1, 1.3], [0.4, 0.8, -59.3, 0.9]];
const SHORE_PAL = [0xe6dccb, 0xcdbfa6, 0xd9c9aa, 0xc2b49c, 0xb7c08a];
const SHORE = [
  [0.7, Y, -57.25, 0.24], [1.35, Y, -57.2, 0.17], [2.1, Y, -57.3, 0.2], [6.25, Y, -59.2, 0.22], [6.3, Y, -59.9, 0.16],
  [6.2, Y, -60.6, 0.25], [-0.25, Y, -62.75, 0.22], [0.5, Y, -62.8, 0.16], [3.8, Y, -62.75, 0.2], [4.4, Y, -62.8, 0.14],
];
// Instanz-Gruppen, die sonst immer gezeichnet werden (beide Pässe): Fliesen der drei Brücken (seitlich verschoben,
// kippend/fallend) und die Sandblöcke (Steg im Becken, Treppe zum Stempel-Sims)
const CULL_GROUPS = [
  { name: 'fliese:3x2x0.4', boxes: [[-4, -6, -100, 4, 2.6, -69.5], [-3.5, -2, -202.3, 3.5, 2.6, -181.5]] },
  { name: 'instanzen:sandblock', boxes: [[3.6, -2, -20.6, 5.6, 2, -9.6], [4.6, -2, -179, 8.8, 5.6, -177.8]] },
];
// Echsen an den Wänden (Kopf nach oben, je ein Zeichenaufruf in der Nähe)
const LIZARDS = [
  { pos: [9.97, 2.4, -3.8], normal: [-1, 0, 0], dir: [0, 1, 0.3], phase: 0 },
  { pos: [-6.2, -1.6, -49.97], normal: [0, 0, 1], dir: [1, 0.35, 0], phase: 2.5, color: 0x5fc0a0, scale: 1.8 },
  { pos: [3.8, -2.2, -129.97], normal: [0, 0, 1], dir: [-0.3, 1, 0], phase: 4.2, scale: 1.8 },
  { pos: [-4.6, -1.3, -201.77], normal: [0, 0, 1], dir: [1, 0.2, 0], phase: 1.3, color: 0x5fc0a0, scale: 1.8 },
];

function wuestenZier(level) {
  const kakteen = cacti(level, KAKTEEN);
  if (!level.view) return;
  const boxes = islandBoxes(LEVEL.segments, EXTRA_BOXES);
  const ctx = { boxes, pools: [POOL], mounds: MOUNDS };
  desertTops(level, ctx);
  const { parts: schichten, bases } = strataParts(boxes);
  const flach = {
    schichten,
    buesche: tuftParts([...tuftSpots(bases, { avoid: AVOID, boxes }), ...TUFTS]),
    rippel: rippleParts(rippleFields(ctx, { avoid: AVOID }), ctx),
    spuren: [...trackParts(TRACKS, ctx), ...featherParts(FEATHERS)],
    ufer: [...seamParts(SEAMS, ctx), ...bankParts(POOL, ctx)],
    platten: flagstoneParts(FLAGSTONES),
  };
  const schatten = {
    kakteen,
    geroell: rubbleParts(bases, { avoid: AVOID, boxes }),
    kruege: [...jarParts(JARS), ...boneParts(BONES), ...shellParts(SHELLS)],
    stoff: [...clothParts(CLOTHS), ...signpostParts(SIGNPOSTS), ...stallParts(STALL), ...parasolParts(PARASOL), ...pennantParts(PENNANT), ...nestParts(NEST)],
    oase: [...reedParts(REEDS), ...stoneParts(SHORE, 13, SHORE_PAL, 0.55)],
  };
  // Kennzahlen (Dreiecke je Gruppe) für Tests und Fehlersuche
  const tri = (list) => Math.round(list.reduce((a, g) => a + (g ? g.attributes.position.count / 3 : 0), 0));
  level.zier = {};
  for (const [k, list] of [...Object.entries(flach), ...Object.entries(schatten)]) level.zier[k] = tri(list);
  bakeDeco(level, Object.values(schatten).flat());
  bakeDeco(level, Object.values(flach).flat(), { cast: false, chunk: 32 });
  cullStatic(level, { groups: CULL_GROUPS });
  for (const L of LIZARDS) lizard(level, L.pos, L);
  beetle(level, [3.4, Y, -209.4], [6.2, Y, -210.9], { phase: 1 });
  // der fließende Treibsand stürzt rechts über die Kante in die Schlucht
  sandfall(level, { x: 11, z0: -161.9, z1: -156.1, y: Y, drop: 10, out: 1 });
}

export const LEVEL = {
  id: '2-1',
  world: 2,
  title: 'Rieselschlucht',
  archetype: 'parcours',
  theme: 'desert',
  music: 'course_desert',
  timeLimit: 400,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  killY: -12,
  // level-lokaler Code (Level-Haken): ferne Kulisse ohne Sonnenschatten, Wüstenzier (nur Optik), Krümels Szene,
  // Wüstenleben, Fernsicht für Gegner
  setup(level) {
    shadowless(level, FAR);
    wuestenZier(level);
    kruemelSzene(level);
    wuestenLeben(level);
    farHide(level, ['hackvogel', 'brummer'], 46);
  },
  camera: [
    { ...CAM, from: 12, to: -22, pitch: 45 },
    { ...CAM, from: -22, to: -46, pitch: 44.5, yaw: 6 },
    { ...CAM, from: -46, to: -70, pitch: 45 },
    { ...CAM, from: -70, to: -100, pitch: 46 },
    { ...CAM, from: -100, to: -130, pitch: 45, dist: 12.5 },
    { ...CAM, from: -130, to: -150, pitch: 45 },
    { ...CAM, from: -150, to: -182, yaw: -5 },
    { ...CAM, from: -182, to: -222, pitch: 42 },
    // Bonusraum (abseits)
    { from: 74, to: 46, pitch: 50, dist: 12.5, fov: 40, x: 90, xLock: 0.7, area: [70, 110] },
  ],
  segments: [
    // =============================================================== Kulisse: Wüste tief unten, Felstürme, Dünen
    // (Wüstenboden tief unten: FAR, in LEVEL.setup ohne Sonnenschatten gebaut)

    // =============================================================== 1  Wüstenstart
    plat(-10, 10, 9, -9),
    // Sandstein-Terrasse links vor dem Wachturm, Rastplatz rechts (je eine Stufe höher) mit Palme
    plat(-10, -4.4, 9, -1.6, 1.8),
    { type: 'sign', pos: [-7, 1.8, 6.6], text: 'Rieselschlucht' },
    plat(6.4, 10, 9, 1.4, 1.8),
    // Wachturm (6 m) mit Kletterwand vorn – Stern 0 oben
    cliff(-10, -4.4, -1.6, -9, 7),
    { type: 'wall', pos: [-7.2, Y, -1.3], size: [5.6, 6, 0.6], climbable: true },
    // Schluchtwände rechts/links des Starts
    cliff(-17, -10, 9, -9, 5),
    cliff(10, 17, 9, -9, 3.5),
    // Treibsandbecken zwischen Felswänden
    cliff(-13, -7, -9, -21, 4),
    cliff(7, 13, -9, -21, 4),
    { type: 'quicksand', id: 'becken', pos: [0, -0.2, -15], size: [14, 1.2, 12] },
    isl(-4, -2, -10.4, -12.4, 1.6, 2.2, { top: 'stone' }),
    isl(0.8, 2.8, -14, -16, 1.6, 2.2, { top: 'stone' }),
    isl(-3.2, -1.2, -17.6, -19.6, 1.6, 2.2, { top: 'stone' }),
    { type: 'sandblock', id: 'sandsteg', blocks: [[4.6, 0.6, -10.2], [4.6, 0.6, -11.2], [4.6, 0.6, -13.6], [4.6, 0.6, -14.6], [4.6, 0.6, -17], [4.6, 0.6, -18], [4.6, 0.6, -20]], respawn: 3 },
    { type: 'sign', pos: [-2.6, Y, -7.2], text: 'Vorsicht,\nTreibsand!' },
    { type: 'deco_w2', items: [
      { kind: 'palme', pos: [8.4, 1.8, 5.6], height: 4.8, lean: 0.3, sway: true },
      { kind: 'ruine', pos: [-7.4, 7, -7.4], height: 1.6 },
      { kind: 'felsen', pos: [-14, 5, 0], size: [5, 16], n: 3, height: [1.5, 4], solid: true },
      { kind: 'felsen', pos: [14, 3.5, 2], size: [5, 12], n: 3, height: [1.2, 3.5], solid: true },
      { kind: 'felsen', pos: [-10.4, 4, -12], size: [4, 6], n: 2, height: [1, 2.5] },
      { kind: 'felsen', pos: [10.4, 4, -17], size: [4, 6], n: 2, height: [1, 2.5] },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'sign', pos: [-3.6, Y, 0.4], arrow: 'left', yaw: 0.3 },
      { kind: 'picnic', pos: [8.2, 1.8, 2.8], yaw: -0.4, size: [1.4, 1] },
    ] },

    // =============================================================== 2  Goldröhren-Wand
    plat(-10, 10, -21, -44),
    // Ruinen-Podest links
    plat(-10, -5, -26, -36, 2),
    // hohe Wand rechts mit der Goldröhre oben (über das Sprungfeld)
    cliff(5.4, 11, -27.5, -39, 6.4),
    { type: 'trampoline', pos: [3.4, Y, -36.6], strength: 17 },
    { type: 'goldroehre', id: 'gold_ein', pos: [8.2, 6.4, -33.2], height: 1.4, target: 'gold_aus' },
    cliff(-17, -10, -21, -44, 6),
    cliff(11, 17, -21, -44, 4),
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [-8.6, 2, -27.4], height: 2.8 },
      { kind: 'ruine', pos: [-8.8, 2, -32.4], height: 3.2, broken: false },
      { kind: 'palme', pos: [8.6, Y, -23.2], height: 4 },
      { kind: 'felsen', pos: [-13.6, 6, -32], size: [5, 20], n: 4, height: [1.5, 5], solid: true },
      { kind: 'felsen', pos: [14, 4, -32], size: [5, 20], n: 3, height: [1.5, 4], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'sign', pos: [1.6, Y, -38.8], arrow: 'up', yaw: -0.2 },
    ] },
    // Felssäule über der Schlucht (z −44 … −50)
    pillar(-1.6, 1.6, -45.4, -48.6),

    // =============================================================== 3  Oase und Checkpoint
    plat(-10, -2, -50, -70),
    plat(8, 11, -50, -70, 1.6),
    plat(-2, 8, -50, -55.5),
    plat(-2, 8, -64.5, -70),
    { type: 'oase', id: 'oase', pos: [3, Y, -60], size: [6, 5], depth: 1.6, rim: 2, base: 1, palms: [[-0.2, -56, 4.6], [6.6, -64.2, 5.2]] },
    cliff(11, 17, -50, -70, 4.5),
    cliff(-17, -10, -50, -70, 3),
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [-7, Y, -66.4], height: 1.1, broken: true },
      { kind: 'ruine', pos: [-8.2, Y, -52], height: 3 },
      { kind: 'palme', pos: [-13, 3, -57], height: 4.6 },
      { kind: 'felsen', pos: [14, 4.5, -56], size: [4, 10], n: 2, height: [1.5, 3.5], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'lilypads', pos: [3.4, 0.79, -59.4], size: [4, 3], n: 4 },
      { kind: 'butterflies', pos: [3, Y, -60], n: 3, r: 2.6, h: 1.4, colors: [0xffb03a, 0xffffff, 0x3ad0ff] },
    ] },

    // =============================================================== 4  Fliesenbrücke
    // Fliesen 3 m mit 0,3 m Fuge: Länge = n·3 + (n−1)·0,3 (sonst verteilt der Baustein die Fliesen mit größeren Lücken)
    { type: 'fliesenbruecke', id: 'fb_shift', from: [0, Y, -70], to: [0, Y, -82.9], mode: 'shift', tile: 3, shift: 2.2, stay: 2.2 },
    pillar(-2.6, 2.6, -82.9, -86.6),
    { type: 'fliesenbruecke', id: 'fb_drop', from: [0, Y, -86.6], to: [0, Y, -99.5], mode: 'drop', tile: 3, delay: 0.7, respawn: 2.6 },
    cliff(-18, -11, -70, -100, 9),
    cliff(11, 18, -70, -100, 6),
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [1.9, Y, -83.4], height: 2.2, scale: 0.8 },
      { kind: 'felsen', pos: [-14.5, 9, -84], size: [5, 26], n: 5, height: [1.5, 5], solid: true },
      { kind: 'felsen', pos: [14.5, 6, -84], size: [5, 26], n: 4, height: [1.5, 4], solid: true },
    ] },

    // =============================================================== 5  Schmale Brücke
    plat(-5, 5, -99.5, -104),
    { type: 'schmale_bruecke', from: [0, Y, -104], to: [0, Y, -116] },
    pillar(0.85, 1.85, -108.4, -109.4),
    pillar(-2.4, 2.4, -116, -120.4),
    { type: 'schmale_bruecke', from: [0, Y, -120.4], to: [0, Y, -130] },
    pillar(-1.85, -0.85, -124.4, -125.4),
    cliff(-18, -11, -100, -130, 7),
    cliff(11, 18, -100, -130, 10),
    // Plateau mit dem eingeschlossenen Hackvogel
    plat(-9, 9, -130, -146),
    { type: 'sign', pos: [-5, Y, -132.4], text: 'Hackvögel\nhacken alles!' },
    cliff(-16, -9, -130, -146, 5),
    cliff(9, 16, -130, -146, 3.5),
    { type: 'deco_w2', items: [
      { kind: 'felsen', pos: [-14, 7, -116], size: [5, 26], n: 4, height: [1.5, 5], solid: true },
      { kind: 'felsen', pos: [14, 10, -114], size: [5, 26], n: 4, height: [1.5, 5], solid: true },
      { kind: 'ruine', pos: [-6.6, Y, -140.6], height: 2.6 },
      { kind: 'felsen', pos: [-12.5, 5, -138], size: [4, 12], n: 2, height: [1.5, 3] },
    ] },

    // =============================================================== 6  Schlussstück
    plat(-9, 9, -146, -156),
    // fließender Treibsand: strömt nach rechts und stürzt über die Kante in die Schlucht
    cliff(-15, -9, -146, -162, 4),
    { type: 'quicksand', id: 'sandfall', pos: [1, -0.2, -159], size: [20, 1.2, 6], flow: [1.7, 0] },
    plat(-9, 9, -162, -182),
    cliff(-15, -9, -162, -182, 5),
    // Stempel-Sims rechts oben, bröselnde Sandblock-Treppe
    cliff(9, 15, -170.5, -181.5, 5.8),
    { type: 'sandblock', id: 'treppe', blocks: [[5.4, 1.6, -178.4], [6.7, 2.9, -178.4], [8, 4.2, -178.4]], respawn: 2.5 },
    // lange verschiebende Fliesenbrücke zum Ziel
    { type: 'fliesenbruecke', id: 'fb_slide', from: [0, Y, -182], to: [0, Y, -201.8], mode: 'slide', tile: 3, slide: { amp: 1.4, period: 3.2, wave: 0.6 } },
    plat(-10, 10, -201.8, -220),
    { type: 'mound', pos: [-6.2, Y, -208.6], radius: 3, height: 0.8 },
    { type: 'mound', pos: [6.8, Y, -205.4], radius: 2.4, height: 0.6 },
    cliff(-16, -10, -200, -220, 6),
    cliff(10, 16, -200, -220, 4),
    cliff(15, 21, -146, -170, 3),
    { type: 'deco_w2', items: [
      { kind: 'felsen', pos: [-12, 4, -152], size: [4, 10], n: 3, height: [1.2, 3.5], solid: true },
      { kind: 'ruine', pos: [-7.8, Y, -164.2], height: 2.8 },
      { kind: 'ruine', pos: [-8.3, Y, -170.2], height: 1.6 },
      { kind: 'palme', pos: [-8.2, Y, -168], height: 4.4, lean: 0.35, sway: true },
      { kind: 'ruine', pos: [-11.6, 5, -176.4], height: 2.2 },
      { kind: 'felsen', pos: [18, 3, -158], size: [4, 18], n: 3, height: [2, 6] },
      { kind: 'bogen', pos: [0, Y, -217.4], width: 7.4, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'palme', pos: [-7.4, Y, -212], height: 4.6, sway: true },
      { kind: 'felsen', pos: [13, 4, -210], size: [4, 16], n: 3, height: [1.5, 4], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'picnic', pos: [-6.6, Y, -173.6], yaw: 0.3 },
      { kind: 'sign', pos: [3.4, Y, -180.8], arrow: 'up' },
      { kind: 'bunting', from: [-3.3, 6, -217.4], to: [3.3, 6, -217.4], sag: 0.6 },
      { kind: 'bunting', from: [-7.4, 4.2, -212], to: [-1.4, 4.6, -209.6], sag: 0.5 },
    ] },

    // =============================================================== Bonusraum (Goldröhre, abseits bei x ≈ 90, z ≈ 60)
    { type: 'room', pos: [90, Y, 60], size: [14, 6, 12], top: 'stone', style: 0xd9864a },
    { type: 'goldroehre', id: 'gold_aus', pos: [85, Y, 64], height: 1.4 },
    { type: 'goldroehre', id: 'gold_raus', pos: [95.5, Y, 64], height: 1.4, target: [-5.6, Y + 0.4, -52.6] },
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [84.6, Y, 55.4], height: 2.4 },
      { kind: 'ruine', pos: [95.4, Y, 55.4], height: 2.4 },
    ] },
  ],
  blocks: [
    // 1: ?-Block mit Krallen-Anzug rechts am Start
    { kind: 'brick', pos: [1.4, 3.4, -3.4] },
    { kind: 'question', pos: [2.4, 3.4, -3.4], content: 'krallenAnzug' },
    { kind: 'brick', pos: [3.4, 3.4, -3.4], content: 'coins:3' },
    // 2: Münz-Ziegel über dem Ruinen-Podest
    { kind: 'brick', pos: [-7.4, 4.4, -30.4], content: 'coins:6' },
    // 3: unsichtbarer Block mit Extraleben über dem Säulenstumpf
    { kind: 'hidden', pos: [-7, 3.6, -66.4], content: 'oneup' },
    // 5: Ring aus acht grauen Steinblöcken um den eingeschlossenen Hackvogel (Stern 1 im nordöstlichen Block)
    ...blockRing('steinblock', 2, Y, -138, { '1,-1': 'star:1', '0,1': 'coins:3', '-1,0': 'coin', '0,-1': 'coins:2' }),
    // 6: Ziegel mit Wachstumsbeere vor Krümel
    { kind: 'brick', pos: [2, 3.4, -166], content: 'wachstumsbeere' },
  ],
  enemies: [
    // 1
    { kind: 'hackvogel', id: 'hv1', pos: [5.6, Y, -6], dir: [0, 1], period: 2.4 },
    { kind: 'brummer', pos: [4.6, 3.6, -15], path: [[4.6, 3.6, -11], [4.6, 3.6, -19.5]] },
    // 2
    { kind: 'hackvogel', id: 'hv2', pos: [-2.6, Y, -24.6], dir: [0, 1], period: 2.2, phase: 0.4 },
    { kind: 'hackvogel', id: 'hv3', pos: [3.2, Y, -32.4], dir: [0, 1], period: 2.6 },
    { kind: 'brummer', center: [-1, 3.4, -38], radius: 2.2 },
    // 3
    { kind: 'hackvogel', id: 'hv4', pos: [4.6, Y, -67.4], dir: [0, 1], period: 2.2 },
    // 5: auf den Säulen neben dem Steg (hacken quer auf den Steg) und auf der Mittelinsel
    { kind: 'hackvogel', id: 'hv5', pos: [1.35, Y, -108.9], dir: [-1, 0], sight: 0, period: 2.4, phase: 0 },
    { kind: 'hackvogel', id: 'hv7', pos: [0, Y, -119.2], dir: [0, 1], period: 2.2 },
    { kind: 'hackvogel', id: 'hv8', pos: [-1.35, Y, -124.9], dir: [1, 0], sight: 0, period: 2.2, phase: 0.2 },
    // eingeschlossen im Ring: dreht sich zur Figur und zerhackt den Block in ihrer Richtung
    { kind: 'hackvogel', id: 'hv_ring', pos: [2, Y, -138], dir: [0, 1], track: true, sight: 11, period: 2.4 },
    // 6
    { kind: 'brummer', path: [[-6, 3.4, -151], [6, 3.4, -151]] },
    { kind: 'hackvogel', id: 'hv_kruemel', pos: [-5.4, Y, -171.2], dir: [-1, 0], sight: 0, period: 1.9 },
    { kind: 'hackvogel', id: 'hv10', pos: [4.4, Y, -173.4], dir: [0, 1], period: 2.4, phase: 0.3 },
    { kind: 'brummer', center: [0, 3.6, -192], radius: 2.4 },
  ],
  items: [
    // 1
    line([0, 1.4, 2], [0, 1.4, -2], 3),
    ...arc([-3, 1.7, -9.4], [-3, 2.2, -11.4], 2, 0.6),
    ...arc([-3, 2.2, -11.4], [1.8, 2.2, -15], 3, 1.2),
    ...arc([1.8, 2.2, -15], [-2.2, 2.2, -18.6], 3, 1.2),
    line([4.6, 2.1, -10.7], [4.6, 2.1, -17.5], 3),
    line([-7.2, 7.4, -3.6], [-5.6, 7.4, -3.6], 2),
    // 2
    line([0, 1.4, -24], [0, 1.4, -30], 3),
    ...column(3.4, -36.6, 3.4, 6.4, 3),
    ring([8.2, 8.6, -33.2], 1.4, 5),
    ...arc([0, 1.3, -43.4], [0, 1.3, -50.4], 3, 1.6),
    // 3: Teich (unter Wasser) und Spur zum Säulenstumpf
    line([1.6, 0.15, -60], [4.4, 0.15, -60], 3),
    line([-4.4, 1.4, -63.6], [-6.2, 1.4, -65.6], 2),
    // 4
    line([0, 1.5, -71.4], [0, 1.5, -81], 4),
    ring([0, 1.6, -84.6], 1.2, 4),
    line([0, 1.5, -88], [0, 1.5, -98.6], 4),
    // 5
    line([0, 1.5, -105], [0, 1.5, -115], 4),
    line([0, 1.5, -121.4], [0, 1.5, -129], 4),
    // Hinweis-Spur zur Nordost-Ecke des Steinblock-Rings
    line([4.6, 1.4, -137], [5, 1.4, -141.2], 3),
    // 6
    line([-3, 1.4, -149], [3, 1.4, -149], 3),
    ...arc([0, 1.3, -155.4], [0, 1.3, -162.6], 4, 2.2),
    line([-2.8, 1.4, -169], [-2.8, 1.4, -174], 2),
    line([0, 1.5, -184], [0, 1.5, -201], 5),
    // Bonusraum: Sockel-Münzen
    // Gimmicks
    { kind: 'goldschalter', id: 'goldschalter', pos: [91, Y, 59], area: { pos: [91, Y, 58.4], size: [9, 7] }, time: 8, rate: 7, height: 4.6 },
    { kind: 'task', area: { pos: [-5, Y, -171], r: 10 }, ids: ['hv_kruemel'], reward: { star: { index: 2, pos: [KRUEMEL[0] + 0.3, Y + 1.4, KRUEMEL[2] + 0.6] } } },
  ],
  checkpoint: { pos: [-6, Y, -57.2], yaw: Math.PI / 2 },
  stars: [
    [-7.2, 7.6, -5.2],        // 0: Wachturm (Krallen-Anzug)
    //                           1: Steinblock nordöstlich im Hackvogel-Ring (content 'star:1')
    //                           2: Krümels Hackvogel besiegen (task)
  ],
  stamp: [12, 6.5, -176],
  goal: { pos: [0, Y, -212], height: 9 },
  marks: {
    start: [0, Y, 5],
    tower: [-7.2, Y, 0.2],
    qblock: [2.4, Y, -1.6],
    basin: [0, Y, -7],
    s2: [0, Y, -22.5],
    trampoline: [3.4, Y, -34.4],
    goldpipe: [8.2, 7.8, -33.2],
    room: [85, Y + 1.4, 64],
    s3: [0, Y, -51.5],
    oasis: [-4, Y, -60],
    s4: [0, Y, -68.6],
    rest: [0, Y, -84.6],
    s5: [0, Y, -101.5],
    ring: [2, Y, -138],
    ringNE: [5, Y, -141.4],
    s6: [0, Y, -147.5],
    kruemel: [-5.4, Y, -171.2],
    stairs: [4, Y, -178.4],
    ledge: [12, 5.8, -176],
    goal: [0, Y, -206],
  },
};
