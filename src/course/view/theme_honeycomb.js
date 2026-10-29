// Thema `honeycomb` (Bonuswelt Stern: S-6 Waben im All, Draufsicht): für die Kamera senkrecht von oben gemacht – Sterne
// rundum auch unter dem Level, tief unten ein leuchtendes, goldenes Wabengitter mit schwebenden Honig-Lichtern, ringsum
// Nebel in Honig- und Violetttönen und kleine Planeten. Gelände: honiggelbe Decken, braune Körper. Mit ?theme=honeycomb@tag
// bzw. Remix-Regel light: 'tag' entsteht der Taghimmel (B-10). Registriert in view/themes.js (eine Zeile).
import { spaceSky, honeyDeep, planetoids, animateStar } from './backdrop_star.js';

export const HONEYCOMB_THEME = {
  label: 'Waben-Sternenweg',
  sky: [[1, 0x0a0618], [0.5, 0x1a0e32], [0.15, 0x2e1a4a], [0, 0x3a2456], [-0.3, 0x1a0e2a], [-1, 0x0a0614]],
  background: 0x140a24,
  fog: { color: 0x2a1a3a, near: 110, far: 380 },
  hemi: { sky: 0xffe8c8, ground: 0x8a5a3a, intensity: 1.3 },
  sun: { color: 0xfff0d0, intensity: 2.6, dir: [-0.3, 1, 0.35] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'honeycomb',
  ground: null,
  grassTop: 0xffd23a, grassTop2: 0xffc22a, grassRim: 0xfff0a0, grassSide: 0xc8881a,
  dirt: 0x9a5a1a, dirtDeep: 0x5a3010, rock: 0x8a6a4a, rockDeep: 0x5a3a2a,
  checker: false,
  stone: 0xfff4d8, stoneDark: 0xd0b080,
  wood: 0xfff0d0, woodDark: 0xc8a070,
  climb: 0xffe8a0, climbDark: 0xc8a050,
  water: 0x6ad8ff, waterDeep: 0x2a7ad8,
  lava: 0xff5a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1600, below: -1, shooting: 3,
      nebulae: [
        { dir: [-0.5, -0.6, -1], size: 260, color: 0xffa83a, aspect: 0.5 },
        { dir: [0.6, -0.5, -0.4], size: 220, color: 0x9a5aff, aspect: 0.5 },
        { dir: [0.2, 0.4, -1], size: 180, color: 0xffd86a, aspect: 0.45 },
      ],
    });
    const h = honeyDeep(sky, bounds, rnd, yBase, { y: -45 });
    f.dots.push(h.glow);
    f.honeyMat = h.mat;
    planetoids(sky, bounds, rnd, yBase - 20, { n: 8, near: 30, far: 90, palette: [[0xffd23a, 0xc88a1a], [0xb88aff, 0x6a4ab8], [0xff9a5a, 0xa85a2a]] });
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
