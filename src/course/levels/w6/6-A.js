// 6-A „Schubser-Prinz im Röhrenzwinger“ (Archetyp arena, Bauplan 6-A: „Käfig ca. 20 × 20 m mit 2 × 3 Glasröhren an den
// Wänden. Schubser-Prinz rammt, spuckt nach Ausrutschen einen Feuerball. In eine Röhre rammen, nochmal rammen, er schießt
// gequetscht aus einer anderen Röhre – dann treten. 3 Tritte.“, 300 s, 1 Stern). Thema fortress, Musik course_arena.
//
// Aufbau: eine kleine Festung hoch über dem Glutsee – Festungsplattform mit Zinnenrand und glühenden Fenstern im Leib. In der
// Mitte der Zwinger (Innenfläche 20 × 20 m): Plattenboden mit blauem Läufer und goldenem Kronen-Mosaik, goldene Gitterstäbe
// auf niedrigen Steinmauern (vorn nur eine Brüstung mit Kronentor, damit die Kamera alles sieht), vier Ecktürme mit
// blauen Spitzdächern, Kronen-Banner. An beiden Seitenwänden je drei Röhrenmündungen unter Torbögen; jede Glasröhre
// verbindet die linke und rechte Mündung gleicher Höhe und läuft hinter dem Käfig herum (Glasröhren-Netz 'roehren', für die
// Figur gesperrt). Links und rechts außen jubeln Zuschauer auf Tribünen.
// Ablauf: Wer durch das Kronentor tritt, schließt das Tor hinter sich, der Schubser-Prinz stampft auf (Lebensleiste). Er
// scharrt, rammt (Berührung verletzt), rutscht aus und spuckt Feuerbälle (1 / 2 / 3 je Phase). Steht man vor einer
// Röhrenmündung und weicht im letzten Moment aus, rammt er sich in die Röhre und steckt fest; noch ein Stoß (hineinlaufen,
// draufspringen) schickt ihn durch die Röhre – gequetscht schießt er auf der anderen Seite heraus und ist benommen: jetzt
// draufspringen = ein Tritt. Drei Tritte → er verpufft, der Stern steigt in der Mitte auf; Einsammeln beendet das Level.
// Tod: Neustart vor dem Tor, Prinz wieder 3/3. Extras: ?-Block mit Münzen und ein unsichtbarer Extraleben-Block vor dem Tor.

import { zwinger, prinzKampf, line, ring } from './_helpers_b.js';

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

export const M6A = { Y, W, PZ, GATE, START: [0, Y, 13.4], ONEUP: [5.8, Y, 15.5] };

function build(level) {
  zwinger(level, { y: Y, half: W, mouths: PZ, gate: GATE, plat: [-21, 21, -21, 21], depth: 18 });
  // Käfig: unsichtbare Kollision über den niedrigen Mauern und eine Decke (kein Entkommen, Kamera sieht hindurch)
  const W2 = W + 0.6, inv = (min, max, tag) => level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag });
  inv([-W2, Y, W], [-GATE, Y + 6.4, W2], 'kaefig-vorn');
  inv([GATE, Y, W], [W2, Y + 6.4, W2], 'kaefig-vorn');
  // Seitenwände (auch vor den Röhrenmündungen – hinein darf nur der Prinz) und Rückwand
  inv([-W2, Y, -W2], [-W, Y + 6.4, W2], 'kaefig-wand');
  inv([W, Y, -W2], [W2, Y + 6.4, W2], 'kaefig-wand');
  inv([-W2, Y, -W2], [W2, Y + 6.4, -W], 'kaefig-wand');
  inv([-W2, Y + 6.4, -W2], [W2, Y + 6.8, W2], 'kaefig-decke');
}

function setup(level) {
  prinzKampf(level, {
    id: 'prinz', name: 'Schubser-Prinz',
    gate: { min: [-GATE, Y, W], max: [GATE, Y + 6.4, W + 0.6] },
    inside: (p) => p.z < W - 0.9 && Math.abs(p.x) < W && p.y > Y - 0.5,
  });
}

export const LEVEL = {
  id: '6-A',
  world: 6,
  title: 'Schubser-Prinz im Röhrenzwinger',
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
  arena: { enemies: [], star: [0, Y + 0.6, 0], starIndex: 0, reveal: 2.8, crowd: 'crowd', intro: 'Stoß den Schubser-Prinzen in eine Glasröhre!', center: [0, Y, -1], camPull: 0.45 },
  segments: [
    { type: 'killplane', y: -16 },
    // Festungsplattform (Kollision, Umriss für Himmel und Kulisse; Mauern, Käfig und Leib baut der Haken)
    { type: 'island', pos: [0, Y - 4, 0], size: [42, 4, 42], top: 'stone', under: 0 },
    { type: 'glasnetz', id: 'roehren', radius: 1, nodes: NODES, pipes: PIPES, ends: ENDS },
    { type: 'crowd', id: 'crowd', stands: [
      { from: [-19.4, Y, -9], to: [-19.4, Y, 9], rows: 3, face: [1, 0] },
      { from: [19.4, Y, 9], to: [19.4, Y, -9], rows: 3, face: [-1, 0] },
    ] },
    { type: 'torches', h: 2.0, items: [[-GATE - 1.6, Y, W + 1.8], [GATE + 1.6, Y, W + 1.8], [-18.6, Y, 16.5], [18.6, Y, 16.5], [-18.6, Y, -18.5], [18.6, Y, -18.5]] },
    { type: 'pennants', items: [
      { pos: [-W - 2.6, Y + 11, -W - 2.6], color: 0x2a5ad8, h: 2.4 }, { pos: [W + 2.6, Y + 11, -W - 2.6], color: 0xffc21a, h: 2.4 },
      { pos: [-W - 2.6, Y + 11, W + 2.4], color: 0xffc21a, h: 2.4 }, { pos: [W + 2.6, Y + 11, W + 2.4], color: 0x2a5ad8, h: 2.4 },
      { pos: [-8, Y, 19.4], color: 0x2a5ad8, h: 5 }, { pos: [8, Y, 19.4], color: 0x2a5ad8, h: 5 },
    ] },
    { type: 'sign', pos: [-5.6, Y, 15.2], text: 'Röhrenzwinger', size: [2.6, 0.9], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [-3.6, Y + 2.4, 13.4], content: 'coins:5' },
    { kind: 'coinblock', pos: [3.6, Y + 2.4, 13.4], count: 6 },
    { kind: 'hidden', pos: [5.8, Y + 3.3, 15.5], content: 'oneup' },
  ],
  enemies: [
    {
      kind: 'schubser_prinz', id: 'prinz', pos: [0, Y, -5], dir: [0, 1], arena: { min: [-W, -W], max: [W, W], y: Y },
      net: 'roehren', wakeR: 0,
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
