// Thema `mine` (Welt 5: 5-5 Höhle mit Zündköpfen): Bergwerk – warmes Dunkel, naher Staub-Nebel, Licht an der Figur und
// an Grubenlaternen (view.addLantern, deco_w5 grubenlampe); Kulisse: Felswände rechts und links mit Holz-Stützrahmen,
// leuchtenden Laternen und funkelnden Erzadern. Gelände: dunkler Lehm mit Holzbohlen-Farbe als Decke.
// Stützbalken/Lampen/Kristalle im Level liefert deco_w5. Registriert in view/themes.js (eine Zeile).
import { mineShaft } from './backdrop_w5.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const MINE_THEME = {
  label: 'Bergwerk',
  sky: [[1, 0x0c0806], [0.3, 0x1a120c], [0, 0x2a1c12], [-1, 0x0a0604]],
  background: 0x1a120c,
  fog: { color: 0x22170e, near: 18, far: 90 },
  hemi: { sky: 0xd8a878, ground: 0x4a3020, intensity: 0.75 },
  sun: { color: 0xffd0a0, intensity: 0.9, dir: [-0.3, 1, 0.45] },
  shadows: true,
  sunDisc: false,
  clouds: false,
  backdrop: 'mine',
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
    mineShaft(sky, bounds, rnd, yBase);
    sky.dust = fallingParticles(sky, rnd, { n: 90, size: 0.1, fall: 0.15, sway: 0.9, colors: [0xffd8a0, 0xc8a070], opacity: 0.5 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.dust, dt, camera); },
};
