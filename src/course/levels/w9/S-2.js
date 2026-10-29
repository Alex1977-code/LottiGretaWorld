// S-2 „Plattenpurzeln zwischen den Planetoiden“ – Welt Stern „Sternenzelt“ (Bonuswelt 9; Bauplan: Detail S-2, eigene
// Gestaltung einer Planetoiden-Hommage). Parcours über schwebende Platten zwischen kleinen Grasplaneten: kippende Drehplatten
// mit Krakenpilzen auf gleitenden Blöcken → Münzinsel → rote Farb-Plattenbahn (jede Platte wird beim Betreten golden) →
// Zwischeninsel → Boost-Strecke auf Drehplatten (wer zu langsam ist, stürzt ab) → Warp-Box → Kontrollpunkt → Plattentreppe
// (drei Plattenwände, deren Stufen ausfahren, sobald man nah kommt; ≈ 13 m hinauf) mit der senkrechten Takt-Plattenwand
// daneben → Schachbrett aus Platten (rosa und blau → alle golden öffnen die Zieltreppe) mit Gabelung: oben das Ziel, unten
// über die letzte Warp-Box die blauen Platten mit dem dritten Stern. Wer das Ziel erreicht, schaltet das Sternenglanz-Kostüm
// für Lotti und Greta frei. Thema galaxy, Musik course_galaxy, 400 s, ≈ 300 m Weg nach −Z.
//
// Sterne: 0 Sternziegel neben der rechten blauen Platte (Reihe 3 des Kippfelds) – vom Sternstein-Sockel aus anstoßen ·
//         1 unter der Drehplatte Spalte 1, Reihe 2 (von vorn gezählt): wer auf ihr stehen bleibt, kippt hinab auf das
//         Versteck mit dem Stern (Röhre zurück zur Münzinsel) · 2 blaue Platten unter der letzten Warp-Box (alle umfärben).
// Stempel: oben auf der Takt-Plattenwand nach dem Kontrollpunkt (zwei Spalten im Zickzack; die Welle der Platten läuft
// nach oben, je zwei sind draußen – im Takt mitklettern). Extraleben: unsichtbarer Block auf der Münzinsel, Ende der
// Farb-Plattenbahn (erscheint, wenn alle Platten golden sind), rechter Winkel des zweiten Treppenabsatzes.
// Gegner: Krakenpilz 6 (zwei auf gleitenden Blöcken am Kippfeld, einer auf der Münzinsel, einer gleitet neben der
// Plattenbahn, einer patrouilliert auf der Zwischeninsel, einer am Kontrollpunkt), Hüpfmaus 2 (Absätze der Treppe).

import { isl, line, ring, arc, column, sign, sternziegel, planetenbauch, planetchen, leuchtsterne, funkeln, Bld, litTop, gradY } from './_helpers_a.js';

const Y = 0;
const YM = 0.6;     // Münzinsel
const YZ = 2;       // Zwischeninsel, Boost-Strecke
const YC = 4;       // Kontrollpunkt-Planet
const YB = 17.2;    // Schachbrett
const YG = 20;      // Zielplattform
const YU = 11;      // blaue Platten unter dem Schachbrett

// ---------------------------------------------------------------- Maße (auch für den Test)
export const MS2 = {
  START: { x0: -6, x1: 6, z0: 10, z1: -7.6 },
  SOCKEL: { x0: 4.4, x1: 6.0, z0: -13.5, z1: -15.1 },
  VERSTECK: { x0: -6.4, x1: -1.4, z0: -10.4, z1: -13, top: -3 },
  MUENZ: { x0: -5, x1: 5, z0: -19.6, z1: -29 },
  ZWISCHEN: { x0: -5, x1: 5, z0: -84.3, z1: -96 },
  BOOSTENDE: { x0: -3, x1: 3, z0: -158, z1: -164.5 },
  CP: { x0: -8, x1: 8, z0: -170, z1: -184 },
  ABSATZ1: { x0: -7, x1: 7, z0: -185.7, z1: -193 },
  ABSATZ2: { x0: -7, x1: 7, z0: -194.7, z1: -202 },
  BRETT: { x: 0, z: -209.6, cols: 4, rows: 5, sp: 2.4 },
  UNTEN: { x0: -16, x1: -6.6, z0: -204, z1: -215 },
  ZIEL: { x0: -4.5, x1: 4.5, z0: -220.6, z1: -233 },
  ECKE: { x0: -7.6, x1: -4.8, z0: -203.7, z1: -207.4 },
};
const { START, VERSTECK, MUENZ, ZWISCHEN, BOOSTENDE, CP, ABSATZ1, ABSATZ2, BRETT, UNTEN, ZIEL, ECKE } = MS2;

/** Kippfeld: 3 Spalten × 4 Reihen um z −13 (Reihe 1 = vorn, nächste zur Kamera). */
export const KIPP = { pos: [0, Y, -13], grid: [3, 4], sp: 2.6 };
/** Mitte der Drehplatte in Spalte s (1 = links) und Reihe r (1 = vorn, der Kamera am nächsten). */
export const kippPlate = (s, r) => [+((s - 2) * KIPP.sp).toFixed(2), Y, +(KIPP.pos[2] + (2.5 - r) * KIPP.sp).toFixed(2)];
/** Plattenbahn (Farbplatten rot → golden): S-Kurve von der Münzinsel zur Zwischeninsel. */
export const BAHN = (() => {
  const out = [];
  const n = 24, z0 = -30.2, z1 = z0 - 2.3 * (n - 1);   // Abstand 2,3 m: Fugen 0,1 m (man läuft darüber)
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), z = z0 + (z1 - z0) * t;
    out.push([+(3.6 * Math.sin(t * Math.PI * 2.2)).toFixed(2), +(YM + (YZ - YM) * Math.min(1, t * 1.15)).toFixed(2), +z.toFixed(2)]);
  }
  return out;
})();
/** Schachbrett 4 × 5 (rosa/blau im Wechsel). */
const brett = () => {
  const a = [], b = [];
  for (let r = 0; r < BRETT.rows; r++) for (let c = 0; c < BRETT.cols; c++) {
    const p = [BRETT.x + (c - (BRETT.cols - 1) / 2) * BRETT.sp, YB, BRETT.z + (r - (BRETT.rows - 1) / 2) * BRETT.sp];
    ((r + c) % 2 ? b : a).push(p);
  }
  return { a, b };
};
export const SCHACH = brett();

/** Aufbau nach den Bausteinen: Planetenbäuche, Sternziegel, Schachbrett-Logik, Kulisse. */
function build(level) {
  planetenbauch(level, [
    { ...START, top: Y, h: 3 }, { ...MUENZ, top: YM, h: 2.5 }, { ...ZWISCHEN, top: YZ, h: 2.5 }, { ...BOOSTENDE, top: YZ, h: 1.5, depth: 2.4 },
    { ...CP, top: YC, h: 3 }, { ...ZIEL, top: YG, h: 2.5 }, { ...UNTEN, top: YU, h: 2, depth: 3.5 },
  ]);
  // Sternstein-Sockel (fest, glitzert) neben der rechten blauen Platte, darüber der Sternziegel
  sternziegel(level, [{ id: 'sternziegel', pos: [5.2, Y + 2.5, -14.3], onBreak: { star: 0 } }]);
  if (level.view) {
    const b = new Bld(), g = new Bld();
    b.cyl(1.15, 0.9, 4, 5.2, Y - 4, -14.3, gradY(0x4a2a88, 0xb8a0ff, Y - 4, Y), 10);
    g.star(0.35, 0.15, 0.08, 5.2, Y - 1.2, -13.17, 0xfff07a);
    // Versteck unter der Drehplatte: Kristalle, Leuchtsterne
    for (const [x, z, c] of [[-5.8, -10.8, 0xb8e8ff], [-1.9, -12.6, 0xffb0e0], [-5.9, -12.6, 0xfff0a0]]) g.cone(0.25, 1.1, x, VERSTECK.top, z, c, 5);
    b.flush(level);
    g.flush(level, { material: 'glow', castShadow: false });
  }
  level.world.add({ type: 'cyl', x: 5.2, z: -14.3, r: 1.08, y0: Y - 4, y1: Y, tag: 'sternstein' });
  // Schachbrett: beide Farbgruppen golden → Zieltreppe erscheint
  let fired = false;
  level.onSignal?.('schach_fertig', () => {
    const a = level.named.get('schach_a'), bb = level.named.get('schach_b');
    if (!fired && a?.done && bb?.done) { fired = true; level.named.get('zielweg')?.reveal?.(); level.sfx('key'); }
  });
  // Kulisse: Planetoiden, Leuchtsterne, Funkeln
  planetchen(level, [
    { pos: [-16, 2, -8], r: 3.2, color: [0x7ae05a, 0xb8f888], grass: true, trees: 2, ring: false },
    { pos: [17, -2, -30], r: 4, color: [0xff9ad0, 0xffe0f0], tilt: 0.5 },
    { pos: [-18, 6, -60], r: 3.6, color: [0x7ae05a, 0xb8f888], grass: true, trees: 3, seed: 2, ring: false },
    { pos: [16, 4, -110], r: 5, color: [0xffc83a, 0xfff0a0], tilt: -0.3 },
    { pos: [-17, -4, -140], r: 4.2, color: [0x6aa8ff, 0xd0e8ff] },
    { pos: [18, 10, -190], r: 4, color: [0x7ae05a, 0xb8f888], grass: true, trees: 2, seed: 5, ring: false },
    { pos: [-20, 22, -222], r: 5, color: [0xa87aff, 0xe8d8ff], tilt: 0.2 },
  ]);
  leuchtsterne(level, [
    [-9, 5, 4, 1.2], [10, 6, -10, 1.1], [-10, 7, -44, 1.3], [11, 6, -70, 1], [-12, 8, -100, 1.2], [12, 9, -130, 1.4],
    [-11, 10, -165, 1.1], [12, 13, -186, 1.2], [-21, 20, -196, 1.3], [11, 22, -216, 1.2], [0, 27, -238, 1.8],
  ]);
  funkeln(level, { center: [0, 4, -50], size: [14, 4, 40], n: 34, seed: 4 });
  funkeln(level, { center: [0, 14, -200], size: [12, 8, 24], n: 30, seed: 9, color: 0xffe8b0 });
}

export const LEVEL = {
  id: 'S-2',
  world: 9,
  title: 'Plattenpurzeln zwischen den Planetoiden',
  archetype: 'parcours',
  theme: 'galaxy',
  music: 'course_galaxy',
  timeLimit: 400,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  killY: -16,
  instances: { coin: { farHide: 46, shadow: false } },
  farHide: 42,
  build,
  camera: [
    { from: 14, to: -32, pitch: 46, dist: 13, fov: 40, ahead: 2.2, area: [-30, 40] },
    { from: -32, to: -96, pitch: 44, dist: 13.5, fov: 40, ahead: 2.4, area: [-30, 40] },
    { from: -96, to: -166, pitch: 38, dist: 15, fov: 40, ahead: 3.4, area: [-30, 40] },
    { from: -166, to: -203, pitch: 30, dist: 15, fov: 42, height: 2.4, area: [-30, 40] },
    { from: -203, to: -240, pitch: 44, dist: 13.5, fov: 40, area: [-5.5, 40] },
    { from: -200, to: -218, pitch: 46, dist: 12.5, fov: 40, area: [-30, -5.5] },
  ],
  segments: [
    // =============================================================== Start-Planet
    isl(START.x0, START.x1, START.z0, START.z1, Y, 3),
    sign(-4.2, Y, 7.6, 'Plattenpurzeln\nzwischen den Planetoiden', { size: [3.4, 1.1] }),
    sign(3.8, Y, -5.6, 'Nicht stehen\nbleiben – sie kippen!', { size: [2.6, 0.9], yaw: -0.2 }),
    { type: 'deco', items: [{ kind: 'flowers', pos: [-4, Y, 1], size: [3, 3], n: 8 }, { kind: 'bush', pos: [4.5, Y, 6.5] }, { kind: 'tree', pos: [-4.6, Y, -4.4], height: 3.2 }] },
    // =============================================================== Kippfeld (Drehplatten) mit Krakenpilzen auf gleitenden Blöcken
    { type: 'drehplatte', id: 'kippfeld', pos: KIPP.pos, grid: KIPP.grid, spacing: KIPP.sp, size: [2.2, 0.3, 2.2], delay: 0.45, hold: 1.4, color: 'blau', color2: 'gelb' },
    { type: 'mover', id: 'gleiter_l', path: [[-6.6, Y - 0.5, -9], [-6.6, Y - 0.5, -17]], size: [2.2, 0.5, 2.2], speed: 1.4, wait: 0.6, color: 'purple' },
    { type: 'mover', id: 'gleiter_r', path: [[8.2, Y - 0.5, -17], [8.2, Y - 0.5, -9]], size: [2.2, 0.5, 2.2], speed: 1.4, wait: 0.6, color: 'pink' },
    // Versteck unter der Drehplatte (Spalte 1, Reihe 2): Stern und Röhre zur Münzinsel
    { type: 'island', pos: [(VERSTECK.x0 + VERSTECK.x1) / 2, VERSTECK.top - 1, (VERSTECK.z0 + VERSTECK.z1) / 2], size: [VERSTECK.x1 - VERSTECK.x0, 1, VERSTECK.z0 - VERSTECK.z1], top: 'grass', under: 1.4 },
    { type: 'pipe', id: 'p_versteck', pos: [-5.2, VERSTECK.top, -11.7], height: 1.1, target: 'p_muenz' },
    // =============================================================== Münzinsel
    isl(MUENZ.x0, MUENZ.x1, MUENZ.z0, MUENZ.z1, YM, 2.5),
    { type: 'pipe', id: 'p_muenz', pos: [-3.6, YM, -27.4], height: 1.1, target: 'p_versteck' },
    { type: 'deco', items: [{ kind: 'flowers', pos: [3, YM, -27], size: [2.5, 2.5], n: 6 }, { kind: 'tree', pos: [3.8, YM, -21], height: 2.8 }] },
    // =============================================================== Rote Farb-Plattenbahn
    { type: 'farbplatten', id: 'bahn', tiles: BAHN, size: [2.2, 0.3, 2.2], from: 'rot', to: 'gelb', onAll: [{ coins: 10 }, { spawn: { kind: 'powerup', id: 'bahn_leben', pos: [BAHN[BAHN.length - 1][0] + 2.6, YZ, -86.6], power: 'oneup', speed: 0 } }], at: [BAHN[BAHN.length - 1][0], BAHN[BAHN.length - 1][1] + 1, BAHN[BAHN.length - 1][2]] },
    { type: 'mover', id: 'gleiter_b', path: [[-6.8, YM + 0.3, -46], [-6.8, YM + 0.3, -60]], size: [2.2, 0.5, 2.2], speed: 1.2, wait: 0.8, color: 'purple' },
    // =============================================================== Zwischeninsel und Boost-Strecke
    isl(ZWISCHEN.x0, ZWISCHEN.x1, ZWISCHEN.z0, ZWISCHEN.z1, YZ, 2.5),
    sign(-3.6, YZ, -93.6, 'Renn los –\nnicht trödeln!', { size: [2.2, 0.8], yaw: 0.2 }),
    { type: 'boost', pos: [0, YZ, -95], dir: [0, -1], speed: 16 },
    { type: 'drehplatte', id: 'boost', from: [0, YZ, -98.2], to: [0, YZ, -156.2], n: 24, size: [2.2, 0.3, 2.2], delay: 0.25, arrow: [0, -1], speed: 15, color: 'rot', color2: 'weiss' },
    isl(BOOSTENDE.x0, BOOSTENDE.x1, BOOSTENDE.z0, BOOSTENDE.z1, YZ, 1.5),
    // =============================================================== Kontrollpunkt-Planet, Plattentreppe, Takt-Plattenwand (Stempel)
    isl(CP.x0, CP.x1, CP.z0, CP.z1, YC, 3),
    { type: 'plattenwand', id: 'treppe_a', pos: [-2, YC, CP.z1], dir: [0, 1], size: [8, 4.4], grid: [4, 3], depth: 1.6, mode: 'treppe', near: 6, order: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], color: 'rot', thick: 1.7 },
    isl(ABSATZ1.x0, ABSATZ1.x1, ABSATZ1.z0, ABSATZ1.z1, YC + 4.4, 1.2),
    { type: 'plattenwand', id: 'treppe_b', pos: [2, YC + 4.4, ABSATZ1.z1], dir: [0, 1], size: [8, 4.4], grid: [4, 3], depth: 1.6, mode: 'treppe', near: 6, order: [[3, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]], color: 'blau', thick: 1.7 },
    isl(ABSATZ2.x0, ABSATZ2.x1, ABSATZ2.z0, ABSATZ2.z1, YC + 8.8, 1.2),
    { type: 'plattenwand', id: 'treppe_c', pos: [-2, YC + 8.8, ABSATZ2.z1], dir: [0, 1], size: [8, 4.4], grid: [4, 3], depth: 1.6, mode: 'treppe', near: 6, order: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], color: 'gelb', thick: 1.7 },
    // Takt-Wand im Zickzack (2 Spalten): die nächste Platte steht nie über dem Kopf
    { type: 'plattenwand', id: 'stempelwand', pos: [5.8, YC, CP.z1], dir: [0, 1], size: [3.8, 10], grid: [2, 6], order: [[0, 0], [1, 1], [0, 2], [1, 3], [0, 4], [1, 5]], depth: 1.6, mode: 'takt', period: 7.2, out: 1.9, warn: 0.5, stagger: -1.2, color: 'lila', thick: 1.7 },   // Welle läuft nach oben, je 2 Platten draußen
    sign(-6.4, YC, -172, 'Plattentreppe:\nnah herangehen!', { size: [2.4, 0.9], yaw: 0.2 }),
    // =============================================================== Schachbrett, Gabelung: oben Ziel, unten die blauen Platten
    { type: 'farbplatten', id: 'schach_a', tiles: SCHACH.a, size: [2.2, 0.3, 2.2], from: 'rosa', to: 'gelb', onAll: { signal: 'schach_fertig' } },
    { type: 'farbplatten', id: 'schach_b', tiles: SCHACH.b, size: [2.2, 0.3, 2.2], from: 'blau', to: 'gelb', onAll: { signal: 'schach_fertig' } },
    { type: 'appear', id: 'zielweg', style: 'block', color: 'yellow', parts: [
      { pos: [0, YB - 0.3, -216.2], size: [3, 1.2, 1.6] }, { pos: [0, YB + 0.9, -218.0], size: [3, 1.2, 1.6] }, { pos: [0, YB + 2.1, -219.8], size: [3, 0.7, 1.6] },
    ] },
    isl(UNTEN.x0, UNTEN.x1, UNTEN.z0, UNTEN.z1, YU, 2),
    isl(ECKE.x0, ECKE.x1, ECKE.z0, ECKE.z1, YB, 1),
    { type: 'farbplatten', id: 'blauplatten', pos: [-11.6, YU + 0.1, -209.4], grid: [3, 3], spacing: 2.4, size: [2.2, 0.3, 2.2], from: 'blau', to: 'gelb', star: 2 },
    sign(-14.4, YU, -205.4, 'Blaue Platten\numfärben!', { size: [2.2, 0.8], yaw: 0.3 }),
    // =============================================================== Ziel
    isl(ZIEL.x0, ZIEL.x1, ZIEL.z0, ZIEL.z1, YG, 2.5),
    { type: 'sternenglanz', id: 'glanz', outfit: 'stern', when: 'ziel' },
    { type: 'deco_star', shadow: false, items: [
      { kind: 'rakete', pos: [-3.4, YG, -231.4], height: 4, color: 'weiss', solid: true }, { kind: 'stern', pos: [3.4, YG, -224], pole: 2.2, size: 1.1 },
      { kind: 'planet', pos: [-9, YC + 3, -180], radius: 1.6, color: 'mint' }, { kind: 'kristall', pos: [5.6, YC, -172], n: 5, color: 'gold' },
      // Start-Planet: Kristalle, Sternlaterne, Neonring über dem Start
      { kind: 'kristall', pos: [5, Y, 8.6], n: 4, color: 'rosa' }, { kind: 'kristall', pos: [-5.2, Y, -6.4], n: 3, color: 'mint', size: 0.8 },
      { kind: 'stern', pos: [-5.4, Y, 4.6], pole: 1.8, size: 0.8 }, { kind: 'kristall', pos: [5.2, Y, 1.6], n: 3, color: 'gold', size: 0.7 },
      { kind: 'neonring', pos: [0, Y + 5.4, 3], radius: 1.6, color: 'pink', yaw: 0 },
      // Münzinsel
      { kind: 'kristall', pos: [-4.3, YM, -20.4], n: 4, color: 'blau', size: 0.8 }, { kind: 'stern', pos: [4.3, YM, -28.3], pole: 1.4, size: 0.7 },
      // Zwischeninsel: Antenne funkt zur Boost-Strecke
      { kind: 'antenne', pos: [4, YZ, -86.2], height: 2.6 }, { kind: 'kristall', pos: [-4.2, YZ, -85.4], n: 4, color: 'lila', size: 0.8 },
      { kind: 'neonring', pos: [0, YZ + 3.4, -97.6], radius: 1.8, color: 'cyan', yaw: 0 },
      // Boost-Ende und Kontrollpunkt
      { kind: 'stern', pos: [-2.4, YZ, -163.8], pole: 1.2, size: 0.6 }, { kind: 'stern', pos: [2.4, YZ, -163.8], pole: 1.2, size: 0.6 },
      { kind: 'leuchtsaeule', pos: [-7.2, YC, -170.8], height: 4.5 }, { kind: 'leuchtsaeule', pos: [7.2, YC, -170.8], height: 4.5 },
      // Absätze
      { kind: 'kristall', pos: [-6.4, YC + 4.4, -186.4], n: 3, color: 'rosa', size: 0.7 }, { kind: 'kristall', pos: [6.4, YC + 8.8, -195.4], n: 3, color: 'mint', size: 0.7 },
      // unten (Gabelung) und Ziel
      { kind: 'kristall', pos: [-15.2, YU, -214.2], n: 4, color: 'gold', size: 0.8 }, { kind: 'stern', pos: [-15.4, YU, -210.4], pole: 1.4, size: 0.6 },
      { kind: 'regenbogen', pos: [0, YG, -232.4], width: 7, height: 4.2, yaw: 0 },
      { kind: 'kristall', pos: [3.6, YG, -231.8], n: 4, color: 'lila' }, { kind: 'stern', pos: [-3.8, YG, -222.4], pole: 1.6, size: 0.7 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-1, Y + 1.9, 2], content: 'wachstumsbeere' },
    { kind: 'question', pos: [1, Y + 1.9, 2], content: 'coins:3' },
    { kind: 'coinblock', pos: [0, YM + 2.4, -24.4], count: 8 },
    { kind: 'hidden', pos: [-1.2, YM + 2.6, -27.6], content: 'oneup' },   // 1-up läuft nach +x über die Insel
    { kind: 'question', pos: [-1, YC + 1.9, -175], content: 'coins:5' },
    { kind: 'question', pos: [1, YC + 1.9, -175], content: 'wachstumsbeere' },
  ],
  enemies: [
    { kind: 'krakenpilz', id: 'kp_links', pos: [-6.6, Y, -9], sight: 9, first: 0.9 },
    { kind: 'krakenpilz', id: 'kp_rechts', pos: [8.2, Y, -17], sight: 9, first: 1.6 },
    { kind: 'krakenpilz', id: 'kp_muenz', pos: [2.4, YM, -24], sight: 6, first: 1.4 },
    { kind: 'krakenpilz', id: 'kp_bahn', pos: [-6.8, YM + 0.8, -46], sight: 9, first: 1.4 },
    { kind: 'krakenpilz', id: 'kp_zwischen', pos: [-3, YZ, -90], path: [[-3.4, YZ, -90], [3.4, YZ, -90]], spit: false },
    { kind: 'krakenpilz', id: 'kp_cp', pos: [-5.4, YC, -178], sight: 6.5, first: 1.5 },
    { kind: 'huepfmaus', id: 'hm_a1', pos: [3, YC + 4.4, -189], path: [[1, YC + 4.4, -189.5], [5.5, YC + 4.4, -189.5]] },
    { kind: 'huepfmaus', id: 'hm_a2', pos: [-3, YC + 8.8, -198], path: [[-5.5, YC + 8.8, -198.4], [-1, YC + 8.8, -198.4]] },
  ],
  items: [
    line([0, Y + 0.6, 0], [0, Y + 0.6, -6], 4),
    ...arc([0, Y + 1, -17.6], [0, YM + 1, -20.6], 3, 1.2),
    ring([0, YM + 0.8, -24.4], 2.6, 10),
    ...BAHN.filter((_, i) => i % 2 === 1).map((p) => ({ kind: 'coin', pos: [p[0], p[1] + 0.8, p[2]] })),
    line([0, YZ + 0.8, -100], [0, YZ + 0.8, -154], 12),
    line([-4, YC + 0.6, -176], [4, YC + 0.6, -176], 5),
    ...[0, 1, 2, 3, 4].map((r) => ({ kind: 'coin', pos: [5.8 + (r % 2 ? 0.95 : -0.95), YC + (r + 1) * (10 / 7) + 0.8, CP.z1 + 0.9] })),
    line([-5, YC + 5, -190], [5, YC + 5, -190], 4),
    line([5, YC + 9.4, -198.4], [-5, YC + 9.4, -198.4], 4),
    { kind: 'powerup', pos: [5.6, YC + 8.8, -201.2], power: 'oneup', speed: 0 },   // rechter Winkel des Absatzes, abseits der Treppe
    line([-12, YU + 0.8, -206], [-12, YU + 0.8, -213], 4),
    { kind: 'warpbox', id: 'warp_boost', pos: [0, YZ, -162], target: 'warp_cp' },
    { kind: 'warpbox', id: 'warp_cp', pos: [0, YC, -171.6], target: 'warp_boost' },
    { kind: 'warpbox', id: 'warp_unten', pos: [-6.2, YB, -205.6], target: 'warp_hoch' },
    { kind: 'warpbox', id: 'warp_hoch', pos: [-8, YU, -213.6], target: 'warp_unten' },
  ],
  checkpoint: [{ pos: [-3.2, YZ, -87.2], yaw: Math.PI / 2 }, { pos: [3, YC, -173.6], yaw: Math.PI / 2 }],   // Zwischeninsel (vor der Boost-Strecke), Kontrollpunkt-Insel
  stars: [
    { pos: [5.2, Y + 0.6, -14.3], hidden: true, id: 'stern_ziegel' },                 // 0 Sternziegel (Reihe 3, rechts)
    { pos: [-2.6, VERSTECK.top + 0.3, -11.7], id: 'stern_versteck' },                 // 1 unter Spalte 1, Reihe 2
    { pos: [-11.6, YU + 0.9, -209.4], hidden: true, id: 'stern_blau' },              // 2 blaue Platten
  ],
  stamp: [5.8, YC + 10.1, CP.z1 - 0.85],
  goal: { pos: [0, YG, -228.4], height: 9 },
  marks: {
    start: [0, Y, 6], kipp: [0, Y, -7], sockel: [5.2, Y, -14.3], versteck: [-3.6, VERSTECK.top, -11.2], muenz: [0, YM, -21],
    bahn: [BAHN[0][0], BAHN[0][1], BAHN[0][2]], zwischen: [0, YZ, -88], boostende: [0, YZ, -160], cp: [0, YC, -173.6],
    absatz1: [0, YC + 4.4, -188], absatz2: [0, YC + 8.8, -197], brett: [0, YB, -205], unten: [-11, YU, -207], ziel: [0, YG, -224],
  },
};
