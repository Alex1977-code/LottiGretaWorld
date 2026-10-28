// Thema `fuzzymine` (Welt 6: 6-7 senkrechter Minenschacht): warmes Dunkel eines Schachts, der nach oben führt – Felswände
// rings um den Level über die ganze Höhe, Holz-Stützrahmen, Laternen, blau leuchtende Kristalladern, oben eine helle
// Öffnung; Staub schwebt. Licht an der Figur und an Laternen (view.addLantern, deco_w6 minenlampe). Gelände: Holzbohlen,
// dunkler Fels. Registriert in view/themes.js (eine Zeile).
import { mineShaftUp } from './backdrop_w6.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const FUZZYMINE_THEME = {
  label: 'Wuschel-Schacht',
  sky: [[1, 0xfff0d0], [0.6, 0x6a5038], [0.3, 0x2a1c12], [0, 0x1a120c], [-1, 0x0a0604]],
  background: 0x1c140e,
  fog: { color: 0x24180e, near: 20, far: 95 },
  hemi: { sky: 0xe0b888, ground: 0x4a3020, intensity: 0.8 },
  sun: { color: 0xffe0b0, intensity: 1.1, dir: [-0.2, 1, 0.3] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'mineshaft',
  ground: null,
  grassTop: 0xa87a4e, grassTop2: 0x9a6e44, grassRim: 0xd8a868, grassSide: 0x6a4a2e,
  dirt: 0x5a4030, dirtDeep: 0x34241a, rock: 0x6a5a4e, rockDeep: 0x3a3028,
  checker: false,
  stone: 0xc8b8a0, stoneDark: 0x7a6a58,
  wood: 0xb8844a, woodDark: 0x6a4424,
  climb: 0xc8a070, climbDark: 0x8a6440,
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
  playerLight: { color: 0xffc27a, intensity: 22, distance: 13 },
  lanternLight: { color: 0xffb44a, intensity: 22, distance: 11 },
  buildBackdrop(sky, bounds, rnd, yBase) {
    mineShaftUp(sky, bounds, rnd, yBase, { pad: 9 });
    sky.dust = fallingParticles(sky, rnd, { n: 90, size: 0.1, fall: -0.12, sway: 0.9, colors: [0xffd8a0, 0xc8a070], opacity: 0.5 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.dust, dt, camera); },
};
