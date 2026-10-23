// Thema `bounce` (Welt 4: 4-4 Hüpfweg über die Bergwiese): heller, klarer Sommerhimmel über Bergwiesen – kräftige Sonne,
// weiße Wolken, sattgrüne Hügel mit bunten Blumentupfen, Berge mit Schneekappen, in der Ferne schweben bunte
// Heißluftballons. Gelände: saftiges Wiesengras auf hellbrauner Erde. Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';
import { meadowFlowers, balloons, animateBalloons } from './backdrop_w4.js';

export const BOUNCE_THEME = {
  label: 'Bergwiese',
  sky: [[1, 0x2a86f0], [0.45, 0x4caaff], [0.15, 0x94d6ff], [0.03, 0xd6f2ff], [0, 0xf2fbff], [-0.1, 0xdaf0fa], [-1, 0xbadaec]],
  background: 0xd6f0fc,
  fog: { color: 0xdcf2fc, near: 85, far: 310 },
  hemi: { sky: 0xd2eeff, ground: 0x7cba4c, intensity: 1.35 },
  sun: { color: 0xfff4de, intensity: 2.9, dir: [-0.4, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'bounce',
  ground: { color: 0x8cda62, y: -30 },
  grassTop: 0x88e250, grassTop2: 0x7ad646, grassRim: 0xc2f88c, grassSide: 0x54b63a,
  dirt: 0xca9c6c, dirtDeep: 0x8c6642, rock: 0x9ca2aa, rockDeep: 0x606872,
  checker: false,
  stone: 0xf0f2f6, stoneDark: 0xb8bcc8,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0x9eea6c, 0x4ca242], far: [0xbaeaa8, 0x7cba8c], peaks: [0x8aa6ca, 0xffffff] });
    meadowFlowers(sky, bounds, rnd, yBase, { n: 280 });
    sky.balloons = balloons(sky, bounds, rnd, { n: 6 });
  },
  updateBackdrop(sky, dt) { animateBalloons(sky.balloons, dt); },
};
