// 3-2 „Gitterbahn über den Wolken“ – Welt 3, Archetyp autoscroller (Bauplan 3-2: Himmels-Level mit beweglichen
// Kettenzäunen als Plattformen, an denen man klettert). Thema `skyway`, Musik `course_skyway`, 400 s, 3 Sterne + Stempel.
// Das Bildfenster fährt einen Pfad mit drei Richtungen: zuerst nach −Z (Zaunbahn), dann senkrecht nach oben
// (Kletteraufstieg, 40 m), oben nach rechts (+X, Wolkenstrecke in Seitenansicht). Kamera und Fenstergrenzen je
// Pfadlänge s (LEVEL.scroll.cams/frames, Motor: archetypes/ScrollDirector.js), bei senkrechter Fahrt ist unten aus dem
// Bild = Absturz.
//
// Pfad der Fenstermitte (s = Pfadlänge):  A (0, 0, 6) → B (0, 0, −68) s 74 → C (0, 40, −68) s 114 → D (72, 40, −68) s 186
//   1 Zaunbahn       (z 8 … −60, y 0)      Start-Insel, Schiebeplattform P1 (vor/zurück) über die erste Lücke, links die
//                                          Ringbahn (Kettenplattform fährt los, sobald man aufspringt) durch zwei Goldringe
//                                          → Stern 1 hoch über der Bahn (nur vom Kletterzaun der Plattform aus); Insel I2 mit
//                                          Hubzaun (fährt aus dem Boden auf und ab), Bröckelbrücke, Insel I3, ganz rechts die
//                                          Hubzaun-Gasse (4 Zäune, die abwechselnd Platz machen) → Stern 2; Querplattform P2;
//                                          Torinsel I5: Gittertor, die Warp-Box erscheint, wenn das Fenster ankommt
//   2 Kletteraufstieg (y 0 … 38, z −70)    Checkpoint-Insel mit ?-Block (Krallen-Anzug); Kletterturm: Zaun K1, waagerecht
//                                          gleitender Zaun K2, K3, senkrecht fahrender Zaun K4, K5 → Gipfelsims T; hinter dem
//                                          Glasrohr-Eingang eine Krallenwand mit Zaun → Stempel; das Glasrohr (öffnet, sobald
//                                          das Fenster oben abbiegt) führt hinauf zur Wolkenstation W0
//   3 Wolkenstrecke   (x 10 … 86, y 40–44) Seitenansicht: Kurbelrad hebt eine Plattform → Zaun hinauf → Stern 3; Wolken,
//                                          Bröckelblöcke, Schiebezäune SZ1–SZ3 (man springt nach hinten an den Zaun, fährt
//                                          mit und springt nach vorn ab), Endstation W_end: Warp-Box erscheint beim Halt
//   4 Zielinsel       (x 96 … 126, y 30)   frei begehbar; Kurbelrad hebt eine Plattform zur Wolke mit 1-Up, Zielmast
// Sterne: 1 über den zwei Goldringen der Ringbahn (Sprung vom Plattformzaun), 2 am Ende der Hubzaun-Gasse ganz rechts,
// 3 nach dem Glasrohr: Kurbelrad drehen, Plattform hoch, Zaun hinaufklettern. Stempel: Krallenwand + Zaun hinter dem
// Glasrohr-Eingang. 1-Up: Kurbelrad auf der Zielinsel → Wolke. Gegner: Krabbelkäfer (4), Flatterkäfer (7).

import { levelSetup, isl, line, ring, arc, column, towerBack, slotStrip, pennantLine, balloon, zeppelin, birds, windmill, pipeLid, plate, cyl, sphere, bugSwarm, fenceShadows, addStaticParts, shadowRange, meadow, tree, bush, stonePath, ropeFence } from './_helpers_b.js';

const PI = Math.PI;
const ZC = -68;          // Fensterlinie (Kletterturm, Wolkenstrecke)
const PL = -70;          // Ebene der Kletterzäune
const YT = 37.6;         // Gipfelsims T
const YW = 43.5;         // Wolkenstation W0
const YR = 40;           // Wolkenstrecke
const YZ = 30;           // Zielinsel

// Pfadlängen (Fenstermitte) der Ecken
const S_B = 74, S_C = 114, S_END = 186;

// Kettenplattform mit Oberkante y: pos.y = y − 0,35
const deck = (y) => y - 0.35;

// ------------------------------------------------------------------ Bewegliche Zäune
const FENCES = [
  // 1 Zaunbahn
  { type: 'kettenplattform', id: 'p1', yaw: 0, size: [3, 4.4], pos: [0, deck(0), -3], path: [[0, deck(0), -3], [0, deck(0), -13]], speed: 2.2, wait: 2.5, fenceHeight: 2.2 },
  { type: 'kettenplattform', id: 'ringbahn', yaw: 0, size: [4.2, 3], pos: [-7, deck(0), 0.5], path: [[-7, deck(0), 0.5], [-7, deck(0), -30]], speed: 2.4, idle: true, once: true, fenceHeight: 2.5 },
  { type: 'kettenzaun', id: 'hub1', size: [9.2, 3.8], pos: [0, -3.95, -21], path: [[0, -3.95, -21], [0, 0.02, -21]], speed: 1.7, wait: 3 },
  { type: 'kettenplattform', id: 'p2', yaw: 0, size: [6.4, 4], pos: [-8, deck(0), -47], path: [[-8, deck(0), -47], [3.5, deck(0), -47]], speed: 2.6, wait: 1.5, fenceHeight: 2.2 },
  // Hubzaun-Gasse (Stern 2): vier Zäune, die abwechselnd versinken
  ...[-38, -41.5, -45, -48.5].map((z, i) => ({ type: 'kettenzaun', id: `gasse${i + 1}`, size: [3.1, 2.7], pos: [7.9, -2.75, z], path: [[7.9, -2.75, z], [7.9, 0.02, z]], speed: 2.4, wait: 1.2 })),
  // Gittertor (fest) zwischen Torinsel und Checkpoint-Insel
  { type: 'kettenzaun', id: 'tor', size: [12.4, 5.4], pos: [0, 0.02, -60.35] },
  // 2 Kletterturm (Ebene z −70, Vorderseite zur Kamera)
  { type: 'kettenzaun', id: 'k1', size: [7, 11.2], pos: [0, 0.25, PL] },
  { type: 'kettenzaun', id: 'k2', size: [3.2, 4.6], pos: [-2.2, 12.3, PL], path: [[-2.2, 12.3, PL], [4.0, 12.3, PL]], speed: 3, wait: 0.5 },
  { type: 'kettenzaun', id: 'k3', size: [4, 18], pos: [7.6, 12, PL] },
  { type: 'kettenzaun', id: 'k4', size: [3, 7], pos: [3.0, 18.5, PL], path: [[3.0, 18.5, PL], [3.0, 26.5, PL]], speed: 1.8, wait: 1.2 },
  { type: 'kettenzaun', id: 'k5', size: [4.2, 10.4], pos: [-1.6, 28.2, PL] },
  { type: 'kettenzaun', id: 'k6', size: [2.6, 3.2], pos: [3.6, 41.85, -70.2] },
  // 3 Wolkenstrecke (Ebene z −68,4; man steht davor auf z ≈ −66)
  { type: 'kettenzaun', id: 'g3', size: [2.6, 3.4], pos: [17.6, 49.2, -69.0] },
  { type: 'kettenzaun', id: 'sz1', size: [3.6, 4.2], pos: [41.2, 39.6, -68.4], path: [[41.2, 39.6, -68.4], [49, 39.6, -68.4]], speed: 2.1, wait: 1.5 },
  { type: 'kettenzaun', id: 'sz2', size: [3.2, 4], pos: [56.6, 39.8, -68.4], path: [[56.6, 39.8, -68.4], [60.6, 39.8, -68.4]], speed: 1.8, wait: 1.0 },
  { type: 'kettenzaun', id: 'sz3', size: [3.2, 4], pos: [64, 39.8, -68.4], path: [[64, 39.8, -68.4], [68, 39.8, -68.4]], speed: 1.8, wait: 1.0 },
];

// Laufbahnen (Optik) unter den Plattformen und Zäunen
const RAILS = [
  { type: 'kettenbahn', path: [[0, deck(0), -3], [0, deck(0), -13]] },
  { type: 'kettenbahn', path: [[-7, deck(0), 0.5], [-7, deck(0), -30]] },
  { type: 'kettenbahn', path: [[-8, deck(0), -47], [3.5, deck(0), -47]] },
  { type: 'kettenbahn', path: [[-3.8, 12.3, PL - 0.2], [5.6, 12.3, PL - 0.2]], drop: 0.15 },
  { type: 'kettenbahn', path: [[39.4, 39.6, -68.6], [50.8, 39.6, -68.6]], drop: 0.2 },
  { type: 'kettenbahn', path: [[55, 39.8, -68.6], [62.2, 39.8, -68.6]], drop: 0.2 },
  { type: 'kettenbahn', path: [[62.4, 39.8, -68.6], [70, 39.8, -68.6]], drop: 0.2 },
];

// ------------------------------------------------------------------ Inseln
const ISLANDS = [
  // 1 Zaunbahn
  isl(-5, 5, 8, -1.5, 0, 5, { under: 4 }),                 // Start
  isl(-4.5, 4.5, -14.5, -27.5, 0, 5, { under: 3.5 }),      // I2 (Hubzaun)
  isl(-9, 4.5, -32.5, -43.7, 0, 5, { under: 4 }),          // I3
  isl(6.4, 9.4, -30.5, -52, 0, 3.4, { under: 2.4 }),       // Hubzaun-Gasse
  isl(-6, 6, -50.3, -60.1, 0, 5, { under: 4 }),            // I5 Torinsel
  // 2 Kletterturm
  isl(-7, 7, -60.6, -71, 0, 4, { under: 5, top: 'stone' }),  // Checkpoint-Insel
  isl(1.5, 10.5, -61, -69.1, YT, 1.2, { under: 2.2, top: 'stone' }),   // Gipfelsims T
  // 3 Wolkenstrecke
  isl(10, 27, -63, -71, YW, 1.4, { under: 3.2 }),          // Wolkenstation W0
  isl(50.5, 56, -62, -68.6, YR + 0.2, 1.2, { under: 2.4 }), // W2
  isl(70, 86, -62, -71, YR, 1.6, { under: 3.6 }),           // Endstation W_end
  // 4 Zielinsel
  isl(96, 126, -56, -80, YZ, 3, { under: 5 }),
];

export const LEVEL = {
  id: '3-2',
  world: 3,
  title: 'Gitterbahn über den Wolken',
  archetype: 'autoscroller',
  theme: 'skyway',
  music: 'course_skyway',
  timeLimit: 400,
  killY: -16,
  start: { pos: [0, 0, 3.5], yaw: PI / 2 },
  scroll: {
    path: [[0, 0, 6], [0, 0, ZC], [0, YR, ZC], [96, YR, ZC]],
    start: 4, end: S_END,
    speed: 2.2,
    speeds: [{ from: 52, speed: 1.5 }, { from: 70, speed: 1.15 }, { from: 106, speed: 0.85 }, { from: 128, speed: 2.1 }],
    accel: 3, delay: 2.5,
    frame: { back: 5, front: 8, ahead: 1.2, followX: 0.3, turn: false },
    startBanner: 'Los geht\'s!', endBanner: 'Endstation!',
    // Regie je Pfadlänge s (archetypes/ScrollDirector.js): Kamera und Fenstergrenzen während der Fahrt, steile Fahrt nach
    // oben = unten aus dem Bild ist Absturz, Glasrohr ab s 116, Warp-Boxen, Absturz auf der Wolkenstrecke, Decke über dem
    // Kletterturm, fahrende Zäune im Takt der Fahrt-Uhr
    cams: [
      { s: 0, pitch: 42, dist: 15, fov: 40, height: 1 },
      { s: 66, pitch: 40, dist: 15, fov: 40, height: 1 },
      { s: 78, pitch: 17, dist: 17, fov: 42, height: 1 },
      { s: 108, pitch: 17, dist: 17, fov: 42, height: 1 },
      { s: 120, pitch: 27, dist: 15.5, fov: 40, height: 1 },
      { s: 200, pitch: 27, dist: 15.5, fov: 40, height: 1 },
    ],
    frames: [
      { s: 0, back: 5, front: 7.5, ahead: 1.2, followX: 0.3 },
      { s: 68, back: 5, front: 7.5, ahead: 1.2, followX: 0.3 },
      { s: 76, back: 5.5, front: 6.4, ahead: 1.0, followX: 0.3 },
      { s: 96, back: 5.5, front: 6.4, ahead: 1.0, followX: 0.3 },
      { s: 101, back: 5.5, front: 8.0, ahead: 2.0, followX: 0.3 },
      { s: 110, back: 5.5, front: 8.0, ahead: 2.0, followX: 0.3 },
      { s: 118, back: 6.5, front: 7, ahead: 1.5, followX: 0.25 },
      { s: 200, back: 6.5, front: 7, ahead: 1.5, followX: 0.25 },
    ],
    killUp: 0.6,
    gates: [{ id: 'rohr', open: 116 }],
    reveal: [{ id: 'warp1', at: 62 }, { id: 'warp2', at: 'done' }],
    fall: { minS: 116, y: 33, x: [-12, 92] },
    cap: { s0: 60, s1: 80, up: 6.0, x: [-9, 12], z: [-72, -60.5] },
    // Takt der fahrenden Zäune (Sekunden Versatz zur Fahrt-Uhr, LEVEL.scroll.sync, Motor): je so gelegt, dass sie zur Stelle sind,
    // wenn das Bildfenster dort ankommt (P1 wartet am Start; der Hubzaun senkt sich, wenn man ankommt, und fährt wieder
    // hoch, kurz bevor die hintere Grenze ihn erreicht – wer trödelt, wird zwischen Grenze und Zaun eingeklemmt …)
    sync: {
      p1: 0, hub1: 1.485, gasse1: 2.832, gasse2: 1.632, gasse3: 0.432, gasse4: 3.94, p2: -14.58,
      k2: 4, k4: 0, sz1: 2.8, sz2: 1.06, sz3: 4.28,
    },
  },
  // Kamera je Pfadlänge (Level-Haken; während der Fahrt) – danach diese Schiene (Endstation, Zielinsel)
  camera: [
    { from: 20, to: -100, pitch: 42, dist: 14, fov: 40, area: [-20, 40] },
    { from: -40, to: -100, pitch: 27, dist: 15.5, fov: 40, area: [40, 92] },
    { from: -40, to: -100, pitch: 42, dist: 13, fov: 40, ahead: 2.4, area: [92, 140] },
  ],
  setup: levelSetup((level, scene) => buildSky(level, scene)),
  segments: [
    ...ISLANDS,
    ...FENCES,
    ...RAILS,
    // Bröckelbrücke I2 → I3 (zwei Reihen), Bröckelblöcke der Wolkenstrecke
    { type: 'broeckelblock', id: 'bruecke', blocks: [-0.5, 0.5].flatMap((x) => [-28, -29, -30, -31, -32].map((z) => [x, -1, z])), delay: 0.45, respawn: 4 },
    { type: 'broeckelblock', id: 'wolkenbroeckel', blocks: [36.5, 37.5, 38.5].flatMap((x) => [[x, YR - 0.2, -65.5], [x, YR - 0.2, -66.5]]), delay: 0.5, respawn: 4 },
    // Brücke I3 → Hubzaun-Gasse
    { type: 'bridge', from: [4.5, 0, -35], to: [6.4, 0, -35], width: 2 },
    // Wolken der Wolkenstrecke
    { type: 'cloud', pos: [29.6, YW - 1.7, -66], size: [2.8, 0.6, 3] },
    { type: 'cloud', pos: [40.3, YR + 0.2, -66], size: [2.2, 0.6, 2.6] },
    { type: 'cloud', id: 'wolke2', pos: [33.6, YR + 1.2, -66], size: [2.6, 0.6, 3], path: [[33.6, YR + 1.2, -66], [33.6, YR + 2.6, -66]], speed: 0.9, wait: 0.5 },
    // Krallenwand (Stempel) hinter dem Glasrohr-Eingang
    { type: 'wall', pos: [3.6, YT, -69.75], size: [2.8, 4.2, 1.3], climbable: true },
    // Glasrohr vom Gipfelsims hinauf zur Wolkenstation (öffnet, sobald das Fenster nach rechts abbiegt)
    { type: 'glasspipe', id: 'rohr', oneWay: true, path: [[6.2, YT + 1.15, -65.5], [7.8, YT + 1.15, -65.5], [8.6, YT + 2.0, -65.5], [8.6, YW - 0.1, -65.5], [9.4, YW + 1.0, -65.5], [11.0, YW + 1.1, -65.5]], coins: 3, exitSpeed: 6 },
    // Kurbelräder: Wolkenstation (Stern 3) und Zielinsel (1-Up)
    { type: 'kurbelrad', id: 'kurbel3', pos: [14.2, YW, -64.6], turns: 2, back: 0.25, platform: { pos: [17.6, YW, -67.2], size: [2.4, 0.5, 2.4], rise: 2.6, color: 0x3d8bff } },
    { type: 'kurbelrad', id: 'kurbelZiel', pos: [105.5, YZ, -62.5], turns: 2, back: 0.3, platform: { pos: [108.8, YZ, -60], size: [2.6, 0.5, 2.6], rise: 3.4 } },
    { type: 'cloud', pos: [112.6, YZ + 5.4, -59.4], size: [3.4, 0.6, 3.2] },
    // Schilder
    { type: 'sign', pos: [-3.2, 0, 6.6], text: 'Gitterbahn über\nden Wolken', size: [2.8, 1.1] },
    { type: 'sign', pos: [-4.8, 0, -62.2], text: 'Kletterturm', size: [2.4, 0.9] },
    { type: 'sign', pos: [101, YZ, -57.4], text: 'Wolkeninsel', size: [2.4, 0.9] },
  ],
  blocks: [
    { kind: 'question', pos: [2, 3.2, -0.5], content: 'coins:3' },
    { kind: 'question', pos: [3.2, 2.0, -64.5], content: 'krallen' },   // niedrig: der Anzug bleibt oben liegen (Sprung hinauf)
    { kind: 'question', pos: [-4.6, 3.2, -38.2], content: 'wachstumsbeere' },
    { kind: 'brick', pos: [-3.6, 3.2, -38.2] }, { kind: 'brick', pos: [-5.6, 3.2, -38.2] },
  ],
  enemies: [
    // Krabbelkäfer (4)
    { kind: 'krabbelkaefer', path: [[-3, 1, -16], [3, 1, -16], [3, 1, -18.8], [-3, 1, -18.8]], count: 2, spacing: 1.8, color: 'blue' },
    { kind: 'krabbelkaefer', path: [[-6.5, 1, -40.5], [1.5, 1, -40.5], [1.5, 1, -42.6], [-6.5, 1, -42.6]], count: 2, spacing: 2.2, color: 'green' },
    // Flatterkäfer (7): über der Bröckelbrücke, hinter K1 (Faustschlag durch den Zaun), vor K3, über W2
    { kind: 'flatterkaefer', path: [[-2.2, 2.1, -28.5], [2.2, 2.1, -30.5], [-2.2, 2.1, -32.5]], count: 3, spacing: 2.2, color: 'pink' },
    { kind: 'flatterkaefer', path: [[-2.5, 3.5, -70.75], [2.5, 3.5, -70.75], [2.5, 8.5, -70.75], [-2.5, 8.5, -70.75]], count: 2, spacing: 5.5, color: 'yellow' },
    { kind: 'flatterkaefer', path: [[6.1, 21.6, -69.3], [9.1, 21.6, -69.3]], color: 'red', speed: 1.6 },
    { kind: 'flatterkaefer', path: [[51.5, YR + 1.7, -64.6], [55.2, YR + 1.7, -64.6]], color: 'pink', speed: 1.8 },
  ],
  items: [
    // Goldringe der Ringbahn
    { kind: 'goldring', id: 'ring1', pos: [-7, 1.25, -8], yaw: PI / 2, radius: 1.1 },
    { kind: 'goldring', id: 'ring2', pos: [-7, 1.25, -13.5], yaw: PI / 2, radius: 1.1 },
    { kind: 'goldring', id: 'ringZiel', pos: [110, YZ + 1.4, -70], yaw: 0, radius: 1.2 },
    // Warp-Boxen (erscheinen per Level-Haken)
    { kind: 'warpbox', id: 'warp1', pos: [0, 0, -57], target: [0, 0.05, -63.4], hidden: true },
    { kind: 'warpbox', id: 'warp2', pos: [79, YR, -66], target: [100, YZ + 0.05, -66], hidden: true },
    { kind: 'powerup', pos: [112.6, YZ + 6.0, -59.4], power: 'oneup', speed: 0 },
    // Münzspuren
    line([0, 0.9, 5], [0, 0.9, 0], 3),
    line([0, 0.9, -5], [0, 0.9, -11], 3),
    ...arc([-7, 0.9, -2], [-7, 0.9, -6], 3, 0.6),
    line([-7, 0.9, -17.5], [-7, 0.9, -26], 3),
    line([0, 0.9, -16], [0, 0.9, -19.5], 2),
    line([0, 0.9, -23], [0, 0.9, -26.5], 2),
    line([0, 1.6, -28], [0, 1.6, -32], 3),
    ring([-2, 0.9, -36.5], 1.4, 5),
    line([7.9, 0.9, -32], [7.9, 0.9, -36], 2),
    line([7.9, 3.4, -39.7], [7.9, 3.4, -47], 3),
    line([-6, 0.9, -47], [2, 0.9, -47], 3),
    line([0, 0.9, -51.5], [0, 0.9, -55], 2),
    ring([-3.5, 0.9, -66.5], 1.2, 5),
    column(-2.4, -69.5, 2.5, 10, 4),
    line([-1.8, 15.2, -69.5], [4.4, 15.2, -69.5], 3),
    column(7.6, -69.5, 17.5, 27.5, 4),
    column(3.0, -69.5, 27.5, 32.5, 3),
    column(-2.5, -69.5, 32.5, 37.5, 3),
    line([3.5, YT + 0.9, -64.5], [9.5, YT + 0.9, -64.5], 3),
    line([20.5, YW + 0.9, -66], [26, YW + 0.9, -66], 3),
    ...arc([27, YW + 0.9, -66], [29.6, YW - 0.2, -66], 3, 0.8),
    ...arc([31, YW, -66], [33.6, YR + 2.6, -66], 3, 0.9),
    line([36.5, YR + 1.6, -66], [38.5, YR + 1.6, -66], 3),
    line([42, YR + 4.6, -67.8], [48, YR + 4.6, -67.8], 3),
    line([51.5, YR + 1.0, -64], [55.5, YR + 1.0, -64], 3),
    line([57.5, YR + 4.4, -67.8], [67.5, YR + 4.4, -67.8], 4),
    ring([75, YR + 1.0, -66], 1.6, 6),
    line([100, YZ + 0.9, -70], [117, YZ + 0.9, -70], 5),
    ring([112.6, YZ + 6.9, -59.4], 1.4, 5),
  ],
  checkpoint: [{ pos: [-3.5, 0, -64.5] }],
  stars: [
    { pos: [-7.45, 5.3, -21.5] },                  // 1: Sprung vom Plattformzaun der Ringbahn (über den zwei Goldringen)
    { pos: [7.9, 0.5, -51.2] },                    // 2: Ende der Hubzaun-Gasse ganz rechts
    { pos: [17.6, 52.0, -68.55] },             // 3: Zaun über der Kurbelrad-Plattform
  ],
  stamp: { pos: [3.6, 44.3, -69.75] },          // auf dem Zaun über der Krallenwand
  goal: { pos: [121, YZ, -70], height: 9 },
  marks: {
    start: [0, 0, 3.5], p1Near: [0, 0, -2.5], i2: [0, 0, -16], hub1: [0, 0, -21], bridge: [0, 0, -27.8], i3: [0, 0, -34],
    gasse: [7.9, 0, -33], star2: [7.9, 0, -51.2], p2: [0, 0, -44], i5: [0, 0, -51], warp1: [0, 0, -57], ci: [0, 0, -63.4],
    k1: [0, 0, -69.6], top: [6, YT, -64], pipe: [6.2, YT, -65.5], clawWall: [3.6, YT, -68.9], w0: [12, YW, -66],
    kurbel3: [14.2, YW, -64.6], plat3: [17.6, YW, -67.2], clouds: [27, YW, -66], sz1: [39, YR + 0.8, -66], w2: [52, YR + 0.2, -65],
    sz2: [56, YR + 0.2, -65], wend: [72, YR, -66], warp2: [79, YR, -66], ziel: [100, YZ, -66], kurbelZiel: [105.5, YZ, -62.5], goal: [121, YZ, -70],
  },
  pathS: { B: S_B, C: S_C, end: S_END },
};

/** Level-Haken: Kamera/Fenster je Pfadlänge, Glasrohr-Deckel, Warp-Boxen, Ringbahn-Start, Kulisse. */
function buildSky(level, scene) {
  // Kamera/Fenster je Pfadlänge, Glasrohr, Warp-Boxen, Takt der Zäune: LEVEL.scroll (Motor, archetypes/ScrollDirector.js)
  level._sky = { dir: level.archetype?.director ?? null };
  // Ringbahn fährt los, sobald eine Figur auf ihr steht; ein Neustart vom Levelanfang stellt sie zurück
  const rb = level.named.get('ringbahn');
  if (rb) {
    level.onStep(() => {
      if (!rb.running && rb.pm.s < 1e-6 && (level.players ?? [level.player]).some((p) => p && !p.dead && p.mode === 'ground' && p.ground === rb.deckShape)) rb.start();
    });
    const rt = level.runtime, respawn = rt.respawn.bind(rt);
    rt.respawn = () => {
      respawn();
      if (!level.runtime.checkpoint) {
        rb.stop(); rb.pm.s = 0; rb.pm.dir = 1; rb.pm.pause = 0; rb.pm.at(0, rb.pm.pos);
        rb.pos.set(rb.pm.pos.x, rb.pm.pos.y, rb.pm.pos.z); rb.placeShapes();
      }
    };
  }
  const w = level.scroll;
  pipeLid(level, { pos: [5.95, YT + 1.15 - 1.05, -65.5], r: 1.05, open: () => w.state === 'done' || w.s >= 116 });
  skyDeco(level);
  bugSwarm(level, { dist: 32 });
  fenceShadows(level);
  shadowRange(level, { dist: 30 });
}

/** Kulisse (statisch verschmolzen bzw. wenige animierte Objekte): Turm, Schlitze, Wimpel, Windräder, Ballons, Zeppelin, Vögel. */
function skyDeco(level) {
  const parts = [];
  // Kletterturm hinter den Zäunen (Rückwand mit Höhenmarken)
  towerBack(level, { x0: -8.5, x1: 11.5, z: -70.95, depth: 1.6, y0: -1, y1: YT + 9.5, marks: [10, 20, 30, 40] });
  // Schlitze der Hubzäune
  slotStrip(parts, 0, 0.005, -21, 9.2);
  for (const z of [-38, -41.5, -45, -48.5]) slotStrip(parts, 7.9, 0.005, z, 3.1);
  // Warnpfosten am Hubzaun, Leuchtbaken
  for (const x of [-4.9, 4.9]) parts.push(cyl(0.1, 0.12, 1.6, x, 0, -21, 0xf6f4ef, 8), sphere(0.17, x, 1.7, -21, 0xff9a1a));
  // Wimpelketten an Start, Torinsel und Endstation
  pennantLine(parts, [-4.7, 3.2, 7.6], [4.7, 3.2, 7.6], 12, 0.6);
  for (const x of [-4.7, 4.7]) parts.push(cyl(0.08, 0.1, 3.3, x, 0, 7.6, 0xd8dce8, 8));
  pennantLine(parts, [-5.8, 3.0, -50.6], [5.8, 3.0, -50.6], 12, 0.5);
  for (const x of [-5.8, 5.8]) parts.push(cyl(0.08, 0.1, 3.1, x, 0, -50.6, 0xd8dce8, 8));
  pennantLine(parts, [70.4, YR + 3.4, -62.4], [85.6, YR + 3.4, -62.4], 16, 0.7);
  for (const x of [70.4, 85.6]) parts.push(cyl(0.08, 0.1, 3.5, x, YR, -62.4, 0xd8dce8, 8));
  // Gittertor-Pfosten mit Laternen
  for (const x of [-6.4, 6.4]) parts.push(plate(0.5, 5.8, 0.5, x, 0, -60.35, 0x3a6ab8, { r: 0.08 }), sphere(0.32, x, 6.05, -60.35, 0xffc21a));
  // Ringbahn-Hinweis: rote Pfeile auf dem Boden der Start-Insel
  for (let i = 0; i < 3; i++) parts.push(plate(0.5, 0.03, 0.18, -4.4 + i * 0.0, 0.006, 1.6 - i * 0.6, 0xffc21a, { r: 0 }));
  // Windräder auf den Inseln
  windmill(level, parts, 4.0, 0, 6.6, { h: 2.6 });
  windmill(level, parts, -8.4, 0, -34.2, { h: 3, speed: 2.2 });
  windmill(level, parts, 25.6, YW, -70.2, { h: 3.2, color: 0xffd23d });
  windmill(level, parts, 123.5, YZ, -78.5, { h: 4.2, speed: 1.6 });
  // Gipfelsims: Geländer am Rand, kleines Dach über dem Rohr-Eingang
  for (let x = 2; x <= 10; x += 1.6) parts.push(cyl(0.05, 0.05, 0.9, x, YT, -61.25, 0xd8dce8, 6));
  parts.push(plate(8.4, 0.08, 0.08, 6.2, YT + 0.9, -61.25, 0xffc21a, { r: 0.02 }));
  // Wolkenstation: Bahnhofsdach-Andeutung, Bänke
  parts.push(plate(2, 0.45, 0.6, 22.5, YW, -70.2, 0xb8834a, { r: 0.06, top: 0xd8a462 }));
  // Zielinsel: Blumen, Bäumchen (deco), Wetterhäuschen
  parts.push(plate(1.4, 2.2, 1.4, 99, YZ, -77.5, 0xf6f4ef, { r: 0.1 }), plate(1.7, 0.3, 1.7, 99, YZ + 2.2, -77.5, 0xe8283a, { r: 0.08 }));
  parts.push(cyl(0.05, 0.05, 1.4, 99, YZ + 2.5, -77.5, 0xd8dce8, 6), plate(0.6, 0.06, 0.06, 99.3, YZ + 3.8, -77.5, 0xffc21a, { r: 0 }));
  // Blumen und Gras am Rand der Wiesen-Inseln
  meadow(parts, -5, 5, 8, -1.5, 0, { n: 14, skip: [[-5, -3, 1.5, -0.5]] });
  meadow(parts, -4.5, 4.5, -14.5, -27.5, 0, { n: 12, skip: [[-5, 5, -20.3, -21.7]] });
  meadow(parts, -9, 4.5, -32.5, -43.7, 0, { n: 14 });
  meadow(parts, -6, 6, -50.3, -60.1, 0, { n: 12, skip: [[-1.5, 1.5, -55.5, -58.5]] });
  meadow(parts, 10, 27, -63, -71, YW, { n: 16, skip: [[12.5, 16, -62, -66.5], [16, 19.2, -66, -69]] });
  meadow(parts, 70, 86, -62, -71, YR, { n: 14, skip: [[77, 81, -64, -68]] });
  // Zielinsel: Trittsteinweg zum Zielmast, Bäume, Büsche, Blumen, Seilzaun, Bank am Windrad
  stonePath(parts, [100.5, YZ, -66.5], [118.5, YZ, -70]);
  for (const [x, z, s] of [[98, -59, 1.1], [124, -59.5, 1], [103.5, -78.4, 0.9], [116.5, -78.4, 1.2], [124.8, -66, 0.8]]) {
    tree(parts, x, YZ, z, s);
    level.world.add({ type: 'cyl', x, z, r: 0.2 * s, y0: YZ, y1: YZ + 1.3 * s, tag: 'baum' });
  }
  for (const [x, z] of [[97.6, -63], [97.6, -70.5], [114, -57.4], [119.5, -57.6], [108, -79], [112, -79], [125, -72.5]]) bush(parts, x, YZ, z, 1);
  meadow(parts, 96, 126, -56, -80, YZ, { n: 40, band: 2.4, skip: [[103.5, 111, -58, -64.5], [97, 101.6, -76, -79], [119, 123, -68, -72]] });
  ropeFence(parts, [96.6, YZ, -79.4], [125.4, YZ, -79.4], 2.4);
  ropeFence(parts, [125.4, YZ, -79.4], [125.4, YZ, -56.6], 2.4);
  parts.push(plate(1.6, 0.08, 0.45, 120.2, YZ + 0.42, -77.2, 0xb8834a, { r: 0 }), plate(1.6, 0.4, 0.06, 120.2, YZ + 0.5, -77.42, 0xb8834a, { r: 0 }));
  for (const sx of [-0.65, 0.65]) parts.push(plate(0.08, 0.42, 0.4, 120.2 + sx, YZ, -77.2, 0x6a4a2a, { r: 0 }));
  addStaticParts(level, parts, { castShadow: true });
  // ferne Kulisse ohne Schatten: Ballons, Zeppelin, Möwen
  balloon(level, { pos: [-26, 6, -30], colors: [0xff4a3d, 0xffd23d], r: 3, phase: 0.4, drift: 3, flag: 0x3d8bff });
  balloon(level, { pos: [24, 26, -90], colors: [0x3d8bff, 0xf6f4ef], r: 3.4, phase: 2.0, drift: 4 });
  balloon(level, { pos: [60, 52, -96], colors: [0x4fd04a, 0xffd23d], r: 3, phase: 1.1, drift: 5 });
  zeppelin(level, { from: [-60, 34, -120], to: [90, 46, -130], speed: 1.6 });
  birds(level, { center: [0, 10, -40], r: 14, n: 7, speed: 0.3 });
  birds(level, { center: [40, YR + 8, -74], r: 18, n: 6, speed: 0.25 });
}
