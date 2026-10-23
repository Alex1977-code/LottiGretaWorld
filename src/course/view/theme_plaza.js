// Thema `plaza` (Welt 3: 3-4 Pastell-Garten, 100 s): heller, freundlicher Vormittag – Himmel mit rosa Horizont, sehr
// weiches Licht, Pastellfarben: rosa Grasdecken, cremefarbene Erde, mintgrüne und fliederfarbene Hügel mit hellen
// Kuppen ringsum (ein Mesh). Für Blöcke im Mosaik-Look: Baustein bunter_stein; Kulisse pastell_blume, hecken_hase.
// Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';

export const PLAZA_THEME = {
  label: 'Pastell-Garten',
  sky: [[1, 0x5a98ee], [0.45, 0x8cc2ff], [0.15, 0xcae6ff], [0.03, 0xfff0f6], [0, 0xfff6fa], [-0.1, 0xf6e2ee], [-1, 0xe0c2dc]],
  background: 0xfbf0f6,
  fog: { color: 0xf8eef6, near: 70, far: 260 },
  hemi: { sky: 0xfff2fa, ground: 0xd8a8cc, intensity: 1.4 },
  sun: { color: 0xfff6ee, intensity: 2.55, dir: [-0.42, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'pastel',
  ground: { color: 0xc8f0dc, y: -34 },
  grassTop: 0xffaad8, grassTop2: 0xf89ecc, grassRim: 0xffd8ee, grassSide: 0xea7cba,
  dirt: 0xf6e2c6, dirtDeep: 0xe2c49c, rock: 0xd8c8e8, rockDeep: 0xa898c0,
  checker: false,
  stone: 0xd2f4e4, stoneDark: 0x9ad8c0,
  wood: 0xfff6ee, woodDark: 0xe0c8d8,
  climb: 0xfff0f6, climbDark: 0xe0b8d0,
  water: 0x7ad8ff, waterDeep: 0x3a9ae8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0xcaf4de, 0x8cd6b4], far: [0xece0ff, 0xbca6ea], peaks: [0xffd4e4, 0xfffafc] });
  },
};
