// Thema `temple` (Welt 5: 5-Burg Ruinen-Tempel mit Kippquadern): warmer Ruinen-Tempel am späten Nachmittag – goldener
// Dunst, schräges warmes Licht mit langen Schatten; Kulisse: Stufenpyramiden aus Sandstein mit Moos und goldenen
// Spitzen, Dschungel-Kranz, schwebender Staub. Gelände: Sandstein-Platten (Decke) über dunklerem Quaderstein; Säulen,
// Steinköpfe, Obelisken im Level liefert deco_w5. Registriert in view/themes.js (eine Zeile).
import { templeRing } from './backdrop_w5.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const TEMPLE_THEME = {
  label: 'Ruinen-Tempel',
  sky: [[1, 0x3a6ac8], [0.45, 0x6a9ad8], [0.15, 0xd0c0a0], [0.03, 0xffd090], [0, 0xffc878], [-0.15, 0xd8984a], [-1, 0x8a5a2a]],
  background: 0xf8d8a0,
  fog: { color: 0xf2cc96, near: 60, far: 240 },
  hemi: { sky: 0xffe8c0, ground: 0x8a6a3a, intensity: 1.25 },
  sun: { color: 0xffc888, intensity: 2.8, dir: [-0.6, 0.7, 0.42] },
  shadows: true,
  sunDisc: true,
  clouds: false,
  backdrop: 'temple',
  ground: { color: 0x5a7a3a, y: -22 },
  grassTop: 0xe8d098, grassTop2: 0xdcc48a, grassRim: 0xfff0c8, grassSide: 0xb89a62,
  dirt: 0xb89060, dirtDeep: 0x7a5a36, rock: 0xc8a878, rockDeep: 0x8a6a42,
  checker: false,
  stone: 0xf2deb2, stoneDark: 0xc2a272,
  wood: 0xd8b07a, woodDark: 0x8a6440,
  climb: 0xe2c48c, climbDark: 0xa8844e,
  water: 0x48c4d8, waterDeep: 0x1a7aa0,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    templeRing(sky, bounds, rnd, yBase);
    sky.dust = fallingParticles(sky, rnd, { n: 110, size: 0.12, fall: 0.16, sway: 1.1, colors: [0xfff0c8, 0xffe0a0], opacity: 0.6 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.dust, dt, camera); },
};
