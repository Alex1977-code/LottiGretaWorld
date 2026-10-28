// 7-2 „Schaltfelder im Finstertempel“ (Bauplan 7-2: Parcours, 400 s, ca. 200 m, 5 Abschnitte – dunkler unterirdischer Tempel,
// Kipp-Schaltfelder machen den Weg sichtbar). Thema darkruins, Musik course_switchruins.
//
// Ein versunkener Tempel tief unter der Lava-Festung: Sandsteinhallen mit türkisen Friesen und leuchtenden Runen schweben über
// einem finsteren Abgrund. Zwischen den Hallen gibt es keinen Weg – erst wenn alle Kipp-Schaltfelder einer Gruppe golden
// leuchten, ploppen die Steinplatten des Wegs auf (vorher zeigen blasse Umrisse und schwebende Münzen, wo er entsteht).
// Abschnitte (nach −Z, Boden y 1, Abgrund):
//   1. Eingangshalle und dunkler Gang (z 8 … −41): Funkenblüte im ?-Block, ein Stachelpanzer im Gang, Schaltgruppe 1 (2 × 2).
//   2. Zweiter Saal (z −41 … −72): zwei Stachelpanzer zwischen den vier Feldern der Schaltgruppe 2; ganz rechts über dem
//      Abgrund die Stempel-Plattform.
//   3. Rundsaal mit vier Fackelschalen (z −72 … −88): Feuerbälle der Funkenblüte zünden sie an – alle vier → Stern 0;
//      Kontrollpunkt; rechts davon eine Scheinwand – dahinter der versteckte Schatzraum (Stern 1); Schaltgruppe 3 (3 × 2)
//      unter dem Feuer einer Feuer-Schnappblume.
//   4. Fahrplattform über den Abgrund zur letzten Halle (z −126 … −184): vier Stachelpanzer streifen zwischen den Feldern der
//      Schaltgruppe 4.
//   5. Zielröhre (z −184 … −226): die grüne Röhre führt zum Zielmast; dahinter ein unsichtbarer länglicher ?-Block – ein
//      Kopfstoß zeigt eine versteckte Blockkette hinauf zu Stern 2.
// Gegner (Bauplan): Stachelpanzer 7, Feuer-Schnappblume 1.

import { isl, line, ring, arc, sign, fackelGruppe, scheinwand, geheimLaengsblock, tempel72 } from './_helpers_a.js';

const Y = 1;
const PI = Math.PI;
const HX = 19;   // versteckter Schatzraum (x)

/** Weg-Platten über den Abgrund von z0 nach z1 (n Platten, Breite w) bei x. */
function weg(x, z0, z1, n = 5, w = 2.6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * ((i + 0.5) / n);
    out.push({ pos: [x, Y - 0.4, z], size: [w, 0.4, Math.abs(z1 - z0) / n - 0.2] });
  }
  return out;
}
const panzer = (id, path, o = {}) => ({ kind: 'stachelpanzer', id, pos: path[0], path, speed: o.speed ?? 1.2, ...o });

function build(level) {
  tempel72(level, { Y, HX });
}

function setup(level) {
  fackelGruppe(level, [{ pos: [-5, Y, -75.4], id: 'fackel1' }, { pos: [5, Y, -75.4], id: 'fackel2' }, { pos: [-5, Y, -84.6], id: 'fackel3' }, { pos: [5, Y, -84.6], id: 'fackel4' }],
    { group: 'rund', onAll: { reveal: 'stern0' } });
  scheinwand(level, { from: [4.6, -90.4], to: [4.6, -95.6], y: Y, h: 3.2, t: 0.8, faces: [-1, 1], seed: 72 });
  geheimLaengsblock(level, { id: 'laengsblock', pos: [0, Y + 2.5, -195.2], size: [3, 1, 1], chain: 'kette3', coins: 3 });
}

export const LEVEL = {
  id: '7-2',
  world: 7,
  title: 'Schaltfelder im Finstertempel',
  archetype: 'parcours',
  theme: 'darkruins',
  music: 'course_switchruins',
  timeLimit: 400,
  killY: -12,
  farHide: 56,
  instances: { coin: { farHide: 40, shadow: false } },
  build,
  setup,
  start: { pos: [0, Y, 4.5], yaw: PI / 2 },
  camera: [
    { from: 14, to: -41, pitch: 46, dist: 13, fov: 40, x: 0, xLock: 0.35, area: [-30, 9] },
    { from: -41, to: -72, pitch: 47, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-30, 9.5] },
    { from: -72, to: -126, pitch: 47, dist: 13.5, fov: 40, x: 0, xLock: 0.35, area: [-30, 9] },
    { from: -126, to: -184, pitch: 46, dist: 14, fov: 40, x: 0, xLock: 0.35, area: [-30, 30] },
    { from: -184, to: -230, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.4, area: [-30, 30] },
    // Stempel-Plattform rechts im zweiten Saal, versteckter Schatzraum
    { from: -41, to: -72, pitch: 48, dist: 13.5, fov: 40, x: 7, xLock: 0.4, area: [9.5, 30] },
    { from: -84, to: -102, pitch: 50, dist: 13, fov: 40, x: HX - 2, xLock: 0.5, area: [9, 30] },
  ],
  segments: [
    { type: 'killplane', y: -12 },
    // ================================================================ 1 Eingangshalle, Gang, Schaltgruppe 1
    isl(-6, 6, 8, -6, Y, 4, { under: 3 }),
    isl(-3, 3, -6, -20, Y, 4, { under: 3 }),
    isl(-4.5, 4.5, -20, -27, Y, 4, { under: 3 }),
    { type: 'schaltfelder', id: 's1', pos: [0, Y, -23.5], grid: [2, 2], spacing: 1.8, weg: weg(0, -27.2, -40.8) },
    // ================================================================ 2 Zweiter Saal (Stempel ganz rechts)
    isl(-8, 8, -41, -58, Y, 4, { under: 3 }),
    { type: 'schaltfelder', id: 's2', tiles: [[-3.6, Y, -45], [3.6, Y, -45], [-3.6, Y, -54], [3.6, Y, -54]], weg: weg(0, -58.2, -71.8) },
    isl(11, 14, -46, -50.4, Y + 2.2, 4, { under: 2 }),
    // ================================================================ 3 Rundsaal, Kontrollpunkt, Schatzraum, Schaltgruppe 3
    isl(-8, 8, -72, -88, Y, 4, { under: 3 }),
    isl(-5, 5, -88, -98, Y, 4, { under: 3 }),
    isl(5, HX - 4.5, -91, -95, Y, 4, { under: 2 }),                 // Geheimgang hinter der Scheinwand
    isl(HX - 4.5, HX + 5, -86, -100, Y, 4, { under: 3 }),           // Schatzraum
    isl(-6, 6, -98, -112, Y, 4, { under: 3 }),
    isl(3.4, 5.6, -108.4, -110.6, Y + 1.2, 1.2),                    // Sockel der Feuer-Schnappblume
    { type: 'schaltfelder', id: 's3', pos: [-0.6, Y, -103.6], grid: [3, 2], spacing: 2.0, weg: weg(0, -112.2, -125.8) },
    // ================================================================ 4 Fahrplattform, letzte Halle
    isl(-4, 4, -126, -132, Y, 4, { under: 3 }),
    { type: 'mover', id: 'fahrt', path: [[0, Y - 0.5, -134.6], [0, Y - 0.5, -150.4]], size: [3.6, 0.5, 3.6], speed: 2.4, wait: 1.4, color: 0xd8a83a },
    isl(-9, 9, -153, -170, Y, 4, { under: 3 }),
    { type: 'schaltfelder', id: 's4', pos: [0, Y, -161.5], grid: [3, 2], spacing: 3, weg: weg(0, -170.2, -183.8) },
    // ================================================================ 5 Zielröhre, Zielhalle
    isl(-6, 6, -184, -197, Y, 4, { under: 3 }),
    { type: 'pipe', id: 'zielrohr', pos: [0, Y, -190.6], height: 1.4, target: 'ziel_aus' },
    { type: 'hiddenchain', id: 'kette3', blocks: [[1.8, Y + 4.4, -197.9], [3.8, Y + 6.2, -199.4]] },
    isl(-7, 7, -210, -228, Y, 4, { under: 3 }),
    { type: 'pipe', id: 'ziel_aus', pos: [-3.6, Y, -213.2], height: 1.2 },
    sign(-3.6, Y, 2.4, 'Schaltfelder\nzeigen den Weg', { size: [2.6, 1.0], yaw: 0.2 }),
    sign(-6.6, Y, -74.8, 'Feuer in die\nSchalen!', { size: [2.2, 0.9], yaw: 0.6 }),
    // Fackeln (Licht) und Kulisse
    { type: 'deco_w7', items: [
      { kind: 'fackel', pos: [-5.4, Y, 7.2], mount: 'stand' }, { kind: 'fackel', pos: [5.4, Y, 7.2], mount: 'stand' },
      { kind: 'fackel', pos: [-2.6, Y + 1.6, -12], yaw: 0 }, { kind: 'fackel', pos: [2.6, Y + 1.6, -16], yaw: PI },
      { kind: 'fackel', pos: [-4, Y, -26.4], mount: 'stand' }, { kind: 'fackel', pos: [4, Y, -26.4], mount: 'stand' },
      { kind: 'fackel', pos: [-7.4, Y, -41.6], mount: 'stand' }, { kind: 'fackel', pos: [7.4, Y, -57.4], mount: 'stand' },
      { kind: 'fackel', pos: [12.5, Y + 2.2, -46.6], mount: 'stand' },
      { kind: 'fackel', pos: [-4.4, Y, -97.4], mount: 'stand' }, { kind: 'fackel', pos: [-5.4, Y, -111.4], mount: 'stand' },
      { kind: 'fackel', pos: [HX - 4, Y, -86.6], mount: 'stand' }, { kind: 'fackel', pos: [HX + 4.4, Y, -99.4], mount: 'stand' },
      { kind: 'fackel', pos: [-3.4, Y, -131.4], mount: 'stand' }, { kind: 'fackel', pos: [3.4, Y, -131.4], mount: 'stand' },
      { kind: 'fackel', pos: [-8.4, Y, -153.6], mount: 'stand' }, { kind: 'fackel', pos: [8.4, Y, -169.4], mount: 'stand' },
      { kind: 'fackel', pos: [-5.4, Y, -184.6], mount: 'stand' }, { kind: 'fackel', pos: [5.4, Y, -196.4], mount: 'stand' },
      { kind: 'fackel', pos: [-6.4, Y, -210.6], mount: 'stand' }, { kind: 'fackel', pos: [6.4, Y, -210.6], mount: 'stand' },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2, Y + 2.2, -1.5], content: 'funken' },
    { kind: 'coinblock', pos: [2, Y + 2.2, -1.5], count: 6 },
    { kind: 'question', pos: [0, Y + 2.2, -74.6], content: 'funken' },
    { kind: 'question', pos: [-3.4, Y + 2.2, -126.8], content: 'funken' },
    { kind: 'hidden', pos: [HX + 3, Y + 2.6, -97.5], content: 'oneup' },        // Extraleben im Schatzraum
    { kind: 'question', pos: [3.2, Y + 2.2, -214], content: 'coins:5' },
  ],
  enemies: [
    panzer('sp1', [[-1.8, Y, -12.6], [1.8, Y, -12.6]], { speed: 1.1 }),
    panzer('sp2', [[-6, Y, -44], [-6, Y, -55.4]]),
    panzer('sp3', [[6, Y, -55.4], [6, Y, -44]]),
    { kind: 'feuer_schnappblume', id: 'feuerblume', pos: [4.5, Y + 1.2, -109.5], base: 'pot', yaw: PI / 2, range: 9.5, pause: 1.6 },
    panzer('sp4', [[-7, Y, -156], [7, Y, -156]], { speed: 1.3 }),
    panzer('sp5', [[7, Y, -167], [-7, Y, -167]], { speed: 1.3 }),
    panzer('sp6', [[-7.4, Y, -158], [-7.4, Y, -166]], { speed: 1.0 }),
    panzer('sp7', [[7.4, Y, -166], [7.4, Y, -158]], { speed: 1.0 }),
  ],
  items: [
    line([0, Y + 0.6, 1.5], [0, Y + 0.6, -5], 4),
    line([0, Y + 0.8, -29], [0, Y + 0.8, -39.5], 5),          // schweben über dem Abgrund: hier entsteht der Weg
    ring([0, Y + 0.6, -49.5], 1.6, 6),
    line([0, Y + 0.8, -60], [0, Y + 0.8, -70.5], 5),
    arc([8.6, Y + 0.6, -48.2], [10.6, Y + 2.8, -48.2], 3, 1),
    line([0, Y + 0.8, -114], [0, Y + 0.8, -124.5], 5),
    line([0, Y + 1.4, -136], [0, Y + 1.4, -149], 6),
    line([0, Y + 0.8, -172], [0, Y + 0.8, -182.5], 5),
    ring([HX, Y + 0.6, -93], 2.2, 10), line([7, Y + 0.6, -93], [13, Y + 0.6, -93], 4),
    ring([0, Y + 0.6, -220], 2.2, 8),
  ],
  checkpoint: { pos: [0, Y, -93], yaw: PI / 2 },
  stars: [
    { pos: [0, Y + 0.4, -80], hidden: true, id: 'stern0' },          // 0: Rundsaal (vier Fackelschalen)
    [HX + 1.5, Y + 0.4, -93],                                         // 1: versteckter Schatzraum
    [3.8, Y + 7.3, -199.4],                                           // 2: oben auf der versteckten Blockkette hinter der Röhre
  ],
  stamp: [12.5, Y + 2.7, -48.6],
  goal: [0, Y, -222],
  marks: {
    start: [0, Y, 4.5], gang: [0, Y, -10], s1: [0, Y, -23.5], saal2: [0, Y, -49], stempel: [12.5, Y + 2.2, -48], rund: [0, Y, -80],
    cp: [0, Y, -93], schatz: [HX, Y, -93], s3: [0, Y, -103.6], fahrt: [0, Y, -129], halle: [0, Y, -161.5], rohr: [0, Y, -190.6], ziel: [0, Y, -220],
  },
};
