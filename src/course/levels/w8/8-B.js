// 8-B „Heiße Manege für den rosa Schlangenkönig“ (parcours + boss, Archetyp boss; Bauplan 8-B: wie 3-B – Vorplatz mit
// ?-Block (Krallen-Anzug), Treppe und Seilbahn zur Arena ≈ 25 m; rosa Schlangenkönig, geschleuderte Lavabrocken hinterlassen
// Lavapfützen; 500 s). Thema circus (lokale Variante „Glut-Rummel“: der Zirkus steht am Rand des Lava-Infernos, dahinter der
// Rummelplatz und der Turm des Barons), Musik course_boss, 3 Sterne + Stempel.
//
//   1 Vorplatz        z  14 …  −8   Torbogen, Kasse, Zirkuswagen, Plakat „Schlangenkönig – heiß wie Lava!“, ?-Block mit
//                                   Krallen-Anzug; links der Kletterturm (Stern 1: nur mit Krallen hinauf), rechts das
//                                   Riesenrad (Stern 2 schwebt über dem höchsten Punkt – oben aus der Gondel springen)
//   2 Glutgasse       z  −8 … −32   Buden an einem Lavagraben (Holzbrücke, Lavablasen), aus dem Vulkan regnen Lavabrocken mit
//                                   Landemarken auf die Gasse und hinterlassen kurz Glutpfützen; links die Schiffschaukel
//                                   (Stempel: am höchsten Punkt auf den Ausguck springen), Funkenflämmchen
//   3 Prachttreppe    z −32 … −41   18 Stufen hinauf zur Talstation (4,5 m), Kontrollpunkt
//   4 Seilbahn        z −47 … −73   Gondel über die glühende Lavaschlucht zum Zeltplateau (8 m)
//   5 Zeltplateau     z −73 … −82   Kontrollpunkt, Torbogen mit Vorhängen
//   6 Manege          Ø ≈ 25 m      rosa-rotes Zelt (aufgeschnitten): rosa Schlangenkönig auf dem Sockel – schleudert
//                                   Lavabrocken (Landeanzeige; wo sie landen, bleibt eine heiße Lavapfütze), ruft Diener-Schlangen
//                                   mit Tellern: auf den Teller springen, von dort aufs Haupt (3 Treffer) → Stern 3, Röhre
//   7 Hinterhof       x 43 … 69     Röhren-Ausgang, Riesenrad-Kulisse, Karussell, Feuerwerk, Zielmast
// Sterne: 0 Kletterturm (Krallen-Anzug) · 1 über dem Riesenrad · 2 rosa Schlangenkönig. Stempel: Ausguck an der Schiffschaukel.
// Extraleben: verborgener Block über dem Kletterturm, verborgener Block über der Holzbrücke der Glutgasse.
// Gegner: Funkenflämmchen 2, Lavablasen 4, rosa Schlangenkönig.

import {
  rummelAbend, farbZelt, rummelPflaster, plakat, zuckerwatte, funken, kletterturm, schiffschaukel, glutRand, line, ring, arc, column,
} from './_helpers_d.js';
import { circusArena, circusProps, grandStairs, RisingPipe, spawnLocal } from '../w3/_helpers_e.js';
import { gondelRuf, lichterketten } from '../w6/_helpers_d.js';

const Y0 = 0;                   // Vorplatz und Glutgasse
const SY = 4.5;                 // Talstation
const AY = 8;                   // Zeltplateau
const AZ = -102, AR = 12.3;     // Manege (Mitte, Innenradius der Bande)
const TR = 19.5, TH = 18;       // Zelt (Optik)
const GX = 56, GZ = -98;        // Hinterhof mit Zielmast (nur per Röhre)
const G0 = [0, SY + 2.3, -46.5], G1 = [0, AY + 2.3, -73.1];   // Seilbahn (Seilpunkte)
const TURM = { x: -10.2, z: -1.4, h: 7.5 };                    // Kletterturm (Stern 1)
const RAD = { x: 11.2, z: -3.0, r: 6.4, y: 1.0 + 1.2 + 6.4 };  // Riesenrad: Achse; unterste Planke auf 1,0 m (Einstiegssteg)
const SCH = { x: -9.0, y: 6.6, z: -24.0, L: 5.2 };            // Schiffschaukel (Drehachse)
const GUCK = { x: -17.6, y: 7.0, z: -24.0 };                    // Ausguck (Stempel), Oberseite
const GRABEN = { z0: -19.6, z1: -16.4 };                        // Lavagraben quer über die Gasse

export const LEVEL = {
  id: '8-B',
  world: 8,
  title: 'Heiße Manege für den rosa Schlangenkönig',
  archetype: 'boss',
  theme: 'circus',
  music: 'course_boss',
  timeLimit: 500,
  starSlots: 3,
  killY: -12,
  start: { pos: [0, Y0, 11.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, SY, -41.8], yaw: Math.PI / 2 }, { pos: [1.4, AY, -77.6], yaw: Math.PI / 2 }],
  camera: [
    { from: 24, to: -30, pitch: 33, dist: 15, ahead: 4, area: [-32, 32] },
    { from: -30, to: -46, pitch: 34, dist: 14, ahead: 3, area: [-32, 32] },
    { from: -46, to: -74, pitch: 26, dist: 13.5, x: 0, xLock: 0.55, ahead: 3.5, area: [-32, 32] },
    { from: -74, to: -130, pitch: 46, dist: 19, x: 0, xLock: 0.35, ahead: 0.6, lead: 0.4, height: 1.6, area: [-32, 32] },
    { from: -74, to: -126, pitch: 24, dist: 13, ahead: 4, area: [38, 74] },
  ],
  boss: {
    id: 'koenig', name: 'Rosa Schlangenkönig', speed: 0,
    trigger: { min: [-11, AY - 0.5, AZ - 11], max: [11, AY + 9, AZ + AR - 1.2] },
    lock: { min: [-2.7, AY, AZ + AR - 0.2], max: [2.7, AY + 9, AZ + AR + 1.1] },
    warp: 'roehre_ziel', frame: 0.25, musicAfter: 'course_circus', center: [0, AY, AZ],
    warpBanner: 'Ab in die Röhre!',
  },
  prebuild(level) { rummelAbend(level, { lava: true, lavaY: -8 }); },
  build(level) {
    // ---------------------------------------------------------------- Zelt (rosa-rote Bahnen) und Manege
    const inside = (p) => p.pos.z < AZ + TR - 1 && Math.abs(p.pos.x) < TR + 2 && p.pos.y > AY - 2;
    const tent = farbZelt(level, { center: [0, AY, AZ], radius: TR, height: TH, cut: 2.5, inside, stripe: 0xff4aa0, trim: 0xffd04a });
    const manege = circusArena(level, { center: [0, AY, AZ], arena: AR, door: 4.2, rows: 5, rowDepth: 1.0, rowRise: 0.6, span: [-0.45, Math.PI + 0.45] });
    level._zirkus = { tent, manege };
    grandStairs(level, { x: 0, z: -32, y: Y0, n: 18, rise: (SY - Y0) / 18, run: 0.5, width: 5 });
    // ---------------------------------------------------------------- Vorplatz und Glutgasse
    rummelPflaster(level, {
      carpet: [{ x0: -1.3, x1: 1.3, z0: -15.6, z1: 14.6, y: Y0 + 0.01, color: 0xc8143a }, { x0: -1.3, x1: 1.3, z0: -31.8, z1: -20.4, y: Y0 + 0.01, color: 0xc8143a },
        { x0: -1.2, x1: 1.2, z0: -45.2, z1: -41.2, y: SY + 0.01, every: 2.6, color: 0xc8143a }],
      stars: [[0, Y0, 2.0, 1.0, 0xff7ac0], [TURM.x + 2.8, Y0, TURM.z + 2.6, 0.6, 0xffd04a], [GX, AY, GZ - 4, 1.2, 0xff7ac0]],
    });
    kletterturm(level, { pos: [TURM.x, Y0, TURM.z], size: [3, TURM.h, 3], seed: 21 });
    schiffschaukel(level, { id: 'schaukel', pos: [SCH.x, SCH.y, SCH.z], length: SCH.L, dir: [1, 0], amp: 70, grow: 11, decay: 6, color: 0xd8205a });
    zuckerwatte(level, [{ pos: [7.4, Y0, -26.6], yaw: 0.5 }, { pos: [-6.8, Y0, 8.6], yaw: -0.4, color: 0xffc0e8 }]);
    plakat(level, { pos: [5.0, Y0, 9.4], yaw: -0.3, kind: 'koenig' });
    plakat(level, { pos: [-6.2, AY, -80.2], yaw: 0.3, kind: 'koenig' });
    circusProps(level, [
      { kind: 'kasse', pos: [-8.6, Y0, 11.6] },
      { kind: 'wagen', pos: [10.8, Y0, 9.6], yaw: 0.35, color: 0xd8205a, trim: 0xffc21a },
      { kind: 'wagen', pos: [-17, AY, -80], yaw: 0.4, color: 0x7a2ad8, trim: 0xffc21a },
      { kind: 'wagen', pos: [17.5, AY, -82], yaw: -0.5, color: 0xe8283a, trim: 0xfff2e0 },
    ]);
    circusProps(level, [
      { kind: 'wagen', pos: [GX + 7, AY, GZ + 8], yaw: -0.5, color: 0xff4aa0, trim: 0xffc21a },
      { kind: 'wagen', pos: [GX - 8.5, AY, GZ - 8], yaw: 0.6, color: 0x2a6ae8, trim: 0xffc21a },
    ], { shadow: false });
    glutRand(level, [[-19, GRABEN.z0, 19, GRABEN.z1, Y0 - 0.02]]);
    // Ausguck der Schiffschaukel (Stempel): Holzturm mit Plattform
    lichterketten(level, [
      { a: [-3.6, SY + 4.2, -41.4], b: [3.6, SY + 4.2, -41.4], sag: 0.8, kind: 'wimpel', every: 0.6 },
      { a: [-18.6, Y0 + 4.6, -10.2], b: [-2.4, Y0 + 4.0, -10.2], sag: 0.8, every: 0.8 },
      { a: [2.4, Y0 + 4.0, -10.2], b: [18.6, Y0 + 4.6, -10.2], sag: 0.8, every: 0.8 },
      { a: [-18.6, Y0 + 4.6, -30.4], b: [-2.4, Y0 + 4.0, -30.4], sag: 0.8, kind: 'wimpel', every: 0.6 },
      { a: [2.4, Y0 + 4.0, -30.4], b: [18.6, Y0 + 4.6, -30.4], sag: 0.8, kind: 'wimpel', every: 0.6 },
    ]);
  },
  setup(level) {
    gondelRuf(level, { id: 'gondel', station: { x0: -6, x1: 6, z0: -45.4, z1: -41.0, y: SY } });
    // Lavabrocken-Regen nur, solange eine Figur in der Glutgasse ist (startet beim Betreten, hört dahinter auf)
    const regen = level.named.get('regen');
    if (regen) {
      level.onStep(() => {
        const p = level.player;
        if (!p || p.dead) return;
        const inGasse = p.pos.z < -8.5 && p.pos.z > -33 && p.pos.y < 6;
        if (inGasse && regen.state === 'aus') regen.start();
        else if (!inGasse && regen.state === 'an') regen.stop();
      });
    }
    const ring0 = level._zirkus?.manege;
    if (ring0) {
      const prevHit = level.onBossHit, prevDef = level.onBossDefeated;
      level.onBossHit = (b, w) => { prevHit?.(b, w); ring0.cheer(1, 2.4); };
      level.onBossDefeated = (b) => { prevDef?.(b); ring0.cheer(1, 6); };
    }
    spawnLocal(level, new RisingPipe(level, { id: 'roehre_ziel', pos: [0, AY, AZ - 8.6], hidden: true, height: 1.5, target: 'ziel_ausgang', color: 0xff5aa8 }));
    funken(level, { x: GX, z: GZ - 8, y: AY, near: (p) => p.pos.x > 38 });
  },
  segments: [
    { type: 'killplane', y: -12 },
    // ---------------------------------------------------------------- 1/2 Vorplatz und Glutgasse (Lavagraben quer)
    { type: 'island', pos: [0, Y0 - 4, -0.9], size: [38, 4, 31.0], top: 'rock', topColor: 0x8a5a6a, sideColor: 0x3a1e2a, under: 3 },
    { type: 'island', pos: [0, Y0 - 4, -26.0], size: [38, 4, 12.8], top: 'rock', topColor: 0x8a5a6a, sideColor: 0x3a1e2a, under: 3 },
    { type: 'lava', pos: [0, Y0 - 2.2, (GRABEN.z0 + GRABEN.z1) / 2], size: [38, 1, GRABEN.z1 - GRABEN.z0] },
    { type: 'bridge', from: [0, Y0, GRABEN.z1 + 0.6], to: [0, Y0, GRABEN.z0 - 0.6], width: 3 },
    // Einstiegssteg des Riesenrads, Ausguck der Schiffschaukel
    { type: 'island', pos: [RAD.x, Y0, RAD.z + 2.45], size: [4.2, 1.0, 1.9], top: 'rock', topColor: 0xffc21a, sideColor: 0x7a2ad8, under: 0 },
    { type: 'island', pos: [RAD.x - 2.9, Y0, RAD.z + 2.45], size: [1.6, 0.5, 1.6], top: 'rock', topColor: 0xffc21a, sideColor: 0x7a2ad8, under: 0 },
    { type: 'island', pos: [GUCK.x, Y0, GUCK.z], size: [2.4, GUCK.y, 2.4], top: 'rock', topColor: 0xffc21a, sideColor: 0x6a3a2a, under: 0 },
    // ---------------------------------------------------------------- 3 Talstation
    { type: 'island', pos: [0, Y0 - 4, -43.2], size: [12, SY + 4, 4.4], top: 'rock', topColor: 0x9a6a7a, sideColor: 0x3a1e2a, under: 3 },
    // ---------------------------------------------------------------- 4 Lavaschlucht unter der Seilbahn
    { type: 'lava', pos: [0, -7.0, -60], size: [60, 1, 28] },
    // ---------------------------------------------------------------- Riesenrad (Stern 2)
    { type: 'riesenrad', id: 'rad', pos: [RAD.x, RAD.y, RAD.z], radius: RAD.r, gondolas: 6, axis: 'z', speed: 0.16, angle: -Math.PI / 2 },
    // ---------------------------------------------------------------- Lavabrocken-Regen über der Glutgasse (Landemarken)
    { type: 'lavabrocken_regen', id: 'regen', targets: [[-1.2, Y0, -11.6], [1.4, Y0, -13.8], [-0.8, Y0, -22.6], [1.6, Y0, -25.4], [0.2, Y0, -28.6], [-1.6, Y0, -27.0], [1.2, Y0, -9.8], [-0.4, Y0, -24.2]],
      period: 1.5, flight: 1.7, warn: 1.25, radius: 1.0, size: 0.6, puddle: 1.6, seed: 4, from: [26, 34, -64], start: 'signal' },
    { type: 'deco_w8', items: [
      { kind: 'torbogen', pos: [0, Y0, 8.6], width: 6.2, height: 5.2, yaw: Math.PI / 2 },
      { kind: 'bude', pos: [-16.2, Y0, 3.6], color: 'rot', yaw: 0, solid: true, seed: 13 },
      { kind: 'bude', pos: [-13.0, Y0, -12.8], color: 'lila', yaw: 0, solid: true, seed: 15 },
      { kind: 'bude', pos: [5.6, Y0, -13.4], color: 'gelb', yaw: Math.PI, solid: true, seed: 17 },
      { kind: 'bude', pos: [13.6, Y0, -27.4], color: 'blau', yaw: Math.PI, solid: true, seed: 19 },
      { kind: 'bude', pos: [-4.8, Y0, -28.4], color: 'gruen', yaw: 0, solid: true, seed: 23 },
      { kind: 'mast', pos: [-2.4, Y0, -10.2], height: 4.2 }, { kind: 'mast', pos: [2.4, Y0, -10.2], height: 4.2 },
      { kind: 'mast', pos: [-18.6, Y0, -10.2], height: 4.6 }, { kind: 'mast', pos: [18.6, Y0, -10.2], height: 4.6 },
      { kind: 'mast', pos: [-2.4, Y0, -30.4], height: 4.2 }, { kind: 'mast', pos: [2.4, Y0, -30.4], height: 4.2 },
      { kind: 'mast', pos: [-18.6, Y0, -30.4], height: 4.6 }, { kind: 'mast', pos: [18.6, Y0, -30.4], height: 4.6 },
      { kind: 'ballons', pos: [-13.6, Y0, 10.6], n: 5, color: 'rot' }, { kind: 'ballons', pos: [17.4, Y0, 4.4], n: 4, color: 'lila' },
      { kind: 'gluehbirnen', from: [-15, Y0 + 4.6, 13.6], to: [15, Y0 + 4.6, 13.6], sag: 1.2 },
      // Zeltplateau und Hinterhof
      { kind: 'ballons', pos: [-9.6, AY, -77.4], n: 5, color: 'gelb' }, { kind: 'ballons', pos: [9.8, AY, -78.0], n: 4, color: 'blau' },
      { kind: 'riesenrad_kulisse', pos: [GX + 2, AY, GZ - 24], radius: 8.5, count: 10, shadow: false },
      { kind: 'karussell', pos: [GX - 8.4, AY, GZ - 4], radius: 3, speed: 0.6, solid: true },
      { kind: 'bude', pos: [GX + 9.4, AY, GZ - 6], color: 'rot', yaw: Math.PI, solid: true, seed: 27 },
      { kind: 'ballons', pos: [GX - 5, AY, GZ - 14], n: 6, color: 'lila' },
      { kind: 'gluehbirnen', from: [GX - 10, AY + 4.2, GZ + 10.5], to: [GX + 10, AY + 4.2, GZ + 10.5], sag: 1.0 },
    ] },
    { type: 'deco_w1b', items: [
      { kind: 'pole', pos: [-3.4, SY, -41.4], size: 4.4, r: 0.2 }, { kind: 'pole', pos: [3.4, SY, -41.4], size: 4.4, r: 0.2 },
      { kind: 'drum', pos: [-6.4, Y0, 4.0], size: [1.8, 0.9], color: 'pink' }, { kind: 'ball', pos: [-4.8, Y0, 2.4], size: 0.7 },
      // Zeltplateau: Torbogen mit Vorhängen
      { kind: 'pole', pos: [-3.3, AY, -81.2], size: 6, r: 0.25 }, { kind: 'pole', pos: [3.3, AY, -81.2], size: 6, r: 0.25 },
      { kind: 'bulbs', from: [-3.3, AY + 5.9, -81.2], to: [3.3, AY + 5.9, -81.2], sag: 0.9, n: 14 },
      { kind: 'curtain', pos: [-4.4, AY, -81.4], size: [2, 6], color: 0xd8205a }, { kind: 'curtain', pos: [4.4, AY, -81.4], size: [2, 6], color: 0xd8205a },
      { kind: 'drum', pos: [6.6, AY, -76.6], size: [1.6, 0.8], color: 'red' }, { kind: 'ball', pos: [-4.6, AY, -76.4], size: 0.6 },
      // im Zelt: Scheinwerfer, Wimpelketten, Lichterketten
      { kind: 'spotlight', pos: [-13, AY + 14, AZ - 6], target: [-3, AY, AZ + 2], r: 3.2, color: 0xfff2c8 },
      { kind: 'spotlight', pos: [13, AY + 14, AZ - 6], target: [3, AY, AZ + 2], r: 3.2, color: 0xffb0d8 },
      { kind: 'spotlight', pos: [0, AY + 15.5, AZ - 14], target: [0, AY, AZ - 1], r: 3.6, color: 0xffd0a0 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [-17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [17, AY + 7.5, AZ - 6], sag: 1.6, n: 18 },
      { kind: 'bunting', from: [0, AY + 16, AZ], to: [0, AY + 7.5, AZ - 18], sag: 1.6, n: 18 },
      { kind: 'bulbs', from: [-18, AY + 7.2, AZ + 2], to: [-10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      { kind: 'bulbs', from: [18, AY + 7.2, AZ + 2], to: [10, AY + 7.2, AZ - 15], sag: 1, n: 24 },
      { kind: 'confetti', pos: [GX, AY + 0.05, GZ - 4], size: [14, 14], n: 60 },
    ] },
    { type: 'sign', pos: [TURM.x + 3.0, Y0, TURM.z + 2.2], text: 'Nur mit\nKrallen!', size: [1.9, 1.0], yaw: 0.4 },
    { type: 'sign', pos: [RAD.x - 3.6, Y0, RAD.z + 4.6], text: 'Riesenrad', size: [1.9, 0.8], yaw: -0.4 },
    { type: 'sign', pos: [-3.2, Y0, -8.8], text: 'Achtung,\nLavabrocken!', size: [2.2, 1.1], yaw: 0.3 },
    { type: 'sign', pos: [-2.8, SY, -41.8], text: 'Zur Manege', size: [2.0, 0.8], yaw: 0.2 },
    { type: 'pennants', items: [
      { pos: [-18.4, Y0, 13.8], color: 0xff5ab0, h: 6 }, { pos: [18.4, Y0, 13.8], color: 0xffcf2a, h: 6 },
      { pos: [-28, AY, -75], color: 0xff5ab0, h: 7 }, { pos: [28, AY, -75], color: 0xffcf2a, h: 7 },
      { pos: [GX - 12, AY, GZ + 13], color: 0xe8322a, h: 6 }, { pos: [GX + 12, AY, GZ + 13], color: 0xff5ab0, h: 6 },
    ] },
    // ---------------------------------------------------------------- 4 Seilbahn
    { type: 'seilbahn', id: 'gondel', from: G0, to: G1, speed: 2.6, wait: 1.5, trigger: 'stand', mode: 'pingpong' },
    // ---------------------------------------------------------------- 5/6 Zeltplateau, Manege
    { type: 'island', pos: [0, AY - 6, AZ], size: [60, 6, 56], top: 'grass', under: 3 },
    // ---------------------------------------------------------------- 7 Hinterhof (Röhren-Ausgang)
    { type: 'island', pos: [GX, AY - 6, GZ], size: [26, 6, 30], top: 'grass', under: 3 },
    { type: 'pipe', id: 'ziel_ausgang', pos: [GX - 4, AY, GZ + 6], height: 1.2, color: 'green' },
  ],
  blocks: [
    { kind: 'question', pos: [2.8, Y0 + 2.5, 4.0], content: 'krallen' },
    { kind: 'question', pos: [-2.8, Y0 + 2.5, 4.0], content: 'coins:5' },
    { kind: 'hidden', pos: [TURM.x, Y0 + TURM.h + 0.2 + 3.3, TURM.z], content: 'oneup' },
    { kind: 'hidden', pos: [0, Y0 + 0.3 + 3.3, (GRABEN.z0 + GRABEN.z1) / 2], content: 'oneup' },
  ],
  enemies: [
    { kind: 'funkenflaemmchen', id: 'flamme1', pos: [-8.6, Y0, -14.6], path: [[-11.6, Y0, -14.6], [-6.4, Y0, -14.6]], hop: 0.8 },
    { kind: 'funkenflaemmchen', id: 'flamme2', pos: [8.6, Y0, -22.6], path: [[6.2, Y0, -22.6], [11.4, Y0, -22.6]], hop: 0.8, phase: 0.5 },
    { kind: 'lavablase', id: 'blase1', pos: [-4.2, Y0 - 1.2, -18.0], height: 4.2, period: 3.2, phase: 0 },
    { kind: 'lavablase', id: 'blase2', pos: [4.2, Y0 - 1.2, -18.0], height: 4.2, period: 3.2, phase: 0.5 },
    { kind: 'lavablase', id: 'blase3', pos: [-9.0, -6.0, -58.0], height: 6, period: 3.6, phase: 0.2 },
    { kind: 'lavablase', id: 'blase4', pos: [8.0, -6.0, -63.0], height: 6, period: 3.6, phase: 0.7 },
    { kind: 'schlangenkoenig', id: 'koenig', color: 'rosa', pos: [0, AY, AZ], arena: { center: [0, AY, AZ], r: AR - 1.1 }, plate: 2.8, star: { pos: [0, AY + 0.4, AZ + 6.5], index: 2 } },
  ],
  items: [
    { kind: 'coins', pos: [0, Y0 + 0.6, 1.0], r: 2.0, n: 8 },
    line([0, Y0 + 0.8, -4.0], [0, Y0 + 0.8, -14.6], 5),
    line([0, Y0 + 1.0, -21.0], [0, Y0 + 1.0, -29.6], 4),
    line([0, Y0 + 1.6, -32.8], [0, SY + 1.0, -40.4], 6),
    // Bitcoin-Säule am Kletterturm, Bogen zum Riesenrad-Steg, Bogen unter der Schiffschaukel
    column(TURM.x, Y0 + 1.6, Y0 + TURM.h - 0.8, TURM.z + 1.9, 6),
    ...arc([RAD.x - 4.8, Y0 + 0.6, RAD.z + 6.0], [RAD.x - 0.8, Y0 + 1.6, RAD.z + 2.4], 4, 1.2),
    ...arc([SCH.x + 3.6, Y0 + 0.8, SCH.z], [SCH.x - 3.6, Y0 + 0.8, SCH.z], 5, 1.0),
    ring([GUCK.x, GUCK.y + 0.8, GUCK.z], 0.9, 5),
    // Münzspur entlang der Seilbahn (in Kopfhöhe in der Gondel)
    line([0, SY + 1.1, -49.0], [0, AY + 1.0, -70.6], 8),
    ...arc([-3, AY + 0.6, -78.6], [3, AY + 0.6, -78.6], 5, 1.2),
    ring([GX, AY + 0.8, GZ - 2], 2.6, 10),
  ],
  stars: [
    { pos: [TURM.x, Y0 + TURM.h + 1.0, TURM.z] },
    { pos: [RAD.x, RAD.y + RAD.r - 1.2 + 2.9, RAD.z] },
    // Stern 3 bringt der rosa Schlangenkönig selbst mit (star: { index: 2 }) – erscheint nach dem Sieg vor dem Sockel
  ],
  stamp: { pos: [GUCK.x, GUCK.y + 0.6, GUCK.z] },
  goal: { pos: [GX, AY, GZ - 12], height: 8 },
  marks: {
    start: [0, Y0, 11.5], turm: [TURM.x, Y0, TURM.z], rad: [RAD.x, RAD.y, RAD.z], steg: [RAD.x, Y0 + 1.0, RAD.z + 2.45],
    schaukel: [SCH.x, SCH.y, SCH.z], guck: [GUCK.x, GUCK.y, GUCK.z], station: [0, SY, -41.8], gondel: [G0[0], SY, G0[2]],
    plateau: [1.4, AY, -77.6], center: [0, AY, AZ], pipe: [0, AY, AZ - 8.6], hof: [GX - 4, AY, GZ + 6], goal: [GX, AY, GZ - 12],
  },
  plan: { Y0, SY, AY, AZ, AR, GX, GZ, G0, G1, TURM, RAD, SCH, GUCK, GRABEN },
};
