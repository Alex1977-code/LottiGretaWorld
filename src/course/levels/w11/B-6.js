// B-6 „Grauspuk in der Mondscheinvilla“ – Remix von 3-3 „Die Mondscheinvilla“ (Bauplan Welt Blume, Detail B-6: Schwarz-Weiß-
// Filter, Großspuk verfolgt ab dem Startflur, zwei falsche Zielmasten rufen Großspuke, echter Mast am Ende des dritten
// Balkons; Geheimnisse: unten links übers Geländer, unsichtbare Wolken zur Warp-Box zum Schlussbalkon, eine Warp-Box hinter
// dem Abgrund schickt zurück an den Anfang; Sterne: links vom Start hinter dem Großspuk, hinter einem leeren Gemälde aufs
// Sofa, Ende von Bereich 3 auf fallenden Plattformen; 400 s). Basis als Daten (remixOf, levels/w3/3-3.js bleibt unverändert).
// Musik der Basis (course_ghost) mit Klang-Variante 'schwarzweiss' (altes Radio), Graustufen-Filter über der 3D-Ansicht
// (Thema ghost+sw, HUD bleibt bunt), kein Stempel.
//
// Ablauf wie in der Basis (Spukflur → Bibliothek → Außenhof 1 → Stufenhalle → Außenhof 2), neu:
//   Startflur: ein Großspuk lauert links vom Start über Stern 0 und **jagt** die Figur, sobald sie losläuft (auch angeschaut
//     nur langsam; der Licht-Helm rechts vom Start löst ihn auf; ab 26 m Abstand gibt er auf).
//   Das Spuk-Gemälde ist jetzt ein **leeres Gemälde** – dahinter wie gehabt die Warp-Box in den Drehraum und von dort auf die
//     Empore: Stern 1 liegt auf dem schwebenden Sofa.
//   Außenhof 1 (Bereich 3): am Ende rechts drei **Fallplattformen** über den Zaun hinaus zum Felssims mit Stern 2.
//   Außenhof 2: der falsche Zielmast ruft einen Großspuk (und öffnet wie gehabt die Treppe zur Terrasse); auf der Terrasse
//     steht **ein zweiter falscher Zielmast** (zwei Großspuke). Der echte Mast steht am Ende des **dritten Balkons**: rechts von
//     der Terrasse steigen drei Balkone am Seitenflügel über dem Abgrund an. Hinter dem Abgrund neben Balkon 1 lockt eine
//     **Warp-Box zurück an den Anfang**.
//   Geheimnis: unten links im Außenhof 2 übers Geländer – **unsichtbare Wolken** (Münzen verraten sie) führen zu einer
//     Warp-Box, die direkt auf den Schlussbalkon bringt.
// Weggefallen: Sterne der Basis (Drehraum, Regalgasse, falsche Röhre), Stempel, der echte Zielmast auf der Terrasse.

import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS } from '../w3/3-3.js';
import { hauntFloor, ironFence, facade } from '../w3/_helpers_c.js';
import { line, leeresGemaelde, geisterwolken } from './_helpers_bb.js';

const Y = 1;
const YT = Y + 6.6;                      // Terrasse G
const B1 = { x0: 254, x1: 259, zA: -215.5, zB: -222, y: 9.6 };
const B2 = { x0: 259.5, x1: 264.6, zA: -224.5, zB: -230.5, y: 11.6 };
const B3 = { x0: 252.5, x1: 264.6, zA: -233.5, zB: -239, y: 13.6 };
const FALLE = { x0: 253, x1: 257.5, zA: -225, zB: -229.5, y: 9.6 };
const SIMS = [141.2, Y + 4.4, -101.2];   // Felssims am Ende von Außenhof 1 (Stern 2)
const START = [0, Y, 8];

/** Großspuk (size 2,5). */
const gross = (id, x, y, z, o = {}) => ({ kind: 'spuk', id, size: 2.5, pos: [x, y, z], ...o });

export const LEVEL = remixOf('3-3', {
  id: 'B-6',
  world: 11,
  title: 'Grauspuk in der Mondscheinvilla',
  filter: 'schwarzweiss',
  music: { variant: 'schwarzweiss' },
  timeLimit: 400,
  stamp: false,
  // Balkone (Seitenflügel rechts der Terrasse): eigene Schiene, etwas weiter weg, dem Weg nach hinten folgend
  camera: [...BASIS.camera, { from: -214, to: -244, pitch: 42, dist: 14.5, fov: 40, x: 258, xLock: 0.45, area: [246, 266] }],
  change: [
    // leeres Gemälde (Motiv ohne Augen; die Leinwand leert der Aufbau-Haken)
    { match: { id: 'gemaelde' }, set: { motif: 'landschaft' } },
    // der falsche Zielmast ruft einen Großspuk
    { match: { id: 'falsch' }, set: { spawn: { kind: 'spuk', size: 2.5, sight: 16, id: 'ruf1' }, text: 'Reingelegt! Huuuh!' } },
  ],
  goal: { pos: [254.2, B3.y, -236.2], height: 9 },
  stars: [
    [-4, Y + 0.3, 10.8],                 // 0: links vom Start hinter dem Großspuk
    [3.9, Y + 7.85, 1.4],                // 1: auf dem Sofa der Empore (leeres Gemälde → Drehraum → Warp-Box)
    [SIMS[0], SIMS[1] + 1.0, SIMS[2]],   // 2: Felssims nach den Fallplattformen (Ende Außenhof 1)
  ],
  add: {
    segments: [
      // ---------------- Außenhof 1: Fallplattformen über den Zaun hinaus, Felssims mit Stern 2
      { type: 'fallplatform', id: 'fall1', pos: [129.6, Y + 1.2, -100.6], size: [2.2, 0.5, 2.2], delay: 0.8, respawn: 4 },
      { type: 'fallplatform', id: 'fall2', pos: [133.4, Y + 2.4, -100.8], size: [2.2, 0.5, 2.2], delay: 0.8, respawn: 4 },
      { type: 'fallplatform', id: 'fall3', pos: [137.2, Y + 3.6, -101], size: [2.2, 0.5, 2.2], delay: 0.8, respawn: 4 },
      { type: 'platform', style: 'stone', pos: SIMS, size: [2.8, 0.6, 2.8] },
      // ---------------- Außenhof 2: zweiter falscher Zielmast auf der Terrasse (statt des echten)
      { type: 'zielmast_spuk', id: 'falsch2', pos: [240, YT, -220], height: 7, text: 'Schon wieder reingelegt!',
        spawn: { kind: 'spuk', size: 2.5, sight: 16, id: 'ruf2' }, onTrick: { spawn: [{ kind: 'spuk', size: 2.5, sight: 16, id: 'ruf3', pos: [247, YT + 1.6, -219] }] } },
      { type: 'sign', pos: [251, YT, -216.4], text: 'Balkone →', yaw: -0.4, size: [1.6, 0.7] },
      { type: 'sign', pos: [253.8, FALLE.y, -225.6], text: 'Abkürzung?', yaw: 0.3, size: [1.4, 0.7] },
    ],
    enemies: [
      // Startflur: der Jäger lauert links vom Start über Stern 0 und jagt, sobald die Figur losläuft
      gross('jaeger', -3.6, Y, 10.2, { hunt: true, trigger: { min: [-5, -2, -31.5], max: [5, 12, 3.5] }, huntSpeed: 1.9, giveUp: 26, sight: 16 }),
    ],
    items: [
      // Warp-Box hinter dem Abgrund → zurück an den Anfang
      { kind: 'warpbox', id: 'falle', pos: [255.2, FALLE.y, -228.2], target: [START[0], START[1] + 0.2, START[2] + 1.6] },
      // Geheimnis: Warp-Box auf der letzten unsichtbaren Wolke ↔ Schlussbalkon
      { kind: 'warpbox', id: 'geheim', pos: [221.6, Y + 1.6, -151.6], target: 'schluss' },
      { kind: 'warpbox', id: 'schluss', pos: [258.6, B3.y, -238.1], target: 'geheim' },
      // Münzen verraten die unsichtbaren Wolken; Balkone
      line([229.6, Y + 1.0, -158.4], [226.2, Y + 1.8, -155.6], 3),
      line([255, B1.y + 0.6, -218], [258, B1.y + 0.6, -220], 3),
      line([262, B2.y + 0.6, -226], [262, B2.y + 0.6, -229], 3),
      line([258, B3.y + 0.6, -236.2], [261, B3.y + 0.6, -236.2], 3),
      line([133.4, Y + 3.6, -100.8], [137.2, Y + 4.8, -101], 2),
    ],
  },
  // Balkone, Seitenflügel, Falle, Geländer (Aufbau-Haken: Kollision + Optik der Basis-Hilfen)
  build(level) {
    for (const b of [B1, B2, B3, FALLE]) hauntFloor(level, { ...b, depth: 1.0 });
    facade(level, { face: '-x', at: 265, from: -204, to: -242, y: Y, h: 19, windows: [-212, -222, -231] });
    facade(level, { face: '+z', at: -239.8, from: 251.6, to: 265, y: B3.y, h: 6, windows: [255.5, 261] });
    ironFence(level, [252.6, B3.y, -233.5], [259.6, B3.y, -233.5], { h: 1.0, solid: true });
    ironFence(level, [254, B1.y, -215.5], [257.2, B1.y, -215.5], { h: 1.0, solid: true });
    ironFence(level, [253, FALLE.y, -229.5], [257.5, FALLE.y, -229.5], { h: 1.0 });
    // unsichtbare Wolken unten links vor dem Außenhof 2 (übers Geländer)
    geisterwolken(level, [
      { id: 'gw1', pos: [229.6, Y - 0.6, -158.4], size: [2.6, 0.6, 2.6] },
      { id: 'gw2', pos: [226.2, Y + 0.2, -155.6], size: [2.6, 0.6, 2.6] },
      { id: 'gw3', pos: [222.4, Y + 1.0, -152.4], size: [4.2, 0.6, 4.2] },
    ]);
  },
  setup(level) { leeresGemaelde(level, 'gemaelde'); },
  marks: {
    start: START, helm: [2.6, Y, 6.2], stern0: [-4, Y, 10.8], gemaelde: [-4.2, Y, 1.6], empore: [4, Y + 7, 4.6], sofa: [3.9, Y + 7, 1.4],
    hof1: [114.6, Y, -74], fall: [128, Y, -100.6], sims: SIMS, hof2: [235.4, Y, -168], geheim: [229.6, Y, -160], falsch: [240, Y, -205.6],
    terrasse: [240, YT, -217], balkon1: [256.5, B1.y, -218.6], falle: [255.2, FALLE.y, -228.2], balkon2: [262, B2.y, -227.5], balkon3: [258, B3.y, -236.2],
    ziel: [254.2, B3.y, -236.2],
  },
});
