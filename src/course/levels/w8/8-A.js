// 8-A „Goldglibber-Zugabe im Brummbär-Zirkus“ (parcours + boss, Archetyp boss; Bauplan 8-A: Anlauf ≈ 25 m + Seilbahn +
// Arena 25 × 25 m; goldene Würfelblase, Landungen erzeugen Schockwellen; 3 Kopftreffer; 400 s). Thema circus (lokale
// Abend-Variante: der Brummbär-Rummelplatz im Abendlicht, hinten der große Turm des Barons), Musik course_bossblob,
// 3 Sterne + Stempel.
//
//   1 Rummelplatz      z  15 … −15   Torbogen, Buden, Plakat „Goldglibber – die Zugabe!“, Karussell, Zuckerwatte-Stand,
//                                    goldene Gelee-Brocken; links „Hau den Lukas“ (Stern 1: nur die Stampfattacke schlägt
//                                    den Schlitten bis zur Glocke), rechts die Losbude mit dem Glücksrad-Block und die
//                                    goldene Zirkuskanone (schießt hinauf in die Ballonloge: Stempel)
//   2 Prachttreppe     z −15 … −24   18 Stufen hinauf zur Talstation (4,5 m), Kontrollpunkt
//   3 Talstation       z −24 … −31   Sternenring (Stern 2: acht Sternmünzen entlang der Seilbahn – in der fahrenden Gondel
//                                    hin und her laufen und nach den hohen springen), Ballonloge links darüber
//   4 Seilbahn         z −31 … −59   Gondel hoch über dem abendlichen Rummel zum Zeltplateau (8 m)
//   5 Zeltplateau      z −59 … −68   Kontrollpunkt, Torbogen mit Vorhängen, Zirkuswagen
//   6 Manege           Ø ≈ 25 m      goldenes Zelt (aufgeschnitten): goldene Würfelblase – sammelt Brocken zum goldenen Riesen,
//                                    jede Landung schickt zwei goldene Schockwellen über die Manege (drüberspringen), dann
//                                    flieht sie: auf den Hut springen (3 Treffer) → Stern 3, Warp-Box
//   7 Hinterhof        x 43 … 69     Riesenrad, Karussell, Feuerwerk, Zielmast
// Sterne: 0 Hau den Lukas (Stampfattacke) · 1 Sternenring entlang der Seilbahn · 2 goldene Würfelblase.
// Stempel: Ballonloge über der Talstation (nur mit der goldenen Zirkuskanone).
// Extraleben: verborgener Block über der Zuckerwatte-Wolke an der Ballonloge, Glücksrad-Block der Losbude (1-Up im Wechsel).
// Gegner: goldene Gelee-Brocken 4, goldene Würfelblase.

import {
  rummelAbend, farbZelt, hauDenLukas, rummelPflaster, plakat, zuckerwatte, funken, rummelUnten, buehnenSchuerze, manege, bake, discG, line, ring, arc,
} from './_helpers_d.js';
import { circusArena, circusProps, grandStairs } from '../w3/_helpers_e.js';
import { gondelRuf, lichterketten } from '../w6/_helpers_d.js';

const Y0 = 0;                   // Rummelplatz
const SY = 4.5;                 // Talstation
const AY = 8;                   // Zeltplateau
const AZ = -88, AR = 12.3;      // Manege (Mitte, Innenradius der Bande)
const TR = 19.5, TH = 18;       // Zelt (Optik)
const GX = 56, GZ = -82;        // Hinterhof mit Zielmast (nur per Warp-Box)
const G0 = [0, SY + 2.3, -31.7], G1 = [0, AY + 2.3, -59.1];   // Seilbahn (Seilpunkte)
const LUKAS = { x: -6.6, z: 1.6 };                             // Schlagplatte Hau den Lukas
const KANONE = { x: 10.4, z: -9.6 };                           // goldene Zirkuskanone
const LOGE = { x: -8.6, y: 10.2, z: -20.6 };                   // Ballonloge (Stempel), Oberseite
const RING = { x: 3.6, z: -27.2 };                             // Sternenring an der Talstation
const LOS = { x: 8.6, z: 3.0 };                                // Losbude (Glücksrad-Block davor)

// Sternmünzen entlang der Seilbahn: Gondelboden bei u (Seil − 2,2 m) + Höhe h, seitlich dx (in der Gondel ±0,75)
const seilU = (u) => [G0[0] + (G1[0] - G0[0]) * u, G0[1] + (G1[1] - G0[1]) * u - 2.2, G0[2] + (G1[2] - G0[2]) * u];
const STERNMUENZEN = [[0.14, -0.7, 1.0], [0.26, 0.7, 2.5], [0.38, -0.7, 2.5], [0.5, 0.7, 1.0], [0.6, -0.7, 2.5], [0.7, 0.7, 2.5], [0.8, -0.7, 1.0], [0.9, 0.7, 2.5]]
  .map(([u, dx, h]) => { const p = seilU(u); return [+(p[0] + dx).toFixed(2), +(p[1] + h).toFixed(2), +p[2].toFixed(2)]; });

export const LEVEL = {
  id: '8-A',
  world: 8,
  title: 'Goldglibber-Zugabe im Brummbär-Zirkus',
  archetype: 'boss',
  theme: 'circus',
  music: 'course_bossblob',
  timeLimit: 400,
  starSlots: 3,
  killY: -14,
  start: { pos: [0, Y0, 11.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, SY, -26.0], yaw: Math.PI / 2 }, { pos: [1.4, AY, -63.4], yaw: Math.PI / 2 }],
  camera: [
    { from: 24, to: -15, pitch: 33, dist: 15, ahead: 4, area: [-32, 32] },
    { from: -15, to: -31, pitch: 34, dist: 14, ahead: 3, area: [-32, 32] },
    { from: -31, to: -60, pitch: 26, dist: 13.5, x: 0, xLock: 0.55, ahead: 3.5, area: [-32, 32] },
    { from: -60, to: -116, pitch: 46, dist: 19, x: 0, xLock: 0.35, ahead: 0.6, lead: 0.4, height: 1.6, area: [-32, 32] },
    { from: -60, to: -110, pitch: 24, dist: 13, ahead: 4, area: [38, 74] },
  ],
  boss: {
    id: 'blase', name: 'Goldene Würfelblase', speed: 0,
    trigger: { min: [-11, AY - 0.5, AZ - 11], max: [11, AY + 10, AZ + AR - 1.2] },
    lock: { min: [-2.7, AY, AZ + AR - 0.2], max: [2.7, AY + 9, AZ + AR + 1.1] },
    warp: 'warp_sieg', frame: 0.4, center: [0, AY, AZ], musicAfter: 'course_circus',
  },
  prebuild(level) { rummelAbend(level, { floor: -8 }); },
  build(level) {
    // ---------------------------------------------------------------- Zelt (gold-lila Bahnen) und Manege
    const inside = (p) => p.pos.z < AZ + TR - 1 && Math.abs(p.pos.x) < TR + 2 && p.pos.y > AY - 2;
    const tent = farbZelt(level, { center: [0, AY, AZ], radius: TR, height: TH, cut: 2.5, inside, stripe: 0xf2b01a, cream: 0x6a2a9a, trim: 0xff5aa8 });
    const arena = manege(level, circusArena, { center: [0, AY, AZ], arena: AR, door: 4.2, rows: 5, rowDepth: 1.0, rowRise: 0.6, span: [-0.45, Math.PI + 0.45], near: (p) => p.pos.z < AZ + TR + 16 && p.pos.x < 36 });
    level._zirkus = { tent, manege: arena };
    bake(level, [discG(0, TR, 0, AY + 0.012, AZ, 0x3a1430, 64)], { castShadow: false });
    grandStairs(level, { x: 0, z: -15, y: Y0, n: 18, rise: (SY - Y0) / 18, run: 0.5, width: 5 });
    // ---------------------------------------------------------------- Rummelplatz
    rummelPflaster(level, {
      carpet: [{ x0: -1.3, x1: 1.3, z0: -14.8, z1: 14.6, y: Y0 + 0.01 }, { x0: -1.2, x1: 1.2, z0: -30.4, z1: -24.2, y: SY + 0.01, every: 2.6 },
        { x0: -1.4, x1: 1.4, z0: AZ + TR - 0.5, z1: -60.4, y: AY + 0.01, every: 2.6 }, { x0: GX - 5.4, x1: GX - 2.6, z0: GZ - 8, z1: GZ + 12, y: AY + 0.01 }],
      stars: [[0, Y0, 3.0, 1.0, 0xffd04a], [LUKAS.x + 2.2, Y0, LUKAS.z + 2.6, 0.55, 0xff7ac0], [GX, AY, GZ - 4, 1.2, 0xffd04a], [8.6, AY, -63.4, 0.7, 0xff7ac0], [-9.2, Y0, 8.4, 0.6, 0x9ad8ff]],
    });
    // kahle Inselkanten werden zu Zirkusbühnen (Streifen, Goldleiste, Glühbirnen)
    buehnenSchuerze(level, [
      { x0: -30, x1: 30, z: AZ + 28, y: AY, h: 3.4, face: 1, colors: [0x7a2ad8, 0xffc21a] },
      { x0: -6, x1: 6, z: -30.6, y: SY, h: 2.6, face: -1, colors: [0xd8205a, 0xfff2e8] },
      { x0: -24.2, x1: 14.8, z: -14, y: Y0, h: 2.6, face: -1, axis: 'z', colors: [0xd8205a, 0xfff2e8] },
      { x0: -24.2, x1: 14.8, z: 14, y: Y0, h: 2.6, face: 1, axis: 'z', colors: [0xd8205a, 0xfff2e8] },
    ]);
    // tief unter der Seilbahn: der abendliche Rummel des Barons (nur Zier)
    rummelUnten(level, {
      y: -12,
      items: [
        { kind: 'zelt', pos: [-15, -40], r: 5, h: 7, color: 0x7a2ad8 }, { kind: 'zelt', pos: [16, -50], r: 4.4, h: 6, color: 0xe8423a },
        { kind: 'zelt', pos: [-22, -60], r: 4, h: 5.6, color: 0x3a7ae8 },
        { kind: 'zelt', pos: [-5.5, -51], r: 3.4, h: 5, color: 0xffc21a }, { kind: 'zelt', pos: [9, -34], r: 3.2, h: 4.6, color: 0x4ac85a },
        { kind: 'bude', pos: [7, -44], yaw: Math.PI / 2, color: 'gelb', seed: 3 }, { kind: 'bude', pos: [-9, -32], yaw: -Math.PI / 2, color: 'blau', seed: 5 },
        { kind: 'bude', pos: [3.5, -58], yaw: Math.PI / 2, color: 'gruen', seed: 7 }, { kind: 'bude', pos: [-12, -54], yaw: 0, color: 'rot', seed: 9 },
        ...[[-2, -38], [2, -38], [-2, -46], [2, -46], [-2, -54], [2, -54], [-12, -46], [12, -42], [12, -56]].map(([x, z]) => ({ kind: 'laterne', pos: [x, z] })),
      ],
      paths: [[-1.8, -30, 1.8, -64], [-20, -45.6, 20, -48.4]],
    });
    hauDenLukas(level, { id: 'lukas', pos: [LUKAS.x, Y0, LUKAS.z], height: 7, back: [0, -1], onRing: { reveal: 'stern1' } });
    zuckerwatte(level, [{ pos: [-11.4, Y0, -1.4], yaw: 0.5 }, { pos: [-9.6, Y0, -17.4], yaw: -0.3, color: 0x9ad8ff }]);
    plakat(level, { pos: [4.6, Y0, 9.6], yaw: -0.3, kind: 'blase' });
    plakat(level, { pos: [-6.2, AY, -66.2], yaw: 0.3, kind: 'blase' });
    circusProps(level, [
      { kind: 'kasse', pos: [-8.4, Y0, 11.0] },
      { kind: 'wagen', pos: [-17, AY, -66], yaw: 0.4, color: 0x7a2ad8, trim: 0xffc21a },
      { kind: 'wagen', pos: [17.5, AY, -68], yaw: -0.5, color: 0xe8283a, trim: 0xffc21a },
    ]);
    circusProps(level, [
      { kind: 'wagen', pos: [GX + 7, AY, GZ + 8], yaw: -0.5, color: 0xffb020, trim: 0x7a2ad8 },
      { kind: 'wagen', pos: [GX - 8.5, AY, GZ - 8], yaw: 0.6, color: 0x2a6ae8, trim: 0xffc21a },
    ], { shadow: false });
    lichterketten(level, [
      { a: [-3.6, SY + 4.2, -24.4], b: [3.6, SY + 4.2, -24.4], sag: 0.8, kind: 'wimpel', every: 0.6 },
      { a: [-12.6, Y0 + 4.4, -13.6], b: [-3.9, Y0 + 3.9, -13.6], sag: 0.7, every: 0.8 },
      { a: [3.9, Y0 + 3.9, -13.6], b: [12.6, Y0 + 4.4, -13.6], sag: 0.7, every: 0.8 },
    ]);
  },
  setup(level) {
    gondelRuf(level, { id: 'gondel', station: { x0: -6, x1: 6, z0: -30.6, z1: -24.2, y: SY } });
    const ring0 = level._zirkus?.manege;
    if (ring0) {
      const prevHit = level.onBossHit, prevDef = level.onBossDefeated;
      level.onBossHit = (b, w) => { prevHit?.(b, w); ring0.cheer(1, 2.4); };
      level.onBossDefeated = (b) => { prevDef?.(b); ring0.cheer(1, 6); };
    }
    funken(level, { x: GX, z: GZ - 8, y: AY, near: (p) => p.pos.x > 38 });
  },
  segments: [
    { type: 'killplane', y: -14 },
    // ---------------------------------------------------------------- 1 Rummelplatz (mit Treppen-Fuß)
    { type: 'island', pos: [0, Y0 - 4, -4.5], size: [28, 4, 39], top: 'rock', topColor: 0x8a6aa0, sideColor: 0x4a2e5e, under: 3 },
    // ---------------------------------------------------------------- 3 Talstation
    { type: 'island', pos: [0, Y0 - 4, -27.4], size: [12, SY + 4, 6.4], top: 'rock', topColor: 0x9a7ab8, sideColor: 0x4a2e5e, under: 3 },
    { type: 'deco_w8', items: [
      // Eingang: Torbogen, Buden, Masten, Ballons, Karussell
      { kind: 'torbogen', pos: [0, Y0, 7.4], width: 6.2, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'bude', pos: [-11.2, Y0, 6.0], color: 'rot', yaw: 0, solid: true, seed: 3 },
      { kind: 'bude', pos: [11.4, Y0, 9.8], color: 'blau', yaw: Math.PI, solid: true, seed: 5 },
      { kind: 'bude', pos: [LOS.x + 2.4, Y0, LOS.z], color: 'gelb', yaw: Math.PI, solid: true, seed: 7 },
      { kind: 'bude', pos: [11.6, Y0, -17.6], color: 'gruen', yaw: Math.PI, solid: true, seed: 9 },
      { kind: 'karussell', pos: [-8.6, Y0, -8.8], radius: 3.2, speed: 0.5, solid: true },
      { kind: 'mast', pos: [-3.9, Y0, -13.6], height: 4.2 }, { kind: 'mast', pos: [3.9, Y0, -13.6], height: 4.2 },
      { kind: 'mast', pos: [-12.8, Y0, -13.6], height: 4.6 }, { kind: 'mast', pos: [12.8, Y0, -13.6], height: 4.6 },
      { kind: 'ballons', pos: [-10.6, Y0, 11.4], n: 5, color: 'rot' },
      { kind: 'ballons', pos: [12.6, Y0, -3.4], n: 4, color: 'gelb' },
      { kind: 'ballons', pos: [LOGE.x, LOGE.y, LOGE.z], n: 6, color: 'lila', height: 3.4 },
      { kind: 'gluehbirnen', from: [-12, Y0 + 4.6, 13.8], to: [12, Y0 + 4.6, 13.8], sag: 1.2 },
      { kind: 'wimpel', from: [-12.8, Y0 + 4.2, -1.0], to: [12.8, Y0 + 4.2, -1.0], sag: 1.0 },
      // Zeltplateau und Hinterhof
      { kind: 'ballons', pos: [-9.6, AY, -63.6], n: 5, color: 'gelb' }, { kind: 'ballons', pos: [9.8, AY, -64.2], n: 4, color: 'blau' },
      { kind: 'riesenrad_kulisse', pos: [GX + 2, AY, GZ - 24], radius: 8.5, count: 10, shadow: false },
      { kind: 'karussell', pos: [GX - 8.4, AY, GZ - 4], radius: 3, speed: 0.6, solid: true },
      { kind: 'bude', pos: [GX + 9.4, AY, GZ - 6], color: 'lila', yaw: Math.PI, solid: true, seed: 11 },
      { kind: 'ballons', pos: [GX - 5, AY, GZ - 14], n: 6, color: 'rot' },
      { kind: 'gluehbirnen', from: [GX - 10, AY + 4.2, GZ + 10.5], to: [GX + 10, AY + 4.2, GZ + 10.5], sag: 1.0 },
    ] },
    { type: 'deco_w1b', items: [
      // Talstation: Masten, Wimpel; Ballonloge (Stempel) schwebt links darüber
      { kind: 'pole', pos: [-3.4, SY, -24.6], size: 4.4, r: 0.2 }, { kind: 'pole', pos: [3.4, SY, -24.6], size: 4.4, r: 0.2 },
      { kind: 'stage', pos: [LOGE.x, LOGE.y - 0.6, LOGE.z], size: [3.6, 0.6, 3.6], round: true, color: 'purple', star: true },
      // Zeltplateau: Torbogen mit Vorhängen
      { kind: 'pole', pos: [-3.3, AY, -67.2], size: 6, r: 0.25 }, { kind: 'pole', pos: [3.3, AY, -67.2], size: 6, r: 0.25 },
      { kind: 'bulbs', from: [-3.3, AY + 5.9, -67.2], to: [3.3, AY + 5.9, -67.2], sag: 0.9, n: 14 },
      { kind: 'curtain', pos: [-4.4, AY, -67.4], size: [2, 6], color: 0x7a2ad8 }, { kind: 'curtain', pos: [4.4, AY, -67.4], size: [2, 6], color: 0x7a2ad8 },
      { kind: 'drum', pos: [6.6, AY, -62.6], size: [1.6, 0.8], color: 'yellow' }, { kind: 'ball', pos: [-4.6, AY, -62.4], size: 0.6 },
      // im Zelt: Scheinwerfer, Wimpelketten, Lichterketten
      { kind: 'spotlight', pos: [-13, AY + 14, AZ - 6], target: [-4.5, AY, AZ + 2], r: 3.0, color: 0xfff2c8, strength: 0.045 },
      { kind: 'spotlight', pos: [13, AY + 14, AZ - 6], target: [4.5, AY, AZ + 2], r: 3.0, color: 0xffe08a, strength: 0.045 },
      { kind: 'spotlight', pos: [0, AY + 15.5, AZ - 14], target: [0, AY, AZ - 4], r: 3.4, color: 0xffd0f0, strength: 0.045 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [-17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [0, AY + 7.5, AZ - 18], sag: 1.6, n: 18 },
      { kind: 'bulbs', from: [-18, AY + 7.2, AZ + 2], to: [-10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      { kind: 'bulbs', from: [18, AY + 7.2, AZ + 2], to: [10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      // Hinterhof
      { kind: 'confetti', pos: [GX, AY + 0.05, GZ - 4], size: [14, 14], n: 60 },
    ] },
    { type: 'sign', pos: [LUKAS.x - 2.0, Y0, LUKAS.z + 1.2], text: 'Hau den\nLukas!', size: [1.9, 1.0], yaw: 0.5 },
    { type: 'sign', pos: [KANONE.x - 2.4, Y0, KANONE.z + 2.6], text: 'Zur\nBallonloge', size: [1.9, 1.0], yaw: -0.4 },
    { type: 'sign', pos: [-2.8, SY, -25.2], text: 'Zur Manege', size: [2.0, 0.8], yaw: 0.2 },
    { type: 'pennants', items: [
      { pos: [-13.2, Y0, 14.2], color: 0xffcf2a, h: 6 }, { pos: [13.2, Y0, 14.2], color: 0x9a5ae8, h: 6 },
      { pos: [-28, AY, -61], color: 0xffcf2a, h: 7 }, { pos: [28, AY, -61], color: 0xff5ab0, h: 7 },
      { pos: [GX - 12, AY, GZ + 13], color: 0xe8322a, h: 6 }, { pos: [GX + 12, AY, GZ + 13], color: 0xffcf2a, h: 6 },
    ] },
    // ---------------------------------------------------------------- goldene Zirkuskanone → Ballonloge (Stempel)
    { type: 'roehrenkanone', id: 'kanone', pos: [KANONE.x, Y0, KANONE.z], to: [LOGE.x, LOGE.y, LOGE.z], color: 'gold', arc: 7 },
    { type: 'wolkenplattform', id: 'watte1', pos: [-6.0, 7.4, -24.6], size: [2.6, 0.6, 2.6], color: 'rosa', sink: 0.15 },
    // ---------------------------------------------------------------- 4 Seilbahn
    { type: 'seilbahn', id: 'gondel', from: G0, to: G1, speed: 2.6, wait: 1.5, trigger: 'stand', mode: 'pingpong' },
    // ---------------------------------------------------------------- 5/6 Zeltplateau, Manege
    { type: 'island', pos: [0, AY - 6, AZ], size: [60, 6, 56], top: 'rock', topColor: 0x8a6aa0, sideColor: 0x4a2e5e, under: 3 },
    // ---------------------------------------------------------------- 7 Hinterhof
    { type: 'island', pos: [GX, AY - 6, GZ], size: [26, 6, 30], top: 'rock', topColor: 0x8a6aa0, sideColor: 0x4a2e5e, under: 3 },
  ],
  blocks: [
    { kind: 'question', pos: [-2.4, Y0 + 3.0, 4.6], content: 'coins:5' },
    { kind: 'rouletteblock', id: 'gluecksrad', pos: [LOS.x - 2.4, Y0 + 2.6, LOS.z], contents: ['coins:5', 'oneup', 'wachstumsbeere', 'coins:5', 'krallen'], period: 0.45 },
    { kind: 'hidden', pos: [-6.0, 7.4 + 0.6 + 3.3, -24.6], content: 'oneup' },
  ],
  enemies: [
    { kind: 'gelee_brocken', id: 'gb1', pos: [2.6, Y0, 0.4], color: 'gold', behavior: 'hop', speed: 1.4 },
    { kind: 'gelee_brocken', id: 'gb2', pos: [-2.6, Y0, -4.6], color: 'gold', behavior: 'hop', speed: 1.4 },
    { kind: 'gelee_brocken', id: 'gb3', pos: [3.0, Y0, -9.6], color: 'gold', behavior: 'chase', sight: 5, speed: 1.2 },
    { kind: 'gelee_brocken', id: 'gb4', pos: [-1.6, AY, -64.6], color: 'gold', behavior: 'hop', speed: 1.4 },
    { kind: 'wuerfelblase', id: 'blase', color: 'gold', waves: 2, waveGap: 0.45, pos: [0, AY, AZ - 3], arena: { center: [0, AY, AZ], r: AR - 0.9 }, star: { pos: [0, AY + 0.4, AZ + 6.5], index: 2 } },
  ],
  items: [
    { kind: 'starring', id: 'sternenring', pos: [RING.x, SY, RING.z], yaw: Math.PI / 2, star: 1, time: 16, coins: STERNMUENZEN },
    ring([0, Y0 + 0.6, 3.0], 2.2, 8),
    line([0, Y0 + 0.8, -2.4], [0, Y0 + 0.8, -10.6], 5),
    ...arc([LUKAS.x + 1.6, Y0 + 0.6, LUKAS.z + 4.6], [LUKAS.x + 1.6, Y0 + 0.6, LUKAS.z + 0.2], 4, 1.4),
    line([0, Y0 + 1.6, -15.8], [0, SY + 1.0, -23.4], 6),
    // Bitcoin-Bogen entlang des Kanonenflugs (im Flug eingesammelt) und auf der Ballonloge
    ...arc([KANONE.x - 2.2, Y0 + 7, KANONE.z - 1.6], [LOGE.x + 2.6, LOGE.y + 1.2, LOGE.z + 0.6], 6, 4.6),
    ring([LOGE.x, LOGE.y + 0.8, LOGE.z], 1.2, 6),
    ...arc([-3, AY + 0.6, -64.6], [3, AY + 0.6, -64.6], 5, 1.2),
    // nach dem Sieg: Warp-Box in der Manege → Hinterhof
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, AY, AZ], target: [GX - 4, AY + 0.3, GZ + 8], hidden: true },
    ring([GX, AY + 0.8, GZ - 2], 2.6, 10),
  ],
  stars: [
    { pos: [LUKAS.x + 2.4, Y0 + 0.9, LUKAS.z + 2.6], id: 'stern1', hidden: true },
    { pos: [2.6, AY + 0.9, -62.6], id: 'stern2', hidden: true },
    // Stern 3 bringt die goldene Würfelblase selbst mit (star: { index: 2 }) – erscheint nach dem Sieg vor ihr
  ],
  stamp: { pos: [LOGE.x, LOGE.y + 0.5, LOGE.z - 0.4] },
  goal: { pos: [GX, AY, GZ - 12], height: 8 },
  marks: {
    start: [0, Y0, 11.5], lukas: [LUKAS.x, Y0 + 0.35, LUKAS.z], kanone: [KANONE.x, Y0, KANONE.z], loge: [LOGE.x, LOGE.y, LOGE.z],
    ring: [RING.x, SY, RING.z], station: [0, SY, -26.0], gondel: [G0[0], SY, G0[2]], plateau: [1.4, AY, -63.4],
    center: [0, AY, AZ], hof: [GX - 4, AY, GZ + 8], goal: [GX, AY, GZ - 12], los: [LOS.x - 2.4, Y0, LOS.z],
  },
  plan: { Y0, SY, AY, AZ, AR, GX, GZ, G0, G1, LUKAS, KANONE, LOGE, RING, LOS, STERNMUENZEN },
};
