// Thema `stonecircle` (Welt 6: 6-B Steinkreis auf einer Wolkeninsel): heller, leicht goldener Vormittag über den Wolken;
// rings um die Arena ein Kreis hoher, bemooster Menhire mit Decksteinen, in der Ferne Schwebeinseln, unten das
// Wolkenmeer. Gelände: sattes Inselgras, warmgrauer Stein. Registriert in view/themes.js (eine Zeile).
import { cloudFloor, stoneRing } from './backdrop_w6.js';

export const STONECIRCLE_THEME = {
  label: 'Steinkreis',
  sky: [[1, 0x2a66d0], [0.45, 0x4a98ee], [0.15, 0x96d0ff], [0.02, 0xe0f0ff], [0, 0xfff6e6], [-0.15, 0xe6ecf6], [-1, 0xc4d4ec]],
  background: 0xe8f0fc,
  fog: { color: 0xe8eefa, near: 70, far: 280 },
  hemi: { sky: 0xe8f0ff, ground: 0x8aa860, intensity: 1.3 },
  sun: { color: 0xffeccc, intensity: 2.8, dir: [-0.5, 0.95, 0.4] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'stonering',
  ground: null,
  grassTop: 0x7ad84e, grassTop2: 0x68c840, grassRim: 0xb4f080, grassSide: 0x4aa83a,
  dirt: 0xc89a62, dirtDeep: 0x8a6440, rock: 0xa8a4b4, rockDeep: 0x6a6680,
  checker: false,
  stone: 0xd8d4e0, stoneDark: 0x9a96a8,
  wood: 0xe8d8b8, woodDark: 0xa8865a,
  climb: 0xd8d0c0, climbDark: 0x9a8e78,
  water: 0x46c8ff, waterDeep: 0x1a78d8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    cloudFloor(sky, bounds, rnd, Math.min(bounds.min.y, yBase) - 30, { n: 50 });
    stoneRing(sky, bounds, rnd, yBase, { pad: 14 });
  },
};
