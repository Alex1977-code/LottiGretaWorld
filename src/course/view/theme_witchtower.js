// Thema `witchtower` (Halloween-Welt: H-4 Hexenturm, vertikal): Nacht zwischen Wolkenbänken – violetter Himmel, dicke
// lila Wolken rund um den Turm und tief unten ein Wolkenmeer, ab und zu ein sanfter lila Blitzschimmer in den Wolken
// (weich an- und abschwellend, kein Knall, kein greller Blitz), schiefe Hexentürme mit grün leuchtenden Fenstern;
// grüne Zaubertrank-Funken steigen auf. Grünes Kessellicht von unten (Himmelslicht-Boden grün), Licht an Figur und
// Kesseln/Laternen. Gelände: lila-grauer Turmstein, dunkles Holz, Moos. Registriert in view/themes.js (eine Zeile).
import { stormClouds, animateStorm } from './backdrop_hw.js';
import { starField } from './backdrop_w2.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const WITCHTOWER_THEME = {
  label: 'Hexenturm',
  sky: [[1, 0x08051a], [0.4, 0x170c34], [0.14, 0x2c1a4e], [0.03, 0x3a2a56], [0, 0x2e3a48], [-0.2, 0x141228], [-1, 0x080610]],
  background: 0x1c1232,
  fog: { color: 0x26183e, near: 40, far: 175 },
  hemi: { sky: 0xb8a0f0, ground: 0x3a9a4a, intensity: 0.9 },
  sun: { color: 0xc8b8ff, intensity: 1.45, dir: [0.35, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'witchtower',
  ground: null,
  grassTop: 0x6a9a5a, grassTop2: 0x5e8e50, grassRim: 0xa8d890, grassSide: 0x3a5a3a,
  dirt: 0x5a4a6a, dirtDeep: 0x34284a, rock: 0x6a5a7a, rockDeep: 0x3a3048,
  checker: false,
  stone: 0xb8a8d0, stoneDark: 0x6a5a88,
  wood: 0xa07858, woodDark: 0x5a3e2e,
  climb: 0xc0a8c8, climbDark: 0x7a6488,
  water: 0x4ad88a, waterDeep: 0x1a8a5a,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xe0ffd8, intensity: 9, distance: 11 },
  lanternLight: { color: 0x8aff6a, intensity: 18, distance: 10 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    sky.storm = stormClouds(sky, bounds, rnd, yBase);
    starField(sky, rnd, 380, { size: 1.6, tints: [0xffffff, 0xd8d0ff, 0xc8ffd8] });
    sky.sparks = fallingParticles(sky, rnd, { n: 70, size: 0.14, fall: -0.5, sway: 0.8, colors: [0x8aff6a, 0xd8ffb0, 0xc59aff], opacity: 0.85 });
  },
  updateBackdrop(sky, dt, camera) { animateStorm(sky.storm, dt); animateFall(sky.sparks, dt, camera); },
};
