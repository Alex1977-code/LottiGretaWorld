// Thema `grotto` (Bonuswelt Stern: S-7 übergroßer Dschungel mit Unterwasser-Abschnitt): sattgrünes Blätterdach-Licht,
// dunstiger, warmer Dschungelnebel; ringsum riesige Bäume mit Blätterkronen, gepunktete Riesenpilze, Riesenblätter und
// Lianen – alles übergroß. Unter Wasser (automatisch, sobald der Kopf der Figur im Wasser ist) klares Türkis mit
// Lichtflecken. Gelände: Moos auf dunkler Walderde. Registriert in view/themes.js (eine Zeile).
import { jungleGiants, animateStar } from './backdrop_star.js';
import { embers } from './backdrop_w7.js';

export const GROTTO_THEME = {
  label: 'Riesengrotte',
  sky: [[1, 0x3a8a6a], [0.45, 0x6ab88a], [0.15, 0xa8d8a0], [0.02, 0xd8f0b8], [0, 0xe8f6c8], [-0.15, 0x6aa86a], [-1, 0x2a5a3a]],
  background: 0x8ac898,
  fog: { color: 0x9ad0a0, near: 45, far: 190 },
  hemi: { sky: 0xe0ffd0, ground: 0x4a7a3a, intensity: 1.25 },
  sun: { color: 0xfff4c8, intensity: 2.4, dir: [-0.3, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'grotto',
  ground: { color: 0x4a8a3a, y: -14 },
  grassTop: 0x5ad04a, grassTop2: 0x4ac03a, grassRim: 0x9af07a, grassSide: 0x2a9a3a,
  dirt: 0x7a5032, dirtDeep: 0x4a2e1a, rock: 0x7a7a6a, rockDeep: 0x4a4a3a,
  checker: false,
  stone: 0xe0e8c8, stoneDark: 0xa0a888,
  wood: 0xd8b07a, woodDark: 0x8a5a2a,
  climb: 0xb8e090, climbDark: 0x6aa850,
  water: 0x3ad8c8, waterDeep: 0x1a8a9a,
  lava: 0xff6a1a,
  lights: [],
  underwater: {
    fog: { color: 0x1a8a8a, near: 3, far: 42 },
    background: 0x147070,
    hemi: { sky: 0xb8fff0, ground: 0x2a6a4a, intensity: 1.2 },
    sun: { color: 0xf0ffe8, intensity: 1.4 },
    dome: 0x1a7a7a,
    caustics: 0.4,
    color: 0xd8fff0,
    playerLight: 0.6,
  },
  buildBackdrop(sky, bounds, rnd, yBase) {
    jungleGiants(sky, bounds, rnd, yBase, { y: -14, n: 28 });
    // schwebende Pollen/Glühwürmchen
    sky.star = { t: 0, embers: [embers(sky, rnd, { n: 90, box: [40, 18, 40], colors: [0xfff4a0, 0xd0ff9a], size: 0.18, flow: [0.2, 0.3, 0.1], sway: 0.8, opacity: 0.8 })] };
  },
  updateBackdrop(sky, dt, camera) { animateStar(sky.star, dt, camera); },
};
