// S-3 „Walzenritt im Holzsternenhimmel“ (Bauplan S-3: Parcours, 400 s, ca. 380 m – Holz-Athletik mit rollenden
// Schienenwalzen). Thema woodspace, Musik course_rollingride.
//
// Hoch im blaugrünen All über einem freundlichen Mond rollen große Holzwalzen auf Schienen dahin: wer oben mitläuft, fährt
// mit, wer stehen bleibt, rutscht nach hinten herunter. Abschnitte (nach −Z, Laufhöhe y 0, ab dem Walzenaufstieg y 8):
//   1. Startdeck (z 8 … −12): rechts ein schmaler Steg ins All – betritt man ihn, tauchen versteckte Bitcoins auf; am Ende
//      ein unsichtbarer Extraleben-Block.
//   2. Erste Schienenwalze (z −12 … −92, 76 m): rot-weiße Holz-Hürden über der Bahn – halbe zum Ausweichen, eine ganze zum
//      Drüberspringen, zum Schluss ein Tor mit Lücke.
//   3. Walzentrio mit Wurfsichel (z −92 … −172): ?-Block mit der Wurfsichel, drei kurze Walzen hintereinander; Bitcoins
//      schweben neben den Walzen im All (nur mit der Wurfsichel zu angeln); nach der dritten Walze die Rätselbox in den
//      Walzenraum (Stern 0).
//   4. Zweite Walze an Hackvögeln vorbei (z −172 … −234, 58 m): Hackvögel auf Seitenkonsolen hacken in die Randspur, ein
//      vierter wacht am Landedeck.
//   5. Kontrollpunkt (z −234 … −256): links die kleine Kurbelwalze – lässt man sie bis zum Prellbock rollen, erscheint unter
//      dem Ende der großen Walze eine Sternbühne (Stern 1); ?-Block mit dem Krallen-Anzug.
//   6. Walzenaufstieg (z −256 … −303): drei schräge Walzen tragen 8 m hinauf.
//   7. Große Schienenwalze (z −303 … −401, 93 m) mit Hürden; rechts der Seitenweg über Holzdecks mit Zeit-Uhren und dem
//      Figurenschalter für Greta – er lässt eine Blocktreppe zum Stempel über dem Schalter erscheinen.
//   8. Endwand (z −401 … −424): Zielmast links; ?-Block mit der Spiegelfrucht, Doppel-Lift (fährt nur mit zwei Figuren)
//      bzw. mit dem Krallen-Anzug die Wand hinauf – oben Stern 2.
//   Walzenraum (Rätselbox, abseits bei x 90): hohle Riesenwalze mit Druckknopf; zweimal drehen, dann bilden die Regale
//   eine Treppe zum Stern in der Mitte.
// Sterne: 0 Walzenraum drehen · 1 Kurbelwalze am Kontrollpunkt → Sternbühne unter der letzten Walze · 2 oben auf der Endwand
// (Doppel-Lift oder Krallen-Anzug). Stempel: über dem Figurenschalter am Seitenweg (Greta). Gegner: 4 Hackvögel.

import { PI, deck, line, ring, arc, column, sign, huerden, versteckteMuenzen, beiZustand, banner } from './_helpers_b.js';

const RX = 90;              // Walzenraum (abseits)
const Y8 = 8;               // Laufhöhe nach dem Walzenaufstieg

// Walzen: Achsmitte (Pfad), Radius, Länge – Oberkante = Achse + Radius
const W1 = { R: 1.6, LEN: 7 };
const WT = { R: 1.2, LEN: 5 };
const W2 = { R: 1.6, LEN: 6 };
const WG = { R: 2.2, LEN: 9 };

function build(level) {
  huerden(level, [
    // erste Walze (Oberkante y 0, Schienen bei y −3,4): halbe Hürden zum Ausweichen, eine ganze, ein Tor mit Lücke
    { x0: -3.6, x1: 0.2, z: -32, y0: 0.32, y1: 0.82, posts: [-4.05], bottom: -3.4 },
    { x0: -0.2, x1: 3.6, z: -46, y0: 0.32, y1: 0.82, posts: [4.05], bottom: -3.4 },
    { x0: -3.6, x1: 3.6, z: -60, y0: 0.3, y1: 0.72, posts: [-4.05, 4.05], bottom: -3.4 },
    { x0: -3.6, x1: -1.25, z: -76, y0: 0.32, y1: 1.6, posts: [-4.05], bottom: -3.4 },
    { x0: 1.25, x1: 3.6, z: -76, y0: 0.32, y1: 1.6, posts: [4.05], bottom: -3.4 },
    // große Walze (Oberkante y 8, Schienen bei y 3,4)
    { x0: -4.6, x1: -0.4, z: -332, y0: Y8 + 0.32, y1: Y8 + 0.82, posts: [-5.05], bottom: 3.4 },
    { x0: -4.6, x1: 4.6, z: -352, y0: Y8 + 0.3, y1: Y8 + 0.72, posts: [-5.05, 5.05], bottom: 3.4 },
    { x0: 0.4, x1: 4.6, z: -372, y0: Y8 + 0.32, y1: Y8 + 0.82, posts: [5.05], bottom: 3.4 },
  ]);
}

function setup(level) {
  // Steg am Start: versteckte Bitcoins tauchen auf, sobald man ihn betritt
  versteckteMuenzen(level, { area: [6.4, 21.4, -2, -6], coins: [6.5, 21.5, -2.4, -5.6], banner: 'Versteckte Bitcoins!' });
  // Kurbelwalze am Kontrollpunkt am Prellbock → Sternbühne unter dem Ende der großen Walze
  beiZustand(level, 'kurbel', (h) => h.state === 'ende', [
    { reveal: ['sternbuehne', 'unterstern'], sfx: 'powerup_appear' },
    (L) => banner(L, 'Unter der großen Walze tut sich was!', { hold: 2, size: 13, y: 0.36 }),
  ]);
}

export const LEVEL = {
  id: 'S-3',
  world: 9,
  title: 'Walzenritt im Holzsternenhimmel',
  archetype: 'parcours',
  theme: 'woodspace',
  music: 'course_rollingride',
  timeLimit: 400,
  killY: -14,
  farHide: 60,
  instances: { coin: { farHide: 46, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 5], yaw: PI / 2 },
  camera: [
    { from: 14, to: -13, pitch: 42, dist: 13, fov: 40, area: [-40, 40] },
    { from: -13, to: -92, pitch: 40, dist: 13.5, fov: 40, x: 0, xLock: 0.35, area: [-40, 40] },
    { from: -92, to: -172, pitch: 43, dist: 13, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -172, to: -234, pitch: 42, dist: 13.5, fov: 40, x: 0, xLock: 0.35, area: [-40, 40] },
    { from: -234, to: -256, pitch: 45, dist: 13, fov: 40, area: [-40, 40] },
    { from: -256, to: -303, pitch: 38, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -303, to: -401, pitch: 40, dist: 14, fov: 40, area: [-40, 40] },
    { from: -401, to: -432, pitch: 36, dist: 15, fov: 42, height: 1.6, area: [-40, 40] },
    // Walzenraum (abseits)
    { from: -128, to: -170, pitch: 26, dist: 11, fov: 44, height: 2.2, x: RX, xLock: 0.6, area: [RX - 25, RX + 25] },
  ],
  segments: [
    // ================================================================ 1 Startdeck und Steg
    deck(-6, 6, 9, -12, 0, 1.8),
    sign(-4.6, 0, 6.6, 'Walzenritt\nim All', { yaw: 0.25 }),
    { type: 'bridge', from: [6, 0, -4], to: [17.4, 0, -4], width: 1.6 },
    deck(17.4, 21.4, -2, -6, 0, 1.2),
    sign(19.4, 0, -5.4, 'Steg der\nStille', { size: [2.2, 0.95], yaw: -0.2 }),

    // ================================================================ 2 erste Schienenwalze
    { type: 'schienenwalze', id: 'walze1', path: [[0, -W1.R, -14.4], [0, -W1.R, -90]], radius: W1.R, length: W1.LEN, speed: 3, roll: 1.1, respawn: 3 },
    deck(-6, 6, -92, -100, 0, 1.6),

    // ================================================================ 3 Walzentrio mit Wurfsichel, Rätselbox
    sign(-4.6, 0, -93.4, 'Walzentrio', { yaw: 0.2 }),
    { type: 'schienenwalze', id: 'trio1', path: [[0, -WT.R, -101.4], [0, -WT.R, -116.4]], radius: WT.R, length: WT.LEN, speed: 2.8, roll: 1.0, respawn: 2.5 },
    deck(-4, 4, -118, -121.8, 0, 1.4),
    { type: 'schienenwalze', id: 'trio2', path: [[0, -WT.R, -123.4], [0, -WT.R, -138.4]], radius: WT.R, length: WT.LEN, speed: 2.8, roll: 1.0, respawn: 2.5 },
    deck(-4, 4, -140, -143.8, 0, 1.4),
    { type: 'schienenwalze', id: 'trio3', path: [[0, -WT.R, -145.4], [0, -WT.R, -160.4]], radius: WT.R, length: WT.LEN, speed: 2.8, roll: 1.0, respawn: 2.5 },
    deck(-6, 6, -162, -172, 0, 1.6),

    // ================================================================ 4 zweite Walze an Hackvögeln vorbei
    { type: 'schienenwalze', id: 'walze2', path: [[0, -W2.R, -174.4], [0, -W2.R, -232]], radius: W2.R, length: W2.LEN, speed: 3, roll: 1.1, respawn: 3 },
    deck(-6.4, -3.05, -186.6, -191.4, 0, 1.2),      // Konsole links (Hackvogel 1)
    deck(3.05, 6.4, -199.6, -204.4, 0, 1.2),        // Konsole rechts (Hackvogel 2)
    deck(-6.4, -3.05, -212.6, -217.4, 0, 1.2),      // Konsole links (Hackvogel 3)

    // ================================================================ 5 Kontrollpunkt mit Kurbelwalze
    deck(-7, 7, -234, -256, 0, 2),
    sign(-5.4, 0, -236.2, 'Kurbelwalze', { yaw: 0.35 }),
    { type: 'schienenwalze', id: 'kurbel', path: [[-9.8, -0.8, -240.6], [-9.8, -0.8, -248.6]], radius: 0.8, length: 2.4, speed: 1.5, roll: 0.5, end: 'halt', respawn: 2 },
    deck(-11.4, -7, -250.2, -253.4, 0, 1),

    // ================================================================ 6 Walzenaufstieg (8 m)
    { type: 'schienenwalze', id: 'auf1', path: [[0, -WT.R, -257.6], [0, 1.4, -266]], radius: WT.R, length: WT.LEN, speed: 2.6, roll: 0.9, respawn: 2.5 },
    deck(-3, 3, -267.8, -270.6, 2.6, 1.2),
    { type: 'schienenwalze', id: 'auf2', path: [[0, 1.4, -272.2], [0, 4.0, -280.6]], radius: WT.R, length: WT.LEN, speed: 2.6, roll: 0.9, respawn: 2.5 },
    deck(-3, 3, -282.4, -285.2, 5.2, 1.2),
    { type: 'schienenwalze', id: 'auf3', path: [[0, 4.0, -286.8], [0, 6.8, -295.2]], radius: WT.R, length: WT.LEN, speed: 2.6, roll: 0.9, respawn: 2.5 },
    deck(-6, 6, -297, -302.6, Y8, 1.6),

    // ================================================================ 7 große Schienenwalze mit Seitenweg
    { type: 'schienenwalze', id: 'gross', path: [[0, Y8 - WG.R, -305.4], [0, Y8 - WG.R, -398]], radius: WG.R, length: WG.LEN, speed: 3.2, roll: 1.1, respawn: 3 },
    deck(7.6, 11.6, -318, -324, Y8, 1.2),
    deck(9, 12.6, -327.6, -333, Y8, 1.2),
    deck(9, 13, -336.6, -344, Y8, 1.2),
    deck(8, 14.4, -347.4, -357.6, Y8, 1.4),         // Figurenschalter
    deck(9, 13, -361.4, -367, Y8, 1.2),
    deck(8.6, 12.4, -370.8, -376.6, Y8, 1.2),
    deck(8.2, 12.2, -380.6, -386.4, Y8, 1.2),
    deck(6, 12, -390.4, -401, Y8, 1.4),
    sign(10.6, Y8, -319.4, 'Seitenweg', { yaw: -0.2 }),
    { type: 'zeituhren', id: 'uhren', list: [[10.5, Y8 + 2.4, -325.8], [10.9, Y8 + 2.4, -334.8], [11, Y8 + 2.4, -345.7], [11, Y8 + 2.4, -369]], sec: 10 },
    { type: 'appear', id: 'stempeltreppe', style: 'block', delay: 0.18,
      parts: [{ pos: [13.4, Y8, -349.6], size: [2, 1.6, 2], color: 'orange' }, { pos: [13.4, Y8, -352.4], size: [2, 3.2, 2], color: 'pink' },
        { pos: [11.4, Y8, -355.2], size: [2, 4.8, 2], color: 'blue' }] },
    // Sternbühne unter dem Ende der großen Walze (erscheint, wenn die Kurbelwalze am Prellbock ist) mit Stufen hinauf
    { type: 'appear', id: 'sternbuehne', style: 'block', delay: 0.16,
      parts: [{ pos: [-7.6, 2.4, -395.4], size: [3.6, 0.6, 3.6], color: 'yellow' }, { pos: [-10.6, 4.2, -397.6], size: [1.8, 0.6, 1.8], color: 'orange' },
        { pos: [-10.6, 6.0, -399.8], size: [1.8, 0.6, 1.8], color: 'pink' }] },

    // ================================================================ 8 Endwand mit Doppel-Lift
    deck(-12, 12, -401, -424, Y8, 2.2),
    { type: 'wall', id: 'endwand', pos: [2, Y8, -421], size: [12, 10, 4], climbable: true },
    deck(8.55, 10.8, -413.4, -423, Y8 + 10, 10, { under: 0 }),   // Holzturm rechts: in die Ecke laufen sammelt beide Figuren auf dem Lift
    { type: 'multilift', id: 'doppellift', pos: [7, Y8, -416.9], rise: 9.6, need: 2, speed: 2.4, wait: 1.2, color: 'purple' },
    sign(6.4, Y8, -410.6, 'Doppel-Lift\nnur zu zweit!', { size: [2.6, 1.1], yaw: -0.25 }),

    // ================================================================ Walzenraum (Rätselbox)
    deck(RX - 7, RX + 7, -134.4, -147, 0.5, 1.6),
    { type: 'walzenraum', id: 'raum', pos: [RX, 6.3, -152], radius: 6, length: 10, axis: 'z', color: 'holz', time: 1,
      // Regale (Stellung 0 hoch über der Mitte; nach zwei Vierteldrehungen bilden sie eine Treppe zur Mitte)
      parts: [{ u: 3.6, v: 3.6, w: 1.6, h: 0.4, a: [-5, 1.6], color: 0x8ad0ff }, { u: 1.3, v: 1.8, w: 1.6, h: 0.4, a: [-5, 1.6], color: 0xffb0d8 }],
      items: [{ kind: 'coin', u: 3.6, v: 2.9, a: -2 }, { kind: 'coin', u: 1.3, v: 1.1, a: -2 }, { kind: 'coin', u: -2.6, v: -2.6, a: -2 },
        { kind: 'coin', u: 0, v: -4.6, a: -3.5 }, { kind: 'coin', u: 2.6, v: 2.6, a: -3.5 }] },
    { type: 'druckknopf', id: 'raumknopf', pos: [RX, 0.52, -148.6], color: 'rot', once: false, reset: 1.8, onPress: { toggle: 'raum' } },
    sign(RX - 4.6, 0.5, -137.4, 'Walzenraum:\nKnopf drücken!', { size: [2.6, 1.1], yaw: 0.2 }),

    // ================================================================ Kulisse
    { type: 'deco_star', items: [
      { kind: 'holzkiste', pos: [-4.4, 0, 2.4], solid: true }, { kind: 'holzkiste', pos: [-4.6, 1.2, 2.3], size: 0.9, yaw: 0.4 },
      { kind: 'walzenstapel', pos: [4.4, 0, 4.4], yaw: 0.5 }, { kind: 'holzbalken', pos: [3.2, 0, -9.6], length: 3.4, yaw: 0.7 },
      { kind: 'rakete', pos: [-14, -4, -6], height: 4.4, color: 'rot' }, { kind: 'planet', pos: [-24, 6, -40], radius: 4, color: 'mint' },
      { kind: 'planet', pos: [26, 2, -120], radius: 5, color: 'rosa', variant: 'ring' }, { kind: 'planet', pos: [-28, 10, -210], radius: 3, color: 'gold', variant: 'pilz' },
      { kind: 'planet', pos: [30, 16, -300], radius: 6, color: 'blau', variant: 'eis' }, { kind: 'planet', pos: [-30, 22, -380], radius: 4.4, color: 'lila', variant: 'blume' },
      { kind: 'komet', pos: [18, 10, -70], size: 1.4, dir: [-1, -0.3, 0.2] }, { kind: 'komet', pos: [-20, 18, -260], size: 1.2, dir: [1, -0.2, 0.3] },
      { kind: 'sterne', pos: [0, 4, -60], size: [40, 70], n: 16, height: 8 }, { kind: 'sterne', pos: [0, 8, -200], size: [44, 90], n: 18, height: 10 },
      { kind: 'sterne', pos: [0, 14, -360], size: [44, 90], n: 18, height: 12 },
      { kind: 'holzkiste', pos: [4.6, 0, -97.6], solid: true }, { kind: 'walzenstapel', pos: [-4.4, 0, -98.4], yaw: -0.3 },
      { kind: 'holzkiste', pos: [-5, 0, -169.6], solid: true }, { kind: 'holzbalken', pos: [-3.4, 0, -165], length: 3, yaw: -0.4 },
      { kind: 'holzkiste', pos: [5.4, 0, -252.6], solid: true }, { kind: 'holzkiste', pos: [5.6, 1.2, -252.6], size: 0.9, yaw: 0.6 },
      { kind: 'walzenstapel', pos: [-4.6, Y8, -299.2], yaw: 0.2 }, { kind: 'holzkiste', pos: [-10.4, Y8, -406], solid: true },
      { kind: 'holzbalken', pos: [-6, Y8, -422], length: 4, yaw: 0.2 }, { kind: 'walzenstapel', pos: [-10.6, Y8, -421.6], yaw: -0.6 },
      { kind: 'stern', pos: [-11, Y8, -414], pole: 3, size: 1.1 }, { kind: 'stern', pos: [-5, Y8, -403], pole: 2.2, size: 0.8 },
      { kind: 'stern', pos: [6.2, 0, -236], pole: 2.4, size: 0.9 }, { kind: 'kristall', pos: [-5.6, 0, -255], n: 4, color: 'lila' },
      // Walzenraum: Holzkisten, Planeten
      { kind: 'holzkiste', pos: [RX + 5.4, 0.5, -136.6], solid: true }, { kind: 'walzenstapel', pos: [RX - 5.6, 0.5, -144], yaw: 0.4 },
      { kind: 'planet', pos: [RX + 18, 10, -150], radius: 4, color: 'gold' }, { kind: 'sterne', pos: [RX, 6, -150], size: [40, 40], n: 12, height: 8 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-1.6, 2.4, -3], content: 'coins:5' },
    { kind: 'coinblock', pos: [1.6, 2.4, -3], count: 6 },
    { kind: 'hidden', pos: [19.4, 2.5, -4], content: 'oneup' },                // Extraleben am Steg
    { kind: 'question', pos: [0, 1.9, -96], content: 'sichel' },               // Wurfsichel vor dem Walzentrio
    { kind: 'question', pos: [-4.6, 1.3, -130.6], content: 'coins:5' },        // neben der zweiten Trio-Walze (nur Wurfsichel)
    { kind: 'question', pos: [4.6, 1.3, -152.6], content: 'coins:5' },         // neben der dritten (nur Wurfsichel)
    { kind: 'question', pos: [3, 1.9, -245], content: 'krallen' },             // Krallen-Anzug am Kontrollpunkt
    { kind: 'coinblock', pos: [-2.4, 2.4, -243], count: 6 },
    { kind: 'question', pos: [-2, Y8 + 1.7, -409], content: 'spiegel' },       // Spiegelfrucht vor der Endwand
    { kind: 'hidden', pos: [6, Y8 + 12.4, -421.4], content: 'oneup' },        // Extraleben oben auf der Endwand
    { kind: 'hidden', pos: [RX + 4.4, 2.9, -140.4], content: 'oneup' },       // Extraleben im Vorraum des Walzenraums
  ],
  enemies: [
    { kind: 'hackvogel', id: 'hv1', sight: 1.9, pos: [-3.35, 0, -189], dir: [1, 0], period: 2.1 },
    { kind: 'hackvogel', id: 'hv2', sight: 1.9, pos: [3.35, 0, -202], dir: [-1, 0], period: 2.1 },
    { kind: 'hackvogel', id: 'hv3', sight: 1.9, pos: [-3.35, 0, -215], dir: [1, 0], period: 2.1 },
    { kind: 'hackvogel', id: 'hv4', pos: [-2.6, 0, -237.6], dir: [0, 1], period: 2.4, sight: 9, track: true },
  ],
  items: [
    // Start und Steg
    line([0, 0.6, 1.5], [0, 0.6, -9], 5),
    line([8, 0.55, -4], [16.4, 0.55, -4], 6, { hidden: true }),
    ring([19.4, 0.6, -4], 1.3, 5, { hidden: true }),
    // erste Walze: Mittelspur, Bögen über den Hürden
    line([0, 0.6, -17], [0, 0.6, -28], 4),
    line([2, 0.6, -35], [2, 0.6, -42], 3), line([-2, 0.6, -50], [-2, 0.6, -56], 3),
    ...arc([0, 0.6, -58.4], [0, 0.6, -61.6], 3, 1.4),
    line([0, 0.6, -66], [0, 0.6, -72], 3), line([0, 0.6, -78], [0, 0.6, -86], 3),
    ring([0, 2.6, -46], 1.2, 6),
    // Walzentrio: Mitte zu Fuß, neben den Walzen im All (Wurfsichel)
    line([0, 0.6, -104], [0, 0.6, -114], 4), line([0, 0.6, -126], [0, 0.6, -136], 4), line([0, 0.6, -148], [0, 0.6, -158], 4),
    line([-4.1, 0.9, -108], [-6.1, 0.9, -108], 3), line([4.1, 0.9, -130], [6.1, 0.9, -130], 3), line([-4.1, 0.9, -152], [-6.1, 0.9, -152], 3),
    // zweite Walze: Randspuren locken an die Hackvögel
    line([-2.1, 0.6, -184], [-2.1, 0.6, -194], 4), line([2.1, 0.6, -197], [2.1, 0.6, -207], 4), line([-2.1, 0.6, -210], [-2.1, 0.6, -220], 4),
    line([0, 0.6, -177], [0, 0.6, -182], 2), line([0, 0.6, -223], [0, 0.6, -230], 3),
    // Kontrollpunkt, Kurbelwalze
    ring([0, 0.6, -246], 2.4, 8), line([-9.8, 0.6, -242], [-9.8, 0.6, -248], 3),
    // Walzenaufstieg
    line([0, 0.6, -259], [0, 3.2, -265], 3), line([0, 3.2, -273.4], [0, 5.8, -279.6], 3), line([0, 5.8, -288], [0, 8.6, -294.2], 3),
    // große Walze und Seitenweg
    line([0, Y8 + 0.6, -308], [0, Y8 + 0.6, -326], 5), line([-2.5, Y8 + 0.6, -336], [-2.5, Y8 + 0.6, -346], 4),
    ...arc([0, Y8 + 0.6, -350.4], [0, Y8 + 0.6, -353.6], 3, 1.4), line([2.6, Y8 + 0.6, -360], [2.6, Y8 + 0.6, -368], 3),
    line([-2.6, Y8 + 0.6, -376], [-2.6, Y8 + 0.6, -394], 6),
    ...arc([5.2, Y8 + 0.6, -321], [8.8, Y8 + 0.6, -321], 3, 1.2), line([10.8, Y8 + 0.6, -339], [10.8, Y8 + 0.6, -342.6], 2),
    line([11, Y8 + 0.6, -363], [11, Y8 + 0.6, -366], 2), line([10.4, Y8 + 0.6, -382], [10.4, Y8 + 0.6, -385.6], 2),
    // Sternbühne, Endwand
    ring([-7.6, 3.6, -395.4], 1.2, 5, { hidden: false }),
    line([-6, Y8 + 0.6, -404], [-6, Y8 + 0.6, -412], 4), ring([2, Y8 + 10.6, -421], 1.6, 6), column(7, -416.9, Y8 + 2, Y8 + 9, 4),
    // Walzenraum: Vorraum
    line([RX, 1.1, -137], [RX, 1.1, -144], 4),
    // Rätselbox (Hin- und Rückweg)
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [3.4, 0, -168], target: 'raumbox' },
    { kind: 'warpbox', id: 'raumbox', style: 'mystery', pos: [RX - 3.2, 0.5, -139.4], target: 'raetsel' },
    // Seitenweg: Figurenschalter für Greta → Blocktreppe zum Stempel
    { kind: 'figurenschalter', id: 'gretaschalter', pos: [10.6, Y8, -352.4], hero: 'greta', on: { reveal: 'stempeltreppe' } },
  ],
  checkpoint: { pos: [0, 0, -245.6], yaw: PI / 2 },
  stars: [
    { pos: [RX, 6.3, -153.4], id: 'raumstern' },                              // 0: Walzenraum (Mitte)
    { pos: [-7.6, 3.6, -395.4], hidden: true, id: 'unterstern' },             // 1: Sternbühne unter der großen Walze
    [1.6, Y8 + 10.9, -421.2],                                                 // 2: oben auf der Endwand
  ],
  stamp: [11.4, Y8 + 5.8, -355.2],
  goal: [-8, Y8, -416],
  marks: {
    start: [0, 0, 5], steg: [8, 0, -4], walze1: [0, 0, -11.4], p1: [0, 0, -96], trio1: [0, 0, -99.6], p4: [0, 0, -166],
    walze2: [0, 0, -171], cp: [0, 0, -245.6], kurbel: [-6.4, 0, -244.6], auf: [0, 0, -255], g0: [0, Y8, -300], seiten: [9.6, Y8, -321],
    schalter: [10.6, Y8, -350], ende: [0, Y8, -406], wand: [6.4, Y8, -413], raum: [RX, 0.5, -142], raumMitte: [RX, 0.52, -152],
  },
};
