// Thema `cake` (Welt 5: 5-6 Torten-Welt, Rot-Blau-Flipper): Pastell-Torten-Welt – rosa-lila Zuckerwatte-Himmel, weiches
// warmes Licht; Kulisse: Erdbeermilch-Boden tief unten, Riesen-Torten mit Glasur, Kirschen und Sahnewolken am Horizont,
// fallende bunte Streusel. Gelände: Sahne/Glasur als Decke (rosa), Biskuit-Schichten als Körper.
// Tortenstücke, Kerzen, Zuckerstangen im Level liefert deco_w5. Registriert in view/themes.js (eine Zeile).
import { cakeLand } from './backdrop_w5.js';
import { fallingParticles, animateFall } from './backdrop_w3.js';

export const CAKE_THEME = {
  label: 'Torten-Welt',
  sky: [[1, 0x8a7ae8], [0.45, 0xb89af8], [0.15, 0xf0b8f0], [0.03, 0xffd8ec], [0, 0xffe8f2], [-0.15, 0xffc8dc], [-1, 0xe0a0c8]],
  background: 0xffe0ee,
  fog: { color: 0xffe0f0, near: 72, far: 270 },
  hemi: { sky: 0xfff0ff, ground: 0xffb0d0, intensity: 1.45 },
  sun: { color: 0xfff0e8, intensity: 2.5, dir: [-0.35, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'cake',
  ground: null,
  grassTop: 0xffb0d8, grassTop2: 0xffa4d0, grassRim: 0xfff4fa, grassSide: 0xf088b8,
  dirt: 0xf4c878, dirtDeep: 0xd89a4a, rock: 0xe8a868, rockDeep: 0xb87a40,
  checker: false,
  stone: 0xfff6f0, stoneDark: 0xf0c8d8,
  wood: 0xf4d0a0, woodDark: 0xc88a5a,
  climb: 0xf6e0b0, climbDark: 0xc9a46a,
  water: 0x8ae0ff, waterDeep: 0x4aa8e8,
  lava: 0xff6a1a,
  lights: [],
  buildBackdrop(sky, bounds, rnd, yBase) {
    cakeLand(sky, bounds, rnd, yBase);
    sky.sprinkles = fallingParticles(sky, rnd, { n: 120, size: 0.16, fall: 0.9, sway: 0.9, colors: [0xff5a8a, 0x5ad0ff, 0xffe04a, 0x7aff9a, 0xffffff], opacity: 0.85 });
  },
  updateBackdrop(sky, dt, camera) { animateFall(sky.sprinkles, dt, camera); },
};
