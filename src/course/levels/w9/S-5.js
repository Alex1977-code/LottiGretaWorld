// S-5 „Riesenblock-Wiese im Pixelhimmel“ (Bauplan S-5: Parcours, 400 s, ca. 300 m, 2 Gebiete – Grasland aus Riesenblöcken,
// eigene Retro-Gestaltung). Thema blockland, Musik course_blockland.
//
// Gebiet 1 (Retro-Blockland, z 10 … −168, x ≈ 0): Grasinseln aus riesigen Erdblöcken mit Raster-Grasdecke über einer Wiese tief
// unten, bunte Riesenblöcke mit Nieten, Retro-Wolken und -Büsche.
//   1. Startinsel (z 10 … −16): ?-Block mit Gleitblatt, Pilzlinge.
//   2. Aufzug-Riesen-?-Block (z −20 … −36): stampft man auf ihn, wächst er zu einem Turm und trägt einen hinauf zur hohen Insel.
//   3. Hohe Insel (z −36 … −60, y 7,2): Laufbombe, Ziegelmauer; vom Rand gleitet man mit dem Gleitblatt zur Bitcoin-Insel
//      (Extraleben); sonst Riesenblock-Stufen hinab.
//   4. Riesentrank-Insel (z −72 … −100, y 2): versteckter Block mit dem Riesentrank, eine Steinblockwand nur für Riesen, die
//      Rätselbox in den Zehn-Sekunden-Raum (Stern 0).
//   5. Riesen-?-Blöcke über der Wiese (z −104 … −130): von unten anschlagen – sie wachsen zu Türmen und sprühen Bitcoins.
//   6. Ende von Gebiet 1 (z −134 … −168): Großblock (Stampfen → Stempel), Warp-Box zum Kontrollpunkt; rechts die hohen
//      Großblock-Stufen: oben einen schwebenden ?-Block anschlagen, er wächst zum Turm – im Schacht zwischen Turm und
//      Riesensäule mit Wandsprüngen hinauf zu Stern 2.
// Gebiet 2 (Felsenwiese, x ≈ 70, z −186 … −318): Kontrollpunkt an der Warp-Box; Laufbombe gegen den Felsblock kicken
//   (Stern 1); fünf Schlüsselmünzen (Säule, Aufzug-?-Block, Sprungblöcke, Pilzling-Nische, Federweg) öffnen die
//   Ziel-Warp-Box; sie führt zur Zielinsel.
// Zehn-Sekunden-Raum (Rätselbox, x ≈ −70): Knopf drücken – zehn Sekunden fahren Blöcke aus der Wand, die Treppe hinauf zu
//   Stern 0.
// Gegner: Pilzlinge 7, Laufbomben 3.

import { PI, line, ring, arc, column, sign, riesenblock, banner } from './_helpers_b.js';
import { countdown } from '../../entities/gimmick.js';

const X2 = 70;              // Gebiet 2
const X3 = -70;             // Zehn-Sekunden-Raum
const isl = (x0, x1, zA, zB, top, h = 5, o = {}) => ({ type: 'island', pos: [(x0 + x1) / 2, top - h, (zA + zB) / 2], size: [Math.abs(x1 - x0), h, Math.abs(zA - zB)], under: o.under ?? 3, ...o });
const pilz = (id, x, y, z, dx = 3, o = {}) => ({ kind: 'pilzling', id, pos: [x, y, z], path: [[x - dx, y, z], [x + dx, y, z]], ...o });

// Bunte Riesenblöcke (statische Geometrie + Form): [x, y, z, w, h, d, Farbe]
const BLOECKE = [
  // Stufen von der hohen Insel hinab
  [0, 4.0, -63.6, 3.4, 1.2, 3.4, 'blau'], [-1.6, 2.6, -67.6, 3.4, 1.2, 3.4, 'rot'],
  // Bitcoin-Insel (nur gleitend erreichbar)
  [18, 1.8, -77, 4.4, 1.2, 4.4, 'gelb'],
  // hohe Großblock-Stufen (Stern 2) und Plateau
  [6.4, 0, -141.6, 3, 2.6, 3, 'gruen'], [9.4, 0, -145, 3, 5.2, 3, 'gelb'], [12.4, 0, -148.4, 3, 7.8, 3, 'rosa'], [13.5, 0, -154.1, 5, 10.4, 7, 'blau'],
  // Riesensäule neben dem Turm-Schacht
  [17.2, 0, -155.6, 3, 20.4, 4, 'rot'],
  // Gebiet 2: Säule mit Schlüsselmünze, Trittblock
  [X2 + 6, 0, -203, 2.4, 4.4, 2.4, 'lila'], [X2 + 3.4, 0, -205.4, 2, 2.2, 2, 'orange'],
  // Gebiet 2: Sprungblöcke über die Lücke zur Schlüsselmünze 3
  [X2 + 11.4, 0.6, -240.4, 2.2, 1.2, 2.2, 'gelb'], [X2 + 13.4, 1.6, -243.6, 2.2, 1.2, 2.2, 'gruen'], [X2 + 12.4, 2.6, -247.2, 2.4, 1.2, 2.4, 'rot'],
  // Gebiet 2: Nische der Pilzlinge (Wände)
  [X2 - 8.5, 0, -258, 1, 2.6, 8, 'weiss'], [X2 - 5.5, 0, -253.6, 5, 2.6, 0.8, 'weiss'],
  // Gebiet 2: hoher Block über dem Federfeld
  [X2 + 5.6, 0, -268, 3, 6.4, 3, 'orange'],
  // Zehn-Sekunden-Raum: Rahmen
  [X3 - 7.4, 0, -103, 2, 10, 2, 'gelb'], [X3 + 7.4, 0, -103, 2, 10, 2, 'gelb'],
];

function build(level) {
  for (const [x, y, z, w, h, d, c] of BLOECKE) riesenblock(level, [x, y, z], [w, h, d], c);
}

/** Zehn-Sekunden-Treppe: Knopf → Wandblöcke fahren 10 s aus (Zeitanzeige über der Figur), danach wieder ein. */
function zehnSekunden(level, wandId, sec = 10) {
  const st = { t: 0, on: false, runs: 0 };
  level.zehn = st;
  st.start = () => {
    if (st.on) return;
    st.on = true; st.t = sec; st.runs++;
    level.named.get(wandId)?.start?.();
    banner(level, 'Schnell! Zehn Sekunden!', { hold: 1.4, size: 14, y: 0.36 });
  };
  level.onStep((dt) => {
    if (!st.on) return;
    st.t -= dt;
    countdown(level).show(st, st.t, '', '#ffd23a');
    if (st.t <= 0) { st.on = false; countdown(level).hide(st); level.named.get(wandId)?.stop?.(); level.sfx('timewarn'); }
  });
}

function setup(level) {
  zehnSekunden(level, 'zehnwand', 10);
}

/** Großblock (Stampfen): der Stempel steckt darin und springt beim Wachsen obendrauf. */
function stempelHeraus(level, ctx) {
  const s = level.entities.find((e) => e.kind === 'stamp' && e.alive);
  if (s) { s.pos.set(ctx.pos[0], ctx.pos[1] - 0.25, ctx.pos[2]); level.effects?.sparks({ x: s.pos.x, y: s.pos.y + 0.6, z: s.pos.z }, 16); }
}

export const LEVEL = {
  id: 'S-5',
  world: 9,
  title: 'Riesenblock-Wiese im Pixelhimmel',
  archetype: 'parcours',
  theme: 'blockland',
  music: 'course_blockland',
  timeLimit: 400,
  killY: -14,
  farHide: 60,
  instances: { coin: { farHide: 46, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 6], yaw: PI / 2 },
  camera: [
    { from: 14, to: -18, pitch: 42, dist: 13.5, fov: 40, area: [-40, 40] },
    { from: -18, to: -62, pitch: 40, dist: 14, fov: 40, height: 1.4, area: [-40, 40] },
    { from: -62, to: -102, pitch: 43, dist: 13.5, fov: 40, area: [-40, 40] },
    { from: -102, to: -132, pitch: 40, dist: 14, fov: 40, height: 1.6, area: [-40, 40] },
    { from: -132, to: -172, pitch: 38, dist: 15, fov: 42, height: 1.8, area: [-40, 40] },
    // Gebiet 2
    { from: -180, to: -280, pitch: 42, dist: 14, fov: 40, area: [40, 110] },
    { from: -280, to: -324, pitch: 40, dist: 14, fov: 40, area: [40, 110] },
    // Zehn-Sekunden-Raum
    { from: -80, to: -110, pitch: 30, dist: 15, fov: 42, height: 2.4, x: X3, xLock: 0.5, area: [X3 - 25, X3 + 25] },
  ],
  segments: [
    // ================================================================ Gebiet 1
    isl(-8, 8, 10, -16, 0),
    sign(-5.6, 0, 6.6, 'Riesenblock-\nWiese', { yaw: 0.25 }),
    isl(-6, 6, -20, -36, 0),
    isl(-7, 7, -36, -60, 7.2, 8),
    isl(-8, 8, -71, -100, 2, 5),
    isl(-7, 7, -104, -130, 0),
    isl(-9, 9, -134, -168, 0),
    sign(-7.4, 0, -136.4, 'Stampf auf\nden Großblock!', { size: [2.6, 1.1], yaw: 0.25 }),
    sign(7.6, 0, -137, 'Hoch hinaus?', { size: [2.4, 0.95], yaw: -0.25 }),
    // ================================================================ Gebiet 2
    isl(X2 - 8, X2 + 8, -186, -212, 0),
    isl(X2 - 9, X2 + 9, -216, -244, 0),
    isl(X2 - 9, X2 + 9, -248, -276, 0),
    { type: 'trampoline', pos: [X2 + 2.4, 0, -268], strength: 18.5 },
    isl(X2 - 7, X2 + 7, -294, -318, 0),
    sign(X2 - 5.6, 0, -188.6, 'Felsenwiese', { yaw: 0.25 }),
    sign(X2 - 3, 0, -266, '5 Schlüssel\nöffnen die Box', { size: [2.8, 1.1], yaw: 0.2 }),
    // ================================================================ Zehn-Sekunden-Raum
    isl(X3 - 9, X3 + 9, -84, -106, 0),
    { type: 'plattenwand', id: 'zehnwand', pos: [X3, 0, -102], dir: [0, 1], size: [10, 10], grid: [5, 4], depth: 1.6, thick: 1.8, mode: 'signal', order: [[0, 0], [1, 1], [2, 2], [3, 3]],
      stagger: 0.08, move: 0.3, warn: 0.6, color: 'rot', wall: 'weiss' },
    sign(X3 - 4, 0, -88, 'Knopf drücken –\nzehn Sekunden!', { size: [2.8, 1.1], yaw: 0.2 }),
    // ================================================================ Kulisse (Retro-Wolken, -Büsche, Röhren, Riesenblöcke tief unten)
    { type: 'deco_star', items: [
      { kind: 'retro_busch', pos: [-6, 0, 2] }, { kind: 'retro_busch', pos: [6.4, 0, -12], size: 1.5 }, { kind: 'roehre_deko', pos: [6.6, 0, 6], radius: 1, height: 2.2, solid: true },
      { kind: 'retro_busch', pos: [-4.6, 0, -24] }, { kind: 'retro_busch', pos: [5.4, 7.2, -40] }, { kind: 'retro_busch', pos: [-5.8, 7.2, -57], size: 1.4 },
      { kind: 'roehre_deko', pos: [5.6, 2, -76], radius: 0.9, height: 1.8, solid: true }, { kind: 'retro_busch', pos: [-6.4, 2, -76] },
      { kind: 'retro_busch', pos: [5.6, 0, -127], size: 1.6 }, { kind: 'retro_busch', pos: [-7.6, 0, -164] }, { kind: 'roehre_deko', pos: [-7.4, 0, -151], radius: 1.1, height: 2.6, solid: true },
      { kind: 'retro_wolke', pos: [-14, 10, -20], size: 2.4 }, { kind: 'retro_wolke', pos: [16, 13, -60], size: 2.8 }, { kind: 'retro_wolke', pos: [-18, 14, -120], size: 3 },
      { kind: 'retro_wolke', pos: [-10, 18, -160], size: 2.6 }, { kind: 'retro_wolke', pos: [X2 + 16, 12, -220], size: 2.8 }, { kind: 'retro_wolke', pos: [X2 - 16, 14, -280], size: 3 },
      { kind: 'retro_busch', pos: [X2 - 6, 0, -208] }, { kind: 'retro_busch', pos: [X2 + 7, 0, -226], size: 1.4 }, { kind: 'roehre_deko', pos: [X2 + 7, 0, -192], radius: 1, height: 2.2, solid: true },
      { kind: 'retro_busch', pos: [X2 + 5.6, 0, -300] }, { kind: 'retro_busch', pos: [X2 - 5.6, 0, -310], size: 1.5 },
      { kind: 'riesenblock', pos: [-22, -14, -40], size: 6, color: 'gelb' }, { kind: 'riesenblock', pos: [24, -16, -110], size: 7, color: 'blau' },
      { kind: 'riesenblock', pos: [X2 + 24, -14, -250], size: 6, color: 'rot' }, { kind: 'retro_busch', pos: [X3 + 6, 0, -88] }, { kind: 'retro_wolke', pos: [X3 + 10, 12, -98], size: 2.6 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, 2.4, -6], content: 'coins:5' },
    { kind: 'blockwand', pos: [-4.5, 7.2, -50], size: [3, 2, 1], block: 'brick' },
    // Steinblock-Nische (nur Riesen bzw. Bomben zerschlagen die grauen Blöcke)
    { kind: 'blockwand', pos: [-6, 2, -95.6], size: [4, 3, 1], block: 'steinblock' }, { kind: 'blockwand', pos: [-3.5, 2, -98], size: [1, 3, 4], block: 'steinblock' },
    { kind: 'question', pos: [2.4, 2.0, -6], content: 'gleitblatt' },
    { kind: 'question', pos: [0, 9.2, -44], content: 'gleitblatt' },          // auf der hohen Insel (Gleitflug zur Bitcoin-Insel)
    { kind: 'hidden', pos: [-4.5, 3.9, -84], content: 'riese' },               // versteckter Riesentrank-Block
    { kind: 'hidden', pos: [18, 5.4, -77], content: 'oneup' },                // Extraleben auf der Bitcoin-Insel
    { kind: 'brick', pos: [-1, 2.6, -112], content: 'coins:3' }, { kind: 'brick', pos: [1, 2.6, -122] },
    { kind: 'hidden', pos: [X2 - 5.5, 2.6, -257.6], content: 'oneup' },       // Extraleben in der Pilzling-Nische
  ],
  enemies: [
    pilz('p1', 0, 0, -26, 4), pilz('p2', 2, 0, -31, 2.5),
    pilz('p3', 2, 7.2, -46, 3),
    pilz('p4', -3, 0, -110, 2.5), pilz('p5', 3, 0, -126, 2.5),
    pilz('p6', X2 - 6.5, 0, -260, 1.2, { behavior: 'chase', sight: 5 }), pilz('p7', X2 - 4.5, 0, -264, 1.2, { behavior: 'chase', sight: 5 }),
    { kind: 'laufbombe', id: 'lb1', pos: [3, 7.2, -54], path: [[3, 7.2, -52], [3, 7.2, -57]], speed: 1.0 },
    { kind: 'laufbombe', id: 'lb2', pos: [-3.5, 0, -118], path: [[-5, 0, -118], [0, 0, -118]], speed: 1.0 },
    { kind: 'laufbombe', id: 'lb3', pos: [X2 - 1.4, 0, -230], path: [[X2 - 1.4, 0, -228], [X2 - 1.4, 0, -232]], speed: 0.8 },
  ],
  items: [
    // Aufzug-Riesen-?-Block (Stampfen) zur hohen Insel
    { kind: 'riesen_frageturm', id: 'aufzug', pos: [3.6, 0, -34.6], size: 2.4, blocks: 2, trigger: ['pound', 'bomb', 'mega'], coins: 2, content: 'coins:3' },
    // Riesen-?-Blöcke über der Wiese (von unten anschlagen)
    { kind: 'riesen_frageturm', id: 'turm_a', pos: [-3.4, 2.8, -114.6], size: 2, blocks: 3, coins: 1, content: 'coins:5' },
    { kind: 'riesen_frageturm', id: 'turm_b', pos: [3.4, 2.8, -121.4], size: 2, blocks: 3, coins: 1, content: 'coins:5', color: 'orange' },
    // Großblock (Stampfen → Stempel)
    { kind: 'riesen_frageturm', id: 'grossblock', pos: [-4, 0, -148], size: 3, blocks: 1, coins: 0, trigger: ['pound'], color: 'orange', content: [stempelHeraus] },
    // schwebender ?-Block auf dem Plateau (anschlagen → Turm, Schacht für Wandsprünge zu Stern 2)
    { kind: 'riesen_frageturm', id: 'schachtturm', pos: [12.5, 13.0, -155.6], size: 2, blocks: 4, coins: 1, content: 'coins:3' },
    // Warp-Box zum Kontrollpunkt (Gebiet 2) und zurück
    { kind: 'warpbox', id: 'warp1', pos: [0, 0, -163], target: 'cpbox' },
    { kind: 'warpbox', id: 'cpbox', pos: [X2, 0, -190], target: 'warp1' },
    // Rätselbox (Zehn-Sekunden-Raum)
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [5, 2, -96], target: 'raumbox' },
    { kind: 'warpbox', id: 'raumbox', style: 'mystery', pos: [X3 + 5, 0, -87.4], target: 'raetsel' },
    { kind: 'druckknopf', id: 'zehnknopf', pos: [X3, 0, -93], color: 'rot', once: false, reset: 11, onPress: (L) => L.zehn?.start() },
    // Felsblock mit Stern 1 (Laufbombe hineinkicken)
    { kind: 'felsblock', id: 'fels', pos: [X2 - 6.6, 0, -230], size: [3.2, 3, 3.2], content: { star: 1 } },
    // Schlüsselmünzen (5) → Ziel-Warp-Box
    { kind: 'schluesselmuenze', id: 'k1', group: 'ziel', pos: [X2 + 6, 4.7, -203], onAll: { reveal: 'zielbox' } },
    { kind: 'riesen_frageturm', id: 'k2turm', pos: [X2 + 5, 0, -222], size: 2.4, blocks: 2, trigger: ['pound', 'bomb', 'mega'], coins: 1, content: { reveal: 'k2' } },
    { kind: 'schluesselmuenze', id: 'k2', group: 'ziel', pos: [X2 + 5, 7.5, -222], hidden: true },
    { kind: 'schluesselmuenze', id: 'k3', group: 'ziel', pos: [X2 + 12.4, 4.0, -247.2] },
    { kind: 'schluesselmuenze', id: 'k4', group: 'ziel', pos: [X2 - 6.4, 0.3, -260.4] },
    { kind: 'schluesselmuenze', id: 'k5', group: 'ziel', pos: [X2 + 5.6, 6.7, -268] },
    { kind: 'warpbox', id: 'zielbox', pos: [X2, 0, -272], target: 'zielankunft', hidden: true },
    { kind: 'warpbox', id: 'zielankunft', pos: [X2, 0, -297], target: 'zielbox' },
    // Bitcoin-Pfade
    line([0, 0.6, 2], [0, 0.6, -12], 5),
    line([0, 0.6, -21], [0, 0.6, -30], 4), column(3.6, -34.6, 3.4, 6.6, 3),
    line([0, 7.8, -38], [0, 7.8, -48], 4), ...arc([0, 7.8, -58], [-1.6, 4.4, -67.6], 4, 1.4),
    ring([18, 3.6, -77], 1.4, 6), ...arc([7.4, 8.2, -60], [16, 3.6, -75], 6, 2),
    line([-2, 2.6, -74], [2, 2.6, -86], 4), line([-7, 2.6, -97.4], [-4.8, 2.6, -99.2], 5),
    line([0, 0.6, -105], [0, 0.6, -130], 8),
    ring([0, 0.6, -140], 2, 8), column(6.4, -141.6, 3.2, 4.4, 2), column(9.4, -145, 5.8, 7, 2), column(12.4, -148.4, 8.4, 9.6, 2),
    line([X2, 0.6, -196], [X2, 0.6, -210], 5), line([X2, 0.6, -218], [X2, 0.6, -242], 7), line([X2, 0.6, -250], [X2, 0.6, -264], 5),
    ring([X2, 0.6, -306], 2.4, 10), line([X3, 0.6, -86], [X3, 0.6, -96], 4),
  ],
  checkpoint: { pos: [X2, 0, -196.4], yaw: PI / 2 },
  stars: [
    [X3 + 2, 10.3, -102.9],                                           // 0: Zehn-Sekunden-Raum (oben auf der Wand)
    { pos: [X2 - 6.6, 0.4, -230], hidden: true, id: 'felsstern' },     // 1: im Felsblock (Laufbombe)
    [17.2, 20.7, -155.6],                                             // 2: oben auf der Riesensäule (Turm-Schacht, Wandsprünge)
  ],
  stamp: [-4, 1.0, -148],
  goal: [X2, 0, -311],
  marks: {
    start: [0, 0, 6], i1: [0, 0, -24], aufzug: [3.6, 0, -31], hoch: [0, 7.2, -40], gleit: [4, 7.2, -58], i3: [0, 2, -76], raetsel: [5, 2, -93.4],
    i4: [0, 0, -106], i5: [0, 0, -138], gross: [-4, 0, -144], plateau: [13, 10.4, -154], warp: [0, 0, -160], cp: [X2, 0, -196.4], fels: [X2 + 2, 0, -230],
    j3: [X2, 0, -252], ziel: [X2, 0, -300], raum: [X3, 0, -88],
  },
};
