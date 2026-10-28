// 7-B „Blaufeuer-Prinz im Glutzwinger“ (Archetyp arena, Bauplan 7-B: „Zeitlimit 300 s · Käfig ca. 20 × 20 m. Blauer
// Schubser-Prinz feuert 3 blaue Feuerbälle in einer Kurve, nach jedem Treffer einen mehr. Ablauf wie 6-A, 3 Tritte.“, 1 Stern).
// Thema fortress, Musik course_arena.
//
// Aufbau: eine Basalt-Festung hoch über dem Lavasee der Lava-Festung – Festungsplattform mit Zinnenrand und glühenden Fenstern
// im Leib. In der Mitte der Glutzwinger (Innenfläche 20 × 20 m): Basaltplatten mit glühenden Fugen, ein dunkelroter Läufer
// und ein blau leuchtendes Flammenkronen-Mosaik, schwarze Eisenstäbe mit rotglühenden Spitzen auf niedrigen Basaltmauern
// (vorn nur eine Brüstung mit Fallgitter-Tor, damit die Kamera alles sieht), Brummbär-Banner an der Rückwand, vier
// Festungstürme an den Ecken. An beiden Seitenwänden je drei Röhrenmündungen unter Torbögen mit blauen Feuerschalen; jede
// Glasröhre verbindet die linke und rechte Mündung gleicher Höhe und läuft hinter dem Käfig herum (Netz 'roehren', für die
// Figur gesperrt). Links und rechts außen jubeln Zuschauer auf Tribünen, vorn brennen blaue Fackeln.
// Ablauf (wie 6-A, Muster prinzKampf): Wer durch das Tor tritt, schließt es hinter sich, der blaue Schubser-Prinz stampft auf
// (Lebensleiste). Er scharrt, rammt (Berührung verletzt), rutscht aus und spuckt blaue Feuerbälle in einer Kurve – 3, nach
// jedem Tritt einer mehr (4, 5). Steht man vor einer Röhrenmündung und weicht im letzten Moment aus, rammt er sich in die Röhre;
// noch ein Stoß schickt ihn hindurch – gequetscht schießt er auf der anderen Seite heraus und ist benommen: jetzt draufspringen
// = ein Tritt. Drei Tritte → er verpufft, der Stern steigt in der Mitte auf; Einsammeln beendet das Level. Tod: Neustart vor
// dem Tor, Prinz wieder 3/3. Extras: ?-Block mit Münzen, Münzblock und ein unsichtbarer Extraleben-Block vor dem Tor.

import { glutZwinger, prinzKampf, line, ring } from './_helpers_b.js';

const Y = 2;                    // Boden des Zwingers
const W = 10;                   // halbe Innenweite
const PZ = [-6, 0, 6];          // Röhrenmündungen (z) an beiden Seitenwänden
const GATE = 2.4;               // halbe Torbreite

/** Glasröhren-Netz: linke Mündung (z) hinter dem Käfig herum zur rechten (gleiches z); m = Schachtelung (innen 0). */
const NODES = {}, PIPES = [], ENDS = {};
PZ.forEach((z, m) => {
  const o = W + 1.3 + 2.3 * m, back = -(W + 1.3 + 2.3 * m), y = Y + 1;
  NODES[`L${z}`] = [-W + 0.05, y, z]; NODES[`R${z}`] = [W - 0.05, y, z];
  ENDS[`L${z}`] = { enter: false }; ENDS[`R${z}`] = { enter: false };
  PIPES.push({ from: `L${z}`, to: `R${z}`, via: [[-o, y, z], [-o, y, back], [o, y, back], [o, y, z]] });
});

function build(level) {
  glutZwinger(level, { y: Y, half: W, mouths: PZ, gate: GATE, plat: [-21, 21, -21, 21], depth: 18 });
  // Käfig: unsichtbare Kollision über den niedrigen Mauern und eine Decke (kein Entkommen, Kamera sieht hindurch)
  const W2 = W + 0.6, inv = (min, max, tag) => level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag });
  inv([-W2, Y, W], [-GATE, Y + 6.4, W2], 'kaefig-vorn');
  inv([GATE, Y, W], [W2, Y + 6.4, W2], 'kaefig-vorn');
  inv([-W2, Y, -W2], [-W, Y + 6.4, W2], 'kaefig-wand');
  inv([W, Y, -W2], [W2, Y + 6.4, W2], 'kaefig-wand');
  inv([-W2, Y, -W2], [W2, Y + 6.4, -W], 'kaefig-wand');
  inv([-W2, Y + 6.4, -W2], [W2, Y + 6.8, W2], 'kaefig-decke');
}

function setup(level) {
  prinzKampf(level, {
    id: 'prinz', name: 'Blauer Schubser-Prinz',
    gate: { min: [-GATE, Y, W], max: [GATE, Y + 6.4, W + 0.6] },
    inside: (p) => p.z < W - 0.9 && Math.abs(p.x) < W && p.y > Y - 0.5,
  });
}

export const LEVEL = {
  id: '7-B',
  world: 7,
  title: 'Blaufeuer-Prinz im Glutzwinger',
  archetype: 'arena',
  theme: 'fortress',
  music: 'course_arena',
  timeLimit: 300,
  starSlots: 1,
  killY: -16,
  build,
  setup,
  start: { pos: [0, Y, 13.4], yaw: Math.PI / 2 },
  checkpoint: { pos: [0, Y, 13.4], yaw: Math.PI / 2 },
  // Überblick über den ganzen Zwinger samt Röhren: steil und weit weg, Blick halb auf die Mitte gezogen
  camera: [{ from: 40, to: -40, pitch: 52, dist: 24, fov: 40, x: 0, xLock: 0.4, ahead: 0.4, lead: 0.4, height: 1.8 }],
  arena: { enemies: [], star: [0, Y + 0.6, 0], starIndex: 0, reveal: 2.8, crowd: 'crowd', intro: 'Stoß den blauen Prinzen in eine Glasröhre!', center: [0, Y, -1], camPull: 0.18 },
  segments: [
    { type: 'killplane', y: -16 },
    // Festungsplattform (Kollision, Umriss für Himmel und Kulisse; Mauern, Käfig und Leib baut der Haken)
    { type: 'island', pos: [0, Y - 4, 0], size: [42, 4, 42], top: 'stone', under: 0 },
    { type: 'glasnetz', id: 'roehren', radius: 1, nodes: NODES, pipes: PIPES, ends: ENDS },
    { type: 'crowd', id: 'crowd', stands: [
      { from: [-19.4, Y, -9], to: [-19.4, Y, 9], rows: 3, face: [1, 0] },
      { from: [19.4, Y, 9], to: [19.4, Y, -9], rows: 3, face: [-1, 0] },
    ] },
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-W - 2.8, Y - 0.2, -W - 2.8], height: 8, radius: 1.8 }, { kind: 'burgturm', pos: [W + 2.8, Y - 0.2, -W - 2.8], height: 8, radius: 1.8 },
      { kind: 'burgturm', pos: [-W - 2.8, Y - 0.2, W + 2.6], height: 7, radius: 1.7 }, { kind: 'burgturm', pos: [W + 2.8, Y - 0.2, W + 2.6], height: 7, radius: 1.7 },
      { kind: 'fackel', pos: [-GATE - 1.6, Y, W + 2], mount: 'stand', color: 'blau' }, { kind: 'fackel', pos: [GATE + 1.6, Y, W + 2], mount: 'stand', color: 'blau' },
      { kind: 'fackel', pos: [-17.5, Y, 17.5], mount: 'stand', color: 'blau' }, { kind: 'fackel', pos: [17.5, Y, 17.5], mount: 'stand', color: 'blau' },
      { kind: 'fahne', pos: [-9, Y, 18.6], height: 5 }, { kind: 'fahne', pos: [9, Y, 18.6], height: 5 },
      { kind: 'kette', pos: [-W - 2.8, Y + 6.5, -W + 1], length: 3 }, { kind: 'kette', pos: [W + 2.8, Y + 6.5, -W + 1], length: 3 },
      { kind: 'knochen', pos: [-16, Y, 14], n: 4 }, { kind: 'knochen', pos: [15.5, Y, -16], n: 3 },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-30, -14, 0], n: 6, height: [8, 16], size: [8, 40] },
      { kind: 'basaltsaeulen', pos: [30, -14, 0], n: 6, height: [8, 16], size: [8, 40] },
      { kind: 'lavafall', pos: [-21.5, Y - 1, -14], width: 3, height: 17, yaw: -Math.PI / 2 },
      { kind: 'lavafall', pos: [21.5, Y - 1, 12], width: 3, height: 17, yaw: Math.PI / 2 },
    ] },
    { type: 'sign', pos: [-5.6, Y, 15.2], text: 'Glutzwinger', size: [2.6, 0.9], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [-3.6, Y + 2.4, 13.4], content: 'coins:5' },
    { kind: 'coinblock', pos: [3.6, Y + 2.4, 13.4], count: 6 },
    { kind: 'hidden', pos: [5.8, Y + 3.3, 15.5], content: 'oneup' },
  ],
  enemies: [
    {
      kind: 'schubser_prinz', id: 'prinz', color: 'blau', fire: [3, 4, 5], curve: 1.1, pos: [0, Y, -5], dir: [0, 1],
      arena: { min: [-W, -W], max: [W, W], y: Y }, net: 'roehren', wakeR: 0,
    },
  ],
  items: [
    line([-1.2, Y + 0.5, 19], [1.2, Y + 0.5, 19], 3),
    ring([-6.5, Y + 0.4, 6.5], 1.2, 6),
    ring([6.5, Y + 0.4, 6.5], 1.2, 6),
    ring([-6.5, Y + 0.4, -6.5], 1.2, 6),
    ring([6.5, Y + 0.4, -6.5], 1.2, 6),
    line([-15, Y + 0.5, 19.2], [-11, Y + 0.5, 19.2], 4),
    line([11, Y + 0.5, 19.2], [15, Y + 0.5, 19.2], 4),
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 13.4], gate: [0, Y, W + 1], L0: [-W, Y, 0], R0: [W, Y, 0] },
};
