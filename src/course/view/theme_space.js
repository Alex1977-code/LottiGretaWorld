// Thema `space` (Welt 2: 2-2 Weltraum mit Tastensteinen): Nacht im All – fast schwarzer, violetter Himmel mit
// Sternenfeld, leuchtenden Nebeln und großen Ringplaneten (alles in der Himmelskuppel, folgt der Kamera: 3 Meshes),
// kühles Sternenlicht, kein Boden unter den schwebenden Inseln. Gelände: lavendelfarbene Decken, tiefviolette
// Körper, helle Stein-/Brückenfarben. Registriert in view/themes.js (eine Zeile).
import { starField, farPlanets, nebulae } from './backdrop_w2.js';

export const SPACE_THEME = {
  label: 'Weltraum',
  sky: [[1, 0x04030c], [0.5, 0x0c0826], [0.15, 0x1e1648], [0.02, 0x3a2670], [0, 0x48307e], [-0.2, 0x1a1040], [-1, 0x05030f]],
  background: 0x0a0720,
  fog: { color: 0x1c1442, near: 95, far: 330 },
  hemi: { sky: 0xc0ccff, ground: 0x6a4aa8, intensity: 1.25 },
  sun: { color: 0xf4f0ff, intensity: 2.6, dir: [-0.4, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'space',
  ground: null,
  grassTop: 0xc8b6ff, grassTop2: 0xb9a4f8, grassRim: 0xece2ff, grassSide: 0x8a6ae0,
  dirt: 0x6a54b8, dirtDeep: 0x382a78, rock: 0x7a6aa8, rockDeep: 0x4a3a78,
  checker: false,
  stone: 0xe6e2f6, stoneDark: 0xa8a0cc,
  wood: 0xf4f0ff, woodDark: 0xbcb4e0,
  climb: 0xe8dcff, climbDark: 0xa890e0,
  water: 0x5ad8ff, waterDeep: 0x2a7ad8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd) {
    sky.starPoints = starField(sky, rnd, 1100);
    nebulae(sky, [
      { dir: [-0.6, 0.35, -1], size: 230, color: 0x8a3ad8 },
      { dir: [0.7, 0.2, -1], size: 190, color: 0x2a8ad8, aspect: 0.5 },
      { dir: [0.1, 0.55, -1], size: 160, color: 0xd83aa0, aspect: 0.45 },
    ]);
    farPlanets(sky, [
      { dir: [-0.55, 0.32, -1], r: 34, colors: [0xff9a3a, 0xffd07a, 0xfff0c0], ring: true, tilt: 0.35 },
      { dir: [0.75, 0.16, -1], r: 18, colors: [0x3a8aff, 0x8ad0ff, 0xe0f4ff], ring: false, tilt: -0.2 },
      { dir: [0.25, 0.6, -0.8], r: 11, colors: [0x9a5ae8, 0xd0a0ff, 0xffe0ff], ring: true, tilt: 0.6 },
      { dir: [-1, 0.05, 0.2], r: 22, colors: [0x3fc87a, 0xa0f0b0, 0xf0fff0], ring: false },
    ]);
  },
  updateBackdrop(sky, dt) {
    if (!sky.starPoints) return;
    sky._tw = (sky._tw ?? 0) + dt;
    sky.starPoints.material.size = 2.1 + Math.sin(sky._tw * 1.7) * 0.25;
  },
};
