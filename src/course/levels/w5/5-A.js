// 5-A „Hörnerherde am Lila Strand“ (Archetyp arena, Bauplan 5-A: „Wie 1-A, aber 5 Rammbock-Bullen“, Käfig ca. 20 × 20 m,
// 200 s, Stern). Thema grass, Musik course_arena.
//
// Aufbau: Die Festungsplattform mit dem gelben Gitterkäfig (Innenradius 11 m) steht auf einer runden Insel mit lila
// Sand mitten im türkis-violetten Meer. Ringsum Strandleben: Palmen, Sandburg und Pilzling-Sandskulptur, Sonnenschirme
// und Liegestühle, ein Rettungsschwimmer-Turm, Muscheln, Strandball, Segelboote und kreisende Möwen. Auf den Tribünen
// (links, rechts, hinten) jubeln die Zuschauer bei jedem Treffer.
// Ablauf: Zwei Bullen im Käfig scharren und stürmen (je 3 Treffer: draufspringen, wenn sie scharren oder benommen am
// Gitter stehen; die Funkenblüte aus dem ?-Block trifft auch von weitem). Draußen auf Sandsteinfelsen (links, vorn links, rechts) warten drei
// weitere Bullen und schauen zu – sind die ersten zwei besiegt, springen sie nacheinander in hohem Bogen über das Gitter (Ansage).
// Alle fünf besiegt → der Stern steigt in der Mitte auf; Einsammeln beendet das Level. Tod setzt Arena und Wellen
// zurück. Extraleben: unsichtbarer Block über dem Sternmosaik vorn.

import { lilacBeach, lifeguardTower, sandRocks, sailboats, seagulls, bullWaves, plazaProps, bunting, beachTowels, Bld, litTop } from './_helpers_b.js';
import { banner } from '../../blocks/w3kit.js';

const Y = 2.4;            // Bodenoberfläche der Arena
const R = 11;             // Innenradius des Käfigs
const SAND = 0;           // Strand
/** Punkte auf einem Kreis um die Arena-Mitte (Winkel 0 = +Z, zur Kamera). */
const ring = (r, a, y = 0) => [Math.sin(a) * r, y, Math.cos(a) * r];

// zweite Welle: Warteplätze auf Sandsteinfelsen vor dem Gitter (links hinten, links vorn, rechts hinten – oben auf
// Arenahöhe, damit die Kamera sie über den Plattformrand hinweg warten sieht)
const ROCK = 15.4;
const WAIT = { bulle3: ring(ROCK, -Math.PI / 2 - 0.35, Y), bulle4: ring(ROCK, -1.0, Y), bulle5: ring(ROCK, Math.PI / 2 + 0.35, Y) };

function scene(level) {
  lilacBeach(level, { r: 31, y: SAND, sea: -0.4 });
  lifeguardTower(level, [21.5, SAND, 9], -Math.PI / 2 + 0.5);
  // Holzkisten am Strand; Sandsteinfelsen als Warteplätze der zweiten Welle
  const b = new Bld();
  for (const [x, z, s] of [[-19, -8, 0.9], [-18.2, -9.2, 0.7], [19.6, -10.5, 0.8]]) b.box(s, s, s, x, SAND, z, litTop(0xc89a6a), { r: 0.04, yaw: x * 0.3 });
  b.flush(level);
  sandRocks(level, Object.values(WAIT).map((p) => [p[0], p[2], 1.6]), SAND - 0.2, Y);
  plazaProps(level, [{ kind: 'bank', pos: [14.2, SAND, 12.4], yaw: -0.8 }]);
  // Wimpelketten zwischen den Fahnenmasten, Strandtücher und Krebse zwischen Tribünen und Käfig
  const top = (a) => { const p = ring(R + 2.4, a); return [p[0], 5.3, p[2]]; };
  bunting(level, [[top(0.55), top(1.6), 9, 0.9], [top(1.6), top(2.4), 7, 0.7], [top(-0.55), top(-1.6), 9, 0.9], [top(-1.6), top(-2.4), 7, 0.7]]);
  beachTowels(level, [[-16.4, SAND, 2.2, 0.3, 0xff6a8a, 0xffffff], [16.6, SAND, 2.6, -0.2, 0x5ac8ff, 0xffe04a], [-17, SAND, 11.6, -0.4, 0x7ae07a, 0xffffff], [8.6, SAND, 16.8, 0.1, 0xb08aff, 0xffffff]],
    [[-11.6, SAND, 12.8, 0.6], [12.2, SAND, 13.4, -0.5], [16.4, SAND, -1.2, 2.2]]);
}

function setup(level) {
  bullWaves(level, [['bulle1', 'bulle2'], ['bulle3', 'bulle4', 'bulle5']], WAIT, {
    center: [0, Y, 0], arc: 7.5, flight: 1.2, stagger: 0.55, pause: 1.3,
    banner: (lv) => banner(lv, 'Drei Bullen springen über das Gitter!', { hold: 1.8, color: '#ffb46a' }),
  });
  sailboats(level, [[-36, -42, 0.4, 0xff6a8a], [44, -30, -0.6, 0x6ac8ff], [-50, 10, 1.2, 0xffd24a], [38, 34, 2.2, 0xb08aff]], -0.4);
  seagulls(level, { spots: [[-10, 14, -18, 7], [14, 13, -10, 6], [0, 16, 20, 9]], n: 2 });
}

export const LEVEL = {
  id: '5-A',
  world: 5,
  title: 'Hörnerherde am Lila Strand',
  archetype: 'arena',
  theme: 'grass',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,           // ein Stern, kein Stempel (HUD/Ergebnis)
  killY: -14,
  build: scene,
  setup,
  start: { pos: [0, Y, 7], yaw: Math.PI / 2 },
  // Überblick über den Käfig und die wartenden Bullen draußen: etwas steiler und weiter weg
  camera: [{ from: 30, to: -30, pitch: 47, dist: 25, x: 0, xLock: 0.45, ahead: 0.4, lead: 0.4, fov: 40 }],
  arena: { enemies: 'all', star: [0, Y + 0.5, 0], starIndex: 0, crowd: 'crowd', intro: 'Besiege die Hörnerherde – fünf Bullen!', center: [0, Y, -1], camPull: 0.3 },
  segments: [
    { type: 'killplane', y: -14 },
    // Festungsplattform mit Käfig (Tor hinten; zur Kamera nur Geländer + Maschengitter)
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 5, floor: Y + 0.5, ceiling: 6.4, gate: Math.PI, low: 0.85, color: 0xffb02a },
    // Tribünen links, rechts und hinten (Zuschauer blicken zur Mitte)
    { type: 'crowd', id: 'crowd', stands: [
      { from: [-18.6, SAND, 9], to: [-18.6, SAND, -8], rows: 3, face: [1, 0] },
      { from: [18.6, SAND, -8], to: [18.6, SAND, 9], rows: 3, face: [-1, 0] },
      { from: [-13, SAND, -16], to: [-4, SAND, -17.5], rows: 4, face: [0.2, 1] },
      { from: [4, SAND, -17.5], to: [13, SAND, -16], rows: 4, face: [-0.2, 1] },
    ] },
    { type: 'pennants', items: [
      { pos: ring(R + 2.4, 0.55), color: 0xff7ac0 }, { pos: ring(R + 2.4, -0.55), color: 0x6ac8ff },
      { pos: ring(R + 2.4, 1.6), color: 0xffcf2a }, { pos: ring(R + 2.4, -1.6), color: 0xb08aff },
      { pos: ring(R + 2.4, 2.4), color: 0xff7ac0, h: 7 }, { pos: ring(R + 2.4, -2.4), color: 0x6ac8ff, h: 7 },
    ].map((it) => ({ ...it, pos: [it.pos[0], SAND, it.pos[2]] })) },
    { type: 'torches', h: 2.6, items: [ring(R + 3.2, 0.3), ring(R + 3.2, -0.3), ring(R + 3.2, 1.35), ring(R + 3.2, -1.35)].map((p) => [p[0], SAND, p[2]]) },
    // Strandleben
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [-23, SAND, 12], height: 6.2, lean: 0.3 }, { kind: 'palme', pos: [-25, SAND, 6], height: 5.2 },
      { kind: 'palme', pos: [24, SAND, -4], height: 6.6, lean: 0.35 }, { kind: 'palme', pos: [22, SAND, -16], height: 5.4 },
      { kind: 'palme', pos: [-21, SAND, -19], height: 6.0 }, { kind: 'palme', pos: [-6, SAND, -27], height: 5.6 }, { kind: 'palme', pos: [9, SAND, -27], height: 6.4, lean: 0.3 },
      { kind: 'sandburg', pos: [-20, SAND, 17], size: 2.4 }, { kind: 'sandskulptur', pos: [-12, SAND, 21], size: 1.6, yaw: -0.4 },
      { kind: 'sandskulptur', pos: [-9.4, SAND, 22.6], size: 1.2, yaw: 0.2 },
      { kind: 'sonnenschirm', pos: [12, SAND, 20], color: 'lila' }, { kind: 'liegestuhl', pos: [13.6, SAND, 21.4], yaw: -0.6 },
      { kind: 'sonnenschirm', pos: [20, SAND, 15], color: 'gelb' }, { kind: 'liegestuhl', pos: [18.6, SAND, 17], yaw: -0.3, color: 'rot' },
      { kind: 'sonnenschirm', pos: [-26, SAND, -6], color: 'rot' }, { kind: 'strandball', pos: [5.5, SAND, 21], size: 0.9 },
      { kind: 'muscheln', pos: [0, SAND, 19], size: [36, 8], n: 16 }, { kind: 'muscheln', pos: [0, SAND, -22], size: [30, 8], n: 10 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.4, Y + 2.3, 5.4], content: 'funken' },
    { kind: 'coinblock', pos: [3.4, Y + 2.3, 5.4], count: 6 },
    { kind: 'hidden', pos: [0, Y + 3.2, 3.4], content: 'oneup' },
  ],
  enemies: [
    { kind: 'rammbock_bulle', id: 'bulle1', pos: [-4.5, Y, -4], dir: [0.4, 1], sight: 26 },
    { kind: 'rammbock_bulle', id: 'bulle2', pos: [4.5, Y, -4], dir: [-0.4, 1], sight: 26 },
    // zweite Welle (warten draußen am Strand, Landeplätze im Käfig)
    { kind: 'rammbock_bulle', id: 'bulle3', pos: [-5.5, Y, -3.5], dir: [0.5, 1], sight: 26 },
    { kind: 'rammbock_bulle', id: 'bulle4', pos: [0, Y, -6], dir: [0, 1], sight: 26 },
    { kind: 'rammbock_bulle', id: 'bulle5', pos: [5.5, Y, -3.5], dir: [-0.5, 1], sight: 26 },
  ],
  items: [
    { kind: 'coins', pos: [-6.5, Y + 0.3, 1], r: 1.4, n: 6 },
    { kind: 'coins', pos: [6.5, Y + 0.3, 1], r: 1.4, n: 6 },
    { kind: 'coins', from: [-2.5, Y + 0.5, -8.5], to: [2.5, Y + 0.5, -8.5], n: 4 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 7], left: [-4.5, Y, -4], right: [4.5, Y, -4], ...WAIT },
};
