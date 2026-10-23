// Thema `canyon` (Welt 4: 4-1 Ameisenhügel): Abendrot im Canyon – violetter Zenit, glühender Orange-Horizont, tiefe warme
// Sonne mit langen Schatten. Kulisse: geschichtete Felswände in Rot, Ocker und Creme beiderseits, Tafelberge und
// Felsnadeln am Horizont, tief unten ein trockenes Flussbett mit dünnem Bach; Geier kreisen über der Schlucht.
// Gelände: trockenes, goldgrünes Gras auf rotem, gebändertem Fels. Registriert in view/themes.js (eine Zeile).
import { canyonRing, birdFlock, animateBirds } from './backdrop_w4.js';

export const CANYON_THEME = {
  label: 'Abendrot-Canyon',
  sky: [[1, 0x2c1f5c], [0.5, 0x5e3c8c], [0.24, 0xc05c74], [0.1, 0xf0884e], [0.03, 0xffbe6e], [0, 0xffd894], [-0.15, 0xd0744c], [-1, 0x5a2a2a]],
  background: 0xf2ac70,
  fog: { color: 0xeea476, near: 75, far: 290 },
  hemi: { sky: 0xffd4ac, ground: 0x8e3c2a, intensity: 1.2 },
  sun: { color: 0xffc48a, intensity: 2.7, dir: [-0.62, 0.62, 0.42] },
  shadows: true,
  sunDisc: true,
  clouds: false,
  backdrop: 'canyon',
  ground: { color: 0xd8985c, y: -34 },
  grassTop: 0xbcc45c, grassTop2: 0xaeb652, grassRim: 0xe0e08e, grassSide: 0x808a36,
  dirt: 0xc85c3a, dirtDeep: 0x8a3622, rock: 0xb86a48, rockDeep: 0x6a3424,
  checker: false,
  stone: 0xf0dab4, stoneDark: 0xc49c72,
  wood: 0xecd8b8, woodDark: 0xaa8862,
  climb: 0xeac48e, climbDark: 0xb28252,
  water: 0x4cbcdc, waterDeep: 0x1a7aa8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    canyonRing(sky, bounds, rnd, yBase);
    sky.birds = birdFlock(sky, bounds, rnd, { n: 7, color: 0x3a1a1c });
  },
  updateBackdrop(sky, dt) { animateBirds(sky.birds, dt); },
};
