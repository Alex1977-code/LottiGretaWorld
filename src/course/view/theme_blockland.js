// Thema `blockland` (Bonuswelt Stern: S-5 Retro-Riesenblock-Grasland, eigene Gestaltung): heller Taghimmel, tief unten
// eine weite Wiese mit bunten Riesenblöcken (Nieten-Kanten), runden Hügeln, Retro-Wolken aus drei Kugeln; die Grasdecken
// tragen ein Raster (Retro-Felder). Kräftige Grundfarben, Sonne. Registriert in view/themes.js (eine Zeile).
import { blockScape, animateStar } from './backdrop_star.js';

export const BLOCKLAND_THEME = {
  label: 'Riesenblockland',
  sky: [[1, 0x2a7ae8], [0.45, 0x4aa8ff], [0.15, 0x8ad0ff], [0.03, 0xc8ecff], [0, 0xe8f8ff], [-0.1, 0xc8e4f8], [-1, 0x9ac4e0]],
  background: 0xc8e8fc,
  fog: { color: 0xcfeafc, near: 90, far: 320 },
  hemi: { sky: 0xc8e8ff, ground: 0x7ab858, intensity: 1.3 },
  sun: { color: 0xfff2d8, intensity: 2.7, dir: [-0.42, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: 'above',
  backdrop: 'blockland',
  ground: null,
  grassTop: 0x6ae04a, grassTop2: 0x58cc3a, grassRim: 0xa8f078, grassSide: 0x3aa830,
  dirt: 0xe0904a, dirtDeep: 0xa85a2a, rock: 0x9a8a96, rockDeep: 0x6a5a66,
  checker: true,
  stone: 0xf4f2ea, stoneDark: 0xc0bcb0,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { blockScape(sky, bounds, rnd, yBase, { y: -20 }); sky.star = { t: 0 }; },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
