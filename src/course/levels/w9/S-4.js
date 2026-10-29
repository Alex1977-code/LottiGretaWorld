// S-4 „Flügelmast-Jagd über dem Wolkenmeer“ (Bauplan S-4: Verfolgung, 100 s ohne Zeitboni, ca. 350 m – „Himmel; der Zielmast
// hat Flügel und fliegt davon“). Thema skyway (Himmel über dem Wolkenmeer), Musik course_goalpole.
//
// Gleich am Start steht der Zielmast – doch kommt man näher, breitet er Federflügel aus und flattert davon. Er fliegt hoch über
// den Wattewolken voraus, wartet, wenn man zurückfällt (ab 11 m langsamer, ab 24 m schwebt er), und landet am Ende auf der
// Zielwolke. Abschnitte (nach −Z, Laufhöhe y 0):
//   1. Startwolke mit dem Scheinziel (z 10 … −14): der Mast steht da wie ein Ziel; ein getimter Weitsprung erwischt ihn
//      noch beim Abheben (Geheimnis).
//   2. Erste Boost-Strecke (z −18 … −64): Boost-Pfeil vor einer 13-m-Lücke; rechts die ersten Donut-Blöcke im Bogen mit
//      Stern 0; auf der zweiten Wolke der erste Glotzfisch, hinter ihm der Stempel auf einer Nebenwolke.
//   3. Wolkenbahn (z −68 … −132): lange schmale Wolke mit zwei Boost-Pfeilen, 12-m-Lücke; vor dem zweiten Glotzfisch ganz
//      links ein Donut-Feld zu Stern 1.
//   4. Dritter Glotzfisch (z −136 … −184): schmale Wolke, Boost-Lücke, Glotzfisch springt dorthin, wo man ist.
//   5. Donut-Felder (z −186 … −262): Donut-Bänder zwischen kleinen Rastwolken, dann die Donut-Treppe: unten weiter, oben der
//      obere Weg zu Stern 2.
//   6. Zielwolke (z −262 … −290): der Mast landet; Fang, die Figur rutscht hinab.
// Kein Kontrollpunkt (100 s, ein Atemzug). Gegner: 3 Glotzfische.

import { PI, line, ring, arc, sign, wolkenInseln, wolkenteiche, donutBloecke, himmelsDeko, wimpel, banner } from './_helpers_b.js';

const DS = 1.4;                 // Donut-Blockgröße (m)
const DY = -DS;                 // Donut-Unterkante, damit die Oberseite bei y 0 liegt

// Wolken [x0, x1, zA, zB, top]
const WOLKEN = [
  [-7, 7, 10, -14, 0],          // Startwolke
  [-5, 5, -18, -34, 0],         // B1 (Boost)
  [-6, 6, -47, -64, 0],         // B2 (Glotzfisch 1)
  [6.2, 9.6, -56.4, -61.6, 0, { puff: 0.8 }],   // Nebenwolke mit dem Stempel
  [-4, 4, -68, -96, 0],         // Wolkenbahn
  [-7, 7, -108, -132, 0],       // C2 (Glotzfisch 2)
  [-19.4, -16, -112, -117.4, 0, { puff: 0.8 }], // Sternwolke links (Stern 1)
  [-3, 3, -136, -150, 0],       // D1 (Boost)
  [-6, 6, -163, -184, 0],       // D2 (Glotzfisch 3)
  [-4, 4, -201, -208, 0],       // Rastwolke 1
  [-4, 4, -227, -234, 0],       // Rastwolke 2 (Fuß der Donut-Treppe)
  [-3, 3, -246.6, -252, 6, { puff: 0.8 }],      // obere Wolke (Stern 2)
  [-8, 8, -262, -290, 0],       // Zielwolke
];

// Donut-Blöcke (Mechanik des Bausteins donutblock, sparsame Optik): Oberseite y 0 bzw. Stufenhöhe
const DONUTS = [
  // Bogen rechts der ersten Boost-Lücke (Stern 0)
  { id: 'donut_bogen', size: DS, delay: 0.5, respawn: 3, color: 'rosa', blocks: donutKurve([5.9, -26.6], [16.4, -36.8], [6.8, -47.2]) },
  // ganz links vor dem zweiten Glotzfisch (Stern 1)
  { id: 'donut_links', size: DS, delay: 0.55, respawn: 3, color: 'gelb', blocks: [-8, -9.5, -11, -12.5, -14, -15.5].flatMap((x) => [-113.2, -114.7, -116.2].map((z) => [x, DY, z])) },
  // Donut-Felder: Band, Rautenfeld
  { id: 'donut_band1', size: DS, delay: 0.5, respawn: 3, color: 'rosa',
    blocks: [-1.4, 0, 1.4].flatMap((x) => [-185.2, -186.6, -188.0, -189.4, -190.8, -192.2, -193.6, -195.0, -196.4, -197.8, -199.2].map((z) => [x, DY, z])) },
  { id: 'donut_band2', size: DS, delay: 0.5, respawn: 3, color: 'schoko',
    // Rautenfeld: fünf Spalten, an den Rändern Lücken (Mitte durchgehend)
    blocks: [-2.8, -1.4, 0, 1.4, 2.8].flatMap((x, c) => [-209.2, -210.6, -212.0, -213.4, -214.8, -216.2, -217.6, -219.0, -220.4, -221.8, -223.2, -224.6, -226.0]
      .filter((z, r) => Math.abs(x) < 2 || (r + c) % 3 !== 0).filter((z, r) => Math.abs(x) < 2 || (r > 0 && r < 12)).map((z) => [x, DY, z])) },
  // Donut-Treppe: Stufen je 1,2 m höher bis zur oberen Wolke (y 6); daneben das flache Band unten zur Zielwolke
  { id: 'donut_treppe', size: DS, delay: 0.6, respawn: 3, color: 'gelb',
    blocks: [[0, 1.2, -235.6], [0, 2.4, -237.6], [0, 3.6, -239.6], [0, 4.8, -241.6], [0, 6.0, -243.6], [0, 6.0, -245.0]].map(([x, y, z]) => [x, y + DY, z]) },
  { id: 'donut_unten', size: DS, delay: 0.5, respawn: 3, color: 'rosa',
    blocks: Array.from({ length: 19 }, (_, i) => [3.2, DY, +(-234.75 - i * 1.4).toFixed(2)]) },
  { id: 'donut_oben', size: DS, delay: 0.55, respawn: 3, color: 'minze',
    blocks: [[0, 6, -253.4], [0, 6, -254.8], [-0.4, 5, -256.6], [-0.8, 4, -258.4], [-1.2, 3, -260.2]].map(([x, y, z]) => [x, y + DY, z]) },
];

const TEICHE = [[-4, 0, -55], [0, 0, -55], [4, 0, -55], [-4.5, 0, -124], [0, 0, -124], [4.5, 0, -124], [-3.4, 0, -172.6], [0, 0, -175.4], [3.4, 0, -178.2]];
const BOOSTS = [[0, -31.6], [0, -73], [0, -93.4], [0, -147.4]];

/** Wolkenblüten entlang der Längsränder jeder größeren Wolke (deterministisch gestreut, frei von Teichen und Boost-Pfeilen). */
function blueten() {
  const out = [];
  let k = 0;
  for (const [x0, x1, zA, zB, top] of WOLKEN) {
    if (x1 - x0 < 5) continue;
    const za = Math.min(zA, zB), zb = Math.max(zA, zB);
    for (const side of [-1, 1]) {
      const x = side < 0 ? x0 + 0.9 : x1 - 0.9;
      for (let z = zb - 1.4; z > za + 1; z -= 2.6 + ((k * 37) % 7) * 0.25) {
        k++;
        if (TEICHE.some(([tx, , tz]) => Math.hypot(tx - x, tz - z) < 1.6) || BOOSTS.some(([bx, bz]) => Math.abs(bz - z) < 2 && Math.abs(bx - x) < 2)) continue;
        const n = 1 + (k % 3 === 0 ? 1 : 0);
        for (let i = 0; i < n; i++) out.push([x + side * -0.1 - side * i * 0.55, top, z - i * 0.5 + ((k * 13) % 5) * 0.08, undefined, 0.9 + ((k + i) % 3) * 0.15]);
      }
    }
  }
  return out;
}

function build(level) {
  donutBloecke(level, DONUTS);
  wolkenInseln(level, WOLKEN);
  wolkenteiche(level, TEICHE);
  himmelsDeko(level, {
    ballons: [
      { pos: [6.2, 0, 8.6], n: 4 }, { pos: [-6.3, 0, -12.8], n: 3 }, { pos: [-4.4, 0, -19], n: 3 }, { pos: [-5.4, 0, -63.2], n: 3 }, { pos: [9, 0, -56.9], n: 2 },
      { pos: [3.5, 0, -69], n: 2 }, { pos: [-3.5, 0, -95.4], n: 3 }, { pos: [6.4, 0, -108.6], n: 3 }, { pos: [6.4, 0, -131.4], n: 3 }, { pos: [-19, 0, -112.4], n: 2 },
      { pos: [2.5, 0, -136.5], n: 2 }, { pos: [-5.4, 0, -163.6], n: 3 }, { pos: [5.4, 0, -183.4], n: 3 }, { pos: [3.5, 0, -201.6], n: 2 }, { pos: [-3.5, 0, -227.6], n: 2 },
      { pos: [2.5, 6, -251.5], n: 2 }, { pos: [-7.3, 0, -262.8], n: 4 }, { pos: [7.3, 0, -262.8], n: 4 }, { pos: [-7.3, 0, -289.3], n: 3 }, { pos: [7.3, 0, -289.3], n: 3 },
    ],
    heissluft: [[-21, 3, -42, 0xff5a5a, 1.4], [25, 9, -96, 0x4aa8ff, 1.6], [-25, 5, -166, 0xffc83a, 1.5], [23, 1, -232, 0xb87aff, 1.5], [-17, 11, -284, 0x5ad86a, 1.3], [18, -5, -8, 0xff9a3a, 1.2]],
    blueten: blueten(),
    zielbogen: { pos: [0, 0, -267.5], width: 13, height: 5.4 },
  });
  wimpel(level, [
    { from: [-6.4, 3.4, -13.2], to: [6.4, 3.4, -13.2], n: 16, sag: 0.7, poles: true, y0: 0 },
    { from: [-7.4, 2.8, -268.5], to: [-7.4, 2.8, -288.6], n: 14, sag: 0.6, poles: true, y0: 0 },
    { from: [7.4, 2.8, -268.5], to: [7.4, 2.8, -288.6], n: 14, sag: 0.6, poles: true, y0: 0 },
  ]);
}

// Flugregie des Zielmasts (Daten des Bausteins, je Schritt angepasst): am Start gemächlich (6,5 m/s – so lässt er sich mit
// einem getimten Weitsprung noch beim Abheben greifen), danach so schnell wie eine rennende Figur; wer ihn überholt hat
// (Boost!), dem fliegt er mit voller Kraft hinterher statt zu warten.
const MAST = { start: 6.5, chase: 10.5, near: 11, far: 24 };
function setup(level) {
  let said = false;
  level.onStep(() => {
    const m = level.named.get('flugmast');
    if (!m || m.state === 'gefangen' || m.state === 'gelandet') return;
    if (!said && m.state !== 'wartet') { said = true; banner(level, 'Der Zielmast fliegt davon – hinterher!', { hold: 2.2, size: 14, y: 0.36 }); }
    if (m.state === 'wartet') return;
    m.speed = m.s > 9 ? MAST.chase : MAST.start;
    const ahead = (level.players ?? [level.player]).some((f) => f && !f.dead && f.pos.z < m.pos.z - 1);
    m.near = ahead ? 999 : MAST.near;
    m.far = ahead ? 1999 : MAST.far;
  });
}

// Donut-Reihen (Mitte der Unterseite, Oberseite y 0)
/** Donut-Kurve: quadratische Bézierkurve a → m → b (x, z), Blöcke im Abstand step (dicht an dicht), Oberseite y 0. */
function donutKurve(a, m, b, step = DS + 0.1) {
  const P = (t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]];
  const out = [P(0)];
  let prev = out[0];
  for (let t = 0; t <= 1; t += 0.002) { const q = P(t); if (Math.hypot(q[0] - prev[0], q[1] - prev[1]) >= step) { out.push(q); prev = q; } }
  return out.map(([x, z]) => [+x.toFixed(2), DY, +z.toFixed(2)]);
}

export const LEVEL = {
  id: 'S-4',
  world: 9,
  title: 'Flügelmast-Jagd über dem Wolkenmeer',
  archetype: 'verfolgung',
  theme: 'skyway',
  music: 'course_goalpole',
  timeLimit: 100,
  killY: -16,
  farHide: 70,
  instances: { coin: { farHide: 50, shadow: false } },
  build,
  setup,
  start: { pos: [0, 0, 6], yaw: PI / 2 },
  camera: [
    { from: 14, to: -16, pitch: 36, dist: 14, fov: 42, height: 1.4, area: [-40, 40] },
    { from: -16, to: -66, pitch: 38, dist: 14, fov: 42, height: 1.4, area: [-40, 40] },
    { from: -66, to: -134, pitch: 36, dist: 14.5, fov: 42, height: 1.4, x: 0, xLock: 0.25, area: [-40, 40] },
    { from: -134, to: -186, pitch: 38, dist: 14, fov: 42, height: 1.4, area: [-40, 40] },
    { from: -186, to: -262, pitch: 40, dist: 14, fov: 42, height: 1.6, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -262, to: -296, pitch: 36, dist: 14, fov: 42, height: 1.6, area: [-40, 40] },
  ],
  segments: [
    sign(-5.4, 0, 6.8, 'Ziel?\nSchon?', { yaw: 0.25, size: [2, 0.95] }),
    // ================================================================ 2 Boost vor der Lücke, Donut-Bogen rechts (Stern 0)
    { type: 'boost', pos: [0, 0, -31.6], dir: [0, -1], speed: 17, size: [2.4, 2.6] },
    // ================================================================ 3 Wolkenbahn mit zwei Boosts
    { type: 'boost', pos: [0, 0, -73], dir: [0, -1], speed: 16, size: [2.2, 2.4] },
    { type: 'boost', pos: [0, 0, -93.4], dir: [0, -1], speed: 17, size: [2.4, 2.6] },
    // ================================================================ 4 Boost vor der dritten Lücke
    { type: 'boost', pos: [0, 0, -147.4], dir: [0, -1], speed: 17, size: [2.2, 2.6] },
    // ================================================================ Kulisse
    { type: 'deco_star', shadow: false, items: [
      { kind: 'regenbogen', pos: [-10, 0, -2], width: 7, height: 3.6, yaw: 0.4 }, { kind: 'stern', pos: [5.6, 0, 7.6], pole: 2.2, size: 0.9 },
      { kind: 'retro_wolke', pos: [-16, 5, -30], size: 2.6 }, { kind: 'retro_wolke', pos: [18, 8, -70], size: 3 }, { kind: 'retro_wolke', pos: [-20, 10, -150], size: 3.2 },
      { kind: 'retro_wolke', pos: [16, 12, -220], size: 2.8 }, { kind: 'retro_wolke', pos: [-14, 14, -280], size: 3 },
      { kind: 'planet', pos: [30, 26, -120], radius: 6, color: 'rosa', variant: 'ring' }, { kind: 'planet', pos: [-34, 30, -240], radius: 5, color: 'mint', variant: 'blume' },
      { kind: 'komet', pos: [-24, 22, -60], size: 1.4, dir: [1, -0.3, 0.2] }, { kind: 'regenbogen', pos: [0, 0, -288], width: 10, height: 5 },
      { kind: 'stern', pos: [-6.4, 0, -286], pole: 3, size: 1.1 }, { kind: 'stern', pos: [6.4, 0, -286], pole: 3, size: 1.1 },
      { kind: 'sterne', pos: [0, 10, -60], size: [36, 60], n: 12, height: 8 }, { kind: 'sterne', pos: [0, 12, -200], size: [36, 80], n: 14, height: 10 },
      // große Regenbögen tief unten zwischen den Wolken (Blick über den Rand)
      { kind: 'regenbogen', pos: [17, -8, -44], width: 16, height: 9, yaw: 0.35 }, { kind: 'regenbogen', pos: [-18, -9, -100], width: 18, height: 10, yaw: -0.3 },
      { kind: 'regenbogen', pos: [17, -8, -158], width: 16, height: 9, yaw: 0.3 }, { kind: 'regenbogen', pos: [-17, -8, -214], width: 16, height: 9, yaw: -0.35 },
    ] },
    sign(-4.4, 0, -48.6, 'Hinterher!', { yaw: 0.3, size: [2, 0.8] }),
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, 2.2, -1.6], content: 'coins:5' },
    { kind: 'hidden', pos: [-4.4, 2.6, -127.6], content: 'oneup' },           // Extraleben auf der Glotzfisch-2-Wolke (links hinten)
    { kind: 'coinblock', pos: [0, 2.6, -112], count: 8 },
    { kind: 'hidden', pos: [5, 2.6, -280], content: 'oneup' },                // Extraleben auf der Zielwolke
  ],
  enemies: [
    { kind: 'glotzfisch', id: 'fisch1', holes: [[-4, 0, -55], [0, 0, -55], [4, 0, -55]], height: 2.6, every: 2.6, phase: 0, color: 'blau' },
    { kind: 'glotzfisch', id: 'fisch2', holes: [[-4.5, 0, -124], [0, 0, -124], [4.5, 0, -124]], height: 2.8, every: 2.4, phase: 0.35, aim: true, sight: 6, color: 'gelb' },
    { kind: 'glotzfisch', id: 'fisch3', holes: [[-3.4, 0, -172.6], [0, 0, -175.4], [3.4, 0, -178.2]], height: 2.6, every: 2.2, phase: 0.6, aim: true, sight: 7, color: 'rosa' },
  ],
  items: [
    // Der Zielmast mit Flügeln: steht am Start (Scheinziel), fliegt hoch voraus, wartet, landet auf der Zielwolke
    { kind: 'fliegender_zielmast', id: 'flugmast', pos: [0, 0, -9.5], start: 'nah', trigger: 6.5, speed: 6.5, near: 11, far: 24, height: 9, bob: 0.4,
      path: [[0, 2.6, -12.5], [0, 6, -19], [0, 6, -40], [0, 6.5, -56], [0, 6.5, -82], [0, 6, -102], [0, 6.5, -124], [0, 6, -150], [0, 6.5, -176], [0, 6, -204],
        [0, 6.5, -228], [0, 9.6, -246], [0, 7, -262], [0, 2, -272], [0, 0, -277]],
      land: [0, 0, -277] },
    // Bitcoin-Pfade
    line([0, 0.6, 2], [0, 0.6, -5], 4),
    line([0, 0.6, -20], [0, 0.6, -29], 4), ...arc([0, 0.6, -35.6], [0, 0.6, -45.4], 5, 3.4),
    line([8.4, 1.4, -29.2], [11.0, 1.4, -33.6], 3), line([11.0, 1.4, -40.0], [8.6, 1.4, -44.6], 3),
    ring([0, 0.6, -50], 1.6, 6), line([-5, 0.6, -58], [-5, 0.6, -62], 2),
    line([0, 0.6, -70], [0, 0.6, -90], 7), ...arc([0, 0.6, -97.6], [0, 0.6, -106.6], 4, 3.2),
    line([-9.5, 2, -114.6], [-14, 2, -114.6], 4),
    line([0, 0.6, -128.5], [0, 0.6, -132], 2), line([0, 0.6, -138], [0, 0.6, -146], 3), ...arc([0, 0.6, -151.6], [0, 0.6, -161.4], 5, 3.4),
    ring([0, 0.6, -168], 1.4, 5),
    line([0, 1.6, -186], [0, 1.6, -199], 6), line([0, 1.6, -210], [0, 1.6, -225], 6),
    line([0, 2.4, -235.6], [0, 7.6, -245], 5), line([3.2, 1.6, -237], [3.2, 1.6, -259], 8), line([0, 7.6, -253.4], [-1.2, 4.6, -260.2], 4),
    ring([0, 0.6, -270], 2.2, 8),
  ],
  stars: [
    [11.4, 0.3, -37.1],                    // 0: erste Donut-Blöcke (Bogen rechts)
    [-17.7, 1.2, -114.7],                  // 1: vor dem zweiten Glotzfisch ganz links, Donut-Feld
    [0, 7.2, -249.4],                      // 2: Donut-Treppe hoch, oberer Weg
  ],
  stamp: [8, 0.35, -59],
  marks: {
    start: [0, 0, 6], weit: [0, 0, -1.6], b1: [0, 0, -22], boost1: [0, 0, -29], b2: [0, 0, -49], fisch1: [0, 0, -52], bahn: [0, 0, -70],
    c2: [0, 0, -110], fisch2: [0, 0, -120], d1: [0, 0, -138], d2: [0, 0, -166], band1: [0, 0, -182], rast1: [0, 0, -204], treppe: [0, 0, -230],
    oben: [0, 6, -249], ziel: [0, 0, -266],
  },
};
