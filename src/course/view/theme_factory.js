// Thema `factory` (Welt 6: 6-6 Maschinenhalle im Himmel): Stahl im blauen Himmel – kräftige Sonne, Wolken; ringsum
// Stahltürme mit gelben Warnstreifen, Querträger, Rohre und riesige, langsam drehende Zahnräder, unten das Wolkenmeer.
// Gelände: Stahlplatten mit gelber Kante, dunkler Stahl als Körper. Förderbänder liefert w6_conveyor, Zahnräder im Level
// deco_w6. Registriert in view/themes.js (eine Zeile).
import { cloudFloor, skyFactory, animateGears } from './backdrop_w6.js';

export const FACTORY_THEME = {
  label: 'Himmels-Maschinenhalle',
  sky: [[1, 0x1a5ac8], [0.45, 0x3a8ae8], [0.15, 0x86c4f8], [0.02, 0xd0ecff], [0, 0xeef6ff], [-0.15, 0xd6e4f4], [-1, 0xb4c8e4]],
  background: 0xdae8f8,
  fog: { color: 0xd4e4f6, near: 75, far: 300 },
  hemi: { sky: 0xdce8ff, ground: 0x6a7488, intensity: 1.3 },
  sun: { color: 0xfff2dc, intensity: 2.8, dir: [-0.4, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'skyfactory',
  ground: null,
  grassTop: 0xb4bccc, grassTop2: 0xa6aec0, grassRim: 0xffc83a, grassSide: 0x6a7488,
  dirt: 0x5a6272, dirtDeep: 0x3a4252, rock: 0x7a8496, rockDeep: 0x4a5264,
  checker: false,
  stone: 0xdce0ea, stoneDark: 0x9aa2b4,
  wood: 0xc8a070, woodDark: 0x7a5a32,
  climb: 0xc8ccd8, climbDark: 0x7a8296,
  water: 0x46c8ff, waterDeep: 0x1a78d8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    cloudFloor(sky, bounds, rnd, Math.min(bounds.min.y, yBase) - 34, { n: 55 });
    sky.factory = skyFactory(sky, bounds, rnd, yBase, { n: 12, gears: 6 });
  },
  updateBackdrop(sky, dt) { animateGears(sky.factory, dt); },
};
