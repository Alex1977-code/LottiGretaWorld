// Thema `ruins` (Welt 4: 4-5 Versunkene Stadt): warme Ruinenstadt am goldenen Nachmittag – blauer Himmel mit honiggelbem
// Horizont, schräges warmes Licht, schwebender Staub in der Luft. Kulisse: Säulenreihen (teils gebrochen), Bögen,
// bröckelnde Türme aus Sandstein mit Moos, dazwischen Dschungelbäume. Gelände: sattes Grün auf hellem Sandstein; Ranken
// und Moos liefert die Kulisse deco_w4 (ranken, saeulen …). Registriert in view/themes.js (eine Zeile).
import { ruinCity } from './backdrop_w4.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const RUINS_THEME = {
  label: 'Ruinenstadt',
  sky: [[1, 0x3a86d8], [0.45, 0x6caee8], [0.15, 0xbad8e8], [0.03, 0xf4e2be], [0, 0xffe6b6], [-0.15, 0xe8c890], [-1, 0xa88a60]],
  background: 0xf6e2b8,
  fog: { color: 0xf2dcb0, near: 64, far: 250 },
  hemi: { sky: 0xfff0d0, ground: 0x9c7c4c, intensity: 1.3 },
  sun: { color: 0xffe0a6, intensity: 2.8, dir: [-0.52, 0.82, 0.45] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'ruins',
  ground: { color: 0xb89c64, y: -24 },
  grassTop: 0x8ece4c, grassTop2: 0x7ebe44, grassRim: 0xbaea72, grassSide: 0x5c9c36,
  dirt: 0xe2be86, dirtDeep: 0xaa8250, rock: 0xd2ac7a, rockDeep: 0x8c6642,
  checker: false,
  stone: 0xf2deb2, stoneDark: 0xc2a272,
  wood: 0xd8b07a, woodDark: 0x8a6440,
  climb: 0xe2c48c, climbDark: 0xa8844e,
  water: 0x48c4d8, waterDeep: 0x1a7aa0,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    ruinCity(sky, bounds, rnd, yBase);
    sky.dust = fallingParticles(sky, rnd, { n: 120, size: 0.12, fall: 0.18, sway: 1.1, colors: [0xfff0c8, 0xffe0a0], opacity: 0.6 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.dust, dt, camera); },
};
