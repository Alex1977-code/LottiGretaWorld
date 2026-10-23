// Thema `race` (Welt 3: 3-6 Bergrennen): sonniger Alpentag im Kart-Rennstil – kräftiger Himmel, klare Luft, große Berge
// mit Schneekappen ringsum, bunte Wimpelmasten entlang der Strecke (zwei Meshes). Gelände: sattes Gras, warmer Fels;
// Banden, Start-/Zielbogen und Boost-Teile liefern die Bausteine (w3_race.js). Registriert in view/themes.js (eine Zeile).
import { hillRing } from './backdrop_w2.js';
import { flagPoles } from './backdrop_w3.js';

export const RACE_THEME = {
  label: 'Bergrennen',
  sky: [[1, 0x1a62d6], [0.45, 0x3a92f2], [0.15, 0x86cdff], [0.03, 0xd2efff], [0, 0xeaf8ff], [-0.1, 0xcfe6f2], [-1, 0xa8c8dc]],
  background: 0xd4ecfb,
  fog: { color: 0xd6ecfa, near: 80, far: 290 },
  hemi: { sky: 0xc8e8ff, ground: 0x7aae58, intensity: 1.3 },
  sun: { color: 0xfff2d6, intensity: 2.8, dir: [-0.42, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'mountains',
  ground: { color: 0x6ac04a, y: -40 },
  grassTop: 0x6cd844, grassTop2: 0x5ec83c, grassRim: 0xa2ee6a, grassSide: 0x44a830,
  dirt: 0xc88a52, dirtDeep: 0x8e5a32, rock: 0x9a8a80, rockDeep: 0x605650,
  checker: false,
  stone: 0xe8e4e0, stoneDark: 0xb0aaa4,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    hillRing(sky, bounds, rnd, yBase, { near: [0x8ade5a, 0x3e9a3a], far: [0xa8d8b0, 0x6a9a7a], peaks: [0x8a96b8, 0xffffff] });
    flagPoles(sky, bounds, rnd, yBase, { y: bounds.min.y });
  },
};
