// Thema `dunes` (Welt 8: 8-2 Wüsten-Abfahrt auf Pflaume): ein Dünenmeer im Abendlicht – tiefblauer Himmel über einem
// orange-rosa Horizont, tiefstehende Sonne, lange Schatten auf den Dünenkämmen, am Horizont riesige Baron-Brummbär-
// Sandstatuen (Bärenkopf mit Zylinder und Monokel), feiner Sand weht vorbei. Gelände: warmer Sand mit hellen Kämmen.
// Registriert in view/themes.js (eine Zeile).
import { duneSea, animateW8 } from './backdrop_w8.js';

export const DUNES_THEME = {
  label: 'Dünen im Abendrot',
  sky: [[1, 0x1a2a6a], [0.5, 0x3a5aa8], [0.2, 0x9a7ab8], [0.07, 0xff9a6a], [0.02, 0xffc070], [0, 0xffd890], [-0.2, 0xd88a5a], [-1, 0x8a4a3a]],
  background: 0xf0a878,
  fog: { color: 0xf0b088, near: 55, far: 230 },
  hemi: { sky: 0xffd8b8, ground: 0xc8783a, intensity: 1.25 },
  sun: { color: 0xffb070, intensity: 2.5, dir: [-0.7, 0.42, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'dunes',
  ground: null,
  grassTop: 0xf0c07a, grassTop2: 0xe8b46e, grassRim: 0xffe0a8, grassSide: 0xc8884a,
  dirt: 0xd0904e, dirtDeep: 0x9a6030, rock: 0xc0905a, rockDeep: 0x8a5a32,
  checker: false,
  stone: 0xf0d8a8, stoneDark: 0xb8945e,
  wood: 0xb07a4a, woodDark: 0x6a4224,
  climb: 0xe8c890, climbDark: 0xa88050,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  sandBed: 0xe8b46e, sandBedTop: 0xf6cc88,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = duneSea(sky, bounds, rnd, yBase, { y: -6 }); },
  updateBackdrop(sky, dt, camera) { animateW8(sky.w8, dt, camera); },
};
