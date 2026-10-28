// Thema `jungle` (Welt 6: 6-4 Dschungel-Floßfahrt): schwüler, grün-goldener Dschungeltag – dunstiger Himmel, warmes Licht;
// ringsum ein lila Giftsee bis zum Horizont, Ufer voller Baumriesen mit Lianen, ferne Tafelberge im Dunst. Gelände:
// sattes Dschungelgrün, dunkle, feuchte Erde. Das Giftwasser im Level baut `giftwasser` (Welt 4), Floß/Strömung w6_water.
// Registriert in view/themes.js (eine Zeile).
import { jungleLake } from './backdrop_w6.js';

export const JUNGLE_THEME = {
  label: 'Giftsee-Dschungel',
  sky: [[1, 0x3a7ab8], [0.45, 0x6aa8c8], [0.15, 0xb8d8b0], [0.03, 0xe0ecc0], [0, 0xeef2d0], [-0.12, 0xb8c8a8], [-1, 0x6a7a5a]],
  background: 0xd8e4c0,
  fog: { color: 0xc8d8b0, near: 45, far: 210 },
  hemi: { sky: 0xe8f4c8, ground: 0x4a6a2a, intensity: 1.25 },
  sun: { color: 0xfff0b8, intensity: 2.6, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'junglelake',
  ground: null,
  seaLevel: -0.6,
  grassTop: 0x4cbc3a, grassTop2: 0x3eae30, grassRim: 0x8ae060, grassSide: 0x2a8a2a,
  dirt: 0x7a5232, dirtDeep: 0x4a3018, rock: 0x6a7a5a, rockDeep: 0x3a4a32,
  checker: false,
  stone: 0xc8d0b0, stoneDark: 0x8a9478,
  wood: 0xb8844a, woodDark: 0x6a4424,
  climb: 0x9ac85a, climbDark: 0x5a8a32,
  water: 0x3ab8a0, waterDeep: 0x1a6a5a,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd) {
    jungleLake(sky, bounds, rnd, (sky.theme.seaLevel ?? -0.6) - 0.5, { n: 34 });
  },
};
