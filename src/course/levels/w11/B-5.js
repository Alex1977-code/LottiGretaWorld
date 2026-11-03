// B-5 „Hasenhatz im Morgenrot“ – Remix von 5-4 „Kanonenflug über die Goldsavanne“ (Bauplan Welt Blume, Detail B-5: Morgen,
// 500 s, gleich nach B-1 verfügbar; viele Hasen und ein Riesenhase am Start, gefangen geben sie Items; Wolkenlifte und
// bewegte Wolken zum Ziel; Sterne: Riesenhase fangen, Glasröhre neben einer Wolkenplattform nach der Treppe,
// Figurenschalter für die Pilzkopf-Figur nahe dem Ende). Basis als Daten (remixOf, levels/w5/5-4.js bleibt unverändert).
// Musik der Basis (course_savanna) mit Klang-Variante 'morgen', Thema savanna@morgen (Morgenrot, weiches Licht), kein Stempel.
//
// Ablauf (≈ 310 m nach −Z): **Morgenwiese** (neu, 30 × 28 m hinter der Startsäule, y 10) mit dem Riesenhasen und drei
//   kleinen Hasen → Startsäule mit Röhrenkanone → Kletterberg (Terrassen wie eine Treppe 7 → 10,5 → 14,5 → 19 m; ein Hase
//   auf dem Landeplatz) → Gipfel: rechts eine **Wolkenplattform**, daneben eine Glasröhre zum Felsturm mit Stern 1 → Drehbrücke,
//   zweite Kanone → dritter Berg (Checkpoint, fünf Hasen – der grün leuchtende trägt jetzt einen Funkelstern –, Ameisenloch zum
//   Ameisenbau) → Hohe Wand (Glasröhren) → Plateau: statt der Drehbalken eine **bewegte Wolke** zur Insel, eine zweite (quer)
//   zum Zielplateau, dort ein **Wolkenlift** auf den Zielfelsen (y 47) mit dem Zielmast.
// Sterne (Index): 0 Riesenhase auf der Morgenwiese fangen (er lässt Items im Kreis und den Stern fallen), 1 Glasröhre neben
//   der Wolkenplattform am Gipfel → Felsturm, 2 Figurenschalter (nur Greta) auf dem Zielplateau → Wolkenstufen zum Stern.
// Hasen (Items): Riesenhase (Wachstumsbeere, Funkenblüte, Krallen-Anzug, 5 Münzen), Morgenwiese (Gleitblatt, 5 Münzen,
//   Funkenblüte), Landeplatz (Wachstumsbeere), dritter Berg (Funkelstern, zwei 1-Up, Krallen-Anzug, 8 Münzen).
// Weggefallen: Mulden-Stern, Sternring und beide Drehbalken der Basis, Stempel (der Ameisenbau bleibt als Münz-Geheimnis).

import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS } from '../w5/5-4.js';
import { cliffSkirt, rectPoly, savannaFloor, dirtPath } from '../w5/_helpers_b.js';
import { isl, line, arc, sternHier } from './_helpers_bb.js';

const S1 = 10, T1 = 7, T4 = 19, Y3 = 9, TOP = 39;
const BOT = -22;
const ZF = 47;                               // Zielfelsen
const WIESE = [-15, 15, 34, 6];              // Morgenwiese x0, x1, zA, zB (Oberkante S1)
const TURM = [24, 30, -92, -98, 25];         // Felsturm mit Stern 1 (Oberkante über jeder Sprunghöhe von der Wolke)
const ZIELFELS = [4, 12, -270, -280, ZF];

const hase = (id, x, y, z, area, reward) => ({ kind: 'bunny', id, pos: [x, y, z], area: { min: area[0], max: area[1] }, reward });
const wolke = (id, pos, path, o = {}) => ({ type: 'cloud', id, pos, size: [3.4, 0.6, 3.4], path, speed: 1.7, wait: 0.7, ...o });

export const LEVEL = remixOf('5-4', {
  id: 'B-5',
  world: 11,
  title: 'Hasenhatz im Morgenrot',
  light: 'morgen',
  music: { variant: 'morgen' },
  timeLimit: 500,
  stamp: false,
  start: { pos: [0, S1, 30], yaw: Math.PI / 2 },
  // Morgenwiese bekommt eine eigene Kameraschiene (weiter Blick für die Hasenjagd), sonst wie die Basis
  // und der Felsturm rechts vom Gipfel eine Schiene, die ihn mit ins Bild nimmt
  camera: [{ from: 40, to: 14, pitch: 48, dist: 16, fov: 40, x: 0, xLock: 0.45 }, ...BASIS.camera,
    { from: -86, to: -104, pitch: 44, dist: 13.5, fov: 40, x: 26, xLock: 0.7, area: [15, 40] }],
  remove: [
    { type: 'drehplattform' },                                    // Drehbalken → Wolken
    { id: 'sternring' },                                          // Sternring (Stern 2 der Basis)
    { in: 'deco', kind: 'termitenhuegel', box: [8, -277, 10, -275] }, // stünde im Zielfelsen
    { in: 'deco', kind: 'akazie', box: [-11, -267, -9, -265] },       // stünde in den Wolkenstufen
  ],
  change: [
    // der grün leuchtende Hase trägt jetzt einen Funkelstern statt des Sterns
    { match: { id: 'sternhase' }, fn: (e) => { const x = { ...e, reward: { power: 'stern' } }; delete x.star; return x; } },
  ],
  goal: { pos: [8, ZF, -276], height: 9 },
  stars: [
    { pos: [0, S1 + 1, 20], hidden: true, id: 'stern_riesenhase' },  // 0: erscheint an der Fangstelle des Riesenhasen
    [27.6, TURM[4] + 0.4, -95],                                         // 1: Felsturm hinter der Glasröhre am Gipfel
    [-8, 45.2, -270],                                                   // 2: über den Wolkenstufen (Figurenschalter)
  ],
  add: {
    segments: [
      // ---------------- Morgenwiese (neu)
      isl(...WIESE, S1, 4),
      { type: 'sign', pos: [-4.4, S1, 31.6], text: 'Morgenwiese\nFang die Hasen!', size: [2.6, 0.9], yaw: 0.3 },
      { type: 'deco_w5', items: [
        { kind: 'akazie', pos: [-12.6, S1, 31.4], height: 5.6, lean: 0.15 }, { kind: 'baobab', pos: [12.4, S1, 31], height: 6.2 },
        { kind: 'termitenhuegel', pos: [13, S1, 8.4], size: 1.3 }, { kind: 'felsbrocken', pos: [-12.6, S1, 8.6], size: [3, 3], n: 3 },
        { kind: 'savannengras', pos: [0, S1, 20], size: [28, 26], n: 18, avoid: [[0, 30, 2.5], [-4.4, 31.6, 1.4]] },
      ] },
      // ---------------- Gipfel: Wolkenplattform und Glasröhre zum Felsturm (Stern 1)
      { type: 'cloud', id: 'gipfelwolke', pos: [11.6, T4 + 0.4, -94], size: [3.6, 0.6, 3.2] },
      { type: 'glasspipe', id: 'roehre_turm', radius: 1, coins: 4,
        path: [[13.2, T4 + 2.05, -94], [16, T4 + 2.05, -94], [19, T4 + 5.4, -94.5], [22, TURM[4] + 1.05, -95], [25.2, TURM[4] + 1.05, -95]] },
      isl(TURM[0], TURM[1], TURM[2], TURM[3], TURM[4], 5),
      { type: 'sign', pos: [6.6, T4, -97.4], text: 'Wolke →', size: [1.4, 0.6], yaw: -0.5 },
      // ---------------- Plateau: bewegte Wolken und Wolkenlift zum Zielfelsen
      wolke('wolke_ab', [0, TOP - 0.6, -224.4], [[0, TOP - 0.6, -224.4], [0, TOP - 0.6, -229.6]]),
      wolke('wolke_bc', [-4.5, TOP - 0.6, -247], [[-4.5, TOP - 0.6, -247], [4.5, TOP - 0.6, -247]], { size: [4, 0.6, 3.6], speed: 1.5, wait: 0.6 }),
      wolke('wolkenlift', [2, TOP - 0.6, -273.2], [[2, TOP - 0.6, -273.2], [2, ZF - 0.6, -273.2]], { size: [3.2, 0.6, 3.2], speed: 1.6, wait: 1.2 }),
      isl(...ZIELFELS, ZF - TOP + 0.5),
      { type: 'sign', pos: [-2.6, TOP, -268.4], text: 'Wolkenlift ↑', size: [1.8, 0.7], yaw: 0.3 },
      // Figurenschalter (nur Greta) → Wolkenstufen zum Stern 2
      { type: 'appear', id: 'wolkenstufen', style: 'cloud', parts: [
        { pos: [-11.5, TOP + 1.4, -262.6], size: [2.8, 0.6, 2.8] },
        { pos: [-11, TOP + 3.4, -266.6], size: [2.8, 0.6, 2.8] },
        { pos: [-8, TOP + 5.4, -270], size: [3, 0.6, 3] },
      ] },
    ],
    items: [
      // Morgenwiese: Riesenhase (Stern 0 an der Fangstelle) und drei kleine Hasen
      { kind: 'bunny', id: 'riesenhase', size: 'giant', pos: [3, S1, 19], area: { pos: [0, S1, 20], r: 12.5 },
        items: ['wachstumsbeere', 'funken', 'krallen', 'coins:5'], reward: sternHier(0, 1) },
      hase('hase_m1', -9, S1, 28, [[-14, 22], [-2, 33]], { power: 'gleitblatt' }),
      hase('hase_m2', 9, S1, 28, [[2, 22], [14, 33]], { coins: 5 }),
      hase('hase_m3', -9, S1, 11, [[-14, 7], [-2, 17]], { power: 'funken' }),
      // Kletterberg: Landeplatz
      hase('hase_t1', -5, T1, -53, [[-7.5, -57.5], [7.5, -39]], { power: 'wachstumsbeere' }),
      // Dritter Berg: zwei weitere Hasen
      hase('hase_b1', -20, Y3, -140, [[-28, -146], [-10, -132]], { power: 'krallen' }),
      hase('hase_b2', 22, Y3, -138, [[12, -144], [28, -132]], { coins: 8 }),
      // Figurenschalter für die Pilzkopf-Figur (Greta)
      { kind: 'figurenschalter', id: 'greta_schalter', pos: [-11.5, TOP, -257.6], hero: 'greta', on: { reveal: 'wolkenstufen' } },
      // Münzen: Morgenwiese, über den Wolken
      line([-3, S1 + 0.6, 24], [3, S1 + 0.6, 24], 4),
      line([0, TOP + 0.9, -224.6], [0, TOP + 0.9, -229.4], 3),
      ...arc([0, TOP + 0.8, -243], [0, TOP + 0.8, -251], 4, 1.4),
      line([2, TOP + 2.4, -273.2], [2, ZF - 0.6, -273.2], 4),
    ],
  },
  // Morgenwiese: Felsflanken, Grasboden, Trampelpfad; Felsturm und Zielfelsen ebenso
  build(level) {
    cliffSkirt(level, rectPoly(WIESE[0], WIESE[1], WIESE[2], WIESE[3], 0.9), S1, BOT, { seed: 61, shadow: true });
    cliffSkirt(level, rectPoly(TURM[0], TURM[1], TURM[2], TURM[3], 0.7), TURM[4], BOT, { seed: 67, shadow: false, step: 2.6, band: 3.2 });
    cliffSkirt(level, rectPoly(ZIELFELS[0], ZIELFELS[1], ZIELFELS[2], ZIELFELS[3], 0.7), ZF, TOP - 0.5, { seed: 71, shadow: true });
    savannaFloor(level, [[WIESE[0], WIESE[1], WIESE[2], WIESE[3], S1, 30], [TURM[0], TURM[1], TURM[2], TURM[3], TURM[4], 4], [ZIELFELS[0], ZIELFELS[1], ZIELFELS[2], ZIELFELS[3], ZF, 6]],
      { seed: 91, avoid: [[0, 30, 1.6], [27.6, -95, 1.4], [25, -95, 1.2], [8, -276, 1.6]] });
    dirtPath(level, [[0, 28], [0.6, 18], [-0.6, 10], [0, 6.4]], S1);
  },
  marks: {
    start: [0, S1, 30], wiese: [0, S1, 20], kanone1: [0, S1, -2.6], gipfel: [1, T4, -96], wolke: [11.6, T4 + 1, -94], turm: [27.6, TURM[4], -95],
    checkpoint: [0, Y3, -147], plateau: [0, TOP, -221], insel: [0, TOP, -237], zielplateau: [0, TOP, -262], lift: [2, TOP, -273.2],
    schalter: [-11.5, TOP, -257.6], ziel: [8, ZF, -276],
  },
});
