// Thema `desert` (Welt 2: 2-1 Wüstenschlucht, 2-Panzer): heißer Mittag – tiefblauer Himmel, der zum Horizont in
// warmes Sandgelb übergeht, kräftige Sonne, flirrender Sanddunst; ringsum Dünen und geschichtete Tafelberge aus rotem
// Sandstein (Kulisse über theme.buildBackdrop, ein Mesh). Gelände: Sanddecke statt Gras, Sandstein-Körper, türkises
// Oasenwasser. Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';

export const DESERT_THEME = {
  label: 'Wüste',
  sky: [[1, 0x1c64c8], [0.45, 0x3a94e6], [0.15, 0x8acdf0], [0.04, 0xf4e4b8], [0, 0xffe2a4], [-0.1, 0xf0c27e], [-1, 0xd29a5a]],
  background: 0xf4dcaa,
  fog: { color: 0xf3d8a6, near: 75, far: 270 },
  hemi: { sky: 0xd6eaff, ground: 0xe0a85c, intensity: 1.35 },
  sun: { color: 0xfff0c8, intensity: 3.0, dir: [-0.35, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'dunes',
  ground: { color: 0xe8be72, y: -30 },
  // Gelände: „Gras“ = Sanddecke, „Erde“ = roter Sandstein
  grassTop: 0xf4d58c, grassTop2: 0xecc87a, grassRim: 0xfff0c0, grassSide: 0xdcaa5e,
  dirt: 0xd9864a, dirtDeep: 0xa8562c, rock: 0xc8784a, rockDeep: 0x8a4a2a,
  checker: false,
  stone: 0xf2dcae, stoneDark: 0xc9a46e,
  wood: 0xe0a868, woodDark: 0x96602e,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x2fd4e2, waterDeep: 0x168cb8,
  lava: 0xff6a1a,
  lights: [],
  sand: { light: 0xffe7a6, mid: 0xf8d47c, dark: 0xd29a48, wet: 0xb98a4a },
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0xf8dc9a, 0xd8a258], far: [0xf6e2b8, 0xdcb27a], peaks: null, flat: 0.6, mesas: 8 });
  },
};
