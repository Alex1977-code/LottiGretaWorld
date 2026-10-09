// 1-5 „Kippfeld-Manege“ – Zirkuszelt (Welt 1), ca. 195 m nach −Z, schwebende Plattformen über drei Manegen,
// Kipp-Schaltfelder. Thema `circus` (themes_circus.js), Zeltinneres/Plattformen aus deco_w1b.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1  Schalter-Feld 1   (z 8 … −14, y 0)   6 Schaltfelder, 2 Krabbelkäfer; alle an → Steg zum Feld 2 erscheint.
//                        Rechts Warp-Box (Abkürzung über die Zuschauerloge) und zwei Wände: Wandsprung → Stern 1.
//   2  Schalter-Feld 2   (z −27 … −56, y 0 → 1,5)   Schaltfelder auf zwei Bühnen, zwei fahrende Plattformen (3 m
//                        Lücken), Roulette-Block, 4 Brummer.
//   3  Checkpoint        (z −58 … −68, y 2,5)   Trommelbühne, Krallen-Anzug.
//   4  Flatterkäfer-Zone (z −70 … −92, y 3 → 4)   6 Flatterkäfer in zwei Reihen, 2 Brummer; Rätselbox bewacht von
//                        2 Krabbelkäfern → Kistenraum (x ≈ 60, Stern 2 in der Kiste links in der Ecke, Funkenblüte).
//   5  Krabbelkäfer-Gang (z −95 … −125, y 4)   gerader Laufsteg, 4 Krabbelkäfer im Gänsemarsch.
//   6  Wechselschalter-Plattform (z −126 … −158, fährt)   12 × 12 m Fähre mit Wechsel-Schaltfeldern, Zauberkröte,
//                        Stern 3 in der Mitte.
//   7  Glasrohr-Kanone   (z −159 … −195)   Landebühne, Stempel-Turm (vor „alle Schalter an“ mit Krallen über die
//                        Kletterwand von der Wackelplattform aus, danach nur per Wandsprung), Kanone zur Zielbühne.
// Gegner: Krabbelkäfer 8, Brummer 8, Flatterkäfer 6, Zauberkröte 1.

const coinsLine = (from, to, n) => ({ kind: 'coins', from, to, n });
const arc = (a, b, h, n) => Array.from({ length: n }, (_, i) => {
  const t = n === 1 ? 0.5 : i / (n - 1);
  return { kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] };
});
/** Zirkusbühne: Mitte x/z, Oberseite top, Größe w × d, Dicke h. */
const stage = (x, top, z, w, d, o = {}) => ({ kind: 'stage', pos: [x, top - (o.h ?? 1), z], size: [w, o.h ?? 1, d], ...o });
const bug = (x, y, z, o = {}) => ({ kind: 'krabbelkaefer', pos: [x, y, z], ...o });
const bee = (x, y, z, o = {}) => ({ kind: 'brummer', pos: [x, y, z], ...o });
const flutter = (x, y, z, o = {}) => ({ kind: 'flatterkaefer', pos: [x, y, z], ...o });

export const LEVEL = {
  id: '1-5',
  world: 1,
  title: 'Kippfeld-Manege',
  archetype: 'parcours',
  theme: 'circus',
  music: 'course_circus',
  timeLimit: 400,
  killY: -7,
  start: { pos: [0, 0, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 10, to: -16, pitch: 46, dist: 13.5, yaw: 0 },
    { from: -16, to: -57, pitch: 46, dist: 14, yaw: 0 },
    { from: -57, to: -69, pitch: 44, dist: 13, yaw: 0 },
    { from: -69, to: -94, pitch: 46, dist: 14, yaw: 0 },
    { from: -94, to: -126, pitch: 42, dist: 13.5, yaw: 0, x: 0, xLock: 0.5 },
    { from: -126, to: -158, pitch: 50, dist: 15, yaw: 0 },
    { from: -158, to: -172, pitch: 45, dist: 13.5, yaw: 0 },
    { from: -172, to: -200, pitch: 42, dist: 14, yaw: 0, x: 0, xLock: 0.4 },
    // Zuschauerloge (abseits links) und Kistenraum (abseits, x ≈ 60)
    { from: -10, to: -36, pitch: 46, dist: 12.5, yaw: 0, x: -20, xLock: 0.6, area: [-26, -15] },
    { from: -76, to: -100, pitch: 52, dist: 12.5, yaw: 0, x: 60, xLock: 0.6, area: [48, 75] },
  ],
  segments: [
    // ======================================================== Zelt (Kulisse)
    { type: 'deco_w1b', items: [
      { kind: 'tent', from: [-27, 18], to: [27, -212], y0: -14, y1: 22, peak: 42,
        rings: [[0, -6, 11], [0, -92, 13], [0, -175, 11]], poles: [[-15, -45], [15, -45], [-15, -135], [15, -135]] },
      { kind: 'curtain', pos: [0, -14, -208], size: [26, 30], color: 0xc81e2a },
    ] },
    // Scheinwerfer (Kegel + Lichtfleck) – ein Objekt
    { type: 'deco_w1b', items: [
      { kind: 'spotlight', pos: [-24, 21, 0], target: [-2, 0, -4], r: 3.2, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [24, 21, -20], target: [1, 0, -31], r: 3, color: 0xffd0f0 },
      { kind: 'spotlight', pos: [-24, 21, -50], target: [0, 2.5, -63], r: 3.4, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [24, 21, -75], target: [-2, 4, -88], r: 3.2, color: 0xc8e4ff },
      { kind: 'spotlight', pos: [-24, 21, -105], target: [0, 4, -112], r: 2.6, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [24, 21, -130], target: [0, 4, -142], r: 4.2, color: 0xffe0b0 },
      { kind: 'spotlight', pos: [-24, 21, -170], target: [0, 10, -190], r: 3.6, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [24, 21, -150], target: [-9.5, 12, -163], r: 1.6, color: 0xffd0f0 },
      { kind: 'spotlight', pos: [-15, 30, -92], target: [-6, -14, -92], r: 4.5, color: 0xffc8e8, strength: 0.1 },
      { kind: 'spotlight', pos: [15, 30, -10], target: [5, -14, -6], r: 4, color: 0xc8e4ff, strength: 0.1 },
    ] },
    // Wimpelketten und Lichterketten seitlich der Route (kreuzen nie den Kamerablick)
    { type: 'deco_w1b', items: [
      { kind: 'bunting', from: [-15, 17, -45], to: [-15, 17, -135], sag: 2.5, n: 60 },
      { kind: 'bunting', from: [15, 17, -45], to: [15, 17, -135], sag: 2.5, n: 60 },
      { kind: 'bunting', from: [-26.5, 19, -45], to: [-15, 17, -45], sag: 1, n: 10 },
      { kind: 'bunting', from: [15, 17, -45], to: [26.5, 19, -45], sag: 1, n: 10 },
      { kind: 'bunting', from: [-26.5, 19, -135], to: [-15, 17, -135], sag: 1, n: 10 },
      { kind: 'bunting', from: [15, 17, -135], to: [26.5, 19, -135], sag: 1, n: 10 },
      { kind: 'bulbs', from: [-15, 14, 12], to: [-15, 14, -45], sag: 1.5, n: 40 },
      { kind: 'bulbs', from: [15, 14, 12], to: [15, 14, -45], sag: 1.5, n: 40 },
      { kind: 'bulbs', from: [-15, 14, -135], to: [-15, 14, -205], sag: 1.5, n: 46 },
      { kind: 'bulbs', from: [15, 14, -135], to: [15, 14, -205], sag: 1.5, n: 46 },
      { kind: 'trapeze', pos: [-11, 12, -24], size: 9 },
      { kind: 'trapeze', pos: [11, 11, -100], size: 10 },
      { kind: 'trapeze', pos: [-11, 13, -150], size: 8 },
      { kind: 'balloons', pos: [-19, 5, -60], n: 6, size: 3 },
      { kind: 'balloons', pos: [19, 3, -118], n: 5, size: 3 },
      // Requisiten unten in den Manegen (Blick in die Tiefe)
      { kind: 'drum', pos: [-5, -14, -4], size: [2.4, 1.4], color: 'blue' }, { kind: 'drum', pos: [5, -14, -9], size: [2.2, 1.2], color: 'yellow' },
      { kind: 'ball', pos: [2, -14, 1], size: 1.1 }, { kind: 'cannon', pos: [-7, -14, -88], yaw: 0.6 },
      { kind: 'drum', pos: [6, -14, -95], size: [2.6, 1.6], color: 'red' }, { kind: 'ball', pos: [4, -14, -86], size: 1.2 },
      { kind: 'drum', pos: [-4, -14, -172], size: [2.4, 1.4], color: 'green' }, { kind: 'ball', pos: [5, -14, -178], size: 1 },
      { kind: 'confetti', pos: [0, -14, -6], size: [16, 16], n: 70 }, { kind: 'confetti', pos: [0, -14, -92], size: [18, 18], n: 80 },
      { kind: 'confetti', pos: [0, -14, -175], size: [16, 16], n: 70 },
    ] },

    // ======================================================== 1  Schalter-Feld 1
    { type: 'deco_w1b', items: [
      stage(0, 0, -3, 20, 22, { color: 0x2a4fd0 }),
      // Wandsprung-Wände neben der Warp-Box (Stern 1 auf der breiten Wand)
      { kind: 'pennant', pos: [-9.3, 0, 7.3], size: 2.6 },
      { kind: 'pennant', pos: [9.3, 0, 7.3], size: 2.6, color: 'blue' },
      { kind: 'drum', pos: [-8, 0, 3], size: [2, 1], color: 'yellow' },
      { kind: 'ball', pos: [-8.6, 1, 3], size: 0.6 },
      { kind: 'ball', pos: [8.4, 0, 2.2], size: 0.8, solid: true },
      { kind: 'balloons', pos: [-9.4, 0, -13.3], n: 4, size: 1.6 },
      { kind: 'confetti', pos: [0, 0, 3], size: [18, 8], n: 50 },
    ] },
    { type: 'deco_w1b', items: [
      stage(5.5, 6.5, -11, 2, 4, { h: 6.5, color: 0xffc21a, skirt: ['red', 0xfff4e0], bulbs: false, inlay: false }),
      stage(9.5, 11, -11, 1, 4, { h: 11, color: 0xffc21a, skirt: [0x2a4fd0, 0xfff4e0], bulbs: false, inlay: false }),
    ] },
    { type: 'sign', pos: [-6.2, 0, 6.8], text: 'Manege frei!', size: [2.6, 0.9] },
    { type: 'switchtiles', id: 'feld1', tiles: [[-5, 0, -1], [0, 0, -1], [5, 0, -1], [-5, 0, -7], [0, 0, -7], [5, 0, -7]], onAll: { reveal: 'steg1' } },
    // Steg (erscheint, wenn alle Schaltfelder an sind; vorher als Umriss zu sehen)
    { type: 'appear', id: 'steg1', style: 'block', parts: [
      { pos: [-1, -0.5, -16.5], size: [3, 0.5, 2.6], color: 'yellow' },
      { pos: [0, -0.5, -20], size: [3, 0.5, 2.6], color: 'red' },
      { pos: [1, -0.5, -23.5], size: [3, 0.5, 2.6], color: 'blue' },
    ] },

    // ======================================================== 2  Schalter-Feld 2
    { type: 'deco_w1b', items: [
      stage(0, 0, -31, 10, 8, { color: 0x8a2ad0 }),
      stage(0, 1.5, -53, 9, 6, { color: 0x2a9a5a }),
      { kind: 'drum', pos: [-4, 0, -28.5], size: [1.6, 0.8], color: 'red' },
      { kind: 'pennant', pos: [4.6, 0, -34.6], size: 2.2, color: 'yellow' },
      { kind: 'pennant', pos: [-4.1, 1.5, -55.6], size: 2.2 },
      { kind: 'ball', pos: [3.8, 1.5, -55.3], size: 0.5 },
    ] },
    { type: 'switchtiles', id: 'feld2', tiles: [[-2.5, 0, -29.5], [2.5, 0, -29.5], [-2.5, 0, -33], [2.5, 0, -33], [-2.5, 1.5, -52.4], [0, 1.5, -54.4], [2.5, 1.5, -52.4]],
      onAll: { power: 'oneup', pos: [0, 1.5, -51] } },
    { type: 'mover', id: 'lift1', size: [3, 0.5, 3], path: [[-4, -0.5, -39], [4, -0.5, -39]], speed: 2.4, wait: 0.5, color: 'red' },
    { type: 'mover', id: 'lift2', size: [3, 0.5, 3], path: [[4, 0.3, -45], [-4, 0.3, -45]], speed: 2.4, wait: 0.5, color: 'yellow' },
    { type: 'deco_w1b', items: [
      { kind: 'ride', at: [-4, -0.5, -39], color: 0xd0302a, skirt: [0xffc21a, 0xfff4e0] },
      { kind: 'ride', at: [4, 0.3, -45], color: 0xffa020, skirt: [0x2a4fd0, 0xfff4e0] },
    ] },

    // ======================================================== 3  Checkpoint
    { type: 'deco_w1b', items: [
      stage(0, 2.5, -63, 9, 9, { round: true, color: 0xd0302a, star: true, h: 1.4 }),
      { kind: 'balloons', pos: [-3.6, 2.5, -65.6], n: 5, size: 1.8 },
    ] },

    // ======================================================== 4  Flatterkäfer-Zone, Rätselbox
    { type: 'deco_w1b', items: [
      stage(-4, 3, -73, 6, 5, { color: 0x2a4fd0 }),
      stage(3, 3.5, -80, 6, 5, { color: 0xffa020 }),
      stage(-2, 4, -88, 10, 8, { color: 0x8a2ad0 }),
      { kind: 'drum', pos: [-6, 4, -85.5], size: [1.6, 0.9], color: 'blue' },
      { kind: 'pennant', pos: [2.6, 4, -91.5], size: 2.3, color: 'yellow' },
    ] },


    // ======================================================== 5  Krabbelkäfer-Gang
    { type: 'deco_w1b', items: [
      stage(0, 4, -110, 4, 30, { color: 0xd0302a }),
      { kind: 'bulbs', from: [-2.2, 5.4, -95.5], to: [-2.2, 5.4, -124.5], sag: 0.4, n: 30 },
      { kind: 'bulbs', from: [2.2, 5.4, -95.5], to: [2.2, 5.4, -124.5], sag: 0.4, n: 30 },
      { kind: 'pole', pos: [-2.2, 4, -95.3], size: 1.6, r: 0.08 }, { kind: 'pole', pos: [2.2, 4, -95.3], size: 1.6, r: 0.08 },
      { kind: 'pole', pos: [-2.2, 4, -110], size: 1.6, r: 0.08 }, { kind: 'pole', pos: [2.2, 4, -110], size: 1.6, r: 0.08 },
      { kind: 'pole', pos: [-2.2, 4, -124.7], size: 1.6, r: 0.08 }, { kind: 'pole', pos: [2.2, 4, -124.7], size: 1.6, r: 0.08 },
    ] },

    // ======================================================== 6  Wechselschalter-Plattform (fährt)
    { type: 'mover', id: 'faehre', size: [12, 0.8, 12], path: [[0, 3.2, -132.2], [0, 3.2, -152]], speed: 2.2, wait: 1.6, color: 'blue' },
    { type: 'deco_w1b', items: [{ kind: 'ride', at: [0, 3.2, -132.2], color: 0x2a4fd0, star: true, skirt: [0xd0302a, 0xffc21a] }] },
    // Wechsel-Schaltfelder auf der Fähre (Weltkoordinaten zur Startlage, Fähren-Mitte z −132,2): alle an →
    // Stern 3 erscheint in der Mitte, und die Wackelplattform am Stempel-Turm stürzt ab
    { type: 'switchtiles', id: 'wechsel', toggle: true, on: 'faehre',
      tiles: [[-3.5, 4, -135.7], [3.5, 4, -135.7], [-3.5, 4, -128.7], [3.5, 4, -128.7], [-4.2, 4, -132.2], [4.2, 4, -132.2]],
      onAll: [{ star: 2 }, { drop: 'wackel' }] },
    // Seitenbühnen, von denen die Zauberkröte zaubert
    { type: 'deco_w1b', items: [
      stage(-9, 5, -137, 3, 3, { color: 0x8a2ad0, bulbs: true, inlay: false }),
      stage(9, 5, -147, 3, 3, { color: 0x8a2ad0, bulbs: true, inlay: false }),
    ] },

    // ======================================================== 7  Landebühne, Stempel-Turm, Kanone, Ziel
    { type: 'deco_w1b', items: [
      stage(-0.5, 4, -164, 15, 10, { color: 0x2a9a5a }),
      stage(0, 10, -190, 10, 10, { color: 0xffc21a, star: true }),
      stage(-9.5, 12, -163.2, 3, 3.8, { color: 0xd0302a, h: 8, bulbs: false, inlay: false }),      // Stempel-Turm
      stage(-6.25, 14, -163.2, 0.5, 3.8, { h: 10, color: 0xffc21a, skirt: [0x2a4fd0, 0xfff4e0], bulbs: false, inlay: false }),   // Wandsprung-Wand
      { kind: 'pennant', pos: [-10.6, 12, -164.6], size: 2 },
      { kind: 'balloons', pos: [4.6, 10, -194], n: 6, size: 2 },
      { kind: 'confetti', pos: [0, 10, -190], size: [9, 9], n: 60 },
      { kind: 'cannon', pos: [-3.8, 10, -194], yaw: -0.4 },
      { kind: 'drum', pos: [5.5, 4, -167.5], size: [1.6, 0.9], color: 'red' },
    ] },
    { type: 'wall', pos: [-9.5, 4, -161.2], size: [3, 8, 0.4], climbable: true },
    { type: 'sign', pos: [-12.6, 4, -158.6], text: 'Kletterkünstler\nbitte hier!', yaw: 0.35, size: [2.6, 1.0] },
    { type: 'fallplatform', id: 'wackel', pos: [-9.5, 3.4, -159.6], size: [3, 0.6, 2.8], trigger: 'signal', respawn: 0, color: 'orange' },
    { type: 'glasspipe', id: 'kanone', path: [[3.5, 5, -162.6], [3.5, 5, -166.5], [3.5, 8, -171], [2.2, 11, -176.5]], radius: 1, oneWay: true,
      coins: 4, cannon: { target: [0, 10, -188.6], arc: 4 } },

    // ======================================================== Zuschauerloge (abseits links)
    { type: 'deco_w1b', items: [
      stage(-20, 6, -22, 6, 12, { color: 0xd0302a }),
      { kind: 'curtain', pos: [-20, 6, -28.3], size: [6, 5], color: 0x7a1aa0 },
    ] },


    // ======================================================== Kistenraum (abseits, x ≈ 60)
    { type: 'deco_w1b', items: [
      stage(60, 0, -87, 16, 14, { color: 0x9a6a3a, bulbs: false }),
      stage(51.5, 4, -87, 1, 14, { h: 4, color: 0xffc21a, bulbs: false, inlay: false, camIgnore: true }),
      stage(68.5, 4, -87, 1, 14, { h: 4, color: 0xffc21a, bulbs: false, inlay: false, camIgnore: true }),
      stage(60, 4, -94.5, 18, 1, { h: 4, color: 0xffc21a, skirt: [0x7a1aa0, 0xfff4e0], bulbs: false, inlay: false }),
      { kind: 'curtain', pos: [60, 4, -94.2], size: [14, 4], color: 0xc81e2a },
      { kind: 'bunting', from: [52, 4.6, -93.9], to: [68, 4.6, -93.9], sag: 0.6, n: 18 },
      { kind: 'drum', pos: [67, 0, -82.5], size: [1.4, 0.8], color: 'blue' },
      { kind: 'ball', pos: [53.2, 0, -82.6], size: 0.6 },
      { kind: 'balloons', pos: [67.4, 0, -86], n: 4, size: 1.6 },
      { kind: 'trapeze', pos: [56, 3.2, -88], size: 3 },
    ] },

  ],
  blocks: [
    { kind: 'question', pos: [0, 3.4, 2], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-2, 3.4, -31], content: 'coin' },
    { kind: 'rouletteblock', pos: [2, 3.4, -31], contents: ['krallen', 'funken', 'wachstumsbeere', 'oneup'] },
    { kind: 'question', pos: [-1.5, 4.9, -61], content: 'krallenAnzug' },
    { kind: 'question', pos: [1.5, 4.9, -61], content: 'coins:5' },
    { kind: 'question', pos: [60, 2.4, -84], content: 'funken' },
    { kind: 'question', pos: [-2, 6.4, -164], content: 'krallenAnzug' },
  ],
  enemies: [
    // Krabbelkäfer (8)
    bug(-6, 0, -4, { path: [[-7, 0, -4], [7, 0, -4]], color: 'yellow' }), bug(6, 0, -10, { path: [[7, 0, -10], [-6, 0, -10]], color: 'red' }),
    bug(-1, 4, -87.5, { path: [[-1, 4, -87.5], [4, 4, -87.5], [4, 4, -92], [-1, 4, -92]], count: 2, spacing: 2.2, color: 'green' }),
    bug(0, 4, -106, { path: [[0, 4, -104], [0, 4, -123]], count: 4, spacing: 1.6, speed: 2.2, color: 'blue' }),
    // Brummer (8)
    bee(-3.5, 2.6, -27.5, { center: [-3.5, 2.6, -31], radius: 2.4 }), bee(0, 2.8, -42, { path: [[-5, 2.8, -42], [5, 2.8, -42]] }),
    bee(-4, 3.6, -49, { center: [-1, 3.6, -48], radius: 3 }), bee(4, 3.2, -22, { center: [3.5, 3.2, -21], radius: 2 }),
    bee(5, 7, -145, { center: [3, 7, -145], radius: 3 }), bee(-4, 2.6, -8, { center: [-4.5, 2.6, -8.5], radius: 2.2 }),
    bee(5.5, 6.2, -161, { center: [5, 6.2, -164], radius: 2.6 }), bee(-3, 12.5, -186, { path: [[-3.5, 12.5, -185.5], [3.5, 12.5, -185.5]] }),
    // Flatterkäfer (6) – zwei Reihen quer über die Lücken
    flutter(-6, 4.9, -69, { path: [[-8, 4.9, -69], [8, 4.9, -69]], count: 3, spacing: 1.5 }),
    flutter(6, 6.4, -99, { path: [[6, 6.4, -99], [-6, 6.4, -99]], count: 3, spacing: 1.5, color: 'yellow' }),
    // Zauberkröte auf der Fähre
    { kind: 'zauberkroete', pos: [-9, 5, -137], spots: [[-9, 5, -137], [9, 5, -147], [-5.5, 4, -160.5]], sight: 18 },
  ],
  items: [
    // Warp-Box am Start → Zuschauerloge (Abkürzung, Münzen) → zurück aufs Schalter-Feld 2
    { kind: 'warpbox', id: 'box1', pos: [2, 0, -11.6], target: 'logeBox' },
    { kind: 'warpbox', id: 'logeBox', pos: [-20, 6, -26], target: [0, 0, -29.5] },
    // Rätselbox (bewacht von Krabbelkäfern) → Kistenraum; dieselbe Box dort führt zurück auf den Laufsteg
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [1.5, 4, -90], target: 'kistenBox' },
    { kind: 'warpbox', id: 'kistenBox', style: 'mystery', pos: [60, 0, -82], target: [0, 4, -97.5] },
    { kind: 'crate', id: 'sternkiste', pos: [53.2, 0, -92.8], content: 'star:1' },
    { kind: 'crate', pos: [54.4, 0, -92.8] }, { kind: 'crate', pos: [53.2, 0, -91.6] },
    { kind: 'crate', pos: [58, 0, -92.8], content: 'coins:3' }, { kind: 'crate', pos: [62, 0, -92.8] },
    { kind: 'crate', pos: [66.8, 0, -92.8], content: 'oneup' }, { kind: 'crate', pos: [65.6, 0, -92.8] }, { kind: 'crate', pos: [66.8, 0, -91.6], content: 'coins:5' },
    coinsLine([0, 0.2, 0], [0, 0.2, -10], 5),
    arc([-1, 0.4, -14], [1, 0.4, -25.5], 1.5, 6),
    { kind: 'coins', pos: [5.5, 6.7, -11], r: 0.9, n: 5 },
    coinsLine([7.5, 1.5, -11], [7.5, 5.5, -11], 3),
    arc([0, 0.4, -35.5], [-4, 0.4, -39], 1.4, 3), arc([4, 0.8, -40.5], [-2, 1.9, -50], 2, 5),
    arc([0, 1.9, -56.5], [0, 2.9, -58.5], 1.2, 3),
    arc([-2, 3, -67.5], [-4, 3.3, -70.5], 1.4, 3), arc([-1, 3.4, -75.5], [2, 3.8, -77.5], 1.6, 3), arc([2, 3.8, -82.5], [0, 4.3, -84], 1.4, 3),
    coinsLine([0, 4.3, -97], [0, 4.3, -123], 10),
    { kind: 'coins', pos: [0, 4.6, -142], r: 3, n: 10 },
    arc([2, 4.3, -168], [1, 10.3, -186], 4, 7),
    { kind: 'coins', pos: [-20, 6.3, -20], r: 2, n: 10 },
    coinsLine([57, 0.3, -84], [63, 0.3, -84], 4),
  ],
  checkpoint: [0, 2.5, -63],
  stars: [
    [5.5, 6.55, -11.6],                                      // 1: auf der breiten Wand neben der Warp-Box (Wandsprung)
    { pos: [53.2, 0.4, -92.8], hidden: true, id: 'stern2' }, // 2: Kistenraum, Kiste links in der Ecke (Funkenblüte)
    { pos: [0, 5, -142], hidden: true, id: 'stern3' },       // 3: erscheint in der Mitte der Wechselschalter-Fähre
  ],
  stamp: [-9.5, 12.05, -164],
  goal: { pos: [0, 10, -192], height: 8 },
  marks: {
    start: [0, 0, 5],
    shaft: [7.7, 0, -11],
    field2: [0, 0, -28],
    movers: [0, 0, -34.5],
    checkpoint: [0, 2.5, -63],
    flutter: [-4, 3, -71.5],
    puzzle: [-2, 4, -86],
    walkway: [0, 4, -96],
    ferry: [0, 4, -126],
    landing: [0, 4, -160],
    tower: [-9.5, 4, -159.6],
    goal: [0, 10, -187],
    loge: [-20, 6, -18],
    crates: [60, 0, -82.5],
  },
};
