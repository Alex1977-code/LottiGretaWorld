// Thema `rainbow` (Bonuswelt Stern: S-1 Regenbogenwege im All): Weltraum in Nachtblau und Violett mit zwei großen
// Regenbogen-Bögen am Himmel, Sternen, Sternschnuppen und rosa-türkisen Nebeln; tief unten treiben Wattewolken. Gelände:
// weiße Wege mit pastellbunten Kanten (Regenbogen-Plattformen färben die Bausteine selbst). Helles, warmes Licht.
// Registriert in view/themes.js (eine Zeile).
import { spaceSky, rainbowArcs, animateStar } from './backdrop_star.js';

export const RAINBOW_THEME = {
  label: 'Regenbogenweg',
  sky: [[1, 0x0a0a30], [0.5, 0x1a1450], [0.15, 0x3a2a7a], [0.02, 0x6a4aa8], [0, 0x7a5ab8], [-0.25, 0x2a2a6a], [-1, 0x0a0a28]],
  background: 0x1c1650,
  fog: { color: 0x3a2e78, near: 110, far: 380 },
  hemi: { sky: 0xffe8ff, ground: 0x8a6ad8, intensity: 1.35 },
  sun: { color: 0xfff0e0, intensity: 2.6, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: 'below',
  backdrop: 'rainbow',
  ground: null,
  grassTop: 0xffffff, grassTop2: 0xf4f0ff, grassRim: 0xffffff, grassSide: 0xffb0d8,
  dirt: 0xb8a0ff, dirtDeep: 0x7a6ad8, rock: 0xa8a0d8, rockDeep: 0x6a5ab0,
  checker: false,
  stone: 0xffffff, stoneDark: 0xd0c8f0,
  wood: 0xfff8f0, woodDark: 0xe0c8d8,
  climb: 0xfff0ff, climbDark: 0xd0a8e8,
  water: 0x7ae8ff, waterDeep: 0x3a9ae0,
  lava: 0xff6a8a,
  lights: [],
  toy: { rim: 1.35 },
  buildBackdrop(sky, bounds, rnd) {
    const f = spaceSky(sky, rnd, {
      stars: 1100, shooting: 4,
      nebulae: [
        { dir: [-0.7, 0.4, -1], size: 220, color: 0xff7ac8, aspect: 0.5 },
        { dir: [0.7, 0.3, -1], size: 200, color: 0x5ae8e0, aspect: 0.45 },
      ],
    });
    rainbowArcs(sky, { arcs: [{ dir: [-0.25, 0.05, -1], r: 150, w: 28, lift: -40 }, { dir: [0.6, 0.0, -1], r: 90, w: 18, lift: -30 }], opacity: 0.55 });
    sky.star = f;
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
