// Thema `skyway` (Welt 3: 3-2 Himmelsbahn mit Kettenzäunen): hoch über den Wolken – tiefblauer Zenit, heller Horizont,
// kräftige Sonne; tief unten ein Wolkenmeer mit Wolkenbergen (unbeleuchtet, ein Mesh), einzelne Wolken treiben vorbei.
// Gelände: frisches Gras, helle Metall-/Steinfarben für Gerüste. Registriert in view/themes.js (eine Zeile).
import { cloudSea } from './backdrop_w3.js';

export const SKYWAY_THEME = {
  label: 'Himmelsbahn',
  sky: [[1, 0x1652cc], [0.45, 0x3486ee], [0.15, 0x7cc2ff], [0.02, 0xcae8ff], [0, 0xeaf6ff], [-0.15, 0xd6eafc], [-1, 0xbcd6f2]],
  background: 0xdaecff,
  fog: { color: 0xd6eaff, near: 85, far: 320 },
  hemi: { sky: 0xd8ecff, ground: 0x8aa8d8, intensity: 1.35 },
  sun: { color: 0xfff6e0, intensity: 2.8, dir: [-0.4, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'cloudsea',
  ground: null,
  grassTop: 0x7ee052, grassTop2: 0x6cd446, grassRim: 0xb0f480, grassSide: 0x4cb83a,
  dirt: 0xa8b4c8, dirtDeep: 0x6a7890, rock: 0x9aa4b8, rockDeep: 0x606a80,
  checker: false,
  stone: 0xeef0f6, stoneDark: 0xb0b8c8,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xd8dce8, climbDark: 0x9aa0b4,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd) {
    cloudSea(sky, bounds, rnd, bounds.min.y - 28, { n: 80 });
  },
};
