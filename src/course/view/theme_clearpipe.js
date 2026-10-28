// Thema `clearpipe` (Welt 6: 6-1 Glasröhren-Bergland): strahlender Tag hoch über den Wolken – tiefblauer Zenit, kräftige
// Sonne; tief unten ein Wolkenmeer, aus dem grüne Berggipfel mit Schneekappen und Bergkiefern ragen, zwischen ihnen ferne
// Glasröhren-Bögen. Gelände: frisches Berggras, hellgrauer Bergfels als Körper. Registriert in view/themes.js (eine Zeile).
import { cloudFloor, cloudPeaks } from './backdrop_w6.js';

export const CLEARPIPE_THEME = {
  label: 'Glasröhren-Bergland',
  sky: [[1, 0x1458d8], [0.45, 0x2e8cf4], [0.15, 0x78c8ff], [0.02, 0xc8ecff], [0, 0xeef8ff], [-0.15, 0xdaecfc], [-1, 0xbcd6f2]],
  background: 0xdcefff,
  fog: { color: 0xd8ecff, near: 85, far: 320 },
  hemi: { sky: 0xd8ecff, ground: 0x7aa86a, intensity: 1.35 },
  sun: { color: 0xfff4dc, intensity: 2.85, dir: [-0.42, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'cloudpeaks',
  ground: null,
  grassTop: 0x72dc4c, grassTop2: 0x62d03e, grassRim: 0xaef27e, grassSide: 0x46b036,
  dirt: 0xa8a4b8, dirtDeep: 0x6e6a82, rock: 0x9a96b0, rockDeep: 0x5e5a74,
  checker: false,
  stone: 0xf0f2f8, stoneDark: 0xb4b8c8,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,
  climb: 0xd8dce8, climbDark: 0x9aa0b4,
  water: 0x46c8ff, waterDeep: 0x1a78d8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    const y = Math.min(bounds.min.y, yBase) - 26;
    cloudFloor(sky, bounds, rnd, y, { n: 60 });
    cloudPeaks(sky, bounds, rnd, y, { n: 16, snow: 0.74, pipes: true });
  },
};
