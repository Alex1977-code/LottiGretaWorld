// 6-C „Glibber-Gala im Wolkenzirkus“ – Welt-6-Burg (Archetyp boss, Bauplan 6-C: Plattform ca. 30 m mit Spiegelfrucht,
// Seilbahn ca. 30 m, Zirkuszelt-Arena ca. 25 m; Boss Würfelblase). Nacht über den Wolkeninseln: Sternenhimmel, Mond,
// Lichterketten – der Wanderzirkus der Würfelblase gastiert auf schwebenden Bühnen.
//
//   1 Wolkenvorplatz   z  17 …  −4   Kassenhäuschen, Zirkuswagen, Plakat „Glibber-Gala“, Ballons, Trommel; Sprungtrommel
//                                    hinauf aufs Artistenpodest (Stempel); verborgener 1-up-Block über der Trommel
//   2 Spiegelbühne     z  −4 … −37   schwebende Bühne mit Zerrspiegeln (Spiegelkabinett), zwei ?-Blöcke mit Spiegelfrucht,
//                                    bunte Gelee-Brocken; Zwei-Figuren-Feld („0/2“) → Stern 1 auf der Trommel daneben
//   3 Prachttreppe     z −37 … −46   18 Stufen hinauf zur Talstation (4,5 m), Kontrollpunkt
//   4 Seilbahn         z −53 … −84   Gondel über die Wolkenschlucht zum Zeltplateau (8 m); unterwegs links die
//                                    Sternschaukel (Stern 2: aus der fahrenden Gondel abspringen), zurück über drei Wolken
//                                    (verborgener 1-up-Block über der mittleren)
//   5 Zeltplateau      z −84 … −92   Kontrollpunkt, Torbogen mit Vorhängen, Plakat, Ballons
//   6 Manege           Ø ≈ 25 m      Würfelblase (sammelt Gelee-Brocken zum silbernen Riesen, der springt; danach flieht sie –
//                                    jetzt auf den Hut springen; 3 Treffer) → Stern 3, Warp-Box → Hinterhof mit Zielmast
// Sterne: 1) Zwei-Figuren-Feld der Spiegelbühne (Spiegelfrucht), 2) Sternschaukel neben der Seilbahn, 3) Würfelblase.
// Stempel: Artistenpodest über dem Vorplatz (Sprungtrommel). Gegner: Gelee-Brocken (5), Würfelblase (Boss).

import { cutawayTent, circusArena, circusProps, grandStairs } from '../w3/_helpers_e.js';
import { line, ring, arc, sternenhimmel, zerrspiegel, galaPlakat, gondelRuf, feuerwerk, lichterketten, riesenrad } from './_helpers_d.js';

const Y0 = 0;                   // Vorplatz und Spiegelbühne
const SY = 4.5;                 // Talstation der Seilbahn
const AY = 8;                   // Zeltplateau
const AZ = -112, AR = 12.3;     // Manege (Mitte, Innenradius der Bande)
const TR = 19.5, TH = 18;       // Zelt (Optik)
const GX = 56, GZ = -106;       // Hinterhof mit Zielmast (nur per Warp-Box)
const G0 = [0, SY + 2.3, -54.6], G1 = [0, AY + 2.3, -83.0];   // Seilbahn (Seilpunkte)
// Sternschaukel: auf Höhe des Gondelbodens bei u ≈ 0,44
const SCH = { x: -4.6, z: -67, y: SY + 0.1 + (AY - SY) * ((67 - 54.6) / 28.4) };   // Bühne der Sternschaukel (Oberkante)
const FELD = { x: -2.6, z: -27 };          // Zwei-Figuren-Feld
const POD = { x: 8.6, z: 0.8, y: 5.9 };   // Artistenpodest (Stempel)

// Wolken unter den Bühnen (Nacht: lila angehaucht)
const PUFFS = [];
{
  const spots = [[-12, 14, 3.2], [12.5, 12, 3.6], [-13, 2, 3.0], [13, -2, 3.4], [-6.5, -12, 2.6], [6.6, -18, 2.8], [-6.4, -30, 3.0], [6.5, -34, 2.6],
    [-4, -48, 3.0], [4.2, -51, 2.6], [-7, -60, 3.4], [6, -66, 3.0], [-2, -72, 3.6], [8, -76, 3.2],
    [-30, -92, 4], [30, -96, 4.2], [-31, -120, 4], [31, -126, 3.8], [GX - 13, -96, 3.6], [GX + 13, -112, 3.6]];
  for (const [x, z, s] of spots) {
    const y = z > -40 ? Y0 - 2.2 : z > -84 ? 1.5 : AY - 2.8;
    PUFFS.push({ kind: 'cloudpuff', pos: [x, y, z], size: s });
  }
}

export const LEVEL = {
  id: '6-C',
  world: 6,
  title: 'Glibber-Gala im Wolkenzirkus',
  archetype: 'boss',
  theme: 'circus',
  music: 'course_bossblob',
  timeLimit: 400,
  starSlots: 3,                 // zwei Sterne im Level + der Stern der Würfelblase (star.index 2)
  killY: -14,
  start: { pos: [0, Y0, 13.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, SY, -48.6], yaw: Math.PI / 2 }, { pos: [1.4, AY, -89.0], yaw: Math.PI / 2 }],
  camera: [
    { from: 24, to: -36, pitch: 30, dist: 15, ahead: 4, area: [-32, 32] },
    { from: -36, to: -54, pitch: 34, dist: 14, ahead: 3, area: [-32, 32] },
    { from: -54, to: -86, pitch: 26, dist: 13.5, x: 0, xLock: 0.55, ahead: 3.5, area: [-32, 32] },
    { from: -86, to: -140, pitch: 46, dist: 19, x: 0, xLock: 0.35, ahead: 0.6, lead: 0.4, height: 1.6, area: [-32, 32] },
    { from: -86, to: -126, pitch: 21, dist: 13, ahead: 4, area: [38, 74] },
  ],
  boss: {
    id: 'blase', name: 'Würfelblase', speed: 0,
    trigger: { min: [-11, AY - 0.5, AZ - 11], max: [11, AY + 10, AZ + AR - 1.2] },
    lock: { min: [-2.7, AY, AZ + AR - 0.2], max: [2.7, AY + 9, AZ + AR + 1.1] },
    warp: 'warp_sieg', frame: 0.4, center: [0, AY, AZ], musicAfter: 'course_circus',
  },
  build(level) {
    sternenhimmel(level, { center: [0, 0, -50], r: 175, n: 560, moon: [-70, 95, -190], moonR: 10 });
    // Zelt und Manege (wie 3-B; aufgeschnitten, sobald die Figur hineingeht)
    const inside = (p) => p.pos.z < AZ + TR - 1 && Math.abs(p.pos.x) < TR + 2 && p.pos.y > AY - 2;
    const tent = cutawayTent(level, { center: [0, AY, AZ], radius: TR, height: TH, cut: 2.5, inside });
    const manege = circusArena(level, { center: [0, AY, AZ], arena: AR, door: 4.2, rows: 5, rowDepth: 1.0, rowRise: 0.6, span: [-0.45, Math.PI + 0.45] });
    level._zirkus = { tent, manege };
    grandStairs(level, { x: 0, z: -37, y: Y0, n: 18, rise: (SY - Y0) / 18, run: 0.5, width: 5 });
    circusProps(level, [
      { kind: 'kasse', pos: [-8.2, Y0, 10.5] },
      { kind: 'wagen', pos: [9.6, Y0, 11.6], yaw: 0.35, color: 0x2a6ae8, trim: 0xe8283a },
      { kind: 'wagen', pos: [-9.6, Y0, -0.4], yaw: -0.3, color: 0xffb020, trim: 0x7a2ad8 },
      { kind: 'wagen', pos: [-17, AY, -92], yaw: 0.4, color: 0x3ab84a, trim: 0xfff2e0 },
      { kind: 'wagen', pos: [17.5, AY, -94], yaw: -0.5, color: 0xe8283a, trim: 0xffc21a },
    ]);
    circusProps(level, [
      { kind: 'wagen', pos: [GX + 7, AY, GZ + 8], yaw: -0.5, color: 0x7a2ad8, trim: 0xffc21a },
      { kind: 'wagen', pos: [GX - 8, AY, GZ - 9], yaw: 0.6, color: 0x2a6ae8, trim: 0xffc21a },
    ], { shadow: false });
    galaPlakat(level, { pos: [5.4, Y0, 6.2], yaw: -0.35 });
    riesenrad(level, { pos: [GX + 3, AY, GZ - 22], r: 7.5, n: 10 });
    galaPlakat(level, { pos: [-6.2, AY, -90.4], yaw: 0.3 });
    // Spiegelkabinett: Zerrspiegel an beiden Rändern der Spiegelbühne
    zerrspiegel(level, [
      ...[-10, -16, -22, -34].map((z, i) => ({ pos: [-5.0, Y0, z], yaw: Math.PI / 2, tint: [0x9ad8ff, 0xffb0e0, 0xb0ffd0, 0xffe0a0][i], wave: i % 2 })),
      ...[-13, -19, -25, -31].map((z, i) => ({ pos: [5.0, Y0, z], yaw: -Math.PI / 2, tint: [0xffb0e0, 0x9ad8ff, 0xffe0a0, 0xb0ffd0][i], wave: (i + 1) % 2 })),
    ]);
    lichterketten(level, [
      { a: [-5.4, Y0 + 3.6, -5.2], b: [-5.4, Y0 + 3.6, -36], sag: 0.9, every: 0.9 },
      { a: [5.4, Y0 + 3.6, -5.2], b: [5.4, Y0 + 3.6, -36], sag: 0.9, every: 0.9 },
      { a: [-5.6, Y0 + 5.4, -5.0], b: [5.6, Y0 + 5.4, -5.0], sag: 1.0, kind: 'wimpel', every: 0.6 },
      { a: [-3.6, SY + 4.2, -46.4], b: [3.6, SY + 4.2, -46.4], sag: 0.8, kind: 'wimpel', every: 0.6 },
    ]);
  },
  setup(level) {
    gondelRuf(level, { id: 'gondel', station: { x0: -3.6, x1: 3.6, z0: -53.2, z1: -45.6, y: SY } });
    const ring0 = level._zirkus?.manege;
    if (ring0) {
      const prevHit = level.onBossHit, prevDef = level.onBossDefeated;
      level.onBossHit = (b, w) => { prevHit?.(b, w); ring0.cheer(1, 2.4); };
      level.onBossDefeated = (b) => { prevDef?.(b); ring0.cheer(1, 6); };
    }
    feuerwerk(level, { x: GX, z: GZ - 6, y: AY, near: (p) => p.pos.x > 38 });
  },
  segments: [
    { type: 'killplane', y: -14 },
    // ---------------------------------------------------------------- 1 Wolkenvorplatz (roter Teppich)
    { type: 'island', pos: [0, Y0 - 4, 6.5], size: [26, 4, 21], top: 'grass', under: 2.5 },
    { type: 'deco_w1b', items: [
      ...PUFFS,
      { kind: 'bulbs', from: [-9, 3.6, 16.2], to: [9, 3.4, 16.6], sag: 1.2, n: 26 },
      { kind: 'bulbs', from: [-11.6, 3.2, 4.4], to: [-11.6, 3.2, -3.4], sag: 0.8, n: 12 },
      { kind: 'balloons', pos: [-6.4, Y0, 14.6], n: 6, size: 2.6 },
      { kind: 'balloons', pos: [11.6, Y0, 4.2], n: 5, size: 2.2 },
      { kind: 'drum', pos: [-6.4, Y0, 4.2], size: [1.8, 0.9], color: 'blue' },
      { kind: 'ball', pos: [-4.6, Y0, 2.4], size: 0.7 },
      { kind: 'cannon', pos: [3.8, Y0, -1.6], yaw: 0.6 },
      { kind: 'pole', pos: [-5.6, Y0, -4.6], size: 5.8, r: 0.24 }, { kind: 'pole', pos: [5.6, Y0, -4.6], size: 5.8, r: 0.24 },
      // Artistenpodest (Stempel) auf einem Mast, Sprungtrommel daneben
      { kind: 'pole', pos: [POD.x, Y0, POD.z], size: POD.y - 0.4, r: 0.22 },
      { kind: 'stage', pos: [POD.x, POD.y - 0.5, POD.z], size: [2.2, 0.5, 2.2], round: true, color: 'yellow', star: true },
      { kind: 'trapeze', pos: [POD.x - 1.6, POD.y + 4.2, POD.z - 0.6], size: 3 },
      // ---------------------------------------------------------------- 2 Spiegelbühne (schwebt)
      { kind: 'stage', pos: [0, Y0 - 1.2, -20.5], size: [11, 1.2, 33], color: 'purple', star: true },
      { kind: 'drum', pos: [FELD.x, Y0, FELD.z - 4.2], size: [1.7, 0.9], color: 'red' },
      { kind: 'spotlight', pos: [-9, Y0 + 12, -24], target: [FELD.x, Y0, FELD.z - 2], r: 2.4, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [9, Y0 + 12, -10], target: [0, Y0, -9], r: 2.2, color: 0xffd0f0 },
      // ---------------------------------------------------------------- 3/4 Talstation, Seilbahn, Sternschaukel
      { kind: 'stage', pos: [0, SY - 1.2, -49.6], size: [7, 1.2, 7.2], color: 'blue', star: true },
      { kind: 'pole', pos: [-3.4, SY, -46.4], size: 4.4, r: 0.2 }, { kind: 'pole', pos: [3.4, SY, -46.4], size: 4.4, r: 0.2 },
      { kind: 'stage', pos: [SCH.x, SCH.y - 0.6, SCH.z], size: [3.0, 0.6, 3.0], round: true, color: 'pink', star: true },
      { kind: 'trapeze', pos: [SCH.x, SCH.y + 4.6, SCH.z], size: 3.6 },
      { kind: 'bulbs', from: [SCH.x - 1.2, SCH.y + 4.6, SCH.z], to: [SCH.x + 1.2, SCH.y + 4.6, SCH.z], sag: 0.3, n: 6 },
      // ---------------------------------------------------------------- 5 Zeltplateau: Torbogen
      { kind: 'pole', pos: [-3.3, AY, -92.2], size: 6, r: 0.25 }, { kind: 'pole', pos: [3.3, AY, -92.2], size: 6, r: 0.25 },
      { kind: 'bulbs', from: [-3.3, AY + 5.9, -92.2], to: [3.3, AY + 5.9, -92.2], sag: 0.9, n: 14 },
      { kind: 'curtain', pos: [-4.4, AY, -92.4], size: [2, 6] }, { kind: 'curtain', pos: [4.4, AY, -92.4], size: [2, 6] },
      { kind: 'balloons', pos: [-9, AY, -89.5], n: 6, size: 2.4 }, { kind: 'balloons', pos: [9.4, AY, -90], n: 5, size: 2.2 },
      { kind: 'drum', pos: [6.4, AY, -88.6], size: [1.6, 0.8], color: 'green' }, { kind: 'ball', pos: [-4.4, AY, -88.0], size: 0.6 },
      // im Zelt: Scheinwerfer, Wimpelketten, Lichterketten
      { kind: 'spotlight', pos: [-13, AY + 14, AZ - 6], target: [-4.5, AY, AZ + 2], r: 3.0, color: 0xfff2c8, strength: 0.045 },
      { kind: 'spotlight', pos: [13, AY + 14, AZ - 6], target: [4.5, AY, AZ + 2], r: 3.0, color: 0xffb0e8, strength: 0.045 },
      { kind: 'spotlight', pos: [0, AY + 15.5, AZ - 14], target: [0, AY, AZ - 4], r: 3.4, color: 0xa8d4ff, strength: 0.045 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [-17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [0, AY + 7.5, AZ - 18], sag: 1.6, n: 18 },
      { kind: 'bulbs', from: [-18, AY + 7.2, AZ + 2], to: [-10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      { kind: 'bulbs', from: [18, AY + 7.2, AZ + 2], to: [10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      // ---------------------------------------------------------------- 7 Hinterhof
      { kind: 'bulbs', from: [GX - 9, AY + 3.4, GZ - 8], to: [GX + 8, AY + 3.4, GZ + 8], sag: 1.4, n: 28 },
      { kind: 'balloons', pos: [GX - 5, AY, GZ - 14], n: 7, size: 3 },
      { kind: 'confetti', pos: [GX, AY + 0.05, GZ - 4], size: [14, 14], n: 60 },
    ] },
    { type: 'trampoline', id: 'sprungtrommel', pos: [10.6, Y0, 4.2], strength: 19 },
    { type: 'sign', pos: [-3.4, Y0, 11.2], text: 'Glibber-\nGala', size: [2.4, 1.1], yaw: 0.25 },
    { type: 'pennants', items: [
      { pos: [-12.4, Y0, 16.2], color: 0xe8322a, h: 6 }, { pos: [12.4, Y0, 16.2], color: 0xffcf2a, h: 6 },
      { pos: [-12.4, Y0, -3], color: 0x3a7ae8, h: 6 }, { pos: [12.4, Y0, -3], color: 0xe8322a, h: 6 },
      { pos: [-28, AY, -86], color: 0xffcf2a, h: 7 }, { pos: [28, AY, -86], color: 0x3a7ae8, h: 7 },
      { pos: [GX - 12, AY, GZ + 13], color: 0xe8322a, h: 6 }, { pos: [GX + 12, AY, GZ + 13], color: 0xffcf2a, h: 6 },
    ] },
    // ---------------------------------------------------------------- 2 Spiegelbühne: Zwei-Figuren-Feld → Stern 1
    { type: 'pfeld', id: 'feld2', pos: [FELD.x, Y0, FELD.z], size: [2.4, 2.4], need: 2, on: { reveal: 'stern1' } },
    { type: 'sign', pos: [-4.4, Y0, -24.4], text: 'Zu zweit\naufs Feld!', size: [2.2, 1.1], yaw: 0.6 },
    // ---------------------------------------------------------------- 4 Seilbahn und Wolken zurück
    { type: 'seilbahn', id: 'gondel', from: G0, to: G1, speed: 2.6, wait: 1.5, trigger: 'stand', mode: 'pingpong' },
    { type: 'wolkenplattform', id: 'wz1', pos: [-5.0, SCH.y + 0.3, -71.4], size: [2.6, 0.6, 2.6], sink: 0.15 },
    { type: 'wolkenplattform', id: 'wz2', pos: [-3.8, SCH.y + 0.9, -75.6], size: [2.6, 0.6, 2.6], sink: 0.15 },
    { type: 'wolkenplattform', id: 'wz3', pos: [-2.6, AY - 0.4, -80.4], size: [2.6, 0.6, 2.6], sink: 0.15 },
    { type: 'sign', pos: [-2.8, SY, -47.4], text: 'Zur Manege', size: [2.0, 0.8], yaw: 0.2 },
    // ---------------------------------------------------------------- 5/6 Zeltplateau, Manege
    { type: 'island', pos: [0, AY - 6, -112], size: [60, 6, 56], top: 'grass', under: 3 },
    // ---------------------------------------------------------------- 7 Hinterhof
    { type: 'island', pos: [GX, AY - 6, GZ], size: [26, 6, 30], top: 'grass', under: 3 },
  ],
  blocks: [
    { kind: 'question', pos: [2.4, Y0 + 3.0, 8.2], content: 'coins:5' },
    { kind: 'hidden', pos: [-6.4, Y0 + 0.9 + 3.3, 4.2], content: 'oneup' },
    { kind: 'question', pos: [0, Y0 + 2.4, -8.6], content: 'spiegel' },
    { kind: 'question', pos: [-0.2, Y0 + 2.4, -23.4], content: 'spiegel' },
    { kind: 'hidden', pos: [-3.8, SCH.y + 1.5 + 3.3, -75.6], content: 'oneup' },
  ],
  enemies: [
    { kind: 'gelee_brocken', id: 'gb1', pos: [2.6, Y0, -13], color: 'rot', behavior: 'hop', speed: 1.4 },
    { kind: 'gelee_brocken', id: 'gb2', pos: [-2.4, Y0, -17.4], color: 'blau', behavior: 'hop', speed: 1.4 },
    { kind: 'gelee_brocken', id: 'gb3', pos: [2.2, Y0, -21.6], color: 'gruen', behavior: 'hop', speed: 1.4 },
    { kind: 'gelee_brocken', id: 'gb4', pos: [2.8, Y0, -30.6], color: 'gelb', behavior: 'chase', sight: 5, speed: 1.2 },
    { kind: 'gelee_brocken', id: 'gb5', pos: [-1.4, AY, -92.6], color: 'rot', behavior: 'hop', speed: 1.4 },
    { kind: 'wuerfelblase', id: 'blase', pos: [0, AY, AZ - 3], arena: { center: [0, AY, AZ], r: AR - 0.9 }, star: { pos: [0, AY + 0.4, AZ + 6.5], index: 2 } },
  ],
  items: [
    ring([0, Y0 + 0.6, 2.6], 2.0, 8),
    line([0, Y0 + 0.8, -11.6], [0, Y0 + 0.8, -20], 5),
    ...arc([FELD.x + 2.4, Y0 + 0.6, FELD.z - 2], [FELD.x + 2.4, Y0 + 0.6, FELD.z - 8], 4, 1.6),
    line([0, Y0 + 1.6, -38.2], [0, SY + 1.0, -45.0], 6),
    // Münzspur entlang der Seilbahn (Kopfhöhe in der Gondel) und zur Sternschaukel hinüber
    line([0, SY + 1.1, -57], [0, AY + 1.0, -80.4], 8),
    ...arc([-1.6, SCH.y + 1.2, SCH.z + 0.4], [SCH.x + 0.8, SCH.y + 0.8, SCH.z], 4, 1.4),
    line([-5.0, SCH.y + 1.4, -71.4], [-2.6, AY + 0.8, -80.4], 4),
    ...arc([-3, AY + 0.6, -93.4], [3, AY + 0.6, -93.4], 5, 1.2),
    // nach dem Sieg: Warp-Box in der Manege → Hinterhof
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, AY, AZ], target: [GX - 4, AY + 0.3, GZ + 8], hidden: true },
    ring([GX, AY + 0.8, GZ - 2], 2.6, 10),
  ],
  stars: [
    { pos: [FELD.x, Y0 + 0.9 + 1.0, FELD.z - 4.2], id: 'stern1', hidden: true },
    { pos: [SCH.x, SCH.y + 0.7, SCH.z], id: 'stern2' },
    // Stern 3 bringt die Würfelblase selbst mit (star: { index: 2 }) – erscheint nach dem Sieg vor ihr
  ],
  stamp: { pos: [POD.x, POD.y + 0.5, POD.z] },
  goal: { pos: [GX, AY, GZ - 12], height: 8 },
  marks: {
    start: [0, Y0, 13.5], feld: [FELD.x, Y0, FELD.z], podest: [POD.x, POD.y, POD.z], trommel: [10.6, Y0, 4.2],
    station: [0, SY, -48.6], gondel: [G0[0], SY, G0[2]], schaukel: [SCH.x, SCH.y, SCH.z], plateau: [1.4, AY, -89.0],
    center: [0, AY, AZ], hof: [GX - 4, AY, GZ + 8], goal: [GX, AY, GZ - 12],
  },
  plan: { Y0, SY, AY, AZ, AR, GX, GZ, G0, G1, SCH, FELD, POD },
};
