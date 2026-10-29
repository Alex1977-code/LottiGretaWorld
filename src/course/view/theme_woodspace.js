// Thema `woodspace` (Bonuswelt Stern: S-3 Holz-Athletik im All mit Schienenwalzen): blaugrüner Weltraum mit großem,
// freundlichem Mond, treibenden Holzbalken, Kisten und kleinen Walzen, Sternen und Sternschnuppen. Gelände: warmes Holz
// (Decken hell, Seiten dunkler), Stein hell. Warmes Licht. Registriert in view/themes.js (eine Zeile).
import { spaceSky, woodDrift, animateStar } from './backdrop_star.js';

export const WOODSPACE_THEME = {
  label: 'Holz-Athletik',
  sky: [[1, 0x021418], [0.5, 0x062a38], [0.15, 0x0e4a5a], [0.02, 0x2a6a78], [0, 0x3a7a88], [-0.25, 0x0e3442], [-1, 0x021014]],
  background: 0x0a2a36,
  fog: { color: 0x14404c, near: 100, far: 360 },
  hemi: { sky: 0xd8f4ff, ground: 0x8a5a3a, intensity: 1.3 },
  sun: { color: 0xffecd0, intensity: 2.7, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'woodspace',
  ground: null,
  grassTop: 0xe8b478, grassTop2: 0xdaa468, grassRim: 0xffd8a8, grassSide: 0xa86a3a,
  dirt: 0x8a5a32, dirtDeep: 0x5a3a1e, rock: 0x8a7a6a, rockDeep: 0x5a4a3a,
  checker: false,
  stone: 0xf4eadc, stoneDark: 0xc8b49a,
  wood: 0xf0c890, woodDark: 0xb07a40,
  climb: 0xf0d0a0, climbDark: 0xb08050,
  water: 0x5ad8e8, waterDeep: 0x1a7a9a,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1100, shooting: 3,
      nebulae: [{ dir: [0.6, 0.3, -1], size: 220, color: 0x3ad8c0, aspect: 0.45 }, { dir: [-0.6, 0.2, -1], size: 180, color: 0xffb070, aspect: 0.4 }],
      planets: [{ dir: [-0.5, 0.35, -1], r: 36, colors: [0xf4ecd8, 0xd8ccb0, 0xfff8e8], ring: false, tilt: 0.1 }],
    });
    woodDrift(sky, bounds, rnd, yBase, { n: 26 });
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
