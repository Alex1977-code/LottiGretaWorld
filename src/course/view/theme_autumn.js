// Thema `autumn` (Welt 3: 3-7 Herbstwald mit Schienen und Wasserfall): goldener Herbstnachmittag – warmes, tiefes
// Sonnenlicht, cremegelber Horizont, ringsum dichter Wald in Orange, Rot und Gold (ein Mesh) vor rostroten Hügeln,
// langsam fallende Blätter (ein Punkte-Objekt vor der Kamera). Gelände: gelbgrünes Herbstgras, warme Erde.
// Herbstbäume im Level: deco_w3 herbstbaum/herbstbaeume. Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';
import { treeRing, fallingParticles, animateFall } from './backdrop_w3.js';

export const AUTUMN_THEME = {
  label: 'Herbstwald',
  sky: [[1, 0x3a74d0], [0.45, 0x68a4ec], [0.15, 0xb6d6f2], [0.03, 0xffe6c4], [0, 0xfff0d8], [-0.1, 0xf0d0a8], [-1, 0xd8a878]],
  background: 0xf8e8cc,
  fog: { color: 0xf4e0c2, near: 60, far: 235 },
  hemi: { sky: 0xfff0d8, ground: 0xb8702e, intensity: 1.3 },
  sun: { color: 0xffdcaa, intensity: 2.65, dir: [-0.55, 0.85, 0.4] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'forest',
  ground: { color: 0xb8902a, y: -30 },
  grassTop: 0xc4b44a, grassTop2: 0xb4a440, grassRim: 0xe6d47a, grassSide: 0x8a8a2c,
  dirt: 0xb8743a, dirtDeep: 0x7e4a24, rock: 0x9a7a62, rockDeep: 0x5e4a3a,
  checker: false,
  stone: 0xf0e2c8, stoneDark: 0xbca484,
  wood: 0xf2e6d0, woodDark: 0xb08a5a,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x4ab8e8, waterDeep: 0x1e78c0,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0xd8963a, 0x8a4a1e], far: [0xe0b07a, 0xa8704a], peaks: null });
    treeRing(sky, bounds, rnd, yBase, { colors: [0xe8602a, 0xf0a020, 0xd83a2a, 0xf6c040, 0xc8501e] });
    sky.leaves = fallingParticles(sky, rnd, { n: 150, size: 0.32, fall: 0.8, sway: 1.4, kind: 'leaf', colors: [0xff7a2a, 0xffb428, 0xe8402a, 0xffd04a], opacity: 0.95 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.leaves, dt, camera); },
};
