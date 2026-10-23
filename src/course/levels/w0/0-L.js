// Leistungsprobe (0-L): Testlevel des Motors für die Präzisierung „Leistung und Level-Haken 2“ (tests/course_leistung.mjs).
// Grasinsel mit Gegnergruppen (gleiche Modelle → Instanzen), Käfern in der Ferne (Detailstufe), Münzreihen und Blöcken
// (Pool-Auswahl, Detailstufe), einem Gegner mit Fern-Ausblendung, einer Insel ohne Schattenwurf (segments shadow: false),
// Aufbau-Haken LEVEL.prebuild/LEVEL.build (Reihenfolge und Verschmelzen werden geprüft) und eigenen Wolken (LEVEL.sky).
// Dazu: Streuung über mehrere Abschnitte (StaticBatcher verteilt sie je Abschnitt), Ameisen als gemeinsame Instanz-Gruppe
// mit Regel LEVEL.instances (view/GroupCuller.js), ein Felsblock mit Felsdeckel und Durchsicht (island top 'rock', xray).

import { box, addStatic, merge } from '../../blocks/kit.js';

const Y = 1;

const coins = (z0, z1, x = 0) => ({ kind: 'coins', from: [x, Y + 0.6, z0], to: [x, Y + 0.6, z1], n: Math.round(Math.abs(z1 - z0) / 1.5) + 1 });

export const LEVEL = {
  id: '0-L',
  world: 0,
  title: 'Leistungsprobe',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 300,
  start: { pos: [0, Y, 4], yaw: Math.PI / 2 },
  camera: [{ from: 20, to: -200, pitch: 44, dist: 13 }],
  sky: { clouds: 5 },
  // vor dem ersten Baustein: Reihenfolge festhalten
  prebuild: (level) => { level._order = ['prebuild']; },
  // nach Bausteinen/Blöcken/Gegnern, vor den Items: statische Zier (wird mitverschmolzen), tiefe Plattform (Umriss)
  build: (level) => {
    level._order.push('build');
    level._buildSaw = { coins: level.entities.filter((e) => e.kind === 'coin').length, enemies: level.entities.filter((e) => e.enemy).length };
    addStatic(level, box(3, 0.4, 3, 8, Y + 0.2, -6, 0xffd23a));   // gelbe Platte (Zier aus dem Haken)
    // Streuung über 60 m (z −48 … −108): ein Teil, der Batcher verteilt ihn auf die Abschnitte
    const bits = [];
    for (let z = -48; z >= -108; z -= 4) bits.push(box(0.5, 0.3, 0.5, 11.5, Y + 0.15, z, 0x8a6a4a));
    addStatic(level, merge(bits));
    level.world.add({ type: 'box', min: [-2, -9, -30], max: [2, -8, -26], tag: 'haken-plattform' });
    level._buildParts0 = level.view?.static.stats.parts ?? 0;
    level._buildHook = true;
  },
  segments: [
    { type: 'island', pos: [0, 0, -40], size: [26, Y, 100] },
    { type: 'island', pos: [0, 0, -140], size: [20, Y, 40], shadow: false, tag: 'ohne-schatten' },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-9, Y, -10] }, { kind: 'tree', pos: [9, Y, -24] }, { kind: 'bush', pos: [-8, Y, -40] },
      { kind: 'tree', pos: [-8, Y, -130] }, { kind: 'tree', pos: [7, Y, -150] },
    ] },
    { type: 'deco', castShadow: false, items: [{ kind: 'tree', pos: [8, Y, -135] }, { kind: 'rock', pos: [-6, Y, -145], size: 1.2 }] },
    // hoher Felsblock mit Felsdeckel, wird durchscheinend, wenn er die Figur verdeckt
    { type: 'island', pos: [-9, Y, -34], size: [4, 8, 4], top: 'rock', under: 0, xray: true, id: 'durchsicht' },
  ],
  // Ameisen (gemeinsame Instanz-Gruppe): weiter als 40 m von der Figur nicht gezeichnet
  instances: { ameisensoldat: { farHide: 40 } },
  blocks: [
    { kind: 'question', pos: [-3, Y + 2.5, -8], content: 'coin' }, { kind: 'question', pos: [-2, Y + 2.5, -8], content: 'coin' },
    { kind: 'question', pos: [3, Y + 2.5, -60] }, { kind: 'question', pos: [4, Y + 2.5, -60] },
    { kind: 'brick', pos: [2, Y + 2.5, -8] }, { kind: 'brick', pos: [3, Y + 2.5, -70] },
  ],
  enemies: [
    // Pilzling-Gruppe nahe am Start (gleiche Modelle → Instanzen)
    ...[[-4, -12], [-2, -13], [0, -12], [2, -13], [4, -12], [-3, -16], [3, -16], [0, -17]].map(([x, z]) => ({ kind: 'pilzling', pos: [x, Y, z], wake: 2 })),
    // Flatterkäfer weit voraus (Detailstufe ab 22 m Kameraabstand)
    ...[[-5, -45], [0, -46], [5, -45], [-3, -50], [3, -50]].map(([x, z]) => ({ kind: 'flatterkaefer', pos: [x, Y + 0.5, z], wake: 2 })),
    // Fern-Ausblendung: nur bis 15 m von der Figur gezeichnet
    { kind: 'pilzling', id: 'fern', pos: [6, Y, -30], wake: 2, farHide: 15 },
    // Ameisen: zwei nahe am Start, zwei weit voraus (LEVEL.instances.ameisensoldat.farHide)
    ...[[-10, -4], [-11, -7], [-10, -80], [-11, -84]].map(([x, z]) => ({ kind: 'ameisensoldat', pos: [x, Y, z], wake: 2 })),
  ],
  items: [coins(-4, -40, -1.5), coins(-4, -40, 1.5), coins(-60, -120, 0), coins(-60, -120, 6)],
  goal: [0, Y, -155],
  marks: { start: [0, Y, 4], fern: [6, Y, -22], weit: [0, Y, -70], ohne: [0, Y, -135], durchsicht: [-9, Y, -40] },
};
