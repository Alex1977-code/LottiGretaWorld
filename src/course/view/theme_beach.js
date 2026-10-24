// Thema `beach` (Welt 5: 5-1 Sonnenstrand): strahlender Mittag am Meer – tiefblauer Zenit, heller türkiser Horizont,
// kräftige Sonne; ringsum türkises Meer bis zum Horizont mit Schaumbändern, lila Klippeninseln (die „Lila Strand-Insel“)
// und Segelbooten; Möwen kreisen. Gelände: heller Sand mit Muschelkante als Decke, warmer Sandstein darunter;
// Sandskulpturen, Palmen und Sonnenschirme liefert deco_w5. Flüsse (Ritt-Abschnitt) in Lagunen-Türkis.
// Registriert in view/themes.js (eine Zeile).
import { beachSea } from './backdrop_w5.js';
import { birdFlock, animateBirds } from './backdrop_w4.js';

export const BEACH_THEME = {
  label: 'Sonnenstrand',
  sky: [[1, 0x1466e0], [0.45, 0x2e98f6], [0.15, 0x7ad4ff], [0.03, 0xc8f4ff], [0, 0xe8fcff], [-0.1, 0x9ae8e8], [-1, 0x3ab8d0]],
  background: 0xd4f4fc,
  fog: { color: 0xd4f2fa, near: 80, far: 290 },
  hemi: { sky: 0xd8f4ff, ground: 0xe8c890, intensity: 1.35 },
  sun: { color: 0xfff2d4, intensity: 2.9, dir: [-0.38, 1, 0.48] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'beach',
  ground: null,
  grassTop: 0xf8e2a8, grassTop2: 0xf0d698, grassRim: 0xfff4d4, grassSide: 0xe0c07a,
  dirt: 0xe8b874, dirtDeep: 0xb88450, rock: 0xc8a0c8, rockDeep: 0x8a5a9a,
  checker: false,
  stone: 0xfff0dc, stoneDark: 0xd8bc98,
  wood: 0xf0d8b0, woodDark: 0xa87a4a,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x3ae0e0, waterDeep: 0x1890c8,
  lava: 0xff6a1a,
  sand: { top: 0xf8e2a8, side: 0xe0c07a, dark: 0xb88a50 },
  // Fluss-Ufer (Ritt-Abschnitt, blocks/types/river.js): Lagunenwasser, Sandstein-Ufer, Strandgras
  jungle: {
    water: 0x2ad8e0, waterDeep: 0x149ac8, waterEdge: 0x9af8f0, foam: 0xf4ffff,
    bankRock: 0xd8b07a, bankRockDark: 0xa87a4a, moss: 0xb8d870, lip: 0xf8e2a8, floor: 0xf8e2a8, floor2: 0xf0d698,
    skirt: 0xe0c07a, skirtDark: 0xb88a50, lowland: 0x3ae0e0,
    palmTrunk: 0xb88a52, palmTrunkDark: 0x7a5630, frond: 0x3cc06a, frondLight: 0x8af0a0, frondDark: 0x1e7a4a,
    canopy: [[0x6fd04a, 0x3a9a32, 0x226a22], [0x86dc52, 0x48aa36, 0x2a7426]],
    blooms: [0xff4f7a, 0xff9a2e, 0xffd23a, 0xff6ad5, 0xffffff],
  },
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    beachSea(sky, bounds, rnd, yBase, { y: -1.2 });
    sky.birds = birdFlock(sky, bounds, rnd, { n: 8, color: 0xf8f8ff });
  },
  updateBackdrop(sky, dt) { animateBirds(sky.birds, dt); },
};
