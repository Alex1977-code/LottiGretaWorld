// Thema `savanna` (Welt 5: 5-4 Savannenberge): warmer Nachmittag in der Savanne – blauer Himmel mit honiggelbem Dunst
// am Horizont, tiefe warme Sonne; Kulisse: goldene Grasebene tief unten, Akazien-Silhouetten mit Schirmkronen am Horizont,
// gebänderte Tafelberge und ferne blaue Berge, kreisende Geier. Gelände: goldgelbes Trockengras auf rotbraunem Lehm.
// Akazien, Termitenhügel und Grasbüschel im Level liefert deco_w5. Registriert in view/themes.js (eine Zeile).
import { savannaRing } from './backdrop_w5.js';
import { birdFlock, animateBirds } from './backdrop_w4.js';

export const SAVANNA_THEME = {
  label: 'Savanne',
  sky: [[1, 0x2a7ad8], [0.45, 0x58a6ec], [0.15, 0xa8d0e8], [0.03, 0xf0dca8], [0, 0xffe2a0], [-0.15, 0xe8b870], [-1, 0xa87a40]],
  background: 0xf4dca6,
  fog: { color: 0xf0d8a4, near: 80, far: 300 },
  hemi: { sky: 0xffeccc, ground: 0xa87a40, intensity: 1.3 },
  sun: { color: 0xffd8a0, intensity: 2.9, dir: [-0.55, 0.72, 0.42] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'savanna',
  ground: { color: 0xd8a858, y: -22 },
  grassTop: 0xe0c060, grassTop2: 0xd4b452, grassRim: 0xf4e09a, grassSide: 0xa89a40,
  dirt: 0xc8743e, dirtDeep: 0x8a4a26, rock: 0xb87a50, rockDeep: 0x7a4a2a,
  checker: false,
  stone: 0xf0d8b0, stoneDark: 0xc0986a,
  wood: 0xd8b07a, woodDark: 0x8a6440,
  climb: 0xe2c48c, climbDark: 0xa8844e,
  water: 0x58c8d8, waterDeep: 0x2a8aa8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    savannaRing(sky, bounds, rnd, yBase);
    sky.birds = birdFlock(sky, bounds, rnd, { n: 6, color: 0x3a2418 });
  },
  updateBackdrop(sky, dt) { animateBirds(sky.birds, dt); },
};
