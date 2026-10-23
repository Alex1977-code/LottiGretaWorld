// Thema `water` (Welt 3: 3-5 Röhrenlagune; See-Abschnitte): tropische Lagune am Mittag – leuchtender Himmel, kräftige
// Sonne, helles Türkis; ringsum Meer bis zum Horizont (hell nah, tiefblau fern, Schaumbänder) mit grünen Inseln (zwei
// Meshes; das Meer spart den Level-Umriss aus, damit Lagunen und Unterwasser-Abschnitte im Level sichtbar bleiben).
// Unterwasser-Stimmung (view/mood.js): automatisch, sobald der Kopf der Figur unter Wasser ist (der Motor kann
// view.setUnderwater(on) rufen): türkis-blauer naher Nebel, gedämpftes, kühles Licht, wandernde Lichtflecken und
// Lichtstrahlen. Gelände: tropisches Gras, Sand als Körper. Registriert in view/themes.js (eine Zeile).
import { seaPlane } from './backdrop_w3.js';

export const WATER_THEME = {
  label: 'Lagune',
  sky: [[1, 0x1676e6], [0.45, 0x3aa2f8], [0.15, 0x8ad6ff], [0.03, 0xd8f6ff], [0, 0xeafcff], [-0.1, 0xc8f0f4], [-1, 0x9ad8e8]],
  background: 0xdaf6fc,
  fog: { color: 0xd8f4fa, near: 72, far: 270 },
  hemi: { sky: 0xd8f8ff, ground: 0x5ac0b0, intensity: 1.35 },
  sun: { color: 0xfff4d8, intensity: 2.85, dir: [-0.4, 1, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'sea',
  ground: null,
  seaLevel: 0,
  grassTop: 0x76e05a, grassTop2: 0x66d24c, grassRim: 0xaaf280, grassSide: 0x44b03a,
  dirt: 0xf0d090, dirtDeep: 0xd0a868, rock: 0xb8a088, rockDeep: 0x7a6858,
  checker: false,
  stone: 0xf4ecda, stoneDark: 0xc8b898,
  wood: 0xf0d8b0, woodDark: 0xa87a4a,
  climb: 0xf0d9a8, climbDark: 0xc9a46a,
  water: 0x46dcdc, waterDeep: 0x1890c0,
  lava: 0xff6a1a,
  sandBed: 0xf0d8a0, sandBedTop: 0xf6e4b4,
  lights: [],
  underwater: {
    fog: { color: 0x137aa4, near: 2.5, far: 46 },
    background: 0x0e5a84,
    hemi: { sky: 0xa0f4ff, ground: 0x0a4a6a, intensity: 1.2 },
    sun: { color: 0xc8f6ff, intensity: 1.6 },
    dome: 0x2a86b4,
    caustics: 0.5,
    color: 0xb4ffff,
  },
  buildBackdrop(sky, bounds, rnd) {
    seaPlane(sky, bounds, rnd, (sky.theme.seaLevel ?? 0) - 0.6, { hole: 6 });
  },
};
