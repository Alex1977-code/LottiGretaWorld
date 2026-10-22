// 2-1 „Rieselschlucht“ – Wüstenschlucht mit Treibsand, Hackvögeln und Fliesenbrücken (Bauplan: Detail 2-1).
// Level verläuft nach −Z; die Route führt über Tafelberg-Plateaus (Oberseite y = 1) quer durch eine tiefe Schlucht,
// tief unten liegt der Wüstenboden mit Dünen und Felstürmen.
//
// Abschnitte (Länge entlang z):
//   1  Wüstenstart       z   9 … −21  (30 m) Rastplatz mit Palme, rechts ?-Block mit Krallen-Anzug, links der 6 m hohe
//                                     Wachturm mit Kletterwand (Stern 0 oben). Hackvogel am Plateau-Ende,
//                                     Treibsandbecken zwischen roten Felswänden: Trittsteine (links) oder bröselnde
//                                     Sandblöcke (rechts, Brummer).
//   2  Goldröhren-Wand   z −21 … −44  (23 m) zwei Hackvögel, links ein Ruinen-Podest, rechts eine 5,4 m hohe Wand:
//                                     hinter dem dritten Hackvogel ein Sprungfeld hinauf zur Goldröhre (Bonusraum mit
//                                     goldenem Schalter abseits bei x ≈ 90, z ≈ 60). Brummer, Felssäule über der Schlucht.
//   3  Oase              z −50 … −70  (20 × 20 m) Teich mit Unterwasser-Münzen, Palmen, Schilf, Checkpoint, Hackvogel,
//                                     Ruinen; unsichtbarer Block mit Extraleben über dem Säulenstumpf (Münzspur).
//   4  Fliesenbrücke     z −70 … −100 (30 m) erst ausweichende Fliesen (shift), Rast-Säule, dann kippende Fliesen (drop).
//   5  Schmale Brücke    z −100 … −146 (46 m) 1 m schmale Stege; Hackvögel auf Säulen hacken im Takt auf den Steg,
//                                     einer steht auf der Mittelinsel. Danach Plateau mit dem eingeschlossenen
//                                     Hackvogel im Ring aus acht grauen Steinblöcken (Stern 1 im Block nordöstlich).
//   6  Schlussstück      z −146 … −220 (74 m) Brummer, fließender Treibsand stürzt rechts in die Schlucht, Krümels
//                                     Picknick (ein Hackvogel bedrängt ihn → besiegen → Stern 2), bröselnde Sandblock-
//                                     Treppe zum Stempel-Sims, lange verschiebende Fliesenbrücke (slide), Zielmast.
// Sterne (Index): 0 Wachturm (Krallen-Anzug), 1 Steinblock im Hackvogel-Ring (nicht besiegen – hacken lassen),
//                 2 Krümels Hackvogel besiegen. Stempel: Sims über der Sandblock-Treppe vor der verschiebenden Brücke.
// Kulisse sparsam (Budget): Kakteen ≈ 1,3–3,8 k Dreiecke je Stück, daher wenige und nah am Weg; Felstürme/Dünen billig.

import { isl, line, ring, arc, column, blockRing, figure, bubble, setupHook, farHide, shadowless, camel, tumbleweed } from './_helpers_a.js';

const Y = 1;           // Oberseite der Plateaus
const CAM = { pitch: 43, dist: 13.5, fov: 40, area: [-40, 40] };

/** Plateau (Tafelberg) mit Sanddecke, Unterkante −12. */
const plat = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, top + 12, { under: 3, ...o });
/** Felssäule aus der Schlucht (oben begehbar). */
const pillar = (x0, x1, zA, zB, top = Y) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });
/** Rote Schluchtwand (Kulisse). */
const cliff = (x0, x1, zA, zB, top) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });
/**
 * Wüstenboden tief unten mit Dünen und Felstürmen (Kulisse ohne Sonnenschatten, wird im Aufbau-Haken über shadowless
 * gebaut – drei lange Stücke = drei Zeichenaufrufe, nicht im Schattenpass).
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
// Krümel kauert vor dem Felsen, ein Hackvogel (id 'hv_kruemel') hackt vor ihm in den Sand. Ist der Vogel besiegt,
// jubelt Krümel und bedankt sich (die Aufgabe 'task' lässt Stern 2 über ihm erscheinen). Aufgerufen einmal beim
// Aufbau (setupHook).
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
  camel(level, [13.4, 3.5, 2.2], { yaw: 2.5, phase: 0 });
  camel(level, [14.6, 4.5, -57.4], { yaw: Math.PI - 0.4, phase: 1.7 });
  camel(level, [15.2, 4.5, -60.4], { yaw: Math.PI + 0.3, scale: 0.6, phase: 3.1, blanket: [0xffc21a, 0x7a46d0] });
  tumbleweed(level, [-9.6, Y, -31], [9.6, Y, -26], { speed: 3, pause: 5 });
  tumbleweed(level, [-8.6, Y, -147.6], [8.6, Y, -153.6], { speed: 3.4, pause: 6, phase: 2 });
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
  camera: [
    { ...CAM, from: 12, to: -22 },
    { ...CAM, from: -22, to: -46, yaw: 6 },
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
    // (Wüstenboden tief unten: FAR, im Aufbau-Haken ohne Sonnenschatten gebaut)

    // =============================================================== 1  Wüstenstart
    plat(-10, 10, 9, -9),
    // Rastplatz rechts (eine Stufe höher) mit Palme
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
    { type: 'sandblock', id: 'sandsteg', from: [4.6, 0.6, -9.6], to: [4.6, 0.6, -20.4], respawn: 3 },
    { type: 'sign', pos: [-2.6, Y, -7.2], text: 'Vorsicht,\nTreibsand!' },
    { type: 'deco_w2', items: [
      { kind: 'palme', pos: [8.4, 1.8, 5.6], height: 4.8, lean: 0.3, sway: true },
      { kind: 'kaktus', pos: [-8.6, Y, 7.2], variant: 'saeule', size: 1.1 },
      { kind: 'kaktus', pos: [8.4, Y, -6.8], variant: 'feige' },
      { kind: 'ruine', pos: [-7.4, 7, -7.4], height: 1.6 },
      { kind: 'felsen', pos: [-14, 5, 0], size: [5, 16], n: 3, height: [1.5, 4], solid: true },
      { kind: 'felsen', pos: [14, 3.5, 2], size: [5, 12], n: 3, height: [1.2, 3.5], solid: true },
      { kind: 'felsen', pos: [-10.4, 4, -12], size: [4, 6], n: 2, height: [1, 2.5] },
      { kind: 'felsen', pos: [10.4, 4, -17], size: [4, 6], n: 2, height: [1, 2.5] },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'pebbles', from: [-1.2, Y, 3], to: [1.4, Y, -7.6], n: 7, size: 0.3 },
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
      { kind: 'kaktus', pos: [9.4, 6.4, -28.6], variant: 'gruppe' },
      { kind: 'palme', pos: [8.6, Y, -23.2], height: 4 },
      { kind: 'felsen', pos: [-13.6, 6, -32], size: [5, 20], n: 4, height: [1.5, 5], solid: true },
      { kind: 'felsen', pos: [14, 4, -32], size: [5, 20], n: 3, height: [1.5, 4], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'sign', pos: [1.6, Y, -38.8], arrow: 'up', yaw: -0.2 },
      { kind: 'pebbles', from: [-2, Y, -22.4], to: [-1.2, Y, -34], n: 6, size: 0.3 },
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
      { kind: 'kaktus', pos: [9.6, 1.6, -52.2], variant: 'gruppe' },
      { kind: 'felsen', pos: [14, 4.5, -56], size: [4, 10], n: 2, height: [1.5, 3.5], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'lilypads', pos: [3.4, 0.79, -59.4], size: [4, 3], n: 4 },
      { kind: 'butterflies', pos: [3, Y, -60], n: 3, r: 2.6, h: 1.4, colors: [0xffb03a, 0xffffff, 0x3ad0ff] },
    ] },

    // =============================================================== 4  Fliesenbrücke
    { type: 'fliesenbruecke', id: 'fb_shift', from: [0, Y, -70], to: [0, Y, -82.6], mode: 'shift', tile: 2.6, shift: 2.2, stay: 2.2 },
    pillar(-2.6, 2.6, -82.6, -86.6),
    { type: 'fliesenbruecke', id: 'fb_drop', from: [0, Y, -86.6], to: [0, Y, -100], mode: 'drop', tile: 2.6, delay: 0.7, respawn: 2.6 },
    cliff(-18, -11, -70, -100, 9),
    cliff(11, 18, -70, -100, 6),
    { type: 'deco_w2', items: [
      { kind: 'kaktus', pos: [-1.8, Y, -85.8], variant: 'gruppe', size: 0.8 },
      { kind: 'ruine', pos: [1.9, Y, -83.4], height: 2.2, scale: 0.8 },
      { kind: 'felsen', pos: [-14.5, 9, -84], size: [5, 26], n: 5, height: [1.5, 5], solid: true },
      { kind: 'felsen', pos: [14.5, 6, -84], size: [5, 26], n: 4, height: [1.5, 4], solid: true },
    ] },

    // =============================================================== 5  Schmale Brücke
    plat(-5, 5, -100, -104),
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
      { kind: 'kaktus', pos: [13.4, 10, -122], variant: 'feige' },
      { kind: 'ruine', pos: [-6.6, Y, -140.6], height: 2.6 },
      { kind: 'kaktus', pos: [7.8, Y, -131.6], variant: 'saeule' },
      { kind: 'felsen', pos: [-12.5, 5, -138], size: [4, 12], n: 2, height: [1.5, 3] },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'pebbles', from: [-0.6, Y, -131], to: [-1, Y, -145], n: 7, size: 0.3 },
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
    { type: 'fliesenbruecke', id: 'fb_slide', from: [0, Y, -182], to: [0, Y, -203], mode: 'slide', tile: 2.6, slide: { amp: 1.4, period: 3.2, wave: 0.6 } },
    plat(-10, 10, -203, -220),
    cliff(-16, -10, -200, -220, 6),
    cliff(10, 16, -200, -220, 4),
    cliff(15, 21, -146, -170, 3),
    { type: 'deco_w2', items: [
      { kind: 'felsen', pos: [-12, 4, -152], size: [4, 10], n: 3, height: [1.2, 3.5], solid: true },
      { kind: 'kaktus', pos: [7.6, Y, -148.6], variant: 'gruppe' },
      { kind: 'ruine', pos: [-7.8, Y, -164.2], height: 2.8 },
      { kind: 'ruine', pos: [-8.3, Y, -170.2], height: 1.6 },
      { kind: 'palme', pos: [-8.2, Y, -168], height: 4.4, lean: 0.35, sway: true },
      { kind: 'kaktus', pos: [3.6, Y, -164.6], variant: 'kugel', size: 0.8 },
      { kind: 'kaktus', pos: [12, 5.8, -173.4], variant: 'saeule', size: 0.8 },
      { kind: 'felsen', pos: [-12.5, 5, -175], size: [4, 10], n: 3, height: [1.5, 4], solid: true },
      { kind: 'felsen', pos: [18, 3, -158], size: [4, 18], n: 3, height: [2, 6] },
      { kind: 'bogen', pos: [0, Y, -217.4], width: 7.4, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'palme', pos: [-7.4, Y, -212], height: 4.6, sway: true },
      { kind: 'kaktus', pos: [-8, Y, -205.2], variant: 'saeule', size: 1.2 },
      { kind: 'felsen', pos: [13, 4, -210], size: [4, 16], n: 3, height: [1.5, 4], solid: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'picnic', pos: [-6.6, Y, -173.6], yaw: 0.3 },
      { kind: 'sign', pos: [3.4, Y, -180.8], arrow: 'up' },
      { kind: 'bunting', from: [-3.3, 6, -217.4], to: [3.3, 6, -217.4], sag: 0.6 },
      { kind: 'bunting', from: [-7.4, 4.2, -212], to: [-1.4, 4.6, -209.6], sag: 0.5 },
      { kind: 'pebbles', from: [0, Y, -163], to: [0, Y, -170], n: 5, size: 0.3 },
    ] },

    // =============================================================== Bonusraum (Goldröhre, abseits bei x ≈ 90, z ≈ 60)
    { type: 'room', pos: [90, Y, 60], size: [14, 6, 12], top: 'stone', style: 0xd9864a },
    { type: 'goldroehre', id: 'gold_aus', pos: [85, Y, 64], height: 1.4 },
    { type: 'goldroehre', id: 'gold_raus', pos: [95.5, Y, 64], height: 1.4, target: [-5.6, Y + 0.4, -52.6] },
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [84.6, Y, 55.4], height: 2.4 },
      { kind: 'ruine', pos: [95.4, Y, 55.4], height: 2.4 },
      { kind: 'kaktus', pos: [88, Y, 54.8], variant: 'gruppe', size: 0.8 },
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
    line([4.6, 2.1, -11], [4.6, 2.1, -19], 3),
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
    // level-lokaler Code beim Aufbau: ferne Kulisse ohne Schatten, Krümels Szene, Fernsicht für Gegner (> 50 m)
    ...setupHook((level) => { shadowless(level, FAR); kruemelSzene(level); wuestenLeben(level); farHide(level, ['hackvogel', 'brummer'], 50); }, [0, -9, 0]),
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
