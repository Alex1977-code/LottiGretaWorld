// 4-B „Blaugitter-Bastion der Feuer-Werfer“ (Archetyp arena, Bauplan 4-B: ca. 25 × 25 m, blau vergittert, 3 Feuer-Werfer
// besiegen → Stern; nur 100 s). Thema fortress, Musik course_arena. Auf der Weltkarte hinter der Ruinenstadt (4-5); dort
// weist eine versiegelte blaue Röhre am Ziel auf die Festung hin.
//
// Aufbau: Festungshof (22 × 22 m Kampffläche) auf einem Felssporn: blau-graue Steinplatten, in der Mitte ein leuchtendes
// Wappen-Mosaik (blauer Ring, goldene Flamme der Werfer-Bande), ringsum blaue Rautengitter (hinten, links, rechts; vorn
// nur eine niedrige Brüstung, damit die Kamera alles sieht). Hinten eine Galerie (Einweg-Steg, 2,6 m), links und rechts
// je eine Seitenbühne (2,2 m) – die Werfer springen zwischen Boden und Bühne hin und her. Außenmauern mit Zinnen und
// blauem Band, vier Ecktürme mit blauen Kegeldächern und wehenden blauen Fahnen, Bannern am Tor, ein Steckbrief
// „Gesucht: Lotti & Greta“, das Lager der Bande (Fässer, Kisten, Feuerkugel-Vorrat), Feuerschalen, Wimpel.
// Ablauf: Drei Feuer-Werfer tänzeln, werfen hüpfende Feuerkugeln und springen; draufspringen (in der Wurfpause) besiegt
// sie, ebenso Feuer (Funkenblüte aus dem ?-Block am Start), Krallen, Wurf … Alle drei besiegt → Stern in der Mitte →
// Ziel. Tod setzt die Arena zurück.

import { levelSetup, blueFortress, fortressFxB, shadowDiet } from './_helpers_c.js';

const Y = 2;           // Hofboden
const R = 11;          // halbe Kampffläche
const YG = Y + 2.6;    // Galerie hinten (Oberkante)
const YS = Y + 2.2;    // Seitenbühnen (Oberkante)

function setup(level) {
  const fx = blueFortress(level, { y: Y, half: R, outer: 14.5, height: 4.6, ceiling: 8 });
  fortressFxB(level, fx, { y: Y });
  shadowDiet(level, ['feuer_werfer'], 1);
}

export const LEVEL = {
  id: '4-B',
  world: 4,
  title: 'Blaugitter-Bastion der Feuer-Werfer',
  archetype: 'arena',
  theme: 'fortress',
  music: 'course_arena',
  timeLimit: 100,
  starSlots: 1,
  killY: -12,
  setup: levelSetup(setup),
  start: { pos: [0, Y, 8.6], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 50, dist: 23, x: 0, xLock: 0.45, ahead: 0.6, lead: 0.4 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, 0.5], starIndex: 0, intro: 'Besiege die drei Feuer-Werfer!', center: [0, Y, -1], camPull: 0.55 },
  segments: [
    // Festungsplattform (Kollision + Umriss für Himmel/Kulisse); Mauern, Türme und Gitter baut der Haken
    { type: 'island', pos: [0, Y - 4, 0], size: [29, 4, 29], top: 'stone', under: 0 },
    { type: 'killplane', y: -12 },
    // Galerie hinten und zwei Seitenbühnen (Einweg: von unten durchspringbar)
    { type: 'platform', pos: [0, YG - 0.6, -7.8], size: [11, 0.6, 2.4], style: 'stone', oneWay: true },
    { type: 'platform', pos: [-8.6, YS - 0.6, 0], size: [3.4, 0.6, 4.4], style: 'stone', oneWay: true },
    { type: 'platform', pos: [8.6, YS - 0.6, 0], size: [3.4, 0.6, 4.4], style: 'stone', oneWay: true },
    { type: 'torches', h: 1.4, items: [[-5.2, YG, -8.6], [5.2, YG, -8.6]] },
    { type: 'torches', h: 1.6, items: [[-R + 0.7, Y, R - 0.7], [R - 0.7, Y, R - 0.7], [-3.4, Y, -R - 3.4], [3.4, Y, -R - 3.4]] },
    { type: 'pennants', items: [
      { pos: [-12.8, Y + 1.2, 13.6], color: 0x2a5ac8, h: 4 }, { pos: [12.8, Y + 1.2, 13.6], color: 0xffc21a, h: 4 },
      { pos: [-6, Y + 1.2, 13.6], color: 0xffc21a, h: 3 }, { pos: [6, Y + 1.2, 13.6], color: 0x2a5ac8, h: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.2, Y + 2.5, 5.8], content: 'funken' },
    { kind: 'brick', pos: [-2.2, Y + 2.5, 5.8], content: 'coin' },
    { kind: 'coinblock', pos: [3.2, Y + 2.5, 5.8], count: 5 },
  ],
  enemies: [
    // starten oben auf Galerie und Seitenbühnen (gut sichtbar) und springen zwischen Bühne und Boden hin und her
    { kind: 'feuer_werfer', id: 'werfer1', pos: [0, YG, -7.8], axis: [1, 0], pace: 2.6, heights: [Y, YG], sight: 22, interval: 2.2, first: 1.6, jumpEvery: 3.2 },
    { kind: 'feuer_werfer', id: 'werfer2', pos: [-8.6, YS, 0], axis: [0, 1], pace: 1.4, heights: [Y, YS], sight: 22, interval: 2.4, first: 2.4, jumpEvery: 3.8 },
    { kind: 'feuer_werfer', id: 'werfer3', pos: [8.6, YS, 0], axis: [0, 1], pace: 1.4, heights: [Y, YS], sight: 22, interval: 2.6, first: 3.0, jumpEvery: 4.2 },
  ],
  items: [
    { kind: 'coins', from: [-4, YG + 0.5, -7.8], to: [4, YG + 0.5, -7.8], n: 5 },
    { kind: 'coins', pos: [-8.6, YS + 0.5, 0], r: 1.1, n: 5 },
    { kind: 'coins', pos: [8.6, YS + 0.5, 0], r: 1.1, n: 5 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 8.6], galerie: [0, YG, -7.8], links: [-8.6, YS, 0], rechts: [8.6, YS, 0] },
};
