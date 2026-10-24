// Thema `sneak` (Welt 5: 5-7 Schleich-Festung): Nacht über einer Lava-Festung – tiefblau-violetter Sternenhimmel mit
// Mond, dunkles kühles Licht, damit die Lichtkegel der Suchscheinwerfer (Baustein suchscheinwerfer) deutlich leuchten;
// Kulisse: glühender Lavasee tief unten, dunkle Burgmauern mit glühenden Fensterschlitzen, aufsteigende Funken.
// Gelände: dunkler Burgstein mit rötlicher Kante; Fackeln/Ketten über deco_w4. Registriert in view/themes.js.
import { lavaSea, starField } from './backdrop_w2.js';
import { castleWalls } from './backdrop_w4.js';
import { moon, fallingParticles, animateFall } from './backdrop_w3.js';

export const SNEAK_THEME = {
  label: 'Schleich-Festung',
  sky: [[1, 0x04040e], [0.4, 0x0c0a22], [0.12, 0x1c1238], [0.02, 0x3a1830], [0, 0x5a2020], [-0.2, 0x2a0c10], [-1, 0x0a0406]],
  background: 0x120c1e,
  fog: { color: 0x1a1022, near: 34, far: 160 },
  hemi: { sky: 0x6a6ab8, ground: 0x8a2a18, intensity: 0.7 },
  sun: { color: 0xb8c0ff, intensity: 1.15, dir: [-0.3, 1, 0.5] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'sneak',
  ground: null,
  grassTop: 0x5a5260, grassTop2: 0x504858, grassRim: 0xa86a5a, grassSide: 0x3a3240,
  dirt: 0x3c2c34, dirtDeep: 0x22161c, rock: 0x4c4048, rockDeep: 0x282028,
  checker: false,
  stone: 0xa8a0b0, stoneDark: 0x5c5462,
  wood: 0x7a5a42, woodDark: 0x40281c,
  climb: 0x9a8a90, climbDark: 0x5a4a50,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xb8c8ff, intensity: 6, distance: 8 },
  lanternLight: { color: 0xff8a30, intensity: 20, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    lavaSea(sky, bounds, rnd, yBase, { y: -16 });
    castleWalls(sky, bounds, rnd, yBase, { y: -17, stone: 0x241a24, stoneHi: 0x4a3a48 });
    starField(sky, rnd, 600);
    moon(sky, [-0.4, 0.5, -1], 14, 0xfff2d8);
    sky.embers = fallingParticles(sky, rnd, { n: 90, size: 0.15, fall: -1.1, sway: 0.7, colors: [0xffa032, 0xff6a12], opacity: 0.8 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.embers, dt, camera); },
};
