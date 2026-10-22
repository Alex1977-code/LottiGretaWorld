// 2-1 „Rieselschlucht“ – Wüstenschlucht mit Treibsand, Hackvögeln und Fliesenbrücken (Bauplan: Detail 2-1).
// Level verläuft nach −Z; die Route führt über Tafelberg-Plateaus (Oberseite y = 1) quer durch eine tiefe Schlucht.
//
// Abschnitte (Länge entlang z):
//   1  Wüstenstart       z   9 … −21  (30 m) Sandsteinbogen am Start, rechts ?-Block mit Krallen-Anzug, links der
//                                     6 m hohe Wachturm mit Kletterwand (Stern 0 oben). Hackvogel am Plateau-Ende,
//                                     Treibsandbecken zwischen roten Felswänden: Trittsteine (links) oder bröselnde
//                                     Sandblöcke (rechts, Brummer).
//   2  Goldröhren-Wand   z −21 … −44  (23 m) zwei Hackvögel, rechts eine 5,4 m hohe Wand: hinter dem dritten Hackvogel
//                                     ein Sprungfeld hinauf zur Goldröhre (Bonusraum mit goldenem Schalter, x ≈ 90).
//                                     Sandsteinbogen, Brummer, Felssäule über der Schlucht.
//   3  Oase              z −50 … −70  (20 × 20 m) Teich mit Unterwasser-Münzen, Palmen, Checkpoint, Hackvogel, Ruinen;
//                                     unsichtbarer Block mit Extraleben über dem Säulenstumpf (Münzspur zeigt hin).
//   4  Fliesenbrücke     z −70 … −100 (30 m) erst ausweichende Fliesen (shift), Rast-Säule, dann kippende Fliesen (drop).
//   5  Schmale Brücke    z −100 … −146 (46 m) 1 m schmale Stege; Hackvögel auf Säulen hacken im Takt auf den Steg,
//                                     einer steht auf der Mittelinsel. Danach Plateau mit dem eingeschlossenen
//                                     Hackvogel im Ring aus acht grauen Steinblöcken (Stern 1 im Block nordöstlich).
//   6  Schlussstück      z −146 … −218 (72 m) Brummer, fließender Treibsand stürzt rechts in die Schlucht, Krümels
//                                     Picknick (ein Hackvogel bedrängt ihn → besiegen → Stern 2), bröselnde Sandblock-
//                                     Treppe zum Stempel-Sims, lange verschiebende Fliesenbrücke (slide), Zielmast.
//   Bonusraum abseits bei x ≈ 90 (Goldröhre hin, zweite Goldröhre zurück an den Anfang der Oase).
// Sterne (Index): 0 Wachturm (Krallen-Anzug), 1 Steinblock im Hackvogel-Ring (nicht besiegen – hacken lassen),
//                 2 Krümels Hackvogel besiegen. Stempel: Sims über der Sandblock-Treppe vor der verschiebenden Brücke.

import { isl, line, ring, arc, column, blockRing, figure, bubble } from './_helpers_a.js';

const Y = 1;           // Oberseite der Plateaus
const H = 14;          // Plateau-Höhe (Unterkante −13)
const CAM = { pitch: 44, dist: 13, fov: 40, area: [-40, 40] };

/** Plateau (Tafelberg) mit Sanddecke. */
const plat = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, top + 13, { under: 3, ...o });
/** Felssäule aus der Schlucht (oben begehbar). */
const pillar = (x0, x1, zA, zB, top = Y) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });
/** Rote Schluchtwand (Kulisse, begehbar oben). */
const cliff = (x0, x1, zA, zB, top) => isl(x0, x1, zA, zB, top, top + 30, { under: 0 });

// ------------------------------------------------------------------ Krümels Picknick (level-lokale Szene)
// Krümel kauert vor dem Felsen, ein Hackvogel (id 'hv_kruemel') hackt vor ihm in den Sand. Ist der Vogel besiegt,
// jubelt Krümel und bedankt sich (die Aufgabe 'task' lässt Stern 2 über ihm erscheinen). Aufgerufen einmal beim
// Aufbau über onLit seiner Laterne (Aktion als Funktion, entities/gimmick.js).
const KRUEMEL = [-7.4, Y, -171.2];
function kruemelSzene(level) {
  let anim = 'scared', t = 0, said = false;
  figure(level, 'kruemel', KRUEMEL, 0.15, () => ({ anim }));
  level.onStep((dt) => {
    t += dt;
    const bird = level.named.get('hv_kruemel');
    const free = !bird || bird.defeated || !bird.alive || bird.removed;
    if (free && anim === 'scared') { anim = 'cheer'; t = 0; }
    if (anim === 'cheer' && !said && t > 0.4) {
      said = true;
      const hero = level.player?.hero === 'greta' ? 'Greta' : 'Lotti';
      bubble(level, [KRUEMEL[0] + 0.4, KRUEMEL[1] + 2.4, KRUEMEL[2]], `Danke, ${hero}!`, '– Krümel', 4.5);
    }
  });
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
    { ...CAM, from: -46, to: -70, pitch: 46 },
    { ...CAM, from: -70, to: -100, pitch: 47, dist: 13.5 },
    { ...CAM, from: -100, to: -130, pitch: 46, dist: 12.5 },
    { ...CAM, from: -130, to: -150, pitch: 46 },
    { ...CAM, from: -150, to: -182, pitch: 44, yaw: -5 },
    { ...CAM, from: -182, to: -222, pitch: 43, dist: 13.5 },
    // Bonusraum (abseits)
    { from: -20, to: -46, pitch: 50, dist: 12.5, fov: 40, x: 90, xLock: 0.7, area: [70, 110] },
  ],
  segments: [
    // =============================================================== Kulisse: Wüste tief unten, Felstürme, Dünen
    { type: 'deco_w2', items: [
      { kind: 'sandflaeche', pos: [0, -28, -110], size: [260, 340], solid: false },
      { kind: 'duenen', pos: [-70, -28, -110], size: [60, 300], n: 16, height: [3, 9] },
      { kind: 'duenen', pos: [70, -28, -110], size: [60, 300], n: 16, height: [3, 9] },
      { kind: 'felsen', pos: [-34, -28, -60], size: [16, 110], n: 6, height: [24, 36] },
      { kind: 'felsen', pos: [36, -28, -150], size: [16, 120], n: 6, height: [22, 34] },
      { kind: 'felsen', pos: [-36, -28, -190], size: [16, 60], n: 3, height: [26, 34] },
      { kind: 'felsen', pos: [34, -28, -40], size: [14, 60], n: 3, height: [20, 30] },
      { kind: 'pyramide', pos: [-60, -28, -235], size: 34, steps: 8 },
      { kind: 'kakteen', pos: [0, -28, -100], size: [40, 200], n: 14, scale: [2, 3] },
    ] },

    // =============================================================== 1  Wüstenstart
    plat(-10, 10, 9, -9),
    // Wachturm (6 m) mit Kletterwand vorn – Stern 0 oben
    cliff(-10, -4.4, -1.6, -9, 7),
    { type: 'wall', pos: [-7.2, Y, -1.3], size: [5.6, 6, 0.6], climbable: true },
    // Schluchtwände rechts/links des Starts (Kulisse, nicht begehbar)
    cliff(-16, -10, 9, -9, 5),
    cliff(10, 16, 9, -9, 3.5),
    // Treibsandbecken zwischen Felswänden
    cliff(-12, -7, -9, -21, 4),
    cliff(7, 12, -9, -21, 4),
    { type: 'quicksand', id: 'becken', pos: [0, -0.2, -15], size: [14, 1.2, 12] },
    isl(-4, -2, -10.4, -12.4, 1.6, 2.2, { top: 'stone' }),
    isl(0.8, 2.8, -14, -16, 1.6, 2.2, { top: 'stone' }),
    isl(-3.2, -1.2, -17.6, -19.6, 1.6, 2.2, { top: 'stone' }),
    { type: 'sandblock', id: 'sandsteg', from: [4.6, 0.6, -9.6], to: [4.6, 0.6, -20.4], respawn: 3 },
    { type: 'sign', pos: [-5.4, Y, -6.8], text: 'Vorsicht,\nTreibsand!', yaw: 0.25 },
    { type: 'deco_w2', items: [
      { kind: 'bogen', pos: [0, Y, 1.5], width: 7.2, height: 5, yaw: Math.PI / 2 },
      { kind: 'kaktus', pos: [8.2, Y, 6.8], variant: 'saeule', size: 1.2 },
      { kind: 'kaktus', pos: [-8.6, Y, 7.4], variant: 'kugel' },
      { kind: 'kaktus', pos: [8.6, Y, -6.6], variant: 'feige' },
      { kind: 'kakteen', pos: [-13, 5, 0], size: [5, 16], n: 5 },
      { kind: 'kakteen', pos: [13, 3.5, 0], size: [5, 16], n: 4 },
      { kind: 'kakteen', pos: [-9.5, 4, -15], size: [4, 10], n: 4 },
      { kind: 'kakteen', pos: [9.5, 4, -15], size: [4, 10], n: 3 },
      { kind: 'ruine', pos: [-7.2, 7, -7.6], height: 1.6 },
      { kind: 'palme', pos: [7.8, Y, 2.4], height: 4.6, sway: true },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'pebbles', from: [-1.2, Y, 3], to: [1.4, Y, -7.6], n: 7, size: 0.3 },
      { kind: 'sign', pos: [-3.4, Y, -0.6], arrow: 'left', yaw: 0.3 },
      { kind: 'rockwall', pos: [-12.6, Y, -2], size: [1.6, 5.6, 7], color: 0xc8703e },
    ] },

    // =============================================================== 2  Goldröhren-Wand
    plat(-10, 10, -21, -44),
    // hohe Wand rechts mit der Goldröhre oben (über das Sprungfeld)
    cliff(5.4, 11, -27.5, -39, 6.4),
    { type: 'trampoline', pos: [3.4, Y, -36.6], strength: 17 },
    { type: 'goldroehre', id: 'gold_ein', pos: [8.2, 6.4, -33.2], height: 1.4, target: 'gold_aus' },
    cliff(-16, -10, -21, -44, 6),
    { type: 'deco_w2', items: [
      { kind: 'bogen', pos: [-1.2, Y, -41.6], width: 7, height: 4.8, yaw: Math.PI / 2 },
      { kind: 'ruinen', pos: [-7, Y, -30], size: [4, 14], n: 4, height: [1.2, 3] },
      { kind: 'kaktus', pos: [9.2, 6.4, -28.6], variant: 'kugel' },
      { kind: 'kaktus', pos: [6.4, 6.4, -38.2], variant: 'saeule', size: 0.8 },
      { kind: 'kakteen', pos: [-13, 6, -32], size: [5, 20], n: 6 },
      { kind: 'palme', pos: [9.2, Y, -23.4], height: 4 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'sign', pos: [1.4, Y, -38.8], arrow: 'up', yaw: -0.2 },
      { kind: 'pebbles', from: [-2, Y, -22.4], to: [-1.2, Y, -34], n: 6, size: 0.3 },
    ] },
    // Felssäule über der Schlucht (z −44 … −50)
    pillar(-1.6, 1.6, -45.4, -48.6),

    // =============================================================== 3  Oase und Checkpoint
    plat(-10, -2, -50, -70),
    plat(8, 11, -50, -70),
    plat(-2, 8, -50, -55.5),
    plat(-2, 8, -64.5, -70),
    { type: 'oase', id: 'oase', pos: [3, Y, -60], size: [6, 5], depth: 1.6, rim: 2, base: 1, palms: [[0, -55.9, 4.6], [6.8, -64.4, 5.2], [7.4, -56, 3.8]] },
    cliff(11, 17, -50, -70, 4.5),
    cliff(-16, -10, -50, -70, 3),
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [-7, Y, -66.4], height: 1.1, broken: true },
      { kind: 'ruinen', pos: [-6.5, Y, -52.6], size: [5, 3], n: 2, height: [2.4, 3.4] },
      { kind: 'palmen', pos: [-13, 3, -60], size: [4, 16], n: 3 },
      { kind: 'kakteen', pos: [14, 4.5, -60], size: [4, 16], n: 4 },
      { kind: 'kaktus', pos: [9.6, Y, -52.2], variant: 'gruppe' },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'reeds', pos: [0.5, Y, -63.6], n: 6, size: 1.2 },
      { kind: 'lilypads', pos: [3.4, 0.79, -59.4], size: [4, 3], n: 4 },
      { kind: 'butterflies', pos: [3, Y, -60], n: 3, r: 2.6, h: 1.4, colors: [0xffb03a, 0xffffff, 0x3ad0ff] },
    ] },

    // =============================================================== 4  Fliesenbrücke
    { type: 'fliesenbruecke', id: 'fb_shift', from: [0, Y, -70], to: [0, Y, -82.6], mode: 'shift', shift: 2.2, stay: 2.2 },
    pillar(-2.6, 2.6, -82.6, -86.6),
    { type: 'fliesenbruecke', id: 'fb_drop', from: [0, Y, -86.6], to: [0, Y, -100], mode: 'drop', delay: 0.7, respawn: 2.6 },
    cliff(-18, -11, -70, -100, 9),
    cliff(11, 18, -70, -100, 6),
    { type: 'deco_w2', items: [
      { kind: 'kaktus', pos: [-1.8, Y, -85.8], variant: 'kugel', size: 0.8 },
      { kind: 'ruine', pos: [1.9, Y, -83.4], height: 2.2, scale: 0.8 },
      { kind: 'kakteen', pos: [-14.5, 9, -84], size: [5, 26], n: 6 },
      { kind: 'ruinen', pos: [14.5, 6, -84], size: [5, 24], n: 4 },
    ] },

    // =============================================================== 5  Schmale Brücke
    plat(-5, 5, -100, -104),
    { type: 'schmale_bruecke', from: [0, Y, -104], to: [0, Y, -116] },
    pillar(0.85, 1.85, -108.4, -109.4),
    pillar(-1.85, -0.85, -112.4, -113.4),
    pillar(-2.4, 2.4, -116, -120.4),
    { type: 'schmale_bruecke', from: [0, Y, -120.4], to: [0, Y, -130] },
    pillar(-1.85, -0.85, -124.4, -125.4),
    pillar(0.85, 1.85, -127.2, -128.2),
    cliff(-18, -11, -100, -130, 7),
    cliff(11, 18, -100, -130, 10),
    // Plateau mit dem eingeschlossenen Hackvogel
    plat(-9, 9, -130, -146),
    { type: 'sign', pos: [-5.8, Y, -132.6], text: 'Hackvögel\nhacken alles!', yaw: 0.2 },
    cliff(-16, -9, -130, -146, 5),
    cliff(9, 16, -130, -146, 3.5),
    { type: 'deco_w2', items: [
      { kind: 'kakteen', pos: [-14, 7, -116], size: [5, 26], n: 6 },
      { kind: 'kakteen', pos: [14, 10, -114], size: [5, 26], n: 5 },
      { kind: 'ruinen', pos: [-6.4, Y, -141], size: [3, 8], n: 3, height: [1.2, 2.6] },
      { kind: 'kaktus', pos: [7.8, Y, -131.6], variant: 'saeule' },
      { kind: 'kaktus', pos: [-8, Y, -144.8], variant: 'feige' },
      { kind: 'palme', pos: [12, 3.5, -136], height: 4.2 },
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
    { type: 'fliesenbruecke', id: 'fb_slide', from: [0, Y, -182], to: [0, Y, -203], mode: 'slide', slide: { amp: 1.4, period: 3.2, wave: 0.6 } },
    plat(-10, 10, -203, -220),
    cliff(-16, -10, -200, -220, 6),
    cliff(10, 16, -200, -220, 4),
    { type: 'deco_w2', items: [
      { kind: 'kakteen', pos: [-12, 4, -154], size: [4, 14], n: 4 },
      { kind: 'kaktus', pos: [7.6, Y, -148.6], variant: 'gruppe' },
      { kind: 'ruine', pos: [-7.8, Y, -164.2], height: 2.8 },
      { kind: 'palme', pos: [-8.4, Y, -168.4], height: 4.4, lean: 0.35, sway: true },
      { kind: 'kaktus', pos: [3.6, Y, -164.6], variant: 'kugel', size: 0.8 },
      { kind: 'kakteen', pos: [12, 5.8, -176], size: [4, 8], n: 2 },
      { kind: 'ruinen', pos: [-12.5, 5, -175], size: [4, 10], n: 3 },
      { kind: 'bogen', pos: [0, Y, -205.4], width: 7.4, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'palmen', pos: [-7, Y, -213], size: [4, 8], n: 2 },
      { kind: 'kaktus', pos: [7.6, Y, -216.6], variant: 'saeule', size: 1.3 },
      { kind: 'kakteen', pos: [13, 4, -210], size: [4, 16], n: 4 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'picnic', pos: [-6.6, Y, -173.6], yaw: 0.3 },
      { kind: 'rockwall', pos: [-8.3, Y, -171.2], size: [1.2, 2.6, 3.4], color: 0xc8703e },
      { kind: 'sign', pos: [3.4, Y, -180.8], arrow: 'up' },
      { kind: 'bunting', from: [-3.3, 6, -205.4], to: [3.3, 6, -205.4], sag: 0.6 },
      { kind: 'pebbles', from: [0, Y, -163], to: [0, Y, -170], n: 5, size: 0.3 },
    ] },

    // =============================================================== Bonusraum (Goldröhre, abseits bei x ≈ 90)
    { type: 'room', pos: [90, Y, -33], size: [14, 6, 12], top: 'stone', style: 0xd9864a },
    { type: 'goldroehre', id: 'gold_aus', pos: [85, Y, -29], height: 1.4 },
    { type: 'goldroehre', id: 'gold_raus', pos: [95.5, Y, -29], height: 1.4, target: [-5.6, Y + 0.4, -52.6] },
    { type: 'deco_w2', items: [
      { kind: 'ruine', pos: [84.6, Y, -37.6], height: 2.4 },
      { kind: 'ruine', pos: [95.4, Y, -37.6], height: 2.4 },
      { kind: 'kaktus', pos: [88, Y, -38.2], variant: 'kugel', size: 0.7 },
    ] },
  ],
  blocks: [
    // 1: ?-Block mit Krallen-Anzug rechts am Start
    { kind: 'brick', pos: [1.4, 3.4, -3.4] },
    { kind: 'question', pos: [2.4, 3.4, -3.4], content: 'krallenAnzug' },
    { kind: 'brick', pos: [3.4, 3.4, -3.4], content: 'coins:3' },
    // 2: Münzblock vor dem Bogen
    { kind: 'question', pos: [-3, 3.4, -27], content: 'coins:4' },
    // 3: unsichtbarer Block mit Extraleben über dem Säulenstumpf
    { kind: 'hidden', pos: [-7, 3.6, -66.4], content: 'oneup' },
    // 5: Ring aus acht grauen Steinblöcken um den eingeschlossenen Hackvogel (Stern 1 im nordöstlichen Block)
    ...blockRing('steinblock', 2, Y, -138, { '1,-1': 'star:1', '0,1': 'coins:3', '-1,0': 'coin', '0,-1': 'coins:2' }),
    // 6: Münzblock über dem Plateau vor Krümel
    { kind: 'question', pos: [2, 3.4, -166], content: 'wachstumsbeere' },
  ],
  enemies: [
    // 1
    { kind: 'hackvogel', id: 'hv1', pos: [5.6, Y, -6], dir: [0, 1], period: 2.4 },
    { kind: 'brummer', pos: [4.6, 3.6, -15], path: [[4.6, 3.6, -11], [4.6, 3.6, -19.5]] },
    // 2
    { kind: 'hackvogel', id: 'hv2', pos: [-3.4, Y, -24.6], dir: [0, 1], period: 2.2, phase: 0.4 },
    { kind: 'hackvogel', id: 'hv3', pos: [3.2, Y, -32.4], dir: [0, 1], period: 2.6 },
    { kind: 'brummer', center: [-5.4, 3.4, -36.4], radius: 2.2 },
    // 3
    { kind: 'hackvogel', id: 'hv4', pos: [4.6, Y, -67.4], dir: [0, 1], period: 2.2 },
    // 5: auf den Säulen neben dem Steg (hacken quer auf den Steg) und auf der Mittelinsel
    { kind: 'hackvogel', id: 'hv5', pos: [1.35, Y, -108.9], dir: [-1, 0], sight: 0, period: 2.4, phase: 0 },
    { kind: 'hackvogel', id: 'hv6', pos: [-1.35, Y, -112.9], dir: [1, 0], sight: 0, period: 2.4, phase: 0.5 },
    { kind: 'hackvogel', id: 'hv7', pos: [0, Y, -119.2], dir: [0, 1], period: 2.2 },
    { kind: 'hackvogel', id: 'hv8', pos: [-1.35, Y, -124.9], dir: [1, 0], sight: 0, period: 2.2, phase: 0.2 },
    { kind: 'hackvogel', id: 'hv9', pos: [1.35, Y, -127.7], dir: [-1, 0], sight: 0, period: 2.2, phase: 0.7 },
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
    line([4.6, 2.1, -10.6], [4.6, 2.1, -19.6], 5),
    line([-7.2, 7.4, -3.6], [-5.6, 7.4, -3.6], 2),
    // 2
    line([0, 1.4, -24], [0, 1.4, -30], 4),
    column(3.4, -36.6, 3.4, 6.4, 3),
    ring([8.2, 8.6, -33.2], 1.4, 6),
    ...arc([0, 1.3, -43.4], [0, 1.3, -50.4], 4, 1.6),
    // 3: Teich (unter Wasser) und Spur zum Säulenstumpf
    line([1.4, 0.15, -60], [4.6, 0.15, -60], 3),
    { kind: 'coin', pos: [3, 0.15, -58.6] }, { kind: 'coin', pos: [3, 0.15, -61.4] },
    line([-4.4, 1.4, -63.6], [-6.2, 1.4, -65.6], 2),
    // 4
    line([0, 1.5, -71.4], [0, 1.5, -81], 5),
    ring([0, 1.6, -84.6], 1.2, 5),
    line([0, 1.5, -88], [0, 1.5, -98.6], 5),
    // 5
    line([0, 1.5, -105], [0, 1.5, -115], 6),
    line([0, 1.5, -121.4], [0, 1.5, -129], 5),
    // Hinweis-Spur zur Nordost-Ecke des Steinblock-Rings
    line([4.6, 1.4, -137], [5, 1.4, -141.2], 3),
    // 6
    line([-3, 1.4, -149], [3, 1.4, -149], 3),
    ...arc([0, 1.3, -155.4], [0, 1.3, -162.6], 5, 2.2),
    line([-2.8, 1.4, -168], [-2.8, 1.4, -176], 3),
    line([0, 1.5, -183.4], [0, 1.5, -201.6], 8),
    // Bonusraum: Sockel-Münzen
    ring([92, 1.4, -35], 2.4, 8),
    // Gimmicks
    { kind: 'goldschalter', id: 'goldschalter', pos: [91, Y, -34], area: { pos: [91, Y, -35], size: [9, 7] }, time: 8, rate: 7 },
    { kind: 'lantern', pos: [-5, Y, -175.6], lit: true, onLit: kruemelSzene },
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
    room: [85, Y + 1.4, -29],
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
