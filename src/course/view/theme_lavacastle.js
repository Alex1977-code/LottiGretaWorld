// Thema `lavacastle` (Welt 4: 4-Burg Lavafelsen-Höhle): Lava-Burg mit Glut. Grundstimmung „aussen“: tiefroter, rauchiger
// Himmel über einem glühenden Lavasee, dunkle Burgmauern mit Zinnen und glühenden Fensterschlitzen, Türme mit roten
// Spitzdächern, aufsteigende Funken. Stimmung 'innen' (view.setMood('innen'), z. B. per Tür mit mood oder Level-Haken):
// dunkles Gewölbe, naher Rauch, Licht von der Lava unten und an der Figur. Gelände: dunkler Burgstein mit glimmender
// Kante; Fackeln/Ketten liefert deco_w4. Registriert in view/themes.js (eine Zeile).
import { lavaSea } from './backdrop_w2.js';
import { castleWalls } from './backdrop_w4.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const LAVACASTLE_THEME = {
  label: 'Lava-Burg',
  sky: [[1, 0x0a0204], [0.4, 0x26060a], [0.12, 0x5c1210], [0.02, 0xa22c14], [0, 0xd24c18], [-0.2, 0x6c1c0a], [-1, 0x1a0404]],
  background: 0x2c0806,
  fog: { color: 0x3c1008, near: 36, far: 175 },
  hemi: { sky: 0xff9c72, ground: 0xc23c12, intensity: 1.15 },
  sun: { color: 0xffb282, intensity: 1.95, dir: [-0.25, 1, 0.55] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'lavacastle',
  ground: null,
  grassTop: 0x6c5c60, grassTop2: 0x605054, grassRim: 0xc27c5a, grassSide: 0x403236,
  dirt: 0x4c3438, dirtDeep: 0x2c1a1e, rock: 0x5c4c50, rockDeep: 0x302428,
  checker: false,
  stone: 0xbaaaaa, stoneDark: 0x6c5c60,
  wood: 0x8c5c3c, woodDark: 0x4c2c1c,
  climb: 0xb8988a, climbDark: 0x7a5a4e,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffa868, intensity: 6, distance: 9 },
  lanternLight: { color: 0xff8a30, intensity: 20, distance: 11 },
  moods: {
    aussen: {},
    innen: {
      fog: { color: 0x1c0806, near: 14, far: 72 },
      background: 0x140404,
      hemi: { sky: 0x8c4c3c, ground: 0xff5c12, intensity: 0.95 },
      sun: { color: 0xff8c52, intensity: 0.85 },
      dome: 0x220606,
      playerLight: 2.4,
    },
  },
  buildBackdrop(sky, bounds, rnd, yBase) {
    lavaSea(sky, bounds, rnd, yBase, { y: -14 });
    castleWalls(sky, bounds, rnd, yBase, { y: -15 });
    sky.embers = fallingParticles(sky, rnd, { n: 160, size: 0.17, fall: -1.3, sway: 0.8, colors: [0xffa032, 0xff6a12, 0xffd462], opacity: 0.9 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.embers, dt, camera); },
};
