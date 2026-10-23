// Thema `train` (Welt 3: 3-Zug Zugfahrt): weite Schneeebene am späten Nachmittag – tief stehende, warme Sonne,
// pfirsichfarbener Horizont, kühles Blau oben; nahe unter dem Gleis eine verschneite Ebene (Boden), ringsum verschneite
// Tannenwälder und ferne weiße Berge (zwei Meshes), leichter Schneefall. Gelände: Schneedecken, dunkles Holz.
// Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';
import { treeRing, fallingParticles, animateFall } from './backdrop_w3.js';

export const TRAIN_THEME = {
  label: 'Zugfahrt',
  sky: [[1, 0x325ea8], [0.45, 0x6290d0], [0.15, 0xb2c4e6], [0.03, 0xffd6b6], [0, 0xffe2c6], [-0.1, 0xe8d0d6], [-1, 0xc8c0d8]],
  background: 0xf2e2de,
  fog: { color: 0xf0e2de, near: 85, far: 310 },
  hemi: { sky: 0xfff0e8, ground: 0x7484c4, intensity: 1.3 },
  sun: { color: 0xffd6aa, intensity: 2.5, dir: [-0.6, 0.7, 0.3] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'plain',
  ground: { color: 0xeef2fa, y: -8 },
  grassTop: 0xf6faff, grassTop2: 0xe8f0fa, grassRim: 0xffffff, grassSide: 0xc0d4ee,
  dirt: 0x7a5a48, dirtDeep: 0x4a3428, rock: 0x8a8a9a, rockDeep: 0x5a5a6a,
  checker: false,
  stone: 0xece8f0, stoneDark: 0xaaa4b8,
  wood: 0xc89a6a, woodDark: 0x7a5232,
  climb: 0xe8e0d8, climbDark: 0xa89a8a,
  water: 0x6ac8ee, waterDeep: 0x2a7ac8,
  lava: 0xff6a1a,
  iceBody: 0x9ac4e6,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase + 22, { near: [0xffffff, 0xc8d6ee], far: [0xf6f8ff, 0xbac8e6], peaks: [0x9aaad2, 0xffffff], flat: 0.35 });
    treeRing(sky, bounds, rnd, yBase, { fir: true, colors: [0x2a6a4a, 0x1e5a40, 0x347a52], trunk: 0x4a3226 });
    sky.snowfall = fallingParticles(sky, rnd, { n: 160, size: 0.18, fall: 1.6, sway: 0.5, kind: 'snow', opacity: 0.8 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.snowfall, dt, camera); },
};
