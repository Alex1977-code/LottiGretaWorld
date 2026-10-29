// Thema `galaxy` (Bonuswelt Stern: S-2 Planetoiden-Hommage, eigene Gestaltung): tiefblauer Weltraum mit einer großen,
// rosa-goldenen Sternenwirbel-Wolke, ringsum viele kleine Planetoiden mit Grashaube, Bäumchen und Ringen, Sternschnuppen.
// Gelände: grüne Grasdecken über lila Sternenerde (wie die Planetoiden). Registriert in view/themes.js (eine Zeile).
import { spaceSky, planetoids, animateStar } from './backdrop_star.js';

export const GALAXY_THEME = {
  label: 'Planetoiden',
  sky: [[1, 0x02021a], [0.5, 0x0a0a38], [0.15, 0x1a1a5a], [0.02, 0x3a2a7a], [0, 0x48308a], [-0.25, 0x1a1450], [-1, 0x040418]],
  background: 0x0e0c34,
  fog: { color: 0x221a50, near: 110, far: 380 },
  hemi: { sky: 0xc8d8ff, ground: 0x6a4aa8, intensity: 1.3 },
  sun: { color: 0xfff2e0, intensity: 2.7, dir: [-0.45, 1, 0.4] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'galaxy',
  ground: null,
  grassTop: 0x7ae05a, grassTop2: 0x6ad04a, grassRim: 0xb0f888, grassSide: 0x4ab03a,
  dirt: 0x8a62c8, dirtDeep: 0x4a2a88, rock: 0x7a6ab0, rockDeep: 0x3a2a70,
  checker: false,
  stone: 0xeae4ff, stoneDark: 0xa89ad8,
  wood: 0xfff0e0, woodDark: 0xc8a888,
  climb: 0xe8dcff, climbDark: 0xa890e0,
  water: 0x6ad8ff, waterDeep: 0x2a7ad8,
  lava: 0xff6a1a,
  lights: [],
  toy: { rim: 1.3 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1500, shooting: 4,
      nebulae: [
        { dir: [-0.15, 0.42, -1], size: 260, color: 0xff7ab8, aspect: 0.32 },
        { dir: [-0.1, 0.44, -1], size: 150, color: 0xffd07a, aspect: 0.26 },
        { dir: [0.0, 0.43, -1], size: 70, color: 0xffffff, aspect: 0.4 },
        { dir: [0.75, 0.15, -1], size: 160, color: 0x6a8aff, aspect: 0.5 },
      ],
      planets: [
        { dir: [0.65, 0.3, -1], r: 22, colors: [0x5ad86a, 0xa8f088, 0xfff0a0], ring: true, tilt: -0.3 },
        { dir: [-0.8, 0.12, -1], r: 14, colors: [0xff9a4a, 0xffd08a, 0xffffff], ring: false },
      ],
    });
    planetoids(sky, bounds, rnd, yBase, { n: 20, near: 22, far: 95, scale: 1 });
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
