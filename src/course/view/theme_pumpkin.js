// Thema `pumpkin` (Halloween-Welt „Kürbisinsel“: H-1 Kürbisfeld): Abendrot über den Kürbisfeldern – lila-violetter Zenit,
// rosa Band, glühender Orange-Horizont, tiefe warme Sonne mit langen Schatten. Kulisse: Kürbisfelder mit Furchen und
// Maisreihen bis zum Horizont, rote Scheunen, lila Hügel, Krähen, sachte fallendes Herbstlaub. Gelände: herbstliches
// Gold-Grün auf rotbrauner Ackererde, warmes Holz. Stimmung 'nacht' (view.setMood('nacht')): Nacht wie pumpkin_night.
// Licht an der Figur ist schwach warm (die Laternenlicht-Bausteine machen es zur Handlaterne).
// Registriert in view/themes.js (eine Zeile).
import { pumpkinFields } from './backdrop_hw.js';
import { birdFlock, animateBirds } from './backdrop_w4.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const PUMPKIN_THEME = {
  label: 'Kürbisfeld',
  sky: [[1, 0x2a1a5c], [0.5, 0x5a3a8e], [0.26, 0xb05a8e], [0.12, 0xf07a5a], [0.04, 0xffa84a], [0, 0xffc870], [-0.15, 0xc8603a], [-1, 0x4a1e2a]],
  background: 0xf09a68,
  fog: { color: 0xe08a70, near: 60, far: 250 },
  hemi: { sky: 0xffc8a8, ground: 0x6a3a5a, intensity: 1.08 },
  sun: { color: 0xffb070, intensity: 2.35, dir: [-0.6, 0.5, 0.38] },
  shadows: true,
  sunDisc: true,
  clouds: false,
  backdrop: 'pumpkin',
  ground: { color: 0x5a3424, y: -20 },
  grassTop: 0xa8b848, grassTop2: 0x98aa40, grassRim: 0xd8d880, grassSide: 0x6a7a2e,
  dirt: 0x8a4e30, dirtDeep: 0x5a3020, rock: 0x8a6a6a, rockDeep: 0x5a4048,
  checker: false,
  stone: 0xe0c8b0, stoneDark: 0xa88a78,
  wood: 0xd09a5a, woodDark: 0x8a5a30,
  climb: 0xe8c08a, climbDark: 0xb0864e,
  water: 0x5aa8d8, waterDeep: 0x2a6aa8,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffc080, intensity: 3, distance: 8 },
  lanternLight: { color: 0xffa040, intensity: 14, distance: 10 },
  moods: {
    nacht: {
      fog: { color: 0x1a1236, near: 34, far: 160 },
      background: 0x140e2c,
      hemi: { sky: 0x8a80d8, ground: 0x3a1e3a, intensity: 0.85 },
      sun: { color: 0xa8b4ff, intensity: 1.35 },
      dome: 0x1a1440,
      playerLight: 4,
    },
  },
  buildBackdrop(sky, bounds, rnd, yBase) {
    pumpkinFields(sky, bounds, rnd, yBase);
    sky.birds = birdFlock(sky, bounds, rnd, { n: 6, color: 0x2a1a2a });
    sky.leaves = fallingParticles(sky, rnd, { n: 50, kind: 'leaf', size: 0.35, fall: 0.6, sway: 1.1, colors: [0xff9a2a, 0xd8602a, 0xffc84a, 0xb8482a], opacity: 0.9 });
  },
  updateBackdrop(sky, dt, camera) { animateBirds(sky.birds, dt); animateFall(sky.leaves, dt, camera); },
};
