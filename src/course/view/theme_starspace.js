// Thema `starspace` (Bonuswelt Stern „Sternenzelt“, Weltraum-Grundthema): tiefblauer Sternenhimmel rundum, weiche Nebel in
// Pastellfarben (rosa, mint, pfirsich, flieder), ferne Ringplaneten, Sternschnuppen, ein paar kleine Planetoiden um das
// Level. Kühles, freundliches Licht (Figuren gut lesbar), Gelände: lavendel-weiße Sternenstein-Decken, fliederfarbene
// Körper. Das Welt-2-Thema `space` (2-2) bleibt unverändert. Registriert in view/themes.js (eine Zeile).
import { spaceSky, planetoids, animateStar } from './backdrop_star.js';

export const STARSPACE_THEME = {
  label: 'Sternenzelt',
  sky: [[1, 0x050420], [0.5, 0x0e0c3a], [0.15, 0x2a2468], [0.02, 0x4a3a8a], [0, 0x5a4898], [-0.25, 0x241a5a], [-1, 0x08061e]],
  background: 0x14103a,
  fog: { color: 0x2a2258, near: 100, far: 360 },
  hemi: { sky: 0xd0d8ff, ground: 0x7a5ab8, intensity: 1.3 },
  sun: { color: 0xfff4ff, intensity: 2.6, dir: [-0.4, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'starspace',
  ground: null,
  grassTop: 0xece4ff, grassTop2: 0xdcd0fa, grassRim: 0xffffff, grassSide: 0xb49ef0,
  dirt: 0x8a72d8, dirtDeep: 0x4a3a98, rock: 0x8a7ac0, rockDeep: 0x4a3a80,
  checker: false,
  stone: 0xf0ecff, stoneDark: 0xb0a4d8,
  wood: 0xfff4e8, woodDark: 0xd0b8a8,
  climb: 0xf0e4ff, climbDark: 0xa890e0,
  water: 0x7ae0ff, waterDeep: 0x3a8ad8,
  lava: 0xff6a8a,
  lights: [],
  toy: { rim: 1.35 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    const f = spaceSky(sky, rnd, {
      stars: 1400, shooting: 5,
      nebulae: [
        { dir: [-0.7, 0.3, -1], size: 240, color: 0xff9ad0, aspect: 0.55 },
        { dir: [0.6, 0.22, -1], size: 210, color: 0x7af0c8, aspect: 0.5 },
        { dir: [0.05, 0.5, -1], size: 180, color: 0xffc08a, aspect: 0.4 },
        { dir: [-0.2, -0.3, -1], size: 220, color: 0xb89aff, aspect: 0.6 },
      ],
      planets: [
        { dir: [-0.6, 0.3, -1], r: 30, colors: [0xffb0d8, 0xffe0f0, 0xfff6c8], ring: true, tilt: 0.35 },
        { dir: [0.75, 0.14, -1], r: 16, colors: [0x8ad8ff, 0xd0f4ff, 0xffffff], ring: false, tilt: -0.2 },
        { dir: [0.3, 0.6, -0.8], r: 10, colors: [0xffe07a, 0xfff4c0, 0xffd8f0], ring: true, tilt: 0.6 },
      ],
    });
    planetoids(sky, bounds, rnd, yBase, { n: 8, near: 40, far: 110, scale: 0.9 });
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
