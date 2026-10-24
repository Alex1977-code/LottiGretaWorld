// Thema `bluelava` (Welt 5: 5-3 Unterirdisch, blaue Lava): dunkle Höhle mit blauem Lavaglühen – fast schwarzes Gewölbe,
// kaltes blaues Licht von unten, Licht an der Figur und an Laternen; tief unten ein glühender blauer Lavasee, ringsum
// Tropfstein-Säulen mit blauem Saum, aufsteigende blaue Funken. Gelände: dunkler Basalt mit violetter Kante. Baustein
// `lava` erscheint in diesem Thema blau (lavaColor 'blau'; tödlich wie rote Lava). Registriert in view/themes.js.
import { blueLavaCave } from './backdrop_w5.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const BLUELAVA_THEME = {
  label: 'Blaue Lava',
  sky: [[1, 0x04040c], [0.4, 0x0a0a1e], [0.1, 0x10183a], [0, 0x183070], [-0.2, 0x10204a], [-1, 0x060a18]],
  background: 0x0a0e22,
  fog: { color: 0x0c1430, near: 26, far: 130 },
  hemi: { sky: 0x6a7ac8, ground: 0x2a8aff, intensity: 0.85 },
  sun: { color: 0x9ad0ff, intensity: 1.2, dir: [-0.2, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'bluelava',
  ground: null,
  grassTop: 0x5a5a8a, grassTop2: 0x50507e, grassRim: 0x8a9aff, grassSide: 0x3a3a62,
  dirt: 0x34304e, dirtDeep: 0x1e1a30, rock: 0x4a4668, rockDeep: 0x26223a,
  checker: false,
  stone: 0xa8b0d8, stoneDark: 0x5a6088,
  wood: 0x8a6a5a, woodDark: 0x4a3a32,
  climb: 0x9aa0c8, climbDark: 0x5a6088,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0x3ab4ff,
  lavaColor: 'blau',
  lights: [],
  playerLight: { color: 0xa8d8ff, intensity: 14, distance: 12 },
  lanternLight: { color: 0x6ac0ff, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    blueLavaCave(sky, bounds, rnd, yBase, { y: -10 });
    sky.sparks = fallingParticles(sky, rnd, { n: 140, size: 0.15, fall: -1.1, sway: 0.7, colors: [0x6ac8ff, 0x3a8aff, 0xd0f4ff], opacity: 0.9 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.sparks, dt, camera); },
};
